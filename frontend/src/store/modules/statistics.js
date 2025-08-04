import api from '@/api'

const state = {
  // 系统统计数据
  systemStats: null,
  systemStatsLoading: false,
  
  // 更新时间
  lastUpdated: null
}

const mutations = {
  SET_SYSTEM_STATS(state, stats) {
    state.systemStats = stats
    state.lastUpdated = new Date()
  },
  
  SET_SYSTEM_STATS_LOADING(state, loading) {
    state.systemStatsLoading = loading
  }
}

const actions = {
  // 获取系统统计数据
  async getSystemStatistics({ commit }) {
    commit('SET_SYSTEM_STATS_LOADING', true)
    try {
      const response = await api.question.getStatistics()
      commit('SET_SYSTEM_STATS', response.data)
      return response
    } finally {
      commit('SET_SYSTEM_STATS_LOADING', false)
    }
  },
  
  // 刷新统计数据
  async refreshStatistics({ dispatch }) {
    await dispatch('getSystemStatistics')
  }
}

const getters = {
  systemStats: state => state.systemStats,
  isSystemStatsLoading: state => state.systemStatsLoading,
  lastUpdated: state => state.lastUpdated,
  
  // 题目相关统计
  questionStats: state => state.systemStats?.questions || {},
  
  // DeepSeek API统计
  deepseekStats: state => state.systemStats?.deepseek || {},
  
  // Kimi API统计
  kimiStats: state => state.systemStats?.kimi || {},
  
  // 计算总成本
  totalCost: state => {
    if (!state.systemStats) return 0
    const deepseekCost = state.systemStats.deepseek?.total_cost || 0
    const kimiCost = state.systemStats.kimi?.total_cost || 0
    return deepseekCost + kimiCost
  },
  
  // 计算成功率
  successRate: state => {
    if (!state.systemStats?.questions) return 0
    const { total_raw, confirmed } = state.systemStats.questions
    if (total_raw === 0) return 0
    return ((confirmed / total_raw) * 100).toFixed(2)
  },
  
  // AI审核通过率
  aiPassRate: state => {
    if (!state.systemStats?.questions) return 0
    const { total_raw, auto_pass } = state.systemStats.questions
    if (total_raw === 0) return 0
    return ((auto_pass / total_raw) * 100).toFixed(2)
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}