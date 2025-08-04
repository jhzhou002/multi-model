<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarWidth">
      <div class="sidebar">
        <!-- Logo区域 -->
        <div class="logo-area">
          <h1 class="logo-title">
            <el-icon><MagicStick /></el-icon>
            <span v-show="!isCollapsed">数学AI题库</span>
          </h1>
        </div>
        
        <!-- 导航菜单 -->
        <el-menu
          :default-active="currentRoute"
          :collapse="isCollapsed"
          :unique-opened="true"
          router
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
        >
          <el-menu-item
            v-for="route in menuRoutes"
            :key="route.path"
            :index="route.path"
          >
            <el-icon><component :is="route.meta.icon" /></el-icon>
            <template #title>{{ route.meta.title }}</template>
          </el-menu-item>
        </el-menu>
        
        <!-- 折叠按钮 -->
        <div class="collapse-btn" @click="toggleSidebar">
          <el-icon>
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
        </div>
      </div>
    </el-aside>
    
    <!-- 主内容区 -->
    <el-main class="main-content">
      <!-- 顶部工具栏 -->
      <div class="header-toolbar">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <el-tooltip content="刷新页面" placement="bottom">
            <el-button type="text" @click="refreshPage">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
          
          <el-tooltip content="系统设置" placement="bottom">
            <el-button type="text">
              <el-icon><Setting /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
      
      <!-- 页面内容 -->
      <div class="content-wrapper">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </el-main>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import {
  MagicStick,
  Fold,
  Expand,
  Refresh,
  Setting,
  DataAnalysis,
  EditPen,
  View,
  Collection,
  Management,
  DocumentCopy
} from '@element-plus/icons-vue'

export default {
  name: 'Layout',
  components: {
    MagicStick,
    Fold,
    Expand,
    Refresh,
    Setting,
    DataAnalysis,
    EditPen,
    View,
    Collection,
    Management,
    DocumentCopy
  },
  setup() {
    const store = useStore()
    const route = useRoute()
    const router = useRouter()
    
    // 响应式数据
    const isCollapsed = computed(() => store.getters.isSidebarCollapsed)
    const sidebarWidth = computed(() => isCollapsed.value ? '64px' : '200px')
    const currentRoute = computed(() => route.path)
    
    // 菜单路由配置
    const menuRoutes = ref([
      {
        path: '/dashboard',
        meta: { title: '数据看板', icon: 'DataAnalysis' }
      },
      {
        path: '/question-generate',
        meta: { title: '题目生成', icon: 'EditPen' }
      },
      {
        path: '/question-review',
        meta: { title: '题目审核', icon: 'View' }
      },
      {
        path: '/question-library',
        meta: { title: '题目库', icon: 'Collection' }
      },
      {
        path: '/knowledge-points',
        meta: { title: '知识点管理', icon: 'Management' }
      },
      {
        path: '/api-logs',
        meta: { title: 'API日志', icon: 'DocumentCopy' }
      }
    ])
    
    // 当前页面标题
    const currentPageTitle = computed(() => {
      const currentRouteConfig = menuRoutes.value.find(r => r.path === route.path)
      return currentRouteConfig?.meta.title || '未知页面'
    })
    
    // 方法
    const toggleSidebar = () => {
      store.dispatch('toggleSidebar')
    }
    
    const refreshPage = () => {
      window.location.reload()
    }
    
    return {
      isCollapsed,
      sidebarWidth,
      currentRoute,
      menuRoutes,
      currentPageTitle,
      toggleSidebar,
      refreshPage
    }
  }
}
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  height: 100%;
  background-color: #304156;
  display: flex;
  flex-direction: column;
  position: relative;
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #3e4853;
  padding: 0 16px;
}

.logo-title {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
}

.el-menu {
  flex: 1;
  border: none;
}

.collapse-btn {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 32px;
  background-color: #409eff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1000;
}

.collapse-btn:hover {
  background-color: #66b1ff;
  transform: translateX(-50%) scale(1.1);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f5f7fa;
}

.header-toolbar {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right .el-button {
  font-size: 18px;
  color: #606266;
}

.header-right .el-button:hover {
  color: #409eff;
}

.content-wrapper {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f5f7fa;
}

/* 面包屑样式 */
:deep(.el-breadcrumb__inner) {
  color: #606266;
  font-weight: 500;
}

:deep(.el-breadcrumb__inner.is-link) {
  color: #909399;
}

/* 菜单样式调整 */
:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
}

:deep(.el-menu-item.is-active) {
  background-color: rgba(64, 158, 255, 0.1) !important;
  border-right: 3px solid #409eff;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-toolbar {
    padding: 0 12px;
  }
  
  .content-wrapper {
    padding: 12px;
  }
  
  .logo-title {
    font-size: 16px;
  }
}
</style>