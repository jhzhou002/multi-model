const redis = require('redis');
require('dotenv').config();

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1', // 强制使用IPv4
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  family: 4 // 强制使用IPv4
};

// 创建Redis客户端
const client = redis.createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
    family: redisConfig.family,
    reconnectStrategy: false // 禁用重连，避免日志噪音
  },
  password: redisConfig.password,
  database: redisConfig.db
});

// 错误处理
client.on('error', (err) => {
  // 静默处理Redis错误，避免日志噪音
  if (err.code !== 'ECONNREFUSED') {
    console.error('Redis 客户端错误:', err);
  }
});

client.on('connect', () => {
  console.log('✅ Redis 连接成功');
});

client.on('ready', () => {
  console.log('✅ Redis 准备就绪');
});

client.on('end', () => {
  console.log('🔌 Redis 连接已断开');
});

// 连接Redis
const connectRedis = async () => {
  try {
    if (!client.isOpen) {
      await client.connect();
    }
    return true;
  } catch (error) {
    console.error('❌ Redis 连接失败:', error.message);
    console.log('⚠️  系统将在没有Redis的情况下继续运行，缓存功能不可用');
    return false;
  }
};

// Redis工具函数
const redisUtils = {
  // 设置缓存
  set: async (key, value, expireInSeconds = 300) => {
    try {
      if (!client.isReady) return false;
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      await client.setEx(key, expireInSeconds, value);
      return true;
    } catch (error) {
      console.warn('Redis SET 不可用:', error.message);
      return false;
    }
  },

  // 获取缓存
  get: async (key) => {
    try {
      if (!client.isReady) return null;
      const value = await client.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.warn('Redis GET 不可用:', error.message);
      return null;
    }
  },

  // 删除缓存
  del: async (key) => {
    try {
      if (!client.isReady) return false;
      await client.del(key);
      return true;
    } catch (error) {
      console.warn('Redis DEL 不可用:', error.message);
      return false;
    }
  },

  // 增加计数器（用于限流）
  incr: async (key, expireInSeconds = 60) => {
    try {
      if (!client.isReady) return 1; // Redis不可用时不限流
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, expireInSeconds);
      }
      return count;
    } catch (error) {
      console.warn('Redis INCR 不可用:', error.message);
      return 1; // 返回1表示不限流
    }
  },

  // 检查键是否存在
  exists: async (key) => {
    try {
      if (!client.isReady) return false;
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.warn('Redis EXISTS 不可用:', error.message);
      return false;
    }
  }
};

module.exports = {
  client,
  connectRedis,
  redisUtils
};