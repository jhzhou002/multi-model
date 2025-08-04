<template>
  <div class="dashboard">
    <div class="page-header">
      <h2>数据看板</h2>
      <p>高中数学AI题库系统运营概览</p>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stats-card">
        <div class="stats-card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stats-card-content">
          <h3>{{ questionStats.total_raw || 0 }}</h3>
          <p>总生成题目</p>
        </div>
      </div>
      
      <div class="stats-card">
        <div class="stats-card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
          <el-icon><SuccessFilled /></el-icon>
        </div>
        <div class="stats-card-content">
          <h3>{{ questionStats.confirmed || 0 }}</h3>
          <p>已确认题目</p>
        </div>
      </div>
      
      <div class="stats-card">
        <div class="stats-card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
          <el-icon><View /></el-icon>
        </div>
        <div class="stats-card-content">
          <h3>{{ questionStats.auto_pass || 0 }}</h3>
          <p>AI自动通过</p>
        </div>
      </div>
      
      <div class="stats-card">
        <div class="stats-card-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
          <el-icon><Money /></el-icon>
        </div>
        <div class="stats-card-content">
          <h3>${{ totalCost.toFixed(4) }}</h3>
          <p>API调用成本</p>
        </div>
      </div>
    </div>
    
    <!-- 系统状态 -->
    <div class="system-status">
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="custom-card">
            <div class="card-header">
              <h3 class="card-title">题目生成状态</h3>
              <el-button size="small" @click="refreshStats">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
            <div class="card-body">
              <div class="status-item">
                <span class="status-label">AI审核通过率</span>
                <span class="status-value success">{{ aiPassRate }}%</span>
              </div>
              <div class="status-item">
                <span class="status-label">人工确认率</span>
                <span class="status-value primary">{{ successRate }}%</span>
              </div>
              <div class="status-item">
                <span class="status-label">等待审核</span>
                <span class="status-value warning">{{ (questionStats.auto_pass || 0) + (questionStats.ai_reject || 0) }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">已拒绝</span>
                <span class="status-value danger">{{ questionStats.human_reject || 0 }}</span>
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="12">
          <div class="custom-card">
            <div class="card-header">
              <h3 class="card-title">API调用统计</h3>
              <el-tag size="small" type="info">24小时</el-tag>
            </div>
            <div class="card-body">
              <div class="api-stats">
                <div class="api-stat-item">
                  <div class="api-stat-header">
                    <span>DeepSeek API</span>
                    <el-tag size="small" :type="deepseekStats.successful_calls > 0 ? 'success' : 'info'">
                      {{ deepseekStats.successful_calls || 0 }}/{{ deepseekStats.total_calls || 0 }}
                    </el-tag>
                  </div>
                  <div class="api-stat-details">
                    <span>平均响应时间: {{ Math.round(deepseekStats.avg_response_time || 0) }}ms</span>
                    <span>Token消耗: {{ (deepseekStats.total_request_tokens || 0) + (deepseekStats.total_response_tokens || 0) }}</span>
                    <span>成本: ${{ (deepseekStats.total_cost || 0).toFixed(4) }}</span>
                  </div>
                </div>
                
                <div class="api-stat-item">
                  <div class="api-stat-header">
                    <span>Kimi API</span>
                    <el-tag size="small" :type="kimiStats.successful_reviews > 0 ? 'success' : 'info'">
                      {{ kimiStats.successful_reviews || 0 }}/{{ kimiStats.total_reviews || 0 }}
                    </el-tag>
                  </div>
                  <div class="api-stat-details">
                    <span>平均响应时间: {{ Math.round(kimiStats.avg_response_time || 0) }}ms</span>
                    <span>Token消耗: {{ (kimiStats.total_request_tokens || 0) + (kimiStats.total_response_tokens || 0) }}</span>
                    <span>成本: ${{ (kimiStats.total_cost || 0).toFixed(4) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
    
    <!-- 最新题目 -->
    <div class="recent-questions">
      <div class="custom-card">
        <div class="card-header">
          <h3 class="card-title">最新生成题目</h3>
          <router-link to="/question-review">
            <el-button type="text">查看全部</el-button>
          </router-link>
        </div>
        <div class="card-body">
          <el-table 
            :data="recentQuestions" 
            v-loading="loading"
            stripe
            @row-click="viewQuestionDetail"
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="getTypeTagType(row.type)">
                  {{ getTypeText(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="knowledge_point" label="知识点" width="120" />
            <el-table-column prop="difficulty" label="难度" width="80">
              <template #default="{ row }">
                <el-rate 
                  :model-value="row.difficulty" 
                  disabled 
                  size="small"
                  :colors="{ 2: '#99A9BF', 4: '#F7BA2A', 5: '#FF9900' }"
                />
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="getStatusTagType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="生成时间" width="160">
              <template #default="{ row }">
                {{ formatDateTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button 
                  type="text" 
                  size="small" 
                  @click.stop="viewQuestionDetail(row)"
                >
                  查看详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { 
  Document, 
  SuccessFilled, 
  View, 
  Money, 
  Refresh 
} from '@element-plus/icons-vue'

export default {
  name: 'Dashboard',
  components: {
    Document,
    SuccessFilled,
    View,
    Money,
    Refresh
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    
    // 响应式数据
    const loading = ref(false)
    const recentQuestions = ref([])
    
    // 计算属性
    const questionStats = computed(() => store.getters['statistics/questionStats'])
    const deepseekStats = computed(() => store.getters['statistics/deepseekStats'])
    const kimiStats = computed(() => store.getters['statistics/kimiStats'])
    const totalCost = computed(() => store.getters['statistics/totalCost'])
    const successRate = computed(() => store.getters['statistics/successRate'])
    const aiPassRate = computed(() => store.getters['statistics/aiPassRate'])
    
    // 方法
    const loadDashboardData = async () => {
      loading.value = true
      try {
        // 延迟加载，避免频繁请求
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 加载统计数据和最新题目
        const [statsResult, questionsResult] = await Promise.allSettled([
          store.dispatch('statistics/getSystemStatistics'),
          store.dispatch('question/getRawQuestions', {
            page: 1,
            size: 10
          })
        ])
        
        // 处理题目数据
        if (questionsResult.status === 'fulfilled') {
          recentQuestions.value = questionsResult.value.data?.questions || []
        }
        
        // 如果统计数据失败，仍然继续显示页面
        if (statsResult.status === 'rejected') {
          console.warn('统计数据加载失败，使用默认数据')
        }
        
      } catch (error) {
        console.error('加载仪表板数据失败:', error)
        ElMessage.error('仪表板数据加载失败，请刷新页面重试')
      } finally {
        loading.value = false
      }
    }
    
    const refreshStats = async () => {
      await store.dispatch('statistics/refreshStatistics')
    }
    
    const viewQuestionDetail = (row) => {
      router.push({
        name: 'QuestionReview',
        query: { id: row.id }
      })
    }
    
    // 工具方法
    const getTypeText = (type) => {
      const typeMap = {
        choice: '选择题',
        blank: '填空题',
        solution: '解答题'
      }
      return typeMap[type] || type
    }
    
    const getTypeTagType = (type) => {
      const typeMap = {
        choice: '',
        blank: 'success',
        solution: 'warning'
      }
      return typeMap[type] || ''
    }
    
    const getStatusText = (status) => {
      const statusMap = {
        auto_pass: '自动通过',
        ai_reject: 'AI拒绝',
        confirmed: '已确认',
        human_reject: '人工拒绝'
      }
      return statusMap[status] || status
    }
    
    const getStatusTagType = (status) => {
      const statusMap = {
        auto_pass: 'success',
        ai_reject: 'warning',
        confirmed: 'primary',
        human_reject: 'danger'
      }
      return statusMap[status] || ''
    }
    
    const formatDateTime = (dateTime) => {
      if (!dateTime) return ''
      return new Date(dateTime).toLocaleString('zh-CN')
    }
    
    // 生命周期
    onMounted(() => {
      loadDashboardData()
      
      // 定时刷新数据
      const timer = setInterval(() => {
        refreshStats()
      }, 30000) // 30秒刷新一次
      
      // 组件销毁时清除定时器
      onUnmounted(() => {
        clearInterval(timer)
      })
    })
    
    return {
      loading,
      recentQuestions,
      questionStats,
      deepseekStats,
      kimiStats,
      totalCost,
      successRate,
      aiPassRate,
      refreshStats,
      viewQuestionDetail,
      getTypeText,
      getTypeTagType,
      getStatusText,
      getStatusTagType,
      formatDateTime
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.system-status {
  margin: 24px 0;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  color: #606266;
  font-size: 14px;
}

.status-value {
  font-weight: 600;
  font-size: 16px;
}

.status-value.success {
  color: #67c23a;
}

.status-value.primary {
  color: #409eff;
}

.status-value.warning {
  color: #e6a23c;
}

.status-value.danger {
  color: #f56c6c;
}

.api-stats {
  space-y: 16px;
}

.api-stat-item {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.api-stat-item:last-child {
  border-bottom: none;
}

.api-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
  color: #303133;
}

.api-stat-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.recent-questions {
  margin-top: 24px;
}

/* 表格行点击效果 */
:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .api-stat-details {
    font-size: 11px;
  }
  
  .status-item {
    padding: 8px 0;
  }
  
  .api-stat-item {
    padding: 12px 0;
  }
}
</style>