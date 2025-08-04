# 高中数学 AI 题库自动生成模块  

需求文档 V1.0  
（面向 DeepSeek-reasoner + Kimi-thinking-preview 双模型架构）

## 一、项目定位  

作为整个高中数学辅导平台的第一步，本模块独立提供「单题生成 → 审核 → 落库 → 人工确认」闭环能力，为后续组卷、个性化推荐、学情分析等子系统奠定数据基础。

## 二、总体业务流程  

1. 管理员在 Web 控制台输入题型、知识点、难度、期望篇幅等条件。  
2. 后端调用 DeepSeek-reasoner 生成题目+解析 JSON。  
3. 解析文本立即送入 Kimi-thinking-preview 做「逻辑/计算/格式」三重审核，返回审核结论与修改建议。  
4. 若审核通过，整条记录写入 MySQL「raw_questions」表并标记 status = ‘auto_pass’；不通过则标记 ‘ai_reject’ 并附带修改意见。  
5. 管理员可在控制台查看待人工复审列表，一键采纳或二次编辑。  
6. 人工确认后 status 变为 ‘confirmed’，进入正式题库表「questions」。  

## 三、功能需求  

| 编号 | 功能点         | 需求描述                                                     | 验收标准                                                     |
| ---- | -------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| F1   | 题目生成       | 根据题型、知识点、难度等参数调用 DeepSeek-reasoner 生成题面、标准答案、分步解析（Latex 格式） | 生成时间 ≤ 15 s；支持选择/填空/解答 3 种题型；支持人教 A 版必修 & 选修 18 个知识点 |
| F2   | 审核           | 调用 Kimi-thinking-preview 对解析进行逻辑、计算、格式审核，返回布尔结果 + 改进建议 | 误杀率 ≤ 5%，漏杀率 ≤ 2%（以 100 条人工标注为基准）          |
| F3   | 题库落库       | 将生成记录持久化到 MySQL，支持版本回溯                       | 字段完整；支持幂等写入；支持软删除                           |
| F4   | 运营后台       | Vue 控制台，支持查询、筛选、人工复审、导出                   | 页面响应 ≤ 2 s；支持分页 50/100/200                          |
| F5   | API 限流与重试 | 对两家大模型 API 做统一限流、降级、重试                      | 超时 30 s 自动重试 2 次；QPS 限制 5 req/s                    |

## 四、非功能需求  

1. 性能：单次完整流程（生成+审核+落库）平均 ≤ 25 s。  
2. 可用性：核心链路可用性 ≥ 99%（含 API 异常自动降级到人工审核）。  
3. 安全：API Key 加密存储于服务器环境变量；传输 HTTPS。  
4. 扩展：后续可横向增加知识点、题型、审核维度，无需改表结构（预留 JSON 字段）。

## 五、技术栈与模型选型  

| 层级     | 技术                   | 说明                                                         |
| -------- | ---------------------- | ------------------------------------------------------------ |
| 前端     | Vue3 + ElementPlus     | 管理后台                                                     |
| 后端     | Node.js 20 + Express 4 | RESTful API                                                  |
| 数据库   | MySQL 8.0              | 题库两表 raw_questions / questions                           |
| 缓存     | Redis 7                | 限流计数 & API 结果缓存 5 min                                |
| 生成模型 | DeepSeek-reasoner      | 官方 base_url=https://api.deepseek.com，model="deepseek-reasoner"，max_tokens 8192 |
| 审核模型 | Kimi-thinking-preview  | 官方 base_url=https://api.moonshot.cn，model="kimi-thinking-preview"，max_tokens 8192 |

## 六、数据库设计（核心字段）  

raw_questions  
- id BIGINT PK AUTO_INCREMENT  
- request_id VARCHAR(32) UNIQUE  
- type ENUM('choice','blank','solution')  
- knowledge_point VARCHAR(64)  
- difficulty TINYINT(1-5)  
- deepseek_raw JSON  
- kimi_check JSON  
- status ENUM('auto_pass','ai_reject','confirmed')  
- created_at DATETIME  
- updated_at DATETIME  

questions（正式表，字段略）

## 七、接口设计（关键 REST）  

POST /api/questions/generate  
请求体：{type, knowledgePoint, difficulty, prompt?}  
返回：{requestId, status, preview}

GET /api/questions/raw?status=ai_reject&page=1&size=50  
POST /api/questions/{id}/confirm  
POST /api/questions/{id}/reject

## 八、API 调用示例  

1. DeepSeek 生成  
```js
const { OpenAI } = require('openai');
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_KEY,
  baseURL: 'https://api.deepseek.com'
});
const res = await client.chat.completions.create({
  model: 'deepseek-reasoner',
  messages: [
    { role: 'system', content: '你是高中数学命题专家，请严格按照 JSON 格式返回题面、答案、解析。' },
    { role: 'user', content: `请生成一道 ${difficulty} 星难度的函数选择题，知识点：${knowledgePoint}` }
  ],
  max_tokens: 4096,
  temperature: 0.7
});
```

2. Kimi 审核  
```js
const kimi = new OpenAI({
  apiKey: process.env.KIMI_KEY,
  baseURL: 'https://api.moonshot.cn'
});
const check = await kimi.chat.completions.create({
  model: 'kimi-thinking-preview',
  messages: [
    { role: 'system', content: '你是严谨的高中数学教师，请检查以下解析是否有逻辑或计算错误，按 JSON {"passed":bool,"suggestion":string} 返回。' },
    { role: 'user', content: generatedSolution }
  ],
  max_tokens: 1024
});
```

注：kimi key：sk-5WRXcCdiP1HoPDRwpcKnF0Zi5b9th6q12mF50KqBDJrUc62y


deepseek key：sk-17269fe512b74407b22f5c926a216bf1

// 数据库配置
  DB_CONFIG: {
    host: '8.153.77.15',
    user: 'connect',
    password: 'Zhjh0704.',
    database: 'math',
    port: 3306,
    charset: 'utf8mb4',
    timezone: '+08:00'
  }

