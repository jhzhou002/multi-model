<template>
  <div class="api-logs">
    <div class="page-header">
      <h2>API调用日志</h2>
      <p>查看系统API调用记录，监控性能和成本</p>
    </div>
    
    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="stats-card-content">
            <h3>{{ totalCalls }}</h3>
            <p>总调用次数</p>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
            <el-icon><SuccessFilled /></el-icon>
          </div>
          <div class="stats-card-content">
            <h3>{{ successRate }}%</h3>
            <p>成功率</p>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="stats-card-content">
            <h3>{{ averageResponseTime }}ms</h3>
            <p>平均响应时间</p>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stats-card-content">
            <h3>${{ totalCost.toFixed(4) }}</h3>
            <p>总成本</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 筛选工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="filters.provider" placeholder="API提供商" clearable @change="loadLogs">
          <el-option label="全部" value="" />
          <el-option label="DeepSeek" value="deepseek" />
          <el-option label="Kimi" value="kimi" />
        </el-select>
        
        <el-select v-model="filters.status" placeholder="状态码" clearable @change="loadLogs">
          <el-option label="全部" value="" />
          <el-option label="成功 (200)" value="200" />
          <el-option label="客户端错误 (4xx)" value="4xx" />
          <el-option label="服务器错误 (5xx)" value="5xx" />
        </el-select>
        
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          @change="loadLogs"
          style="width: 400px"
        />
      </div>
      
      <div class="toolbar-right">
        <el-button @click="loadLogs" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        
        <el-button type="primary" @click="exportLogs">
          <el-icon><Download /></el-icon>
          导出日志
        </el-button>
        
        <el-button type="danger" @click="clearLogs">
          <el-icon><Delete /></el-icon>
          清理日志
        </el-button>
      </div>
    </div>
    
    <!-- 日志列表 -->
    <div class="custom-card">
      <el-table 
        :data="logs" 
        v-loading="loading"
        stripe
        @row-click="viewLogDetail"
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        
        <el-table-column prop="api_provider" label="提供商" width="100">
          <template #default="{ row }">
            <el-tag :type="getProviderTagType(row.api_provider)">
              {{ getProviderText(row.api_provider) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="endpoint" label="端点" width="150">
          <template #default="{ row }">
            <code class="endpoint-code">{{ row.endpoint }}</code>
          </template>
        </el-table-column>
        
        <el-table-column prop="status_code" label="状态码" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status_code)" size="small">
              {{ row.status_code || 'N/A' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="response_time_ms" label="响应时间" width="120">
          <template #default="{ row }">
            <span :class="getResponseTimeClass(row.response_time_ms)">
              {{ row.response_time_ms || 0 }}ms
            </span>
          </template>
        </el-table-column>
        
        <el-table-column label="Token使用" width="120">
          <template #default="{ row }">
            <div class="token-usage">
              <div class="token-item">
                <span class="token-label">输入:</span>
                <span class="token-value">{{ row.request_tokens || 0 }}</span>
              </div>
              <div class="token-item">
                <span class="token-label">输出:</span>
                <span class="token-value">{{ row.response_tokens || 0 }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="cost" label="成本" width="100">
          <template #default="{ row }">
            <span class="cost-value">
              ${{ (row.cost || 0).toFixed(4) }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="error_message" label="错误信息" min-width="200">
          <template #default="{ row }">
            <span v-if="row.error_message" class="error-text">
              {{ row.error_message.substring(0, 50) }}{{ row.error_message.length > 50 ? '...' : '' }}
            </span>
            <span v-else class="success-text">成功</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="调用时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="text" 
              size="small" 
              @click.stop="viewLogDetail(row)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[20, 50, 100, 200]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadLogs"
          @current-change="loadLogs"
        />
      </div>
    </div>
    
    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="API调用详情"
      width="80%"
      :before-close="closeDetailDialog"
    >
      <div v-if="currentLog" class="log-detail">
        <!-- 基本信息 -->
        <div class="detail-section">
          <h4>基本信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">调用ID:</span>
              <span class="info-value">{{ currentLog.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">请求ID:</span>
              <span class="info-value">{{ currentLog.request_id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">API提供商:</span>
              <el-tag :type="getProviderTagType(currentLog.api_provider)">
                {{ getProviderText(currentLog.api_provider) }}
              </el-tag>
            </div>
            <div class="info-item">
              <span class="info-label">端点:</span>
              <code>{{ currentLog.endpoint }}</code>
            </div>
            <div class="info-item">
              <span class="info-label">状态码:</span>
              <el-tag :type="getStatusTagType(currentLog.status_code)">
                {{ currentLog.status_code || 'N/A' }}
              </el-tag>
            </div>
            <div class="info-item">
              <span class="info-label">响应时间:</span>
              <span :class="getResponseTimeClass(currentLog.response_time_ms)">
                {{ currentLog.response_time_ms || 0 }}ms
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">调用成本:</span>
              <span class="cost-value">${{ (currentLog.cost || 0).toFixed(6) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">调用时间:</span>
              <span>{{ formatDateTime(currentLog.created_at) }}</span>
            </div>
          </div>
        </div>
        
        <!-- Token使用 -->
        <div class="detail-section" v-if="currentLog.request_tokens || currentLog.response_tokens">
          <h4>Token使用情况</h4>
          <div class="token-stats">
            <div class="token-stat">
              <span class="token-stat-label">请求Token:</span>
              <span class="token-stat-value">{{ currentLog.request_tokens || 0 }}</span>
            </div>
            <div class="token-stat">
              <span class="token-stat-label">响应Token:</span>
              <span class="token-stat-value">{{ currentLog.response_tokens || 0 }}</span>
            </div>
            <div class="token-stat">
              <span class="token-stat-label">总计Token:</span>
              <span class="token-stat-value">{{ (currentLog.request_tokens || 0) + (currentLog.response_tokens || 0) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 请求数据 -->
        <div class="detail-section" v-if="currentLog.request_data">
          <h4>请求数据</h4>
          <pre class="json-content">{{ formatJSON(currentLog.request_data) }}</pre>
        </div>
        
        <!-- 响应数据 -->
        <div class="detail-section" v-if="currentLog.response_data">
          <h4>响应数据</h4>
          <pre class="json-content">{{ formatJSON(currentLog.response_data) }}</pre>
        </div>
        
        <!-- 错误信息 -->
        <div class="detail-section" v-if="currentLog.error_message">
          <h4>错误信息</h4>
          <div class="error-content">{{ currentLog.error_message }}</div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDetailDialog">关闭</el-button>
          <el-button type="primary" @click="copyLogData">复制数据</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Connection, 
  SuccessFilled, 
  Timer, 
  Money, 
  Refresh, 
  Download, 
  Delete 
} from '@element-plus/icons-vue'

export default {
  name: 'ApiLogs',
  components: {
    Connection,
    SuccessFilled,
    Timer,
    Money,
    Refresh,
    Download,
    Delete
  },
  setup() {
    // 响应式数据
    const loading = ref(false)
    const detailDialogVisible = ref(false)
    const currentLog = ref(null)
    const dateRange = ref([])
    
    const logs = ref([])
    const stats = ref({
      totalCalls: 0,
      successCalls: 0,
      totalResponseTime: 0,
      totalCost: 0
    })
    
    const filters = reactive({
      provider: '',
      status: ''
    })
    
    const pagination = reactive({
      page: 1,
      size: 20,
      total: 0
    })
    
    // 计算属性
    const totalCalls = computed(() => stats.value.totalCalls)
    const successRate = computed(() => {
      if (stats.value.totalCalls === 0) return 0
      return Math.round((stats.value.successCalls / stats.value.totalCalls) * 100)
    })
    const averageResponseTime = computed(() => {
      if (stats.value.totalCalls === 0) return 0
      return Math.round(stats.value.totalResponseTime / stats.value.totalCalls)
    })
    const totalCost = computed(() => stats.value.totalCost)
    
    // 方法
    const loadLogs = async () => {
      loading.value = true
      try {
        // 模拟API调用 - 实际项目中这里应该调用真实的API
        const mockLogs = generateMockLogs()
        logs.value = mockLogs.slice((pagination.page - 1) * pagination.size, pagination.page * pagination.size)
        pagination.total = mockLogs.length
        
        // 计算统计数据
        calculateStats(mockLogs)
        
      } catch (error) {
        ElMessage.error('加载日志失败')
      } finally {
        loading.value = false
      }
    }
    
    const generateMockLogs = () => {
      const providers = ['deepseek', 'kimi']
      const endpoints = ['/chat/completions']
      const statusCodes = [200, 400, 500]
      
      return Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        request_id: `req_${Math.random().toString(36).substr(2, 8)}`,
        api_provider: providers[Math.floor(Math.random() * providers.length)],
        endpoint: endpoints[0],
        request_data: {
          model: Math.random() > 0.5 ? 'deepseek-reasoner' : 'kimi-thinking-preview',
          messages: [{ role: 'user', content: '生成一道数学题...' }]
        },
        response_data: Math.random() > 0.8 ? null : { choices: [{ message: { content: '题目内容...' } }] },
        request_tokens: Math.floor(Math.random() * 1000) + 100,
        response_tokens: Math.floor(Math.random() * 2000) + 200,
        response_time_ms: Math.floor(Math.random() * 5000) + 500,
        status_code: statusCodes[Math.floor(Math.random() * statusCodes.length)],
        error_message: Math.random() > 0.8 ? 'API调用超时' : null,
        cost: Math.random() * 0.01,
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      }))
    }
    
    const calculateStats = (logData) => {
      stats.value.totalCalls = logData.length
      stats.value.successCalls = logData.filter(log => log.status_code === 200).length
      stats.value.totalResponseTime = logData.reduce((sum, log) => sum + (log.response_time_ms || 0), 0)
      stats.value.totalCost = logData.reduce((sum, log) => sum + (log.cost || 0), 0)
    }
    
    const viewLogDetail = (row) => {
      currentLog.value = row
      detailDialogVisible.value = true
    }
    
    const closeDetailDialog = () => {
      detailDialogVisible.value = false
      currentLog.value = null
    }
    
    const copyLogData = async () => {
      if (!currentLog.value) return
      
      const data = JSON.stringify(currentLog.value, null, 2)
      try {
        await navigator.clipboard.writeText(data)
        ElMessage.success('日志数据已复制到剪贴板')
      } catch (error) {
        ElMessage.error('复制失败')
      }
    }
    
    const exportLogs = () => {
      const csvContent = generateCSV(logs.value)
      downloadFile(csvContent, 'api_logs.csv', 'text/csv')
      ElMessage.success('日志导出成功')
    }
    
    const clearLogs = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要清理历史日志吗？此操作不可恢复。',
          '清理确认',
          {
            confirmButtonText: '确定清理',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        // 实际项目中这里应该调用清理API
        ElMessage.success('日志清理成功')
        loadLogs()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('清理失败')
        }
      }
    }
    
    // 工具方法
    const getProviderText = (provider) => {
      const providerMap = {
        deepseek: 'DeepSeek',
        kimi: 'Kimi'
      }
      return providerMap[provider] || provider
    }
    
    const getProviderTagType = (provider) => {
      const typeMap = {
        deepseek: 'primary',
        kimi: 'success'
      }
      return typeMap[provider] || ''
    }
    
    const getStatusTagType = (statusCode) => {
      if (statusCode >= 200 && statusCode < 300) return 'success'
      if (statusCode >= 400 && statusCode < 500) return 'warning'
      if (statusCode >= 500) return 'danger'
      return 'info'
    }
    
    const getResponseTimeClass = (responseTime) => {
      if (responseTime > 10000) return 'response-time-slow'
      if (responseTime > 5000) return 'response-time-medium'
      return 'response-time-fast'
    }
    
    const formatDateTime = (dateTime) => {
      if (!dateTime) return ''
      return new Date(dateTime).toLocaleString('zh-CN')
    }
    
    const formatJSON = (data) => {
      if (typeof data === 'string') {
        try {
          return JSON.stringify(JSON.parse(data), null, 2)
        } catch {
          return data
        }
      }
      return JSON.stringify(data, null, 2)
    }
    
    const generateCSV = (data) => {
      const headers = ['ID', '提供商', '端点', '状态码', '响应时间(ms)', '请求Token', '响应Token', '成本($)', '调用时间', '错误信息']
      const csvRows = [headers.join(',')]
      
      data.forEach(log => {
        const row = [
          log.id,
          getProviderText(log.api_provider),
          log.endpoint,
          log.status_code || '',
          log.response_time_ms || 0,
          log.request_tokens || 0,
          log.response_tokens || 0,
          (log.cost || 0).toFixed(6),
          formatDateTime(log.created_at),
          log.error_message || ''
        ]
        csvRows.push(row.map(field => `"${field}"`).join(','))
      })
      
      return csvRows.join('\n')
    }
    
    const downloadFile = (content, filename, mimeType = 'text/plain') => {
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
    
    // 生命周期
    onMounted(() => {
      loadLogs()
    })
    
    return {
      loading,
      detailDialogVisible,
      currentLog,
      dateRange,
      logs,
      filters,
      pagination,
      totalCalls,
      successRate,
      averageResponseTime,
      totalCost,
      loadLogs,
      viewLogDetail,
      closeDetailDialog,
      copyLogData,
      exportLogs,
      clearLogs,
      getProviderText,
      getProviderTagType,
      getStatusTagType,
      getResponseTimeClass,
      formatDateTime,
      formatJSON
    }
  }
}
</script>

<style scoped>
.api-logs {
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

.stats-overview {
  margin-bottom: 24px;
}

.endpoint-code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: #f5f7fa;
  padding: 2px 4px;
  border-radius: 3px;
}

.token-usage {
  font-size: 12px;
}

.token-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.token-label {
  color: #909399;
}

.token-value {
  font-weight: 600;
}

.cost-value {
  font-weight: 600;
  color: #e6a23c;
}

.error-text {
  color: #f56c6c;
}

.success-text {
  color: #67c23a;
}

.response-time-fast {
  color: #67c23a;
}

.response-time-medium {
  color: #e6a23c;
}

.response-time-slow {
  color: #f56c6c;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 16px 0;
}

.log-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-weight: 600;
  color: #606266;
  min-width: 80px;
}

.info-value {
  color: #303133;
}

.token-stats {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.token-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.token-stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.token-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #409eff;
}

.json-content {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
  max-height: 300px;
}

.error-content {
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 12px;
  border-radius: 6px;
  color: #dc2626;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .token-stats {
    flex-direction: column;
    gap: 12px;
  }
}
</style>