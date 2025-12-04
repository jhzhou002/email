<template>
  <div class="gmail-container">
    <!-- 顶部导航栏 -->
    <el-header class="top-header">
      <div class="header-left">
        <el-button text :icon="Menu" @click="drawerVisible = !drawerVisible" class="menu-btn" />
        <div class="logo">
          <el-icon :size="24" color="#ea4335"><Message /></el-icon>
          <span class="logo-text">邮箱系统</span>
        </div>
      </div>

      <div class="header-center">
        <el-input
          v-model="searchKeyword"
          :placeholder="t('email.searchPlaceholder')"
          :prefix-icon="Search"
          class="search-input"
          clearable
          @change="loadEmails"
        >
          <template #append>
            <el-button :icon="Search" @click="loadEmails" />
          </template>
        </el-input>
      </div>

      <div class="header-right">
        <el-tooltip content="刷新">
          <el-button text :icon="Refresh" @click="handleRefresh" circle />
        </el-tooltip>
        <el-tooltip content="设置">
          <el-button text :icon="Setting" @click="router.push('/settings')" circle />
        </el-tooltip>
        <el-dropdown @command="handleCommand">
          <el-avatar :size="32" style="cursor: pointer">
            <el-icon><User /></el-icon>
          </el-avatar>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                <div style="padding: 5px 0">
                  <div style="font-weight: 500">{{ authStore.user?.email }}</div>
                </div>
              </el-dropdown-item>
              <el-dropdown-item divided command="settings">
                <el-icon><Setting /></el-icon>
                <span style="margin-left: 8px">个人设置</span>
              </el-dropdown-item>
              <el-dropdown-item command="logout">
                <el-icon><SwitchButton /></el-icon>
                <span style="margin-left: 8px">退出登录</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- 主体内容 -->
    <el-container class="main-container">
      <!-- 左侧边栏 -->
      <el-aside width="256px" class="left-sidebar">
        <div class="sidebar-content">
          <!-- 统计卡片 -->
          <el-card class="stats-card" shadow="never">
            <div class="stat-item">
              <el-icon color="#ea4335"><Message /></el-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stats.unreadCount }}</div>
                <div class="stat-label">未读邮件</div>
              </div>
            </div>
            <el-divider />
            <div class="stat-row">
              <div class="stat-mini">
                <div class="stat-mini-value">{{ stats.totalCount }}</div>
                <div class="stat-mini-label">总邮件</div>
              </div>
              <div class="stat-mini">
                <div class="stat-mini-value">{{ stats.todayCount }}</div>
                <div class="stat-mini-label">今日</div>
              </div>
            </div>
          </el-card>

          <!-- 标签过滤 -->
          <div class="tags-section">
            <div class="section-title">标签筛选</div>
            <el-radio-group v-model="selectedTagId" @change="loadEmails" class="tag-radio-group">
              <el-radio :label="undefined" class="tag-radio">
                <el-icon><Tickets /></el-icon>
                <span>全部邮件</span>
              </el-radio>
              <el-radio v-for="tag in tags" :key="tag.id" :label="tag.id" class="tag-radio">
                <el-icon><PriceTag /></el-icon>
                <span>{{ locale === 'zh' ? tag.nameZh : tag.nameEn }}</span>
              </el-radio>
            </el-radio-group>
          </div>

          <!-- 提示信息 -->
          <el-alert
            :closable="false"
            type="info"
            :title="t('email.emailRetention')"
            class="retention-alert"
          />
        </div>
      </el-aside>

      <!-- 邮件列表 -->
      <el-main class="email-list-main">
        <!-- 工具栏 -->
        <div class="email-toolbar">
          <div class="toolbar-left">
            <span class="result-count">
              共 {{ total }} 封邮件
              <span v-if="stats.unreadCount > 0" class="unread-badge">
                {{ stats.unreadCount }} 封未读
              </span>
            </span>
          </div>
          <div class="toolbar-right">
            <el-pagination
              small
              background
              layout="prev, pager, next"
              :total="total"
              :page-size="pageSize"
              :current-page="currentPage"
              @current-change="handlePageChange"
            />
          </div>
        </div>

        <!-- 邮件列表 -->
        <div v-loading="loading" class="email-list">
          <div
            v-for="email in emails"
            :key="email.id"
            class="email-item"
            :class="{ unread: email.isRead === 0, priority: email.priority === 1 }"
            @click="handleRowClick(email)"
          >
            <div class="email-item-left">
              <el-checkbox
                @click.stop
                v-model="email.selected"
                class="email-checkbox"
              />
              <el-icon v-if="email.priority === 1" class="priority-icon" color="#fbbc04">
                <Star />
              </el-icon>
            </div>

            <div class="email-item-main">
              <div class="email-from">{{ email.fromAddr }}</div>
              <div class="email-subject">
                <span class="subject-text">{{ email.subject || '(无主题)' }}</span>
                <el-tag
                  v-if="email.extractedCode"
                  type="success"
                  size="small"
                  @click.stop="copyCode(email.extractedCode)"
                  class="code-tag"
                >
                  <el-icon><Key /></el-icon>
                  {{ email.extractedCode }}
                </el-tag>
              </div>
              <div class="email-preview">
                {{ getEmailPreview(email) }}
              </div>
            </div>

            <div class="email-item-right">
              <div class="email-time">{{ formatTime(email.receivedAt) }}</div>
              <el-button
                text
                :icon="Delete"
                @click.stop="handleDelete(email.id)"
                class="delete-btn"
              />
            </div>
          </div>

          <el-empty v-if="!loading && emails.length === 0" description="暂无邮件" />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Menu,
  Search,
  Refresh,
  Setting,
  User,
  SwitchButton,
  Message,
  Delete,
  Star,
  Key,
  Tickets,
  PriceTag
} from '@element-plus/icons-vue'
import { emailAPI } from '@/api/email'
import { userAPI } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { Email, Tag, UserStats } from '@/types'

const router = useRouter()
const { t, locale } = useI18n()
const authStore = useAuthStore()

const loading = ref(false)
const emails = ref<(Email & { selected?: boolean })[]>([])
const tags = ref<Tag[]>([])
const stats = ref<UserStats>({ unreadCount: 0, totalCount: 0, todayCount: 0 })
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const searchKeyword = ref('')
const selectedTagId = ref<number | undefined>(undefined)
const drawerVisible = ref(false)
let pollInterval: number | null = null

const loadEmails = async () => {
  loading.value = true
  try {
    const data = await emailAPI.getEmails({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
      tagId: selectedTagId.value
    })
    emails.value = data.data
    total.value = data.total
  } catch (error) {
    // 错误已在拦截器处理
  } finally {
    loading.value = false
  }
}

const loadTags = async () => {
  try {
    tags.value = await emailAPI.getTags()
  } catch (error) {
    // 错误已在拦截器处理
  }
}

const loadStats = async () => {
  try {
    stats.value = await userAPI.getStats()
  } catch (error) {
    // 错误已在拦截器处理
  }
}

const handleRefresh = async () => {
  try {
    await emailAPI.manualFetch()
    ElMessage.success(t('email.fetchSuccess'))
    loadEmails()
    loadStats()
  } catch (error) {
    // 错误已在拦截器处理
  }
}

const handleRowClick = (email: Email) => {
  router.push(`/email/${email.id}`)
}

const copyCode = (code: string) => {
  navigator.clipboard.writeText(code)
  ElMessage.success(t('email.copiedSuccess'))
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm(t('email.deleteConfirm'), t('common.confirm'), {
      type: 'warning'
    })
    await emailAPI.deleteEmail(id)
    ElMessage.success(t('common.success'))
    loadEmails()
    loadStats()
  } catch (error) {
    // 用户取消或错误
  }
}

const handleCommand = (command: string) => {
  if (command === 'logout') {
    authStore.logout()
    ElMessage.success(t('auth.logoutSuccess'))
    router.push('/login')
  } else if (command === 'settings') {
    router.push('/settings')
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadEmails()
}

const getEmailPreview = (email: Email) => {
  const text = email.bodyText || email.bodyHtml?.replace(/<[^>]*>/g, '') || ''
  return text.substring(0, 100)
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }
}

const startPolling = () => {
  pollInterval = window.setInterval(() => {
    loadEmails()
    loadStats()
  }, 15000)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onMounted(() => {
  loadEmails()
  loadTags()
  loadStats()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.gmail-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

/* 顶部导航栏 */
.top-header {
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 0 0 256px;
}

.menu-btn {
  font-size: 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.header-center {
  flex: 1;
  max-width: 720px;
  padding: 0 32px;
}

.search-input {
  width: 100%;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  background: #f1f3f4;
  box-shadow: none;
}

.search-input :deep(.el-input__wrapper:hover) {
  background: #e8eaed;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 主体容器 */
.main-container {
  flex: 1;
  overflow: hidden;
}

/* 左侧边栏 */
.left-sidebar {
  background: #fff;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.sidebar-content {
  padding: 16px;
}

.stats-card {
  margin-bottom: 16px;
}

.stats-card :deep(.el-card__body) {
  padding: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-item .el-icon {
  font-size: 32px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.stat-row {
  display: flex;
  gap: 24px;
}

.stat-mini {
  flex: 1;
  text-align: center;
}

.stat-mini-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.stat-mini-label {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.tags-section {
  margin-top: 24px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 8px;
  padding: 0 8px;
}

.tag-radio-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-radio {
  width: 100%;
  margin: 0;
  height: auto;
}

.tag-radio :deep(.el-radio__label) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  width: 100%;
  border-radius: 0 16px 16px 0;
  transition: all 0.3s;
}

.tag-radio :deep(.el-radio__input) {
  display: none;
}

.tag-radio :deep(.el-radio__label:hover) {
  background: #f1f3f4;
}

.tag-radio.is-checked :deep(.el-radio__label) {
  background: #d3e3fd;
  color: #1a73e8;
  font-weight: 500;
}

.retention-alert {
  margin-top: 16px;
}

/* 邮件列表主区域 */
.email-list-main {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.email-toolbar {
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.result-count {
  font-size: 14px;
  color: #666;
}

.unread-badge {
  color: #ea4335;
  font-weight: 500;
  margin-left: 8px;
}

.email-list {
  flex: 1;
  overflow-y: auto;
  background: #fff;
}

.email-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
}

.email-item:hover {
  background: #f5f5f5;
  box-shadow: inset 1px 0 0 #dadce0, inset -1px 0 0 #dadce0, 0 1px 2px 0 rgba(60, 64, 67, 0.3),
    0 1px 3px 1px rgba(60, 64, 67, 0.15);
}

.email-item.unread {
  background: #f8f9fa;
  font-weight: 500;
}

.email-item.unread .email-from {
  font-weight: 600;
}

.email-item.priority {
  border-left: 3px solid #fbbc04;
}

.email-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.priority-icon {
  font-size: 18px;
}

.email-item-main {
  flex: 1;
  min-width: 0;
}

.email-from {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.email-subject {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.subject-text {
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-tag {
  cursor: pointer;
  flex-shrink: 0;
}

.code-tag:hover {
  opacity: 0.8;
}

.email-preview {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  min-width: 100px;
}

.email-time {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.email-item:hover .delete-btn {
  opacity: 1;
}
</style>
