const { query, transaction } = require('../config/database');

class Question {
  // 创建原始题目记录
  static async createRawQuestion(data) {
    const sql = `INSERT INTO raw_questions (request_id, type, knowledge_point, difficulty, custom_prompt, deepseek_raw, deepseek_tokens, deepseek_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      data.requestId,
      data.type,
      data.knowledgePoint,
      data.difficulty,
      data.customPrompt || null,
      JSON.stringify(data.deepseekRaw),
      data.deepseekTokens || null,
      data.deepseekCost || null,
      'auto_pass'
    ];
    
    const result = await query(sql, params);
    return result.insertId;
  }

  // 更新Kimi审核结果
  static async updateKimiCheck(id, kimiData) {
    const sql = `UPDATE raw_questions SET kimi_check = ?, kimi_tokens = ?, kimi_cost = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    const status = kimiData.passed ? 'auto_pass' : 'ai_reject';
    const params = [
      JSON.stringify(kimiData.result),
      kimiData.tokens || null,
      kimiData.cost || null,
      status,
      id
    ];
    
    await query(sql, params);
    return true;
  }

  // 获取原始题目列表
  static async getRawQuestions(filters = {}) {
    console.log('🔍 Question.getRawQuestions 调用参数:', JSON.stringify(filters, null, 2));
    
    let sql = `SELECT id, request_id, type, knowledge_point, difficulty, deepseek_raw, kimi_check, status, human_feedback, created_at, updated_at FROM raw_questions WHERE 1=1`;
    
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
      console.log('📌 添加状态筛选:', filters.status);
    }
    
    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
      console.log('📌 添加类型筛选:', filters.type);
    }
    
    if (filters.knowledgePoint) {
      sql += ' AND knowledge_point = ?';
      params.push(filters.knowledgePoint);
      console.log('📌 添加知识点筛选:', filters.knowledgePoint);
    }
    
    if (filters.difficulty) {
      sql += ' AND difficulty = ?';
      params.push(parseInt(filters.difficulty));
      console.log('📌 添加难度筛选:', filters.difficulty);
    }
    
    // 排序
    sql += ' ORDER BY created_at DESC';
    
    // 分页处理 - MySQL不支持LIMIT/OFFSET参数化，需要直接拼接到SQL中
    if (filters.limit && !isNaN(parseInt(filters.limit)) && parseInt(filters.limit) > 0) {
      const limit = parseInt(filters.limit);
      sql += ` LIMIT ${limit}`;
      console.log('📌 添加分页限制:', limit);
      
      if (filters.offset !== undefined && !isNaN(parseInt(filters.offset)) && parseInt(filters.offset) >= 0) {
        const offset = parseInt(filters.offset);
        if (offset > 0) {  // 只有当offset大于0时才添加OFFSET子句
          sql += ` OFFSET ${offset}`;
          console.log('📌 添加分页偏移:', offset);
        }
      }
    } else {
      // 如果没有有效的limit，设置默认值
      sql += ' LIMIT 50';
      console.log('📌 使用默认分页限制: 50');
    }
    
    console.log('🔍 最终SQL查询:', sql);
    console.log('🔍 查询参数:', params);
    
    const result = await query(sql, params);
    console.log('✅ 查询结果数量:', result.length);
    
    return result;
  }

  // 获取原始题目总数
  static async getRawQuestionsCount(filters = {}) {
    console.log('🔢 Question.getRawQuestionsCount 调用参数:', JSON.stringify(filters, null, 2));
    
    let sql = 'SELECT COUNT(*) as total FROM raw_questions WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
      console.log('📌 添加状态筛选:', filters.status);
    }
    
    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
      console.log('📌 添加类型筛选:', filters.type);
    }
    
    if (filters.knowledgePoint) {
      sql += ' AND knowledge_point = ?';
      params.push(filters.knowledgePoint);
      console.log('📌 添加知识点筛选:', filters.knowledgePoint);
    }
    
    if (filters.difficulty) {
      sql += ' AND difficulty = ?';
      params.push(parseInt(filters.difficulty));
      console.log('📌 添加难度筛选:', filters.difficulty);
    }
    
    console.log('🔍 统计查询SQL:', sql);
    console.log('🔍 统计查询参数:', params);
    
    const result = await query(sql, params);
    const total = result[0].total;
    console.log('✅ 查询总数结果:', total);
    
    return total;
  }

  // 根据ID获取原始题目
  static async getRawQuestionById(id) {
    const sql = `SELECT * FROM raw_questions WHERE id = ?`;
    
    const result = await query(sql, [id]);
    return result[0] || null;
  }

  // 确认题目（移动到正式表）
  static async confirmQuestion(rawQuestionId, humanFeedback = null) {
    return await transaction(async (connection) => {
      // 获取原始题目数据
      const [rawQuestion] = await connection.execute(
        'SELECT * FROM raw_questions WHERE id = ?',
        [rawQuestionId]
      );
      
      if (!rawQuestion) {
        throw new Error('题目不存在');
      }
      
      if (rawQuestion.status === 'confirmed') {
        throw new Error('题目已确认');
      }
      
      const deepseekData = JSON.parse(rawQuestion.deepseek_raw);
      
      // 插入到正式题目表
      const insertSql = `INSERT INTO questions (raw_question_id, type, knowledge_point, difficulty, question_text, options, correct_answer, solution) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const [insertResult] = await connection.execute(insertSql, [
        rawQuestionId,
        rawQuestion.type,
        rawQuestion.knowledge_point,
        rawQuestion.difficulty,
        deepseekData.question || '',
        JSON.stringify(deepseekData.options || null),
        deepseekData.answer || '',
        deepseekData.solution || ''
      ]);
      
      // 更新原始题目状态
      await connection.execute(
        'UPDATE raw_questions SET status = ?, human_feedback = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['confirmed', humanFeedback, rawQuestionId]
      );
      
      return insertResult.insertId;
    });
  }

  // 拒绝题目
  static async rejectQuestion(id, humanFeedback) {
    const sql = `UPDATE raw_questions SET status = 'human_reject', human_feedback = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await query(sql, [humanFeedback, id]);
    return true;
  }

  // 获取正式题目列表
  static async getQuestions(filters = {}) {
    let sql = `SELECT q.id, q.type, q.knowledge_point, q.difficulty, q.question_text, q.options, q.correct_answer, q.solution, q.quality_score, q.usage_count, q.created_at FROM questions q WHERE 1=1`;
    
    const params = [];
    
    if (filters.type) {
      sql += ' AND q.type = ?';
      params.push(filters.type);
    }
    
    if (filters.knowledgePoint) {
      sql += ' AND q.knowledge_point = ?';
      params.push(filters.knowledgePoint);
    }
    
    if (filters.difficulty) {
      sql += ' AND q.difficulty = ?';
      params.push(filters.difficulty);
    }
    
    sql += ' ORDER BY q.created_at DESC';
    
    if (filters.limit) {
      const limit = parseInt(filters.limit);
      sql += ` LIMIT ${limit}`;
      
      if (filters.offset !== undefined && parseInt(filters.offset) > 0) {
        const offset = parseInt(filters.offset);
        sql += ` OFFSET ${offset}`;
      }
    }
    
    return await query(sql, params);
  }

  // 统计数据
  static async getStatistics() {
    console.log('📊 Question.getStatistics 开始查询统计数据');
    
    const sql = `SELECT COUNT(*) as total_raw, SUM(CASE WHEN status = 'auto_pass' THEN 1 ELSE 0 END) as auto_pass, SUM(CASE WHEN status = 'ai_reject' THEN 1 ELSE 0 END) as ai_reject, SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed, SUM(CASE WHEN status = 'human_reject' THEN 1 ELSE 0 END) as human_reject, (SELECT COUNT(*) FROM questions) as total_questions FROM raw_questions`;
    
    console.log('🔍 统计查询SQL:', sql);
    
    try {
      const result = await query(sql);
      console.log('✅ 统计查询结果:', result[0]);
      return result[0];
    } catch (error) {
      console.error('❌ 统计查询失败:', error);
      // 返回默认值，避免前端错误
      return {
        total_raw: 0,
        auto_pass: 0,
        ai_reject: 0,
        confirmed: 0,
        human_reject: 0,
        total_questions: 0
      };
    }
  }
}

module.exports = Question;