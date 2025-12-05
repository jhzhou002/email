<template>
  <div class="admin-layout">
    <el-container>
      <!-- 左侧导航栏 -->
      <el-aside width="200px" class="admin-sidebar">
        <div class="logo-section">
          <svg class="logo-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="admin-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
              </linearGradient>
            </defs>
            <!-- Email envelope -->
            <rect x="15" y="30" width="70" height="45" rx="3" fill="none" stroke="url(#admin-logo-gradient)" stroke-width="3"/>
            <path d="M 15 30 L 50 55 L 85 30" fill="none" stroke="url(#admin-logo-gradient)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- Plus symbol -->
            <circle cx="75" cy="25" r="15" fill="url(#admin-logo-gradient)"/>
            <line x1="75" y1="17" x2="75" y2="33" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <line x1="67" y1="25" x2="83" y2="25" stroke="white" stroke-width="3" stroke-linecap="round"/>
          </svg>
          <h3>加号邮箱后台</h3>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#1e3a5f"
          text-color="#fff"
          active-text-color="#ffd04b"
        >
          <el-menu-item index="/admin/dashboard">
            <el-icon><Monitor /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>
          <el-menu-item index="/admin/users">
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/subemails">
            <el-icon><Message /></el-icon>
            <span>子邮箱管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/emails">
            <el-icon><MessageBox /></el-icon>
            <span>邮件管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/tags">
            <el-icon><PriceTag /></el-icon>
            <span>标签管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/config">
            <el-icon><Setting /></el-icon>
            <span>系统配置</span>
          </el-menu-item>
          <el-menu-item index="/admin/logs">
            <el-icon><Document /></el-icon>
            <span>操作日志</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 右侧内容区 -->
      <el-container>
        <!-- 顶部栏 -->
        <el-header class="admin-header">
          <div class="header-left">
            <span class="page-title">{{ pageTitle }}</span>
          </div>
          <div class="header-right">
            <el-dropdown @command="handleCommand">
              <div class="user-info">
                <el-icon><User /></el-icon>
                <span>{{ authStore.user?.email }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">
                    <el-icon><SwitchButton /></el-icon>
                    <span style="margin-left: 8px">退出登录</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <!-- 主内容区 -->
        <el-main class="admin-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  User,
  Message,
  MessageBox,
  PriceTag,
  Setting,
  Document,
  Monitor,
  SwitchButton
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)

const pageTitle = computed(() => {
  const titleMap: Record<string, string> = {
    '/admin/dashboard': '仪表盘',
    '/admin/users': '用户管理',
    '/admin/subemails': '子邮箱管理',
    '/admin/emails': '邮件管理',
    '/admin/tags': '标签管理',
    '/admin/config': '系统配置',
    '/admin/logs': '操作日志'
  }
  return titleMap[route.path] || '管理后台'
})

const handleCommand = (command: string) => {
  if (command === 'logout') {
    authStore.logout()
    ElMessage.success('退出成功')
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-layout {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.admin-layout .el-container {
  height: 100%;
}

.admin-sidebar {
  background: #1e3a5f;
  height: 100%;
  overflow-y: auto;
}

.logo-section {
  padding: 20px;
  text-align: center;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.logo-section .logo-icon {
  width: 50px;
  height: 50px;
}

.logo-section h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.admin-sidebar .el-menu {
  border-right: none;
}

.admin-header {
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
}

.header-left .page-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.header-right .user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background 0.3s;
}

.header-right .user-info:hover {
  background: #f5f5f5;
}

.admin-main {
  background: #f5f5f5;
  overflow-y: auto;
}
</style>
