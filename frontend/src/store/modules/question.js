import api from '@/api'

const state = {
  // 题目生成相关
  generatingQuestion: false,
  currentRequestId: null,
  generationStatus: null,
  
  // 原始题目列表
  rawQuestions: [],
  rawQuestionsTotal: 0,
  rawQuestionsLoading: false,
  
  // 正式题目列表
  questions: [],
  questionsLoading: false,
  
  // 当前查看的题目详情
  currentQuestion: null,
  questionDetailLoading: false
}

const mutations = {
  // 题目生成相关
  SET_GENERATING_QUESTION(state, generating) {
    state.generatingQuestion = generating
  },
  
  SET_CURRENT_REQUEST_ID(state, requestId) {
    state.currentRequestId = requestId
  },
  
  SET_GENERATION_STATUS(state, status) {
    state.generationStatus = status
  },
  
  // 原始题目列表
  SET_RAW_QUESTIONS(state, questions) {
    state.rawQuestions = questions
  },
  
  SET_RAW_QUESTIONS_TOTAL(state, total) {
    state.rawQuestionsTotal = total
  },
  
  SET_RAW_QUESTIONS_LOADING(state, loading) {
    state.rawQuestionsLoading = loading
  },
  
  UPDATE_RAW_QUESTION_STATUS(state, { id, status, humanFeedback }) {
    const question = state.rawQuestions.find(q => q.id === id)
    if (question) {
      question.status = status
      if (humanFeedback) {
        question.human_feedback = humanFeedback
      }
    }
  },
  
  // 正式题目列表
  SET_QUESTIONS(state, questions) {
    state.questions = questions
  },
  
  SET_QUESTIONS_LOADING(state, loading) {
    state.questionsLoading = loading
  },
  
  // 题目详情
  SET_CURRENT_QUESTION(state, question) {
    state.currentQuestion = question
  },
  
  SET_QUESTION_DETAIL_LOADING(state, loading) {
    state.questionDetailLoading = loading
  }
}

const actions = {
  // 生成题目
  async generateQuestion({ commit }, params) {
    commit('SET_GENERATING_QUESTION', true)
    try {
      const response = await api.question.generate(params)
      commit('SET_CURRENT_REQUEST_ID', response.data.requestId)
      return response
    } finally {
      commit('SET_GENERATING_QUESTION', false)
    }
  },
  
  // 获取题目生成状态
  async getQuestionStatus({ commit }, requestId) {
    try {
      const response = await api.question.getStatus(requestId)
      commit('SET_GENERATION_STATUS', response.data)
      return response
    } catch (error) {
      console.error('获取题目状态失败:', error)
      throw error
    }
  },
  
  // 获取原始题目列表
  async getRawQuestions({ commit }, params = {}) {
    commit('SET_RAW_QUESTIONS_LOADING', true)
    try {
      const response = await api.question.getRawQuestions(params)
      commit('SET_RAW_QUESTIONS', response.data.questions)
      commit('SET_RAW_QUESTIONS_TOTAL', response.data.pagination.total)
      return response
    } finally {
      commit('SET_RAW_QUESTIONS_LOADING', false)
    }
  },
  
  // 获取原始题目详情
  async getRawQuestionById({ commit }, id) {
    commit('SET_QUESTION_DETAIL_LOADING', true)
    try {
      const response = await api.question.getRawQuestionById(id)
      commit('SET_CURRENT_QUESTION', response.data)
      return response
    } finally {
      commit('SET_QUESTION_DETAIL_LOADING', false)
    }
  },
  
  // 确认题目
  async confirmQuestion({ commit }, { id, humanFeedback }) {
    try {
      const response = await api.question.confirm(id, { humanFeedback })
      commit('UPDATE_RAW_QUESTION_STATUS', { 
        id, 
        status: 'confirmed', 
        humanFeedback 
      })
      return response
    } catch (error) {
      console.error('确认题目失败:', error)
      throw error
    }
  },
  
  // 拒绝题目
  async rejectQuestion({ commit }, { id, humanFeedback }) {
    try {
      const response = await api.question.reject(id, { humanFeedback })
      commit('UPDATE_RAW_QUESTION_STATUS', { 
        id, 
        status: 'human_reject', 
        humanFeedback 
      })
      return response
    } catch (error) {
      console.error('拒绝题目失败:', error)
      throw error
    }
  },
  
  // 获取正式题目列表
  async getQuestions({ commit }, params = {}) {
    commit('SET_QUESTIONS_LOADING', true)
    try {
      const response = await api.question.getQuestions(params)
      commit('SET_QUESTIONS', response.data.questions)
      return response
    } finally {
      commit('SET_QUESTIONS_LOADING', false)
    }
  },
  
  // 清空当前题目详情
  clearCurrentQuestion({ commit }) {
    commit('SET_CURRENT_QUESTION', null)
  }
}

const getters = {
  // 题目生成相关
  isGeneratingQuestion: state => state.generatingQuestion,
  currentRequestId: state => state.currentRequestId,
  generationStatus: state => state.generationStatus,
  
  // 原始题目列表
  rawQuestions: state => state.rawQuestions,
  rawQuestionsTotal: state => state.rawQuestionsTotal,
  isRawQuestionsLoading: state => state.rawQuestionsLoading,
  
  // 按状态过滤的原始题目
  pendingReviewQuestions: state => state.rawQuestions.filter(q => 
    q.status === 'auto_pass' || q.status === 'ai_reject'
  ),
  
  confirmedQuestions: state => state.rawQuestions.filter(q => 
    q.status === 'confirmed'
  ),
  
  rejectedQuestions: state => state.rawQuestions.filter(q => 
    q.status === 'human_reject'
  ),
  
  // 正式题目列表
  questions: state => state.questions,
  isQuestionsLoading: state => state.questionsLoading,
  
  // 题目详情
  currentQuestion: state => state.currentQuestion,
  isQuestionDetailLoading: state => state.questionDetailLoading
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}