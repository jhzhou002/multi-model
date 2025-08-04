<template>
  <div class="question-library">
    <div class="page-header">
      <h2>题目库</h2>
      <p>浏览已确认的高质量题目，支持导出和使用</p>
    </div>
    
    <!-- 搜索和筛选工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索题目内容..."
          prefix-icon="Search"
          clearable
          @keyup.enter="loadQuestions"
          style="width: 300px"
        />
        
        <el-select v-model="filters.type" placeholder="题目类型" clearable @change="loadQuestions">
          <el-option label="全部" value="" />
          <el-option label="选择题" value="choice" />
          <el-option label="填空题" value="blank" />
          <el-option label="解答题" value="solution" />
        </el-select>
        
        <el-select v-model="filters.knowledgePoint" placeholder="知识点" clearable @change="loadQuestions">
          <el-option label="全部" value="" />
          <el-option
            v-for="kp in knowledgePoints"
            :key="kp.code"
            :label="kp.name"
            :value="kp.code"
          />
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
        
        <el-button type="primary" @click="exportQuestions" :disabled="selectedQuestions.length === 0">
          <el-icon><Download /></el-icon>
          导出选中 ({{ selectedQuestions.length }})
        </el-button>
      </div>
    </div>
    
    <!-- 统计信息 -->
    <div class="stats-bar">
      <el-tag type="info">共 {{ pagination.total }} 道题目</el-tag>
      <el-tag v-if="filters.type" type="primary">{{ getTypeText(filters.type) }}</el-tag>
      <el-tag v-if="filters.knowledgePoint" type="success">{{ getKnowledgePointName(filters.knowledgePoint) }}</el-tag>
      <el-tag v-if="filters.difficulty" type="warning">{{ filters.difficulty }}星难度</el-tag>
    </div>
    
    <!-- 题目列表 -->
    <div class="custom-card">
      <el-table 
        :data="questions" 
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
        @row-click="viewQuestionDetail"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        
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
        
        <el-table-column label="题目预览" min-width="250">
          <template #default="{ row }">
            <div class="question-preview-text">
              {{ getQuestionPreview(row) }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="quality_score" label="质量评分" width="100">
          <template #default="{ row }">
            <span v-if="row.quality_score">
              {{ parseFloat(row.quality_score).toFixed(1) }}分
            </span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="usage_count" label="使用次数" width="100">
          <template #default="{ row }">
            {{ row.usage_count || 0 }}
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="入库时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150" fixed="right">
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
                type="text" 
                size="small"
                @click.stop="copyQuestion(row)"
              >
                复制
              </el-button>
              
              <el-button 
                type="text" 
                size="small"
                @click.stop="downloadSingleQuestion(row)"
              >
                下载
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
          :page-sizes="[20, 50, 100, 200]"
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
          <span v-if="currentQuestion.quality_score" class="quality-score">
            质量评分：{{ parseFloat(currentQuestion.quality_score).toFixed(1) }}分
          </span>
        </div>
        
        <!-- 题目内容 -->
        <div class="question-content">
          <h4>题目内容：</h4>
          <div class="content-text" v-html="renderMath(currentQuestion.question_text)"></div>
          
          <!-- 选项（仅选择题） -->
          <div v-if="currentQuestion.type === 'choice' && currentQuestion.options" class="question-options">
            <h4>选项：</h4>
            <div
              v-for="(option, key) in currentQuestion.options"
              :key="key"
              class="question-option"
            >
              <strong>{{ key }}.</strong> {{ option }}
            </div>
          </div>
          
          <!-- 答案 -->
          <div class="question-answer">
            <h4>答案：</h4>
            <div class="answer-content">{{ currentQuestion.correct_answer }}</div>
          </div>
          
          <!-- 解析 -->
          <div class="question-solution">
            <h4>解析：</h4>
            <div class="solution-content" v-html="renderMath(currentQuestion.solution)"></div>
          </div>
        </div>
        
        <!-- 使用统计 -->
        <div class="usage-stats">
          <h4>使用统计：</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">使用次数</span>
              <span class="stat-value">{{ currentQuestion.usage_count || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">反馈次数</span>
              <span class="stat-value">{{ currentQuestion.feedback_count || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">预计答题时间</span>
              <span class="stat-value">{{ currentQuestion.estimated_time || '--' }}分钟</span>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDetailDialog">关闭</el-button>
          <el-button type="primary" @click="copyQuestionFromDialog">复制题目</el-button>
          <el-button type="success" @click="downloadSingleQuestionFromDialog">下载题目</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { Refresh, Download, Search } from '@element-plus/icons-vue'

export default {
  name: 'QuestionLibrary',
  components: {
    Refresh,
    Download,
    Search
  },
  setup() {
    const store = useStore()
    
    // 响应式数据
    const loading = ref(false)
    const detailDialogVisible = ref(false)
    const currentQuestion = ref(null)
    const searchKeyword = ref('')
    const selectedQuestions = ref([])
    
    const filters = reactive({
      type: '',
      knowledgePoint: '',
      difficulty: ''
    })
    
    const pagination = reactive({
      page: 1,
      size: 20,
      total: 0
    })
    
    // 计算属性
    const questions = computed(() => store.getters['question/questions'])
    const knowledgePoints = computed(() => store.getters['knowledgePoint/knowledgePoints'])
    
    // 方法
    const loadQuestions = async () => {
      loading.value = true
      try {
        const params = {
          ...filters,
          keyword: searchKeyword.value,
          page: pagination.page,
          size: pagination.size
        }
        
        await store.dispatch('question/getQuestions', params)
      } catch (error) {
        ElMessage.error('加载题目列表失败')
      } finally {
        loading.value = false
      }
    }
    
    const handleSelectionChange = (selection) => {
      selectedQuestions.value = selection
    }
    
    const viewQuestionDetail = (row) => {
      currentQuestion.value = row
      detailDialogVisible.value = true
    }
    
    const closeDetailDialog = () => {
      detailDialogVisible.value = false
      currentQuestion.value = null
    }
    
    const copyQuestion = async (question) => {
      const text = formatQuestionForCopy(question)
      
      try {
        await navigator.clipboard.writeText(text)
        ElMessage.success('题目内容已复制到剪贴板')
      } catch (error) {
        ElMessage.error('复制失败，请手动复制')
      }
    }
    
    const copyQuestionFromDialog = () => {
      if (currentQuestion.value) {
        copyQuestion(currentQuestion.value)
      }
    }
    
    const downloadSingleQuestion = (question) => {
      const content = formatQuestionForExport([question])
      downloadFile(content, `question_${question.id}.txt`)
      ElMessage.success('题目下载成功')
    }
    
    const downloadSingleQuestionFromDialog = () => {
      if (currentQuestion.value) {
        downloadSingleQuestion(currentQuestion.value)
      }
    }
    
    const exportQuestions = () => {
      const content = formatQuestionForExport(selectedQuestions.value)
      downloadFile(content, `questions_export_${new Date().getTime()}.txt`)
      ElMessage.success(`成功导出 ${selectedQuestions.value.length} 道题目`)
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
    
    const getKnowledgePointName = (code) => {
      const kp = knowledgePoints.value.find(k => k.code === code)
      return kp ? kp.name : code
    }
    
    const getQuestionPreview = (row) => {
      if (row.question_text) {
        return row.question_text.substring(0, 80) + '...'
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
    
    const formatQuestionForCopy = (question) => {
      let text = `题目类型：${getTypeText(question.type)}\n`
      text += `知识点：${question.knowledge_point}\n`
      text += `难度：${'★'.repeat(question.difficulty)}\n\n`
      text += `题目：${question.question_text}\n\n`
      
      if (question.type === 'choice' && question.options) {
        text += '选项：\n'
        Object.entries(question.options).forEach(([key, value]) => {
          text += `${key}. ${value}\n`
        })
        text += '\n'
      }
      
      text += `答案：${question.correct_answer}\n\n`
      text += `解析：${question.solution}\n`
      
      return text
    }
    
    const formatQuestionForExport = (questions) => {
      let content = `高中数学题目导出\n`
      content += `导出时间：${new Date().toLocaleString('zh-CN')}\n`
      content += `题目数量：${questions.length} 道\n`
      content += `${'='.repeat(50)}\n\n`
      
      questions.forEach((question, index) => {
        content += `第 ${index + 1} 题\n`
        content += formatQuestionForCopy(question)
        content += `\n${'-'.repeat(30)}\n\n`
      })
      
      return content
    }
    
    const downloadFile = (content, filename) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
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
    onMounted(async () => {
      await store.dispatch('knowledgePoint/getKnowledgePoints')
      loadQuestions()
    })
    
    return {
      loading,
      detailDialogVisible,
      currentQuestion,
      searchKeyword,
      selectedQuestions,
      filters,
      pagination,
      questions,
      knowledgePoints,
      loadQuestions,
      handleSelectionChange,
      viewQuestionDetail,
      closeDetailDialog,
      copyQuestion,
      copyQuestionFromDialog,
      downloadSingleQuestion,
      downloadSingleQuestionFromDialog,
      exportQuestions,
      getTypeText,
      getTypeTagType,
      getKnowledgePointName,
      getQuestionPreview,
      formatDateTime,
      renderMath
    }
  }
}
</script>

<style scoped>
.question-library {
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

.stats-bar {
  margin: 16px 0;
  display: flex;
  gap: 8px;
  align-items: center;
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
  flex-wrap: wrap;
}

.knowledge-point {
  font-size: 14px;
  color: #606266;
}

.quality-score {
  font-size: 14px;
  font-weight: 600;
  color: #67c23a;
}

.question-content h4,
.usage-stats h4 {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #409eff;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 12px;
  }
  
  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: flex-start;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .question-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>