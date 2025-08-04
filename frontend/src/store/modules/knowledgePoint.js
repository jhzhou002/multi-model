import api from '@/api'

const state = {
  // 知识点列表
  knowledgePoints: [],
  knowledgePointsLoading: false,
  
  // 知识点分类
  categories: [],
  categoriesLoading: false,
  
  // 知识点统计
  statistics: [],
  statisticsLoading: false,
  
  // 当前编辑的知识点
  currentKnowledgePoint: null
}

const mutations = {
  SET_KNOWLEDGE_POINTS(state, knowledgePoints) {
    state.knowledgePoints = knowledgePoints
  },
  
  SET_KNOWLEDGE_POINTS_LOADING(state, loading) {
    state.knowledgePointsLoading = loading
  },
  
  SET_CATEGORIES(state, categories) {
    state.categories = categories
  },
  
  SET_CATEGORIES_LOADING(state, loading) {
    state.categoriesLoading = loading
  },
  
  SET_STATISTICS(state, statistics) {
    state.statistics = statistics
  },
  
  SET_STATISTICS_LOADING(state, loading) {
    state.statisticsLoading = loading
  },
  
  SET_CURRENT_KNOWLEDGE_POINT(state, knowledgePoint) {
    state.currentKnowledgePoint = knowledgePoint
  },
  
  ADD_KNOWLEDGE_POINT(state, knowledgePoint) {
    state.knowledgePoints.push(knowledgePoint)
  },
  
  UPDATE_KNOWLEDGE_POINT(state, updatedKnowledgePoint) {
    const index = state.knowledgePoints.findIndex(kp => kp.id === updatedKnowledgePoint.id)
    if (index !== -1) {
      state.knowledgePoints.splice(index, 1, updatedKnowledgePoint)
    }
  },
  
  REMOVE_KNOWLEDGE_POINT(state, id) {
    const index = state.knowledgePoints.findIndex(kp => kp.id === id)
    if (index !== -1) {
      state.knowledgePoints.splice(index, 1)
    }
  }
}

const actions = {
  // 获取所有知识点
  async getKnowledgePoints({ commit }, params = {}) {
    commit('SET_KNOWLEDGE_POINTS_LOADING', true)
    try {
      const response = await api.knowledgePoint.getAll(params)
      commit('SET_KNOWLEDGE_POINTS', response.data)
      return response
    } finally {
      commit('SET_KNOWLEDGE_POINTS_LOADING', false)
    }
  },
  
  // 获取知识点分类
  async getCategories({ commit }) {
    commit('SET_CATEGORIES_LOADING', true)
    try {
      const response = await api.knowledgePoint.getCategories()
      commit('SET_CATEGORIES', response.data)
      return response
    } finally {
      commit('SET_CATEGORIES_LOADING', false)
    }
  },
  
  // 获取知识点统计
  async getStatistics({ commit }) {
    commit('SET_STATISTICS_LOADING', true)
    try {
      const response = await api.knowledgePoint.getStatistics()
      commit('SET_STATISTICS', response.data)
      return response
    } finally {
      commit('SET_STATISTICS_LOADING', false)
    }
  },
  
  // 根据分类获取知识点
  async getKnowledgePointsByCategory({ commit }, category) {
    commit('SET_KNOWLEDGE_POINTS_LOADING', true)
    try {
      const response = await api.knowledgePoint.getByCategory(category)
      commit('SET_KNOWLEDGE_POINTS', response.data)
      return response
    } finally {
      commit('SET_KNOWLEDGE_POINTS_LOADING', false)
    }
  },
  
  // 创建知识点
  async createKnowledgePoint({ commit }, knowledgePointData) {
    try {
      const response = await api.knowledgePoint.create(knowledgePointData)
      // 创建成功后重新获取列表
      return response
    } catch (error) {
      console.error('创建知识点失败:', error)
      throw error
    }
  },
  
  // 更新知识点
  async updateKnowledgePoint({ commit }, { id, data }) {
    try {
      const response = await api.knowledgePoint.update(id, data)
      // 更新本地状态
      commit('UPDATE_KNOWLEDGE_POINT', { id, ...data })
      return response
    } catch (error) {
      console.error('更新知识点失败:', error)
      throw error
    }
  },
  
  // 删除知识点
  async deleteKnowledgePoint({ commit }, id) {
    try {
      const response = await api.knowledgePoint.delete(id)
      commit('REMOVE_KNOWLEDGE_POINT', id)
      return response
    } catch (error) {
      console.error('删除知识点失败:', error)
      throw error
    }
  },
  
  // 设置当前编辑的知识点
  setCurrentKnowledgePoint({ commit }, knowledgePoint) {
    commit('SET_CURRENT_KNOWLEDGE_POINT', knowledgePoint)
  },
  
  // 清空当前知识点
  clearCurrentKnowledgePoint({ commit }) {
    commit('SET_CURRENT_KNOWLEDGE_POINT', null)
  }
}

const getters = {
  knowledgePoints: state => state.knowledgePoints,
  isKnowledgePointsLoading: state => state.knowledgePointsLoading,
  
  categories: state => state.categories,
  isCategoriesLoading: state => state.categoriesLoading,
  
  statistics: state => state.statistics,
  isStatisticsLoading: state => state.statisticsLoading,
  
  currentKnowledgePoint: state => state.currentKnowledgePoint,
  
  // 按分类分组的知识点
  knowledgePointsByCategory: state => {
    const grouped = {}
    state.knowledgePoints.forEach(kp => {
      if (!grouped[kp.category]) {
        grouped[kp.category] = []
      }
      grouped[kp.category].push(kp)
    })
    return grouped
  },
  
  // 获取知识点选项（用于下拉选择）
  knowledgePointOptions: state => state.knowledgePoints.map(kp => ({
    label: kp.name,
    value: kp.code,
    category: kp.category
  })),
  
  // 按分类分组的知识点选项
  knowledgePointOptionsByCategory: (state, getters) => {
    const grouped = {}
    state.categories.forEach(category => {
      grouped[category] = getters.knowledgePointOptions.filter(opt => opt.category === category)
    })
    return grouped
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}