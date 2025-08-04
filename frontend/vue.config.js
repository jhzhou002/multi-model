const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  
  // 开发服务器配置
  devServer: {
    port: 8080,
    host: '0.0.0.0',
    open: true, // 自动打开浏览器
    proxy: {
      // 代理API请求到后端
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // 生产构建配置
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
  
  // 关闭ESLint检查（可选，如果遇到ESLint问题）
  lintOnSave: false,
  
  // CSS配置
  css: {
    extract: process.env.NODE_ENV === 'production'
  }
})