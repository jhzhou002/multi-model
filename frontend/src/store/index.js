import { createStore } from 'vuex'
import question from './modules/question'
import knowledgePoint from './modules/knowledgePoint'
import statistics from './modules/statistics'

export default createStore({
  modules: {
    question,
    knowledgePoint,
    statistics
  },
  
  state: {
    // 全局加载状态
    loading: false,
    // 侧边栏折叠状态
    sidebarCollapsed: false,
    // 当前用户信息（暂时为空，后续可扩展）
    user: null
  },
  
  mutations: {
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    
    TOGGLE_SIDEBAR(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    
    SET_SIDEBAR_COLLAPSED(state, collapsed) {
      state.sidebarCollapsed = collapsed
    },
    
    SET_USER(state, user) {
      state.user = user
    }
  },
  
  actions: {
    setLoading({ commit }, loading) {
      commit('SET_LOADING', loading)
    },
    
    toggleSidebar({ commit }) {
      commit('TOGGLE_SIDEBAR')
    },
    
    setSidebarCollapsed({ commit }, collapsed) {
      commit('SET_SIDEBAR_COLLAPSED', collapsed)
    },
    
    setUser({ commit }, user) {
      commit('SET_USER', user)
    }
  },
  
  getters: {
    isLoading: state => state.loading,
    isSidebarCollapsed: state => state.sidebarCollapsed,
    currentUser: state => state.user
  }
})