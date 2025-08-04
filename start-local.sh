#!/bin/bash

# 本地开发环境启动脚本 - 处理Windows和跨平台兼容性

echo "🚀 启动高中数学AI题库自动生成模块 (本地版本)..."

# 检查当前目录
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ 请在项目根目录下运行此脚本"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18.x 或更高版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，当前版本: $(node -v)，需要 18.x 或更高版本"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ npm 版本: $(npm -v)"

# 检查端口是否被占用
check_port() {
    local port=$1
    local service=$2
    
    # 跨平台端口检查
    if command -v netstat &> /dev/null; then
        if netstat -an 2>/dev/null | grep -q ":$port "; then
            echo "⚠️  端口 $port 被占用，请停止占用该端口的进程或修改 $service 配置"
            return 1
        fi
    elif command -v lsof &> /dev/null; then
        if lsof -i :$port &> /dev/null; then
            echo "⚠️  端口 $port 被占用，请停止占用该端口的进程或修改 $service 配置"
            return 1
        fi
    else
        echo "⚠️  无法检查端口占用情况，请确保端口 $port 未被占用"
    fi
    return 0
}

check_port 3000 "后端服务"
check_port 8080 "前端服务"

# 启动后端
echo "📦 准备后端服务..."
cd backend

# 检查并安装依赖
if [ ! -d "node_modules" ]; then
    echo "📥 安装后端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败，请检查网络连接或npm配置"
        exit 1
    fi
else
    echo "✅ 后端依赖已安装"
fi

# 检查环境配置文件
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 复制环境配置文件..."
        cp .env.example .env
        echo "⚠️  请检查并修改 backend/.env 中的配置"
    else
        echo "❌ 环境配置文件不存在"
        exit 1
    fi
fi

# 启动后端服务
echo "🔧 启动后端服务..."
npm run dev &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查后端是否启动成功
backend_started=false
for i in {1..10}; do
    if curl -s -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ 后端服务启动成功 (PID: $BACKEND_PID)"
        backend_started=true
        break
    fi
    echo "   尝试连接后端服务... ($i/10)"
    sleep 2
done

if [ "$backend_started" = false ]; then
    echo "❌ 后端服务启动失败或无法访问"
    echo "   请检查以下内容："
    echo "   1. 数据库连接是否正常"
    echo "   2. 端口3000是否被占用"
    echo "   3. 环境变量配置是否正确"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 启动前端
echo "🎨 准备前端服务..."
cd ../frontend

# 检查并安装依赖
if [ ! -d "node_modules" ]; then
    echo "📥 安装前端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
else
    echo "✅ 前端依赖已安装"
fi

# 启动前端服务
echo "🎨 启动前端服务..."
npm run dev &
FRONTEND_PID=$!

# 等待前端启动
echo "⏳ 等待前端服务启动..."
sleep 3

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
echo "📚 使用说明："
echo "   1. 打开浏览器访问 http://localhost:8080"
echo "   2. 在题目生成页面配置参数并生成题目"
echo "   3. 在题目审核页面查看和管理生成的题目"
echo ""
echo "🔧 故障排除："
echo "   - 如果Redis连接失败，系统会自动降级运行"
echo "   - 如果数据库连接失败，请检查MySQL服务和配置"
echo "   - 查看API测试: ./test-api.sh"
echo ""
echo "⏹️   停止服务: Ctrl+C 或运行 ./stop-dev.sh"
echo ""

# 保存PID到文件
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# 等待用户中断
trap 'echo ""; echo "🛑 正在停止服务..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .backend.pid .frontend.pid; echo "✅ 服务已停止"; exit 0' INT

# 保持脚本运行
wait