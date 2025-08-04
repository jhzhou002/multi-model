import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: {
          title: '数据看板',
          icon: 'DataAnalysis'
        }
      },
      {
        path: '/question-generate',
        name: 'QuestionGenerate',
        component: () => import('@/views/QuestionGenerate.vue'),
        meta: {
          title: '题目生成',
          icon: 'EditPen'
        }
      },
      {
        path: '/question-review',
        name: 'QuestionReview',
        component: () => import('@/views/QuestionReview.vue'),
        meta: {
          title: '题目审核',
          icon: 'View'
        }
      },
      {
        path: '/question-library',
        name: 'QuestionLibrary',
        component: () => import('@/views/QuestionLibrary.vue'),
        meta: {
          title: '题目库',
          icon: 'Collection'
        }
      },
      {
        path: '/knowledge-points',
        name: 'KnowledgePoints',
        component: () => import('@/views/KnowledgePoints.vue'),
        meta: {
          title: '知识点管理',
          icon: 'Management'
        }
      },
      {
        path: '/api-logs',
        name: 'ApiLogs',
        component: () => import('@/views/ApiLogs.vue'),
        meta: {
          title: 'API日志',
          icon: 'DocumentCopy'
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta && to.meta.title) {
    document.title = `${to.meta.title} - 高中数学AI题库管理系统`
  } else {
    document.title = '高中数学AI题库管理系统'
  }
  next()
})

export default router