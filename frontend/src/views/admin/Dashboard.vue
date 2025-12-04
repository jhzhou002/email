<template>
  <div class="dashboard-page">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header-simple">
            <el-icon color="#409EFC" :size="24"><User /></el-icon>
            <span>用户总数</span>
          </div>
        </template>
        <div class="stat-value">{{ dashboard.totalUsers }}</div>
        <div class="stat-change">
          <span v-if="dashboard.newUsersToday > 0" style="color: #67c26a">
            ↑ 今日新增: {{ dashboard.newUsersToday }}
          </span>
          <span v-else style="color: #909399">
            今日新增: {{ dashboard.newUsersToday }}
          </span>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header-simple">
            <el-icon color="#85CE61" :size="24"><Message /></el-icon>
            <span>邮件总数</span>
          </div>
        </template>
        <div class="stat-value">{{ dashboard.totalEmails }}</div>
        <div class="stat-change">
          <span v-if="dashboard.newEmailsToday > 0" style="color: #67c26a">
            ↑ 今日接收: {{ dashboard.newEmailsToday }}
          </span>
          <span v-else style="color: #909399">
            今日接收: {{ dashboard.newEmailsToday }}
          </span>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header-simple">
            <el-icon color="#E6A23C" :size="24"><Message /></el-icon>
            <span>子邮箱总数</span>
          </div>
        </template>
        <div class="stat-value">{{ dashboard.totalSubemails }}</div>
        <div class="stat-change">
          <span style="color: #909399">
            已分配: {{ dashboard.assignedSubemails }}
          </span>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header-simple">
            <el-icon color="#F56C6C" :size="24"><PriceTag /></el-icon>
            <span>标签总数</span>
          </div>
        </template>
        <div class="stat-value">{{ dashboard.totalTags }}</div>
        <div class="stat-change">
          <span style="color: #909399">
            已使用: {{ dashboard.usedTags }}
          </span>
        </div>
      </el-card>
    </div>

    <!-- 系统状态 -->
    <el-card class="status-card" shadow="hover">
      <template #header>
        <div class="card-header-simple">
          <el-icon :size="20"><Monitor /></el-icon>
          <span>系统状态</span>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="status-item">
            <div class="status-label">IMAP服务</div>
            <div class="status-value">
              <el-tag :type="dashboard.imapStatus ? 'success' : 'danger'">
                {{ dashboard.imapStatus ? '正常' : '离线' }}
              </el-tag>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="status-item">
            <div class="status-label">数据库</div>
            <div class="status-value">
              <el-tag :type="dashboard.databaseStatus ? 'success' : 'danger'">
                {{ dashboard.databaseStatus ? '正常' : '异常' }}
              </el-tag>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="status-item">
            <div class="status-label">服务器</div>
            <div class="status-value">
              <el-tag type="success">正常</el-tag>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="status-item">
            <div class="status-label">最后检查</div>
            <div class="status-value">
              <span style="font-size: 12px; color: #909399">{{ lastCheckTime }}</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 快速操作 -->
    <el-card class="action-card" shadow="hover">
      <template #header>
        <div class="card-header-simple">
          <el-icon :size="20"><Tools /></el-icon>
          <span>快速操作</span>
        </div>
      </template>

      <el-button-group>
        <el-button type="primary" @click="navigateTo('/admin/subemails')">
          生成子邮箱
        </el-button>
        <el-button type="primary" @click="navigateTo('/admin/users')">
          管理用户
        </el-button>
        <el-button type="primary" @click="navigateTo('/admin/emails')">
          查看邮件
        </el-button>
        <el-button type="primary" @click="navigateTo('/admin/config')">
          系统配置
        </el-button>
      </el-button-group>
    </el-card>

    <!-- 最近日志 -->
    <el-card class="logs-card" shadow="hover">
      <template #header>
        <div class="card-header-simple">
          <el-icon :size="20"><Document /></el-icon>
          <span>最近操作日志</span>
        </div>
      </template>

      <el-table :data="recentLogs" v-loading="logsLoading" style="width: 100%">
        <el-table-column prop="action" label="操作" width="100">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)" size="small">
              {{ row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <div style="text-align: center; margin-top: 10px">
        <el-button link @click="navigateTo('/admin/logs')">查看全部日志</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, MessageBox, Message, PriceTag, Monitor, Tools, Document } from '@element-plus/icons-vue'
import { adminAPI } from '@/api/admin'

const router = useRouter()

const dashboard = ref({
  totalUsers: 0,
  newUsersToday: 0,
  totalEmails: 0,
  newEmailsToday: 0,
  totalSubemails: 0,
  assignedSubemails: 0,
  totalTags: 0,
  usedTags: 0,
  imapStatus: true,
  databaseStatus: true
})

const recentLogs = ref<any[]>([])
const logsLoading = ref(false)
const lastCheckTime = ref('')

const loadDashboard = async () => {
  try {
    const data = await adminAPI.getDashboard()
    dashboard.value = data
    lastCheckTime.value = new Date().toLocaleTimeString('zh-CN')
    loadRecentLogs()
  } catch (error) {
    ElMessage.error('加载仪表盘数据失败')
  }
}

const loadRecentLogs = async () => {
  logsLoading.value = true
  try {
    const data = await adminAPI.getLogs({
      page: 1,
      pageSize: 10
    })
    recentLogs.value = data.data || []
  } catch (error) {
    ElMessage.error('加载日志失败')
  } finally {
    logsLoading.value = false
  }
}

const getActionType = (action: string) => {
  const typeMap: Record<string, string> = {
    'login': 'primary',
    'create': 'success',
    'update': 'warning',
    'delete': 'danger',
    'export': 'info',
    'other': 'info'
  }
  return typeMap[action] || 'info'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const navigateTo = (path: string) => {
  router.push(path)
}

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.dashboard-page {
  padding: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  :deep(.el-card__header) {
    padding: 16px;
  }

  :deep(.el-card__body) {
    padding: 16px;
  }
}

.card-header-simple {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin: 16px 0 8px 0;
}

.stat-change {
  font-size: 12px;
  color: #909399;
}

.status-card {
  margin-bottom: 20px;

  :deep(.el-card__header) {
    padding: 16px;
  }

  :deep(.el-card__body) {
    padding: 16px;
  }
}

.status-item {
  padding: 12px;
  text-align: center;
  border-radius: 4px;
  background: #f5f5f5;
}

.status-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.status-value {
  font-size: 14px;
}

.action-card {
  margin-bottom: 20px;

  :deep(.el-card__header) {
    padding: 16px;
  }

  :deep(.el-card__body) {
    padding: 16px;
  }

  :deep(.el-button-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  :deep(.el-button) {
    flex: 1;
    min-width: 100px;
  }
}

.logs-card {
  :deep(.el-card__header) {
    padding: 16px;
  }

  :deep(.el-card__body) {
    padding: 16px;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
