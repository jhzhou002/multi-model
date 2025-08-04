const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { connectRedis } = require('./config/redis');

// 导入路由
const questionRoutes = require('./routes/questions');
const knowledgePointRoutes = require('./routes/knowledgePoints');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(helmet()); // 安全头
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost:8080'] // 生产环境允许的域名
    : true, // 开发环境允许所有域名
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API限流配置
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30, // 每分钟最多30个请求
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 生成题目API的严格限流
const generateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1分钟
  max: 3, // 每分钟最多3个生成请求
  message: {
    error: 'Too many generate requests, please try again later.',
    code: 'GENERATE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 应用限流中间件
app.use('/api/', generalLimiter);
app.use('/api/questions/generate', generateLimiter);

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 路由配置
app.use('/api/questions', questionRoutes);
app.use('/api/knowledge-points', knowledgePointRoutes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '高中数学AI题库自动生成模块 API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// API文档端点
app.get('/api/docs', (req, res) => {
  res.json({
    title: '高中数学AI题库自动生成模块 API 文档',
    version: '1.0.0',
    endpoints: {
      'POST /api/questions/generate': '生成新题目',
      'GET /api/questions/raw': '获取原始题目列表',
      'POST /api/questions/:id/confirm': '确认题目',
      'POST /api/questions/:id/reject': '拒绝题目',
      'GET /api/knowledge-points': '获取知识点列表'
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Path ${req.originalUrl} not found`,
    code: 'NOT_FOUND'
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('全局错误:', err);
  
  // 数据库错误
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({
      error: 'Database Error',
      message: '数据库操作失败',
      code: 'DATABASE_ERROR'
    });
  }
  
  // 验证错误
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }
  
  // 默认错误
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || '服务器内部错误',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ 无法连接到数据库，服务器启动失败');
      process.exit(1);
    }
    
    // 连接Redis
    const redisConnected = await connectRedis();
    if (!redisConnected) {
      console.warn('⚠️  Redis连接失败，将继续启动但缓存功能不可用');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 服务器启动成功，端口: ${PORT}`);
      console.log(`📖 API文档: http://localhost:${PORT}/api/docs`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

startServer();

module.exports = app;