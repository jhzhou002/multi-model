<template>
  <div class="question-review">
    <div class="page-header">
      <h2>题目审核</h2>
      <p>审核AI生成的题目，确认质量后加入题库</p>
    </div>
    
    <!-- 筛选工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="filters.status" placeholder="审核状态" clearable @change="loadQuestions">
          <el-option label="全部" value="" />
          <el-option label="自动通过" value="auto_pass" />
          <el-option label="AI拒绝" value="ai_reject" />
          <el-option label="已确认" value="confirmed" />
          <el-option label="人工拒绝" value="human_reject" />
        </el-select>
        
        <el-select v-model="filters.type" placeholder="题目类型" clearable @change="loadQuestions">
          <el-option label="全部" value="" />
          <el-option label="选择题" value="choice" />
          <el-option label="填空题" value="blank" />
          <el-option label="解答题" value="solution" />
        </el-select>
        
        <el-select v-model="filters.difficulty" placeholder="难度等级" clearable @change="loadQuestions">
          <el-option label="全部" value="" />
          <el-option label="1星" :value="1" />
          <el-option label="2星" :value="2" />
          <el-option label="3星" :value="3" />
          <el-option label="4星" :value="4" />
          <el-option label="5星" :value="5" />
        </el-select>
      </div>
      
      <div class="toolbar-right">
        <el-button @click="loadQuestions" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    
    <!-- 题目列表 -->
    <div class="custom-card">
      <el-table 
        :data="questions" 
        v-loading="loading"
        stripe
        @row-click="viewQuestionDetail"
        style="width: 100%"
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
        
        <el-table-column prop="difficulty" label="难度" width="100">
          <template #default="{ row }">
            <el-rate 
              :model-value="row.difficulty" 
              disabled 
              size="small"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="题目预览" min-width="200">
          <template #default="{ row }">
            <div class="question-preview-text">
              {{ getQuestionPreview(row) }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="AI评分" width="100">
          <template #default="{ row }">
            <span v-if="row.kimi_check && row.kimi_check.overall_score">
              {{ row.kimi_check.overall_score }}分
            </span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="生成时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="button-group">
              <el-button 
                type="text" 
                size="small" 
                @click.stop="viewQuestionDetail(row)"
              >
                查看详情
              </el-button>
              
              <el-button 
                v-if="row.status !== 'confirmed'"
                type="text" 
                size="small"
                @click.stop="confirmQuestion(row)"
              >
                确认
              </el-button>
              
              <el-button 
                v-if="row.status !== 'human_reject'"
                type="text" 
                size="small"
                @click.stop="rejectQuestion(row)"
              >
                拒绝
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadQuestions"
          @current-change="loadQuestions"
        />
      </div>
    </div>
    
    <!-- 题目详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="题目详情"
      width="80%"
      :before-close="closeDetailDialog"
    >
      <div v-if="currentQuestion" class="question-detail">
        <!-- 题目基本信息 -->
        <div class="question-meta">
          <el-tag :type="getTypeTagType(currentQuestion.type)">
            {{ getTypeText(currentQuestion.type) }}
          </el-tag>
          <span class="knowledge-point">{{ currentQuestion.knowledge_point }}</span>
          <el-rate :model-value="currentQuestion.difficulty" disabled size="small" />
          <el-tag :type="getStatusTagType(currentQuestion.status)">
            {{ getStatusText(currentQuestion.status) }}
          </el-tag>
        </div>
        
        <!-- 题目内容 -->
        <div class="question-content">
          <h4>题目内容：</h4>
          <div class="content-text" v-html="renderMath(currentQuestion.deepseek_raw?.question)"></div>
          
          <!-- 选项（仅选择题） -->
          <div v-if="currentQuestion.type === 'choice' && currentQuestion.deepseek_raw?.options" class="question-options">
            <h4>选项：</h4>
            <div
              v-for="(option, key) in currentQuestion.deepseek_raw.options"
              :key="key"
              class="question-option"
            >
              <strong>{{ key }}.</strong> {{ option }}
            </div>
          </div>
          
          <!-- 答案 -->
          <div class="question-answer">
            <h4>答案：</h4>
            <div class="answer-content">{{ currentQuestion.deepseek_raw?.answer }}</div>
          </div>
          
          <!-- 解析 -->
          <div class="question-solution">
            <h4>解析：</h4>
            <div class="solution-content" v-html="renderMath(currentQuestion.deepseek_raw?.solution)"></div>
          </div>
        </div>
        
        <!-- AI审核结果 -->
        <div v-if="currentQuestion.kimi_check" class="review-result">
          <h4>AI审核结果：</h4>
          <div class="review-header">
            <el-tag :type="currentQuestion.kimi_check.passed ? 'success' : 'danger'">
              {{ currentQuestion.kimi_check.passed ? '通过' : '不通过' }}
            </el-tag>
            <span class="review-score">总体评分：{{ currentQuestion.kimi_check.overall_score || 0 }}分</span>
          </div>
          
          <div class="review-scores">
            <div class="score-item">
              <div class="score-value">{{ currentQuestion.kimi_check.logic_score || 0 }}</div>
              <div class="score-label">逻辑正确性</div>
            </div>
            <div class="score-item">
              <div class="score-value">{{ currentQuestion.kimi_check.calculation_score || 0 }}</div>
              <div class="score-label">计算准确性</div>
            </div>
            <div class="score-item">
              <div class="score-value">{{ currentQuestion.kimi_check.format_score || 0 }}</div>
              <div class="score-label">格式规范性</div>
            </div>
          </div>
          
          <!-- 审核问题 -->
          <div v-if="currentQuestion.kimi_check.issues && currentQuestion.kimi_check.issues.length > 0" class="review-issues">
            <h5>发现的问题：</h5>
            <div
              v-for="(issue, index) in currentQuestion.kimi_check.issues"
              :key="index"
              class="issue-item"
            >
              <span class="issue-severity" :class="issue.severity">{{ issue.severity }}</span>
              <span>{{ issue.description }}</span>
            </div>
          </div>
          
          <!-- 建议 -->
          <div v-if="currentQuestion.kimi_check.suggestions && currentQuestion.kimi_check.suggestions.length > 0" class="review-suggestions">
            <h5>改进建议：</h5>
            <ul>
              <li v-for="(suggestion, index) in currentQuestion.kimi_check.suggestions" :key="index">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
        
        <!-- 人工反馈 -->
        <div v-if="currentQuestion.human_feedback" class="human-feedback">
          <h4>人工反馈：</h4>
          <div class="feedback-content">{{ currentQuestion.human_feedback }}</div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDetailDialog">关闭</el-button>
          <el-button 
            v-if="currentQuestion && currentQuestion.status !== 'confirmed'"
            type="primary" 
            @click="confirmQuestionFromDialog"
          >
            确认题目
          </el-button>
          <el-button 
            v-if="currentQuestion && currentQuestion.status !== 'human_reject'"
            type="danger" 
            @click="rejectQuestionFromDialog"
          >
            拒绝题目
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

export default {
  name: 'QuestionReview',
  components: {
    Refresh
  },
  setup() {
    const store = useStore()
    const route = useRoute()
    
    // 响应式数据
    const loading = ref(false)
    const detailDialogVisible = ref(false)
    const currentQuestion = ref(null)
    
    const filters = reactive({
      status: '',
      type: '',
      difficulty: ''
    })
    
    const pagination = reactive({
      page: 1,
      size: 20,
      total: 0
    })
    
    // 计算属性
    const questions = computed(() => store.getters['question/rawQuestions'])
    
    // 方法
    const loadQuestions = async () => {
      loading.value = true
      try {
        const params = {
          ...filters,
          page: pagination.page,
          size: pagination.size
        }
        
        const response = await store.dispatch('question/getRawQuestions', params)
        pagination.total = response.data.pagination.total
      } catch (error) {
        ElMessage.error('加载题目列表失败')
      } finally {
        loading.value = false
      }
    }
    
    const viewQuestionDetail = async (row) => {
      try {
        await store.dispatch('question/getRawQuestionById', row.id)
        currentQuestion.value = store.getters['question/currentQuestion']
        detailDialogVisible.value = true
      } catch (error) {
        ElMessage.error('获取题目详情失败')
      }
    }
    
    const closeDetailDialog = () => {
      detailDialogVisible.value = false
      currentQuestion.value = null
      store.dispatch('question/clearCurrentQuestion')
    }
    
    const confirmQuestion = async (row) => {
      try {
        const { value: feedback } = await ElMessageBox.prompt(
          '请输入确认意见（可选）',
          '确认题目',
          {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            inputType: 'textarea',
            inputPlaceholder: '输入确认意见...'
          }
        )
        
        await store.dispatch('question/confirmQuestion', {
          id: row.id,
          humanFeedback: feedback || ''
        })
        
        ElMessage.success('题目确认成功')
        loadQuestions()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('确认题目失败')
        }
      }
    }
    
    const rejectQuestion = async (row) => {
      try {
        const { value: feedback } = await ElMessageBox.prompt(
          '请输入拒绝原因',
          '拒绝题目',
          {
            confirmButtonText: '拒绝',
            cancelButtonText: '取消',
            inputType: 'textarea',
            inputPlaceholder: '请说明拒绝原因...',
            inputValidator: (value) => {
              if (!value || !value.trim()) {
                return '请输入拒绝原因'
              }
              return true
            }
          }
        )
        
        await store.dispatch('question/rejectQuestion', {
          id: row.id,
          humanFeedback: feedback
        })
        
        ElMessage.success('题目已拒绝')
        loadQuestions()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('拒绝题目失败')
        }
      }
    }
    
    const confirmQuestionFromDialog = () => {
      if (currentQuestion.value) {
        confirmQuestion(currentQuestion.value).then(() => {
          closeDetailDialog()
        })
      }
    }
    
    const rejectQuestionFromDialog = () => {
      if (currentQuestion.value) {
        rejectQuestion(currentQuestion.value).then(() => {
          closeDetailDialog()
        })
      }
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
    
    const getQuestionPreview = (row) => {
      if (row.deepseek_raw && row.deepseek_raw.question) {
        return row.deepseek_raw.question.substring(0, 50) + '...'
      }
      return '暂无内容'
    }
    
    const formatDateTime = (dateTime) => {
      if (!dateTime) return ''
      return new Date(dateTime).toLocaleString('zh-CN')
    }
    
    const renderMath = (text) => {
      if (!text) return ''
      return text.replace(/\$\$(.+?)\$\$/g, '<span class="math-formula">$1</span>')
                .replace(/\$(.+?)\$/g, '<span class="math-formula">$1</span>')
    }
    
    // 生命周期
    onMounted(() => {
      // 如果URL中有id参数，直接查看该题目详情
      if (route.query.id) {
        const question = { id: parseInt(route.query.id) }
        viewQuestionDetail(question)
      }
      
      loadQuestions()
    })
    
    return {
      loading,
      detailDialogVisible,
      currentQuestion,
      filters,
      pagination,
      questions,
      loadQuestions,
      viewQuestionDetail,
      closeDetailDialog,
      confirmQuestion,
      rejectQuestion,
      confirmQuestionFromDialog,
      rejectQuestionFromDialog,
      getTypeText,
      getTypeTagType,
      getStatusText,
      getStatusTagType,
      getQuestionPreview,
      formatDateTime,
      renderMath
    }
  }
}
</script>

<style scoped>
.question-review {
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

.question-preview-text {
  color: #606266;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 16px 0;
}

.question-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.knowledge-point {
  font-size: 14px;
  color: #606266;
}

.question-content h4,
.review-result h4,
.human-feedback h4 {
  margin: 16px 0 8px 0;
  color: #303133;
  font-size: 16px;
}

.content-text,
.answer-content,
.solution-content {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.question-options {
  margin: 12px 0;
}

.question-option {
  padding: 6px 0;
  font-size: 14px;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.review-score {
  font-weight: 600;
  color: #409eff;
}

.review-suggestions ul {
  margin: 8px 0;
  padding-left: 20px;
}

.review-suggestions li {
  margin: 4px 0;
  color: #606266;
}

.human-feedback .feedback-content {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  padding: 12px;
  border-radius: 6px;
  color: #856404;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.text-muted {
  color: #c0c4cc;
}

/* 表格行点击效果 */
:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>