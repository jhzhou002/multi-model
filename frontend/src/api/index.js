import axios from 'axios'
import { ElMessage } from 'element-plus'

// 请求缓存机制
const requestCache = new Map()
const CACHE_TIME = 30000 // 30秒缓存

// 防抖函数
const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

// 创建axios实例
const request = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? '/api' : (process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000/api'),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 生成缓存键
const getCacheKey = (config) => {
  return `${config.method}_${config.url}_${JSON.stringify(config.params || {})}`
}

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 检查缓存（仅对GET请求）
    if (config.method === 'get') {
      const cacheKey = getCacheKey(config)
      const cached = requestCache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
        // 返回缓存的Promise
        return Promise.reject({
          isCache: true,
          data: cached.data
        })
      }
    }
    
    // 在此处可以添加认证token等
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    const { data, config } = response
    
    // 缓存GET请求的响应
    if (config.method === 'get') {
      const cacheKey = getCacheKey(config)
      requestCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })
    }
    
    // 如果响应包含success字段且为false，视为业务错误
    if (data.success === false) {
      ElMessage.error(data.message || '操作失败')
      return Promise.reject(new Error(data.message || '操作失败'))
    }
    
    return data
  },
  error => {
    // 处理缓存情况
    if (error.isCache) {
      return Promise.resolve(error.data)
    }
    
    console.error('响应错误:', error)
    
    let message = '网络错误'
    let showMessage = true
    
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 400:
          message = data.message || '请求参数错误'
          break
        case 401:
          message = '未授权访问'
          break
        case 403:
          message = '禁止访问'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 429:
          message = '请求过于频繁，请稍后再试'
          // 对于429错误，我们可能不需要每次都显示错误消息
          showMessage = !error.config.__isRetryRequest
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = data.message || `服务器错误 (${status})`
      }
    } else if (error.request) {
      message = '网络连接失败，请检查后端服务是否启动'
    } else {
      message = error.message || '未知错误'
    }
    
    if (showMessage) {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

// API接口定义
const api = {
  // 题目相关接口
  question: {
    // 生成题目
    generate: (data) => request.post('/questions/generate', data),
    
    // 获取题目状态
    getStatus: (requestId) => request.get(`/questions/status/${requestId}`),
    
    // 获取原始题目列表
    getRawQuestions: (params) => request.get('/questions/raw', { params }),
    
    // 获取原始题目详情
    getRawQuestionById: (id) => request.get(`/questions/raw/${id}`),
    
    // 确认题目
    confirm: (id, data) => request.post(`/questions/${id}/confirm`, data),
    
    // 拒绝题目
    reject: (id, data) => request.post(`/questions/${id}/reject`, data),
    
    // 获取正式题目列表
    getQuestions: (params) => request.get('/questions', { params }),
    
    // 获取统计信息
    getStatistics: () => request.get('/questions/statistics')
  },
  
  // 知识点相关接口
  knowledgePoint: {
    // 获取所有知识点
    getAll: (params) => request.get('/knowledge-points', { params }),
    
    // 获取知识点分类
    getCategories: () => request.get('/knowledge-points/categories'),
    
    // 获取知识点统计
    getStatistics: () => request.get('/knowledge-points/statistics'),
    
    // 根据分类获取知识点
    getByCategory: (category) => request.get(`/knowledge-points/category/${category}`),
    
    // 根据ID获取知识点
    getById: (id) => request.get(`/knowledge-points/${id}`),
    
    // 根据代码获取知识点
    getByCode: (code) => request.get(`/knowledge-points/code/${code}`),
    
    // 创建知识点
    create: (data) => request.post('/knowledge-points', data),
    
    // 更新知识点
    update: (id, data) => request.put(`/knowledge-points/${id}`, data),
    
    // 删除知识点
    delete: (id) => request.delete(`/knowledge-points/${id}`)
  }
}

export default api