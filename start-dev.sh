#!/bin/bash

# 高中数学AI题库自动生成模块 - 开发环境启动脚本

echo "🚀 启动高中数学AI题库自动生成模块..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 20.x"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18.x 或更高版本"
    exit 1
fi

# 检查MySQL连接
echo "🔍 检查数据库连接..."
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL客户端未找到，请确保MySQL服务正在运行"
fi

# 检查Redis连接
echo "🔍 检查Redis连接..."
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis客户端未找到，缓存功能可能不可用"
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
fi

# 初始化数据库
echo "🗄️  初始化数据库..."
if [ -f "sql/init.sql" ]; then
    mysql -h 8.153.77.15 -u connect -p'Zhjh0704.' < sql/init.sql
    if [ $? -eq 0 ]; then
        echo "✅ 数据库初始化成功"
    else
        echo "⚠️  数据库初始化可能失败，请检查连接配置"
    fi
fi

# 启动后端服务
echo "🔧 启动后端服务..."
npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ 后端服务启动成功 (PID: $BACKEND_PID)"
else
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
fi

# 启动前端服务
echo "🎨 启动前端服务..."
npm run serve &
FRONTEND_PID=$!

echo ""
echo "🎉 启动完成！"
echo ""
echo "📋 服务信息："
echo "   后端API:     http://localhost:3000"
echo "   API文档:     http://localhost:3000/api/docs"
echo "   健康检查:    http://localhost:3000/health"
echo "   前端界面:    http://localhost:8080"
echo ""
echo "📝 进程信息："
echo "   后端PID:     $BACKEND_PID"
echo "   前端PID:     $FRONTEND_PID"
echo ""
echo "⏹️  停止服务: Ctrl+C 或运行 ./stop-dev.sh"
echo ""

# 保存PID到文件
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# 等待用户中断
trap 'echo ""; echo "🛑 正在停止服务..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .backend.pid .frontend.pid; echo "✅ 服务已停止"; exit 0' INT

# 保持脚本运行
wait