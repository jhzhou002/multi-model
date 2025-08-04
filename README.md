# 高中数学AI题库自动生成模块

基于DeepSeek-reasoner + Kimi-thinking-preview双模型架构的智能题目生成系统

## ✨ 功能特性

- 🤖 **AI智能生成**: 使用DeepSeek-reasoner自动生成高质量数学题目
- 🔍 **智能审核**: Kimi-thinking-preview三重审核(逻辑/计算/格式)
- 📊 **完整管理**: 生成→审核→落库→人工确认闭环流程
- 🎯 **多样题型**: 支持选择题、填空题、解答题三种类型
- 📚 **知识点全覆盖**: 涵盖人教A版必修&选修18个知识点
- 💾 **数据持久化**: MySQL存储，支持版本回溯和软删除
- ⚡ **高性能**: Redis缓存，API限流，平均响应<25秒

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vue3 前端     │    │  Express 后端   │    │   MySQL 数据库  │
│  管理控制台     │◄───┤   RESTful API   ├───►│   题库存储      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌────────┴────────┐
                       │                 │
            ┌─────────────────┐ ┌─────────────────┐
            │ DeepSeek-reasoner│ │Kimi-thinking    │
            │   题目生成      │ │  preview审核    │
            └─────────────────┘ └─────────────────┘
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18.x
- MySQL >= 8.0  
- Redis >= 7.0 (可选)

### 一键启动
```bash
# 克隆项目
git clone <repo-url>
cd multi-model

# 启动开发环境
./start-dev.sh
```

访问地址：
- 前端管理界面: http://localhost:8080
- 后端API: http://localhost:3000
- API文档: http://localhost:3000/api/docs

### 手动启动

**后端服务:**
```bash
cd backend
npm install
npm run dev
```

**前端服务:**
```bash  
cd frontend
npm install
npm run serve
```

## 📖 使用说明

### 1. 题目生成
- 登录管理界面
- 选择题目类型(选择/填空/解答)
- 设定知识点和难度(1-5星)
- 添加自定义要求(可选)
- 点击生成，系统自动完成AI生成和审核

### 2. 题目审核
- 查看AI生成的题目列表
- 审查题目内容和AI审核结果
- 确认通过或提供反馈拒绝
- 确认的题目自动进入正式题库

### 3. 题库管理
- 浏览正式题库中的题目
- 按知识点、类型、难度筛选
- 导出题目用于试卷组卷

## 🔧 配置说明

### 环境变量配置 (backend/.env)
```bash
# 服务配置
PORT=3000
NODE_ENV=development

# 数据库配置  
DB_HOST=8.153.77.15
DB_USER=connect
DB_PASSWORD=Zhjh0704.
DB_NAME=math

# AI模型API密钥
DEEPSEEK_KEY=sk-17269fe512b74407b22f5c926a216bf1
KIMI_KEY=sk-5WRXcCdiP1HoPDRwpcKnF0Zi5b9th6q12mF50KqBDJrUc62y
```

### 支持的知识点
- 函数基础、反函数、复合函数
- 三角函数、对数函数、指数函数  
- 不等式、数列、极限
- 导数、积分、概率统计
- 平面几何、立体几何、解析几何
- 向量、复数等18个知识点

## 📊 API接口

### 题目管理
```http
POST /api/questions/generate     # 生成题目
GET  /api/questions/raw         # 获取原始题目列表  
POST /api/questions/:id/confirm # 确认题目
POST /api/questions/:id/reject  # 拒绝题目
GET  /api/questions             # 获取题库题目
```

### 知识点管理
```http
GET /api/knowledge-points           # 获取知识点列表
GET /api/knowledge-points/statistics # 获取知识点统计
```

### 系统统计
```http
GET /api/questions/statistics    # 获取系统统计数据
```

## 📈 性能指标

- **生成速度**: 单题生成+审核 ≤ 25秒
- **系统可用性**: ≥ 99%
- **API限流**: 5 requests/second  
- **并发支持**: 多题目并行处理
- **数据一致性**: 事务保证数据完整性

## 🔍 监控日志

系统提供完整的监控和日志功能：
- API调用日志和成本统计
- 题目生成成功率监控
- AI审核通过率分析
- 系统性能指标追踪

## 🛠️ 开发指南

### 项目结构
```
multi-model/
├── backend/          # Node.js后端
│   ├── src/         # 源代码
│   ├── sql/         # 数据库脚本
│   └── package.json
├── frontend/         # Vue3前端  
│   ├── src/         # 源代码
│   └── package.json
├── start-dev.sh     # 开发启动脚本
├── stop-dev.sh      # 停止脚本
└── test-api.sh      # API测试脚本
```

### 开发命令
```bash
# 启动开发环境
./start-dev.sh

# 停止服务
./stop-dev.sh  

# 测试API
./test-api.sh

# 后端开发
cd backend && npm run dev

# 前端开发  
cd frontend && npm run serve
```

## 📋 待办事项

- [ ] 添加用户权限管理
- [ ] 支持批量题目生成
- [ ] 增加题目质量评分算法
- [ ] 实现题目难度自适应调节
- [ ] 添加题目使用统计分析
- [ ] 支持更多数学符号和公式

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

## 📞 技术支持

如遇问题，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至技术支持团队

---

**高中数学AI题库自动生成模块** - 让数学题目生成更智能、更高效！