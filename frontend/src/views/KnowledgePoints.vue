<template>
  <div class="knowledge-points">
    <div class="page-header">
      <h2>知识点管理</h2>
      <p>管理高中数学知识点体系，查看各知识点的题目生成统计</p>
    </div>
    
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="selectedCategory" placeholder="按分类筛选" clearable @change="filterByCategory">
          <el-option label="全部分类" value="" />
          <el-option
            v-for="category in categories"
            :key="category"
            :label="category"
            :value="category"
          />
        </el-select>
        
        <el-switch
          v-model="showStatistics"
          active-text="显示统计"
          inactive-text="隐藏统计"
        />
      </div>
      
      <div class="toolbar-right">
        <el-button @click="loadData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新增知识点
        </el-button>
      </div>
    </div>
    
    <!-- 统计概览 -->
    <div v-if="showStatistics" class="stats-overview">
      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <el-icon><Collection /></el-icon>
          </div>
          <div class="stats-card-content">
            <h3>{{ knowledgePoints.length }}</h3>
            <p>知识点总数</p>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
            <el-icon><Folder /></el-icon>
          </div>
          <div class="stats-card-content">
            <h3>{{ categories.length }}</h3>
            <p>分类数量</p>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stats-card-content">
            <h3>{{ totalGeneratedQuestions }}</h3>
            <p>总生成题目</p>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
            <el-icon><SuccessFilled /></el-icon>
          </div>
          <div class="stats-card-content">
            <h3>{{ averageSuccessRate }}%</h3>
            <p>平均成功率</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 知识点列表 -->
    <div class="custom-card">
      <el-table 
        :data="filteredKnowledgePoints" 
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="code" label="代码" width="120" />
        
        <el-table-column prop="name" label="名称" width="150" />
        
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)">
              {{ row.category }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="description" label="描述" min-width="200">
          <template #default="{ row }">
            <span class="description-text">{{ row.description || '暂无描述' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="sort_order" label="排序" width="80" />
        
        <el-table-column v-if="showStatistics" label="题目统计" width="150">
          <template #default="{ row }">
            <div class="stats-cell">
              <div class="stat-item">
                <span class="stat-label">总数:</span>
                <span class="stat-value">{{ getStatistic(row.code, 'total_generated') }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">已确认:</span>
                <span class="stat-value success">{{ getStatistic(row.code, 'confirmed_count') }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column v-if="showStatistics" label="成功率" width="100">
          <template #default="{ row }">
            <div class="success-rate">
              {{ getSuccessRate(row.code) }}%
            </div>
          </template>
        </el-table-column>
        
        <el-table-column v-if="showStatistics" label="平均质量" width="100">
          <template #default="{ row }">
            <div class="quality-score">
              {{ getQualityScore(row.code) }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="is_active" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="button-group">
              <el-button 
                type="text" 
                size="small" 
                @click="viewStatistics(row)"
              >
                详细统计
              </el-button>
              
              <el-button 
                type="text" 
                size="small"
                @click="editKnowledgePoint(row)"
              >
                编辑
              </el-button>
              
              <el-button 
                type="text" 
                size="small"
                @click="toggleStatus(row)"
                :class="row.is_active ? 'danger-text' : 'success-text'"
              >
                {{ row.is_active ? '禁用' : '启用' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 创建/编辑知识点对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑知识点' : '新增知识点'"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="代码" prop="code">
          <el-input 
            v-model="form.code" 
            :disabled="isEditing"
            placeholder="输入知识点代码，如: func_basic"
          />
        </el-form-item>
        
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="输入知识点名称" />
        </el-form-item>
        
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="选择分类" style="width: 100%">
            <el-option label="必修" value="必修" />
            <el-option label="选修" value="选修" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="输入知识点描述"
          />
        </el-form-item>
        
        <el-form-item label="排序权重">
          <el-input-number 
            v-model="form.sortOrder" 
            :min="0" 
            :max="999"
            placeholder="数字越小排序越靠前"
          />
        </el-form-item>
        
        <el-form-item label="状态">
          <el-switch
            v-model="form.isActive"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            {{ isEditing ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 统计详情对话框 -->
    <el-dialog
      v-model="statsDialogVisible"
      title="知识点详细统计"
      width="800px"
    >
      <div v-if="currentStats" class="stats-detail">
        <div class="stats-header">
          <h3>{{ currentStats.name }}</h3>
          <el-tag :type="getCategoryTagType(currentStats.category)">
            {{ currentStats.category }}
          </el-tag>
        </div>
        
        <div class="stats-charts">
          <div class="chart-item">
            <h4>题目生成情况</h4>
            <div class="chart-stats">
              <div class="chart-stat">
                <div class="stat-number">{{ currentStats.total_generated || 0 }}</div>
                <div class="stat-label">总生成数</div>
              </div>
              <div class="chart-stat">
                <div class="stat-number success">{{ currentStats.confirmed_count || 0 }}</div>
                <div class="stat-label">已确认</div>
              </div>
              <div class="chart-stat">
                <div class="stat-number warning">{{ currentStats.auto_pass_count || 0 }}</div>
                <div class="stat-label">自动通过</div>
              </div>
              <div class="chart-stat">
                <div class="stat-number danger">{{ currentStats.ai_reject_count || 0 }}</div>
                <div class="stat-label">AI拒绝</div>
              </div>
            </div>
          </div>
          
          <div class="chart-item">
            <h4>质量指标</h4>
            <div class="quality-indicators">
              <div class="indicator">
                <span class="indicator-label">成功率:</span>
                <span class="indicator-value">{{ getSuccessRate(currentStats.code) }}%</span>
              </div>
              <div class="indicator">
                <span class="indicator-label">平均质量评分:</span>
                <span class="indicator-value">{{ getQualityScore(currentStats.code) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Refresh, 
  Plus, 
  Collection, 
  Folder, 
  Document, 
  SuccessFilled 
} from '@element-plus/icons-vue'

export default {
  name: 'KnowledgePoints',
  components: {
    Refresh,
    Plus,
    Collection,
    Folder,
    Document,
    SuccessFilled
  },
  setup() {
    const store = useStore()
    
    // 响应式数据
    const loading = ref(false)
    const submitting = ref(false)
    const dialogVisible = ref(false)
    const statsDialogVisible = ref(false)
    const isEditing = ref(false)
    const showStatistics = ref(true)
    const selectedCategory = ref('')
    const currentStats = ref(null)
    const formRef = ref()
    
    const form = reactive({
      code: '',
      name: '',
      category: '',
      description: '',
      sortOrder: 0,
      isActive: true
    })
    
    const formRules = {
      code: [
        { required: true, message: '请输入知识点代码', trigger: 'blur' },
        { pattern: /^[a-z_]+$/, message: '代码只能包含小写字母和下划线', trigger: 'blur' }
      ],
      name: [
        { required: true, message: '请输入知识点名称', trigger: 'blur' }
      ],
      category: [
        { required: true, message: '请选择分类', trigger: 'change' }
      ]
    }
    
    // 计算属性
    const knowledgePoints = computed(() => store.getters['knowledgePoint/knowledgePoints'])
    const categories = computed(() => store.getters['knowledgePoint/categories'])
    const statistics = computed(() => store.getters['knowledgePoint/statistics'])
    
    const filteredKnowledgePoints = computed(() => {
      if (!selectedCategory.value) {
        return knowledgePoints.value
      }
      return knowledgePoints.value.filter(kp => kp.category === selectedCategory.value)
    })
    
    const totalGeneratedQuestions = computed(() => {
      return statistics.value.reduce((sum, stat) => sum + (parseInt(stat.total_generated) || 0), 0)
    })
    
    const averageSuccessRate = computed(() => {
      if (statistics.value.length === 0) return 0
      const rates = statistics.value.map(stat => {
        const total = parseInt(stat.total_generated) || 0
        const confirmed = parseInt(stat.confirmed_count) || 0
        return total > 0 ? (confirmed / total * 100) : 0
      })
      const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length
      return Math.round(average)
    })
    
    // 方法
    const loadData = async () => {
      loading.value = true
      try {
        await Promise.all([
          store.dispatch('knowledgePoint/getKnowledgePoints'),
          store.dispatch('knowledgePoint/getCategories'),
          showStatistics.value ? store.dispatch('knowledgePoint/getStatistics') : Promise.resolve()
        ])
      } catch (error) {
        ElMessage.error('加载数据失败')
      } finally {
        loading.value = false
      }
    }
    
    const filterByCategory = () => {
      // 分类筛选已通过计算属性实现
    }
    
    const showCreateDialog = () => {
      resetForm()
      isEditing.value = false
      dialogVisible.value = true
    }
    
    const editKnowledgePoint = (row) => {
      form.code = row.code
      form.name = row.name
      form.category = row.category
      form.description = row.description || ''
      form.sortOrder = row.sort_order || 0
      form.isActive = row.is_active
      isEditing.value = true
      dialogVisible.value = true
    }
    
    const resetForm = () => {
      form.code = ''
      form.name = ''
      form.category = ''
      form.description = ''
      form.sortOrder = 0
      form.isActive = true
    }
    
    const closeDialog = () => {
      dialogVisible.value = false
      resetForm()
      formRef.value?.clearValidate()
    }
    
    const submitForm = async () => {
      try {
        await formRef.value.validate()
        submitting.value = true
        
        if (isEditing.value) {
          await store.dispatch('knowledgePoint/updateKnowledgePoint', {
            id: getCurrentKnowledgePointId(),
            data: {
              name: form.name,
              category: form.category,
              description: form.description,
              sortOrder: form.sortOrder,
              isActive: form.isActive
            }
          })
          ElMessage.success('知识点更新成功')
        } else {
          await store.dispatch('knowledgePoint/createKnowledgePoint', form)
          ElMessage.success('知识点创建成功')
        }
        
        closeDialog()
        loadData()
      } catch (error) {
        if (error.errors) {
          ElMessage.error('请完善表单信息')
        } else {
          ElMessage.error(isEditing.value ? '更新失败' : '创建失败')
        }
      } finally {
        submitting.value = false
      }
    }
    
    const getCurrentKnowledgePointId = () => {
      const kp = knowledgePoints.value.find(k => k.code === form.code)
      return kp ? kp.id : null
    }
    
    const toggleStatus = async (row) => {
      try {
        const action = row.is_active ? '禁用' : '启用'
        await ElMessageBox.confirm(
          `确定要${action}知识点"${row.name}"吗？`,
          '状态变更确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        await store.dispatch('knowledgePoint/updateKnowledgePoint', {
          id: row.id,
          data: { isActive: !row.is_active }
        })
        
        ElMessage.success(`知识点${action}成功`)
        loadData()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('状态更新失败')
        }
      }
    }
    
    const viewStatistics = (row) => {
      currentStats.value = {
        ...row,
        ...getStatisticData(row.code)
      }
      statsDialogVisible.value = true
    }
    
    // 工具方法
    const getCategoryTagType = (category) => {
      return category === '必修' ? '' : 'success'
    }
    
    const getStatistic = (code, field) => {
      const stat = statistics.value.find(s => s.code === code)
      return stat ? (parseInt(stat[field]) || 0) : 0
    }
    
    const getStatisticData = (code) => {
      return statistics.value.find(s => s.code === code) || {}
    }
    
    const getSuccessRate = (code) => {
      const total = getStatistic(code, 'total_generated')
      const confirmed = getStatistic(code, 'confirmed_count')
      if (total === 0) return 0
      return Math.round((confirmed / total) * 100)
    }
    
    const getQualityScore = (code) => {
      const stat = statistics.value.find(s => s.code === code)
      if (stat && stat.avg_quality_score) {
        return parseFloat(stat.avg_quality_score).toFixed(1)
      }
      return '--'
    }
    
    // 生命周期
    onMounted(() => {
      loadData()
    })
    
    return {
      loading,
      submitting,
      dialogVisible,
      statsDialogVisible,
      isEditing,
      showStatistics,
      selectedCategory,
      currentStats,
      formRef,
      form,
      formRules,
      knowledgePoints,
      categories,
      statistics,
      filteredKnowledgePoints,
      totalGeneratedQuestions,
      averageSuccessRate,
      loadData,
      filterByCategory,
      showCreateDialog,
      editKnowledgePoint,
      closeDialog,
      submitForm,
      toggleStatus,
      viewStatistics,
      getCategoryTagType,
      getStatistic,
      getSuccessRate,
      getQualityScore
    }
  }
}
</script>

<style scoped>
.knowledge-points {
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

.description-text {
  color: #606266;
  font-size: 14px;
}

.stats-cell {
  font-size: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.stat-label {
  color: #909399;
}

.stat-value {
  font-weight: 600;
}

.stat-value.success {
  color: #67c23a;
}

.success-rate {
  font-weight: 600;
  color: #409eff;
}

.quality-score {
  font-weight: 600;
  color: #67c23a;
}

.danger-text {
  color: #f56c6c !important;
}

.success-text {
  color: #67c23a !important;
}

.stats-detail {
  padding: 20px 0;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.stats-header h3 {
  margin: 0;
  color: #303133;
}

.stats-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.chart-item h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
}

.chart-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.chart-stat {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-number.success {
  color: #67c23a;
}

.stat-number.warning {
  color: #e6a23c;
}

.stat-number.danger {
  color: #f56c6c;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.quality-indicators {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.indicator:last-child {
  margin-bottom: 0;
}

.indicator-label {
  color: #606266;
}

.indicator-value {
  font-weight: 600;
  color: #409eff;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-charts {
    grid-template-columns: 1fr;
  }
  
  .chart-stats {
    grid-template-columns: 1fr 1fr;
  }
}
</style>