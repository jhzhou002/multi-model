const { OpenAI } = require('openai');
const { query } = require('../config/database');
require('dotenv').config();

class DeepSeekService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_KEY,
      baseURL: 'https://api.deepseek.com'
    });
    
    this.model = 'deepseek-reasoner';
    this.maxTokens = 4096;
    this.temperature = 0.7;
    this.maxRetries = 2;
    this.timeoutMs = 30000;
  }

  // 生成题目提示词模板
  getPromptTemplate(type, knowledgePoint, difficulty, customPrompt = '') {
    const basePrompt = `你是一位资深的高中数学教师和命题专家。请严格按照以下JSON格式生成一道${difficulty}星难度的${this.getTypeText(type)}题目，知识点为：${knowledgePoint}。

要求：
1. 题目内容要符合高中数学水平，难度适中
2. 使用LaTeX格式表示数学公式，用$包围行内公式，用$$包围独立公式
3. 解析要详细清晰，步骤完整
4. 选择题需要提供4个选项（A、B、C、D）
5. 答案要准确无误

${customPrompt ? `特殊要求：${customPrompt}` : ''}

请严格按照以下JSON格式返回：`;

    const formatTemplates = {
      choice: `
{
  "question": "题目内容（使用LaTeX格式）",
  "options": {
    "A": "选项A内容",
    "B": "选项B内容", 
    "C": "选项C内容",
    "D": "选项D内容"
  },
  "answer": "正确答案字母（如：A）",
  "solution": "详细解析过程（使用LaTeX格式，步骤清晰）"
}`,
      
      blank: `
{
  "question": "题目内容，用______表示填空位置（使用LaTeX格式）",
  "answer": "正确答案（如果有多个答案用;分隔）",
  "solution": "详细解析过程（使用LaTeX格式，步骤清晰）"
}`,
      
      solution: `
{
  "question": "题目内容（使用LaTeX格式）",
  "answer": "最终答案或答案要点",
  "solution": "完整的解题过程（使用LaTeX格式，包含详细步骤和推理）"
}`
    };

    return basePrompt + formatTemplates[type];
  }

  // 题目类型文本
  getTypeText(type) {
    const typeMap = {
      choice: '选择',
      blank: '填空',
      solution: '解答'
    };
    return typeMap[type] || '未知';
  }

  // 生成题目
  async generateQuestion(requestId, type, knowledgePoint, difficulty, customPrompt = '') {
    const startTime = Date.now();
    let apiLog = {
      request_id: requestId,
      api_provider: 'deepseek',
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
      console.log(`🚀 开始生成题目 - RequestId: ${requestId}, Type: ${type}, Knowledge: ${knowledgePoint}, Difficulty: ${difficulty}`);

      const prompt = this.getPromptTemplate(type, knowledgePoint, difficulty, customPrompt);
      const requestData = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一位资深的高中数学教师和命题专家。请严格按照用户要求的JSON格式生成高质量的数学题目。'
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

      // 调用DeepSeek API
      const response = await this.client.chat.completions.create(requestData);
      
      const responseTime = Date.now() - startTime;
      apiLog.response_time_ms = responseTime;
      apiLog.status_code = 200;
      apiLog.request_tokens = response.usage?.prompt_tokens || null;
      apiLog.response_tokens = response.usage?.completion_tokens || null;
      
      // 计算成本（假设价格，实际需要根据DeepSeek定价调整）
      const inputCost = (response.usage?.prompt_tokens || 0) * 0.00001; // $0.01/1K tokens
      const outputCost = (response.usage?.completion_tokens || 0) * 0.00002; // $0.02/1K tokens
      apiLog.cost = inputCost + outputCost;

      const generatedContent = response.choices[0]?.message?.content;
      if (!generatedContent) {
        throw new Error('DeepSeek返回内容为空');
      }

      console.log(`✅ DeepSeek生成完成 - RequestId: ${requestId}, 耗时: ${responseTime}ms`);

      // 解析JSON响应
      let parsedContent;
      try {
        // 提取JSON部分（去除可能的前后文本）
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('无法从响应中提取JSON格式数据');
        }
        parsedContent = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('JSON解析失败:', parseError.message);
        console.error('原始内容:', generatedContent);
        throw new Error(`JSON格式解析失败: ${parseError.message}`);
      }

      // 验证必要字段
      const requiredFields = ['question', 'answer', 'solution'];
      if (type === 'choice' && !parsedContent.options) {
        requiredFields.push('options');
      }

      for (const field of requiredFields) {
        if (!parsedContent[field]) {
          throw new Error(`缺少必要字段: ${field}`);
        }
      }

      apiLog.response_data = parsedContent;

      // 记录API调用日志
      await this.logApiCall(apiLog);

      return {
        success: true,
        data: parsedContent,
        tokens: response.usage?.total_tokens || 0,
        cost: apiLog.cost,
        responseTime: responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      apiLog.response_time_ms = responseTime;
      apiLog.error_message = error.message;
      apiLog.status_code = error.status || 500;

      console.error(`❌ DeepSeek生成失败 - RequestId: ${requestId}:`, error.message);

      // 记录错误日志
      await this.logApiCall(apiLog);

      return {
        success: false,
        error: error.message,
        responseTime: responseTime
      };
    }
  }

  // 重试生成（带指数退避）
  async generateQuestionWithRetry(requestId, type, knowledgePoint, difficulty, customPrompt = '') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        const result = await this.generateQuestion(requestId, type, knowledgePoint, difficulty, customPrompt);
        
        if (result.success) {
          return result;
        }
        
        lastError = result.error;
        
        if (attempt <= this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 指数退避：1s, 2s, 4s
          console.log(`🔄 DeepSeek第${attempt}次尝试失败，${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        lastError = error.message;
        
        if (attempt <= this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`🔄 DeepSeek第${attempt}次尝试异常，${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`DeepSeek生成失败（已重试${this.maxRetries}次）: ${lastError}`);
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

  // 获取API统计信息
  async getApiStatistics(timeRange = '24h') {
    const timeCondition = {
      '1h': 'created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      '24h': 'created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)',
      '7d': 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
      '30d': 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    };

    const sql = `
      SELECT 
        COUNT(*) as total_calls,
        SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) as successful_calls,
        SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) as failed_calls,
        AVG(response_time_ms) as avg_response_time,
        SUM(request_tokens) as total_request_tokens,
        SUM(response_tokens) as total_response_tokens,
        SUM(cost) as total_cost
      FROM api_logs 
      WHERE api_provider = 'deepseek' AND ${timeCondition[timeRange] || timeCondition['24h']}
    `;

    const result = await query(sql);
    return result[0];
  }
}

module.exports = new DeepSeekService();