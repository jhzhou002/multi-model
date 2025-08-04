#!/bin/bash

# API测试脚本

API_BASE="http://localhost:3000/api"

echo "🧪 测试高中数学AI题库API..."

# 测试健康检查
echo "1. 健康检查..."
curl -s "$API_BASE/../health" | jq '.' || echo "健康检查失败"

echo -e "\n2. 获取知识点列表..."
curl -s "$API_BASE/knowledge-points" | jq '.data[0:3]' || echo "获取知识点失败"

echo -e "\n3. 获取统计信息..."
curl -s "$API_BASE/questions/statistics" | jq '.data' || echo "获取统计信息失败"

echo -e "\n4. 测试题目生成..."
curl -s -X POST "$API_BASE/questions/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "choice",
    "knowledgePoint": "func_basic",
    "difficulty": 3,
    "customPrompt": "关于一次函数的基础题目"
  }' | jq '.' || echo "题目生成测试失败"

echo -e "\n5. 获取原始题目列表..."
curl -s "$API_BASE/questions/raw?page=1&size=5" | jq '.data.questions[0:2]' || echo "获取原始题目失败"

echo -e "\n✅ API测试完成"