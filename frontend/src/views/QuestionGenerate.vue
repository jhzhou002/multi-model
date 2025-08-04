<template>
  <div class="question-generate">
    <div class="page-header">
      <h2>题目生成</h2>
      <p>基于AI技术自动生成高质量的数学题目</p>
    </div>
    
    <el-row :gutter="24">
      <!-- 左侧：生成表单 -->
      <el-col :span="10">
        <div class="custom-card">
          <div class="card-header">
            <h3 class="card-title">生成参数配置</h3>
          </div>
          <div class="card-body">
            <el-form
              ref="generateFormRef"
              :model="generateForm"
              :rules="generateRules"
              label-width="100px"
              label-position="top"
            >
              <el-form-item label="题目类型" prop="type">
                <el-select 
                  v-model="generateForm.type" 
                  placeholder="请选择题目类型"
                  style="width: 100%"
                >
                  <el-option label="选择题" value="choice">
                    <div class="option-item">
                      <span>选择题</span>
                      <el-tag size="small" type="primary">A/B/C/D</el-tag>
                    </div>
                  </el-option>
                  <el-option label="填空题" value="blank">
                    <div class="option-item">
                      <span>填空题</span>
                      <el-tag size="small" type="success">填空</el-tag>
                    </div>
                  </el-option>
                  <el-option label="解答题" value="solution">
                    <div class="option-item">
                      <span>解答题</span>
                      <el-tag size="small" type="warning">计算过程</el-tag>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item label="知识点" prop="knowledgePoint">
                <el-select
                  v-model="generateForm.knowledgePoint"
                  placeholder="请选择知识点"
                  style="width: 100%"
                  filterable
                >
                  <el-option-group
                    v-for="category in knowledgePointsByCategory"
                    :key="category.name"
                    :label="category.name"
                  >
                    <el-option
                      v-for="kp in category.points"
                      :key="kp.code"
                      :label="kp.name"
                      :value="kp.code"
                    />
                  </el-option-group>
                </el-select>
              </el-form-item>
              
              <el-form-item label="难度等级" prop="difficulty">
                <el-radio-group v-model="generateForm.difficulty">
                  <el-radio :label="1">
                    <div class="difficulty-option">
                      <span>1星</span>
                      <small>基础</small>
                    </div>
                  </el-radio>
                  <el-radio :label="2">
                    <div class="difficulty-option">
                      <span>2星</span>
                      <small>简单</small>
                    </div>
                  </el-radio>
                  <el-radio :label="3">
                    <div class="difficulty-option">
                      <span>3星</span>
                      <small>中等</small>
                    </div>
                  </el-radio>
                  <el-radio :label="4">
                    <div class="difficulty-option">
                      <span>4星</span>
                      <small>较难</small>
                    </div>
                  </el-radio>
                  <el-radio :label="5">
                    <div class="difficulty-option">
                      <span>5星</span>
                      <small>困难</small>
                    </div>
                  </el-radio>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="自定义要求">
                <el-input
                  v-model="generateForm.customPrompt"
                  type="textarea"
                  :rows="3"
                  placeholder="输入特殊要求或限制条件（可选）"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
              
              <el-form-item>
                <div class="button-group">
                  <el-button 
                    type="primary" 
                    @click="generateQuestion"
                    :loading="isGenerating"
                    :disabled="isGenerating"
                    size="large"
                  >
                    <el-icon><MagicStick /></el-icon>
                    {{ isGenerating ? '生成中...' : '开始生成' }}
                  </el-button>
                  
                  <el-button @click="resetForm" :disabled="isGenerating">
                    <el-icon><RefreshRight /></el-icon>
                    重置
                  </el-button>
                </div>
              </el-form-item>
            </el-form>
          </div>
        </div>
        
        <!-- 生成历史 -->
        <div class="custom-card" style="margin-top: 20px;">
          <div class="card-header">
            <h3 class="card-title">最近生成记录</h3>
            <el-button type="text" size="small" @click="loadRecentGenerations">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
          <div class="card-body">
            <div class="generation-history">
              <div
                v-for="item in recentGenerations"
                :key="item.requestId"
                class="history-item"
                @click="checkGenerationStatus(item.requestId)"
              >
                <div class="history-item-header">
                  <el-tag size="small" :type="getTypeTagType(item.type)">
                    {{ getTypeText(item.type) }}
                  </el-tag>
                  <span class="history-time">{{ formatTime(item.timestamp) }}</span>
                </div>
                <div class="history-item-content">
                  <span>{{ item.knowledgePoint }}</span>
                  <el-rate :model-value="item.difficulty" disabled size="small" />
                </div>
                <div class="history-item-status">
                  <el-tag size="small" :type="getStatusTagType(item.status)">
                    {{ getStatusText(item.status) }}
                  </el-tag>
                </div>
              </div>
              
              <div v-if="recentGenerations.length === 0" class="empty-state">
                <el-icon class="empty-state-icon"><DocumentCopy /></el-icon>
                <p class="empty-state-text">暂无生成记录</p>
              </div>
            </div>
          </div>
        </div>
      </el-col>
      
      <!-- 右侧：生成结果和状态 -->
      <el-col :span="14">
        <!-- 生成状态 -->
        <div class="custom-card" v-if="currentRequestId">
          <div class="card-header">
            <h3 class="card-title">生成状态</h3>
            <el-tag size="small" type="info">{{ currentRequestId }}</el-tag>
          </div>
          <div class="card-body">
            <div class="generation-status">
              <el-steps :active="currentStep" align-center>
                <el-step title="提交请求" />
                <el-step title="AI生成" />
                <el-step title="质量审核" />
                <el-step title="完成" />
              </el-steps>
              
              <div class="status-details" v-if="generationStatus">
                <div v-if="generationStatus.status === 'processing'" class="processing-status">
                  <el-icon class="spinning"><Loading /></el-icon>
                  <span>正在生成题目，预计需要15-30秒...</span>
                </div>
                
                <div v-else-if="generationStatus.status === 'completed'" class="completed-status">
                  <el-result icon="success" title="生成成功" sub-title="题目已成功生成并通过AI审核">
                    <template #extra>
                      <el-button type="primary" @click="viewGeneratedQuestion">查看题目</el-button>
                      <el-button @click="continueGenerate">继续生成</el-button>
                    </template>
                  </el-result>
                </div>
                
                <div v-else-if="generationStatus.status === 'error'" class="error-status">
                  <el-result icon="error" title="生成失败" :sub-title="generationStatus.error">
                    <template #extra>
                      <el-button type="primary" @click="retryGeneration">重新生成</el-button>
                    </template>
                  </el-result>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 题目预览 -->
        <div class="custom-card" v-if="previewQuestion" style="margin-top: 20px;">
          <div class="card-header">
            <h3 class="card-title">题目预览</h3>
            <div class="button-group">
              <el-button type="text" size="small" @click="copyQuestion">
                <el-icon><DocumentCopy /></el-icon>
                复制
              </el-button>
              <el-button type="text" size="small" @click="exportQuestion">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </div>
          </div>
          <div class="card-body">
            <div class="question-preview">
              <!-- 题目信息 -->
              <div class="question-meta">
                <el-tag :type="getTypeTagType(previewQuestion.type)">
                  {{ getTypeText(previewQuestion.type) }}
                </el-tag>
                <span class="knowledge-point">{{ previewQuestion.knowledgePoint }}</span>
                <el-rate :model-value="previewQuestion.difficulty" disabled size="small" />
              </div>
              
              <!-- 题目内容 -->
              <div class="question-content" v-html="renderMath(previewQuestion.question)"></div>
              
              <!-- 选项（仅选择题） -->
              <div v-if="previewQuestion.type === 'choice' && previewQuestion.options" class="question-options">
                <div
                  v-for="(option, key) in previewQuestion.options"
                  :key="key"
                  class="question-option"
                >
                  <strong>{{ key }}.</strong> {{ option }}
                </div>
              </div>
              
              <!-- 答案 -->
              <div class="question-answer">
                <strong>答案：</strong>{{ previewQuestion.answer }}
              </div>
              
              <!-- 解析 -->
              <div class="question-solution">
                <div class="solution-title">解析：</div>
                <div v-html="renderMath(previewQuestion.solution)"></div>
              </div>
              
              <!-- 审核结果 -->
              <div v-if="previewQuestion.review" class="review-result">
                <div class="review-header">
                  <h4>AI审核结果</h4>
                  <el-tag :type="previewQuestion.review.passed ? 'success' : 'danger'">
                    {{ previewQuestion.review.passed ? '通过' : '不通过' }}
                  </el-tag>
                </div>
                
                <div class="review-scores">
                  <div class="score-item">
                    <div class="score-value">{{ previewQuestion.review.score || 0 }}</div>
                    <div class="score-label">总体评分</div>
                  </div>
                </div>
                
                <div v-if="previewQuestion.review.issues && previewQuestion.review.issues.length > 0" class="review-issues">
                  <h5>发现的问题：</h5>
                  <div
                    v-for="(issue, index) in previewQuestion.review.issues"
                    :key="index"
                    class="issue-item"
                  >
                    <span class="issue-severity" :class="issue.severity">{{ issue.severity }}</span>
                    <span>{{ issue.description }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 使用说明 -->
        <div class="custom-card" v-if="!currentRequestId && !previewQuestion" style="margin-top: 20px;">
          <div class="card-header">
            <h3 class="card-title">使用说明</h3>
          </div>
          <div class="card-body">
            <div class="usage-guide">
              <el-steps direction="vertical">
                <el-step title="选择题目类型" description="选择要生成的题目类型：选择题、填空题或解答题" />
                <el-step title="设定知识点和难度" description="选择相应的知识点和难度等级（1-5星）" />
                <el-step title="添加自定义要求" description="可选：输入特殊要求或限制条件" />
                <el-step title="开始生成" description="点击生成按钮，AI将自动生成并审核题目" />
                <el-step title="查看和使用" description="查看生成的题目，支持复制、导出和进一步编辑" />
              </el-steps>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  MagicStick, 
  RefreshRight, 
  Refresh, 
  DocumentCopy, 
  Download,
  Loading
} from '@element-plus/icons-vue'

export default {
  name: 'QuestionGenerate',
  components: {
    MagicStick,
    RefreshRight,
    Refresh,
    DocumentCopy,
    Download,
    Loading
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    
    // 表单引用
    const generateFormRef = ref()
    
    // 响应式数据
    const generateForm = reactive({
      type: '',
      knowledgePoint: '',
      difficulty: 3,
      customPrompt: ''
    })
    
    const currentRequestId = ref('')
    const currentStep = ref(0)
    const generationStatus = ref(null)
    const previewQuestion = ref(null)
    const recentGenerations = ref([])
    const statusCheckTimer = ref(null)
    
    // 表单验证规则
    const generateRules = {
      type: [
        { required: true, message: '请选择题目类型', trigger: 'change' }
      ],
      knowledgePoint: [
        { required: true, message: '请选择知识点', trigger: 'change' }
      ],
      difficulty: [
        { required: true, message: '请选择难度等级', trigger: 'change' }
      ]
    }
    
    // 计算属性
    const isGenerating = computed(() => store.getters['question/isGeneratingQuestion'])
    const knowledgePoints = computed(() => store.getters['knowledgePoint/knowledgePoints'])
    
    // 按分类分组的知识点
    const knowledgePointsByCategory = computed(() => {
      const grouped = {}
      knowledgePoints.value.forEach(kp => {
        if (!grouped[kp.category]) {
          grouped[kp.category] = []
        }
        grouped[kp.category].push(kp)
      })
      
      return Object.keys(grouped).map(category => ({
        name: category,
        points: grouped[category]
      }))
    })
    
    // 方法
    const generateQuestion = async () => {
      try {
        await generateFormRef.value.validate()
        
        const response = await store.dispatch('question/generateQuestion', generateForm)
        currentRequestId.value = response.data.requestId
        currentStep.value = 1
        
        ElMessage.success('题目生成请求已提交，正在处理...')
        
        // 开始检查生成状态
        startStatusCheck()
        
      } catch (error) {
        if (error.errors) {
          ElMessage.error('请完善表单信息')
        } else {
          ElMessage.error('生成请求失败: ' + (error.message || '未知错误'))
        }
      }
    }
    
    const startStatusCheck = () => {
      statusCheckTimer.value = setInterval(async () => {
        try {
          const response = await store.dispatch('question/getQuestionStatus', currentRequestId.value)
          generationStatus.value = response.data
          
          if (response.data.status === 'auto_pass' || response.data.status === 'ai_reject') {
            currentStep.value = 4
            clearInterval(statusCheckTimer.value)
            
            // 设置预览数据
            if (response.data.preview) {
              previewQuestion.value = {
                ...generateForm,
                ...response.data.preview,
                review: response.data.review
              }
            }
            
            ElMessage.success('题目生成完成！')
            
          } else if (response.data.status === 'error') {
            currentStep.value = 1
            clearInterval(statusCheckTimer.value)
            ElMessage.error('题目生成失败')
          } else {
            currentStep.value = 2
          }
          
        } catch (error) {
          console.error('检查生成状态失败:', error)
        }
      }, 3000) // 每3秒检查一次
    }
    
    const resetForm = () => {
      generateFormRef.value?.resetFields()
      generateForm.type = ''
      generateForm.knowledgePoint = ''
      generateForm.difficulty = 3
      generateForm.customPrompt = ''
    }
    
    const continueGenerate = () => {
      currentRequestId.value = ''
      currentStep.value = 0
      generationStatus.value = null
      previewQuestion.value = null
      clearInterval(statusCheckTimer.value)
    }
    
    const retryGeneration = () => {
      generateQuestion()
    }
    
    const viewGeneratedQuestion = () => {
      if (generationStatus.value && generationStatus.value.id) {
        router.push({
          name: 'QuestionReview',
          query: { id: generationStatus.value.id }
        })
      }
    }
    
    const copyQuestion = async () => {
      if (!previewQuestion.value) return
      
      const text = `题目：${previewQuestion.value.question}\n\n答案：${previewQuestion.value.answer}\n\n解析：${previewQuestion.value.solution}`
      
      try {
        await navigator.clipboard.writeText(text)
        ElMessage.success('题目内容已复制到剪贴板')
      } catch (error) {
        ElMessage.error('复制失败，请手动复制')
      }
    }
    
    const exportQuestion = () => {
      // 导出功能实现
      ElMessage.info('导出功能开发中...')
    }
    
    const loadRecentGenerations = () => {
      // 从localStorage加载最近的生成记录
      const saved = localStorage.getItem('recentGenerations')
      if (saved) {
        recentGenerations.value = JSON.parse(saved).slice(0, 5)
      }
    }
    
    const saveGeneration = (data) => {
      const saved = JSON.parse(localStorage.getItem('recentGenerations') || '[]')
      saved.unshift({
        ...data,
        timestamp: new Date().toISOString()
      })
      localStorage.setItem('recentGenerations', JSON.stringify(saved.slice(0, 10)))
      loadRecentGenerations()
    }
    
    const checkGenerationStatus = async (requestId) => {
      try {
        const response = await store.dispatch('question/getQuestionStatus', requestId)
        
        if (response.data.preview) {
          previewQuestion.value = {
            ...response.data.preview,
            review: response.data.review
          }
        }
        
      } catch (error) {
        ElMessage.error('获取题目详情失败')
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
        processing: '处理中',
        auto_pass: '自动通过',
        ai_reject: 'AI拒绝',
        confirmed: '已确认',
        error: '失败'
      }
      return statusMap[status] || status
    }
    
    const getStatusTagType = (status) => {
      const statusMap = {
        processing: 'info',
        auto_pass: 'success',
        ai_reject: 'warning',
        confirmed: 'primary',
        error: 'danger'
      }
      return statusMap[status] || ''
    }
    
    const formatTime = (timestamp) => {
      if (!timestamp) return ''
      return new Date(timestamp).toLocaleString('zh-CN')
    }
    
    const renderMath = (text) => {
      // 简单的LaTeX渲染（实际项目中建议使用MathJax或KaTeX）
      if (!text) return ''
      return text.replace(/\$\$(.+?)\$\$/g, '<span class="math-formula">$1</span>')
                .replace(/\$(.+?)\$/g, '<span class="math-formula">$1</span>')
    }
    
    // 生命周期
    onMounted(async () => {
      // 加载知识点数据
      await store.dispatch('knowledgePoint/getKnowledgePoints')
      loadRecentGenerations()
    })
    
    onUnmounted(() => {
      if (statusCheckTimer.value) {
        clearInterval(statusCheckTimer.value)
      }
    })
    
    return {
      generateFormRef,
      generateForm,
      generateRules,
      currentRequestId,
      currentStep,
      generationStatus,
      previewQuestion,
      recentGenerations,
      isGenerating,
      knowledgePointsByCategory,
      generateQuestion,
      resetForm,
      continueGenerate,
      retryGeneration,
      viewGeneratedQuestion,
      copyQuestion,
      exportQuestion,
      loadRecentGenerations,
      checkGenerationStatus,
      getTypeText,
      getTypeTagType,
      getStatusText,
      getStatusTagType,
      formatTime,
      renderMath
    }
  }
}
</script>

<style scoped>
.question-generate {
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

.option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.difficulty-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.difficulty-option small {
  color: #909399;
  font-size: 11px;
}

.generation-status {
  text-align: center;
  padding: 20px 0;
}

.processing-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
  color: #409eff;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.generation-history {
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.history-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-time {
  font-size: 12px;
  color: #909399;
}

.history-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.history-item-status {
  text-align: right;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.knowledge-point {
  font-size: 14px;
  color: #606266;
}

.usage-guide {
  padding: 20px 0;
}

/* 表单样式增强 */
:deep(.el-radio-group) {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

:deep(.el-radio) {
  margin-right: 0;
  white-space: nowrap;
}

/* 步骤条样式 */
:deep(.el-steps--horizontal .el-step__line) {
  top: 11px;
  left: 48px;
  right: 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .el-col:first-child {
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  :deep(.el-radio-group) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .question-meta {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .history-item-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>