#!/bin/bash

# 高中数学AI题库自动生成模块 - 停止开发服务脚本

echo "🛑 正在停止开发服务..."

# 读取PID文件
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ 后端服务已停止 (PID: $BACKEND_PID)"
    fi
    rm -f .backend.pid
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "✅ 前端服务已停止 (PID: $FRONTEND_PID)"
    fi
    rm -f .frontend.pid
fi

# 强制终止可能残留的进程
pkill -f "node.*app.js"
pkill -f "vue-cli-service serve"

echo "🎯 所有服务已停止"