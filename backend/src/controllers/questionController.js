const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const Question = require('../models/Question');
const deepseekService = require('../services/deepseekService');
const kimiService = require('../services/kimiService');
const { redisUtils } = require('../config/redis');

// 输入验证schema
const generateQuestionSchema = Joi.object({
  type: Joi.string().valid('choice', 'blank', 'solution').required(),
  knowledgePoint: Joi.string().min(1).max(64).required(),
  difficulty: Joi.number().integer().min(1).max(5).required(),
  customPrompt: Joi.string().max(500).optional()
});

const confirmQuestionSchema = Joi.object({
  humanFeedback: Joi.string().max(1000).optional()
});

const rejectQuestionSchema = Joi.object({
  humanFeedback: Joi.string().max(1000).required()
});

class QuestionController {
  // 生成题目
  static async generateQuestion(req, res, next) {
    try {
      // 输入验证
      const { error, value } = generateQuestionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      const { type, knowledgePoint, difficulty, customPrompt } = value;
      const requestId = uuidv4().replace(/-/g, '').substring(0, 32);

      console.log(`📝 开始生成题目流程 - RequestId: ${requestId}`);

      // 检查Redis缓存（可选，用于相同参数的题目）
      const cacheKey = `question:${type}:${knowledgePoint}:${difficulty}:${Buffer.from(customPrompt || '').toString('base64')}`;
      const cachedResult = await redisUtils.get(cacheKey);
      
      if (cachedResult && cachedResult.success) {
        console.log(`💾 使用缓存结果 - RequestId: ${requestId}`);
        return res.json({
          success: true,
          data: {
            requestId: cachedResult.requestId,
            status: cachedResult.status,
            preview: cachedResult.preview
          },
          cached: true
        });
      }

      res.json({
        success: true,
        data: {
          requestId,
          status: 'processing',
          message: '题目生成中，请稍候...'
        }
      });

      // 异步处理题目生成和审核
      QuestionController.processQuestionGeneration(requestId, type, knowledgePoint, difficulty, customPrompt, cacheKey)
        .catch(error => {
          console.error(`❌ 异步处理失败 - RequestId: ${requestId}:`, error);
        });

    } catch (error) {
      next(error);
    }
  }

  // 异步处理题目生成和审核
  static async processQuestionGeneration(requestId, type, knowledgePoint, difficulty, customPrompt, cacheKey) {
    try {
      // 第一步：DeepSeek生成题目
      console.log(`🎯 Step 1: DeepSeek生成 - RequestId: ${requestId}`);
      const generateResult = await deepseekService.generateQuestionWithRetry(
        requestId, type, knowledgePoint, difficulty, customPrompt
      );

      if (!generateResult.success) {
        throw new Error(`DeepSeek生成失败: ${generateResult.error}`);
      }

      // 保存原始题目到数据库
      const rawQuestionId = await Question.createRawQuestion({
        requestId,
        type,
        knowledgePoint,
        difficulty,
        customPrompt,
        deepseekRaw: generateResult.data,
        deepseekTokens: generateResult.tokens,
        deepseekCost: generateResult.cost
      });

      console.log(`💾 原始题目已保存 - ID: ${rawQuestionId}, RequestId: ${requestId}`);

      // 第二步：Kimi审核题目
      console.log(`🎯 Step 2: Kimi审核 - RequestId: ${requestId}`);
      const reviewResult = await kimiService.reviewQuestionWithRetry(
        requestId, generateResult.data, type
      );

      if (!reviewResult.success) {
        console.warn(`⚠️  Kimi审核失败，标记为人工审核 - RequestId: ${requestId}: ${reviewResult.error}`);
        // 审核失败时，保持auto_pass状态，交由人工处理
      } else {
        // 更新审核结果
        await Question.updateKimiCheck(rawQuestionId, {
          passed: reviewResult.data.passed,
          result: reviewResult.data,
          tokens: reviewResult.tokens,
          cost: reviewResult.cost
        });

        console.log(`✅ 审核完成 - RequestId: ${requestId}, 通过: ${reviewResult.data.passed}, 评分: ${reviewResult.data.overall_score}`);
      }

      // 缓存结果（5分钟）
      const cacheData = {
        success: true,
        requestId,
        status: reviewResult.success ? (reviewResult.data.passed ? 'auto_pass' : 'ai_reject') : 'review_failed',
        preview: {
          question: generateResult.data.question.substring(0, 100) + '...',
          type,
          knowledgePoint,
          difficulty,
          reviewScore: reviewResult.success ? reviewResult.data.overall_score : null
        }
      };
      
      await redisUtils.set(cacheKey, cacheData, 300);

      console.log(`🎉 题目生成流程完成 - RequestId: ${requestId}`);

    } catch (error) {
      console.error(`❌ 题目生成流程失败 - RequestId: ${requestId}:`, error);
      
      // 记录错误状态到数据库
      try {
        await Question.updateKimiCheck(rawQuestionId, {
          passed: false,
          result: { error: error.message, passed: false },
          tokens: 0,
          cost: 0
        });
      } catch (dbError) {
        console.error('更新错误状态失败:', dbError);
      }
    }
  }

  // 获取原始题目列表
  static async getRawQuestions(req, res, next) {
    try {
      const {
        status,
        type,
        knowledgePoint,
        difficulty,
        page = 1,
        size = 50
      } = req.query;

      // 参数验证
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(200, Math.max(10, parseInt(size)));
      const offset = (pageNum - 1) * pageSize;

      const filters = {
        status,
        type,
        knowledgePoint,
        difficulty: difficulty ? parseInt(difficulty) : undefined,
        limit: pageSize,
        offset
      };

      // 获取题目列表和总数
      const [questions, total] = await Promise.all([
        Question.getRawQuestions(filters),
        Question.getRawQuestionsCount(filters)
      ]);

      // 处理返回数据，解析JSON字段
      const processedQuestions = questions.map(question => ({
        ...question,
        deepseek_raw: typeof question.deepseek_raw === 'string' 
          ? JSON.parse(question.deepseek_raw) 
          : question.deepseek_raw,
        kimi_check: question.kimi_check 
          ? (typeof question.kimi_check === 'string' 
              ? JSON.parse(question.kimi_check) 
              : question.kimi_check)
          : null
      }));

      res.json({
        success: true,
        data: {
          questions: processedQuestions,
          pagination: {
            page: pageNum,
            size: pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // 根据ID获取原始题目详情
  static async getRawQuestionById(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          error: 'Invalid Parameter',
          message: '无效的题目ID',
          code: 'INVALID_ID'
        });
      }

      const question = await Question.getRawQuestionById(parseInt(id));

      if (!question) {
        return res.status(404).json({
          error: 'Not Found',
          message: '题目不存在',
          code: 'QUESTION_NOT_FOUND'
        });
      }

      // 处理JSON字段
      const processedQuestion = {
        ...question,
        deepseek_raw: typeof question.deepseek_raw === 'string' 
          ? JSON.parse(question.deepseek_raw) 
          : question.deepseek_raw,
        kimi_check: question.kimi_check 
          ? (typeof question.kimi_check === 'string' 
              ? JSON.parse(question.kimi_check) 
              : question.kimi_check)
          : null
      };

      res.json({
        success: true,
        data: processedQuestion
      });

    } catch (error) {
      next(error);
    }
  }

  // 确认题目
  static async confirmQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const { error, value } = confirmQuestionSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          error: 'Invalid Parameter',
          message: '无效的题目ID',
          code: 'INVALID_ID'
        });
      }

      const { humanFeedback } = value;

      // 检查题目是否存在
      const existingQuestion = await Question.getRawQuestionById(parseInt(id));
      if (!existingQuestion) {
        return res.status(404).json({
          error: 'Not Found',
          message: '题目不存在',
          code: 'QUESTION_NOT_FOUND'
        });
      }

      if (existingQuestion.status === 'confirmed') {
        return res.status(400).json({
          error: 'Invalid Status',
          message: '题目已确认，无法重复操作',
          code: 'ALREADY_CONFIRMED'
        });
      }

      // 确认题目
      const questionId = await Question.confirmQuestion(parseInt(id), humanFeedback);

      console.log(`✅ 题目确认成功 - RawID: ${id}, QuestionID: ${questionId}`);

      res.json({
        success: true,
        data: {
          questionId,
          message: '题目确认成功'
        }
      });

    } catch (error) {
      if (error.message.includes('题目不存在') || error.message.includes('题目已确认')) {
        return res.status(400).json({
          error: 'Business Error',
          message: error.message,
          code: 'BUSINESS_ERROR'
        });
      }
      next(error);
    }
  }

  // 拒绝题目
  static async rejectQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const { error, value } = rejectQuestionSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          error: 'Invalid Parameter',
          message: '无效的题目ID',
          code: 'INVALID_ID'
        });
      }

      const { humanFeedback } = value;

      // 检查题目是否存在
      const existingQuestion = await Question.getRawQuestionById(parseInt(id));
      if (!existingQuestion) {
        return res.status(404).json({
          error: 'Not Found',
          message: '题目不存在',
          code: 'QUESTION_NOT_FOUND'
        });
      }

      if (existingQuestion.status === 'human_reject') {
        return res.status(400).json({
          error: 'Invalid Status',
          message: '题目已拒绝，无法重复操作',
          code: 'ALREADY_REJECTED'
        });
      }

      // 拒绝题目
      await Question.rejectQuestion(parseInt(id), humanFeedback);

      console.log(`❌ 题目拒绝 - RawID: ${id}, 原因: ${humanFeedback}`);

      res.json({
        success: true,
        data: {
          message: '题目拒绝成功'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // 获取正式题目列表
  static async getQuestions(req, res, next) {
    try {
      const {
        type,
        knowledgePoint,
        difficulty,
        page = 1,
        size = 50
      } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(200, Math.max(10, parseInt(size)));
      const offset = (pageNum - 1) * pageSize;

      const filters = {
        type,
        knowledgePoint,
        difficulty: difficulty ? parseInt(difficulty) : undefined,
        limit: pageSize,
        offset
      };

      const questions = await Question.getQuestions(filters);

      // 处理JSON字段
      const processedQuestions = questions.map(question => ({
        ...question,
        options: question.options 
          ? (typeof question.options === 'string' 
              ? JSON.parse(question.options) 
              : question.options)
          : null
      }));

      res.json({
        success: true,
        data: {
          questions: processedQuestions,
          pagination: {
            page: pageNum,
            size: pageSize
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // 获取统计信息
  static async getStatistics(req, res, next) {
    try {
      const [
        questionStats,
        deepseekStats,
        kimiStats
      ] = await Promise.all([
        Question.getStatistics(),
        deepseekService.getApiStatistics('24h'),
        kimiService.getReviewStatistics('24h')
      ]);

      res.json({
        success: true,
        data: {
          questions: questionStats,
          deepseek: deepseekStats,
          kimi: kimiStats,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // 获取题目生成状态
  static async getQuestionStatus(req, res, next) {
    try {
      const { requestId } = req.params;

      if (!requestId) {
        return res.status(400).json({
          error: 'Invalid Parameter',
          message: '缺少请求ID',
          code: 'MISSING_REQUEST_ID'
        });
      }

      // 从数据库查询状态
      const sql = 'SELECT id, status, deepseek_raw, kimi_check, created_at, updated_at FROM raw_questions WHERE request_id = ?';
      const result = await require('../config/database').query(sql, [requestId]);

      if (result.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: '未找到对应的生成记录',
          code: 'REQUEST_NOT_FOUND'
        });
      }

      const question = result[0];
      const processedQuestion = {
        id: question.id,
        status: question.status,
        preview: null,
        created_at: question.created_at,
        updated_at: question.updated_at
      };

      // 如果有生成内容，提供预览
      if (question.deepseek_raw) {
        try {
          const deepseekData = typeof question.deepseek_raw === 'string' 
            ? JSON.parse(question.deepseek_raw) 
            : question.deepseek_raw;
          
          processedQuestion.preview = {
            question: deepseekData.question ? deepseekData.question.substring(0, 200) + '...' : '',
            answer: deepseekData.answer || '',
            hasOptions: !!deepseekData.options
          };
        } catch (e) {
          console.error('解析题目内容失败:', e);
        }
      }

      // 如果有审核结果，添加审核信息
      if (question.kimi_check) {
        try {
          const kimiData = typeof question.kimi_check === 'string' 
            ? JSON.parse(question.kimi_check) 
            : question.kimi_check;
          
          processedQuestion.review = {
            passed: kimiData.passed,
            score: kimiData.overall_score,
            issues: kimiData.issues || []
          };
        } catch (e) {
          console.error('解析审核结果失败:', e);
        }
      }

      res.json({
        success: true,
        data: processedQuestion
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = QuestionController;