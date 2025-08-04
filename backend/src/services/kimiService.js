const { OpenAI } = require('openai');
const { query } = require('../config/database');
require('dotenv').config();

class KimiService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.KIMI_KEY,
      baseURL: 'https://api.moonshot.cn'
    });
    
    this.model = 'kimi-thinking-preview';
    this.maxTokens = 1024;
    this.temperature = 0.3; // 审核需要更加严谨，使用较低的temperature
    this.maxRetries = 2;
    this.timeoutMs = 30000;
  }

  // 生成审核提示词
  getReviewPrompt(questionData, type) {
    const basePrompt = `你是一位严谨的高中数学教师，负责审核AI生成的数学题目。请从以下三个维度对题目进行全面审核：

1. **逻辑正确性**：题目描述是否清晰、逻辑是否合理、条件是否充分
2. **计算准确性**：答案和解析中的数学计算是否正确、步骤是否合理
3. **格式规范性**：LaTeX格式是否正确、选项格式是否标准、解析是否完整

**审核题目：**
题目类型：${this.getTypeText(type)}
题目内容：${questionData.question}
${type === 'choice' ? `选项：${JSON.stringify(questionData.options, null, 2)}` : ''}
标准答案：${questionData.answer}
详细解析：${questionData.solution}

请严格按照以下JSON格式返回审核结果：

{
  "passed": true/false,
  "overall_score": 85,  // 总体评分（0-100）
  "logic_score": 90,    // 逻辑正确性评分（0-100）
  "calculation_score": 85,  // 计算准确性评分（0-100）
  "format_score": 80,   // 格式规范性评分（0-100）
  "issues": [           // 发现的问题列表
    {
      "type": "logic|calculation|format",
      "severity": "high|medium|low",
      "description": "具体问题描述"
    }
  ],
  "suggestions": [      // 改进建议
    "具体的改进建议1",
    "具体的改进建议2"
  ],
  "positive_points": [  // 优点
    "题目的优点1",
    "题目的优点2"
  ]
}

要求：
- 如果存在严重的逻辑错误或计算错误，passed必须为false
- 评分要客观公正，总分低于70分时passed应为false
- 问题描述要具体明确，不能太笼统
- 改进建议要可操作，能指导修改
- 即使通过审核也要指出可以改进的地方`;

    return basePrompt;
  }

  // 题目类型文本
  getTypeText(type) {
    const typeMap = {
      choice: '选择题',
      blank: '填空题',
      solution: '解答题'
    };
    return typeMap[type] || '未知题型';
  }

  // 审核题目
  async reviewQuestion(requestId, questionData, type) {
    const startTime = Date.now();
    let apiLog = {
      request_id: requestId,
      api_provider: 'kimi',
      endpoint: '/chat/completions',
      request_data: null,
      response_data: null,
      request_tokens: null,
      response_tokens: null,
      response_time_ms: null,
      status_code: null,
      error_message: null,
      cost: null
    };

    try {
      console.log(`🔍 开始审核题目 - RequestId: ${requestId}, Type: ${type}`);

      const prompt = this.getReviewPrompt(questionData, type);
      const requestData = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一位严谨的高中数学教师，专门负责审核数学题目的质量。请客观公正地评估题目，并按照要求的JSON格式返回审核结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      };

      apiLog.request_data = requestData;

      // 调用Kimi API
      const response = await this.client.chat.completions.create(requestData);
      
      const responseTime = Date.now() - startTime;
      apiLog.response_time_ms = responseTime;
      apiLog.status_code = 200;
      apiLog.request_tokens = response.usage?.prompt_tokens || null;
      apiLog.response_tokens = response.usage?.completion_tokens || null;
      
      // 计算成本（假设价格，需要根据Kimi实际定价调整）
      const inputCost = (response.usage?.prompt_tokens || 0) * 0.00001; // $0.01/1K tokens
      const outputCost = (response.usage?.completion_tokens || 0) * 0.00002; // $0.02/1K tokens
      apiLog.cost = inputCost + outputCost;

      const reviewContent = response.choices[0]?.message?.content;
      if (!reviewContent) {
        throw new Error('Kimi返回内容为空');
      }

      console.log(`✅ Kimi审核完成 - RequestId: ${requestId}, 耗时: ${responseTime}ms`);

      // 解析JSON响应
      let parsedReview;
      try {
        // 提取JSON部分
        const jsonMatch = reviewContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('无法从响应中提取JSON格式数据');
        }
        parsedReview = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('JSON解析失败:', parseError.message);
        console.error('原始内容:', reviewContent);
        throw new Error(`JSON格式解析失败: ${parseError.message}`);
      }

      // 验证必要字段
      const requiredFields = ['passed', 'overall_score'];
      for (const field of requiredFields) {
        if (parsedReview[field] === undefined) {
          throw new Error(`缺少必要字段: ${field}`);
        }
      }

      // 数据验证和标准化
      const normalizedReview = {
        passed: Boolean(parsedReview.passed),
        overall_score: Math.max(0, Math.min(100, parseInt(parsedReview.overall_score) || 0)),
        logic_score: Math.max(0, Math.min(100, parseInt(parsedReview.logic_score) || 0)),
        calculation_score: Math.max(0, Math.min(100, parseInt(parsedReview.calculation_score) || 0)),
        format_score: Math.max(0, Math.min(100, parseInt(parsedReview.format_score) || 0)),
        issues: Array.isArray(parsedReview.issues) ? parsedReview.issues : [],
        suggestions: Array.isArray(parsedReview.suggestions) ? parsedReview.suggestions : [],
        positive_points: Array.isArray(parsedReview.positive_points) ? parsedReview.positive_points : []
      };

      // 逻辑验证：低分题目不应该通过
      if (normalizedReview.overall_score < 70 && normalizedReview.passed) {
        console.warn(`⚠️  审核逻辑异常：总分${normalizedReview.overall_score}但标记为通过，自动修正为拒绝`);
        normalizedReview.passed = false;
        normalizedReview.issues.push({
          type: 'logic',
          severity: 'high',
          description: '总体评分过低，不符合发布标准'
        });
      }

      apiLog.response_data = normalizedReview;

      // 记录API调用日志
      await this.logApiCall(apiLog);

      return {
        success: true,
        data: normalizedReview,
        tokens: response.usage?.total_tokens || 0,
        cost: apiLog.cost,
        responseTime: responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      apiLog.response_time_ms = responseTime;
      apiLog.error_message = error.message;
      apiLog.status_code = error.status || 500;

      console.error(`❌ Kimi审核失败 - RequestId: ${requestId}:`, error.message);

      // 记录错误日志
      await this.logApiCall(apiLog);

      return {
        success: false,
        error: error.message,
        responseTime: responseTime
      };
    }
  }

  // 重试审核（带指数退避）
  async reviewQuestionWithRetry(requestId, questionData, type) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        const result = await this.reviewQuestion(requestId, questionData, type);
        
        if (result.success) {
          return result;
        }
        
        lastError = result.error;
        
        if (attempt <= this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 指数退避：1s, 2s, 4s
          console.log(`🔄 Kimi第${attempt}次尝试失败，${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        lastError = error.message;
        
        if (attempt <= this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`🔄 Kimi第${attempt}次尝试异常，${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Kimi审核失败（已重试${this.maxRetries}次）: ${lastError}`);
  }

  // 记录API调用日志
  async logApiCall(logData) {
    try {
      const sql = `
        INSERT INTO api_logs 
        (request_id, api_provider, endpoint, request_data, response_data, 
         request_tokens, response_tokens, response_time_ms, status_code, error_message, cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        logData.request_id,
        logData.api_provider,
        logData.endpoint,
        JSON.stringify(logData.request_data),
        JSON.stringify(logData.response_data),
        logData.request_tokens,
        logData.response_tokens,
        logData.response_time_ms,
        logData.status_code,
        logData.error_message,
        logData.cost
      ];
      
      await query(sql, params);
    } catch (error) {
      console.error('记录API日志失败:', error.message);
    }
  }

  // 获取审核统计信息
  async getReviewStatistics(timeRange = '24h') {
    const timeCondition = {
      '1h': 'created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      '24h': 'created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)',
      '7d': 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
      '30d': 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    };

    const sql = `
      SELECT 
        COUNT(*) as total_reviews,
        SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) as successful_reviews,
        SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) as failed_reviews,
        AVG(response_time_ms) as avg_response_time,
        SUM(request_tokens) as total_request_tokens,
        SUM(response_tokens) as total_response_tokens,
        SUM(cost) as total_cost,
        (SELECT COUNT(*) FROM raw_questions WHERE status = 'auto_pass' AND ${timeCondition[timeRange] || timeCondition['24h']}) as passed_questions,
        (SELECT COUNT(*) FROM raw_questions WHERE status = 'ai_reject' AND ${timeCondition[timeRange] || timeCondition['24h']}) as rejected_questions
      FROM api_logs 
      WHERE api_provider = 'kimi' AND ${timeCondition[timeRange] || timeCondition['24h']}
    `;

    const result = await query(sql);
    const stats = result[0];
    
    // 计算通过率
    const totalQuestions = (stats.passed_questions || 0) + (stats.rejected_questions || 0);
    stats.pass_rate = totalQuestions > 0 ? ((stats.passed_questions || 0) / totalQuestions * 100).toFixed(2) : 0;
    
    return stats;
  }

  // 批量审核题目（用于批处理场景）
  async batchReviewQuestions(questions) {
    const results = [];
    const concurrency = 3; // 并发数限制
    
    for (let i = 0; i < questions.length; i += concurrency) {
      const batch = questions.slice(i, i + concurrency);
      const batchPromises = batch.map(async (question) => {
        try {
          const result = await this.reviewQuestionWithRetry(
            question.requestId,
            question.data,
            question.type
          );
          return { ...result, requestId: question.requestId };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            requestId: question.requestId
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 批次间延迟，避免触发API限流
      if (i + concurrency < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

module.exports = new KimiService();