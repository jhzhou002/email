<template>
  <div class="logs-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>操作日志</span>
        </div>
      </template>

      <div class="table-toolbar">
        <el-select v-model="filterType" placeholder="日志类型" style="width: 200px" clearable @change="loadLogs">
          <el-option label="所有类型" :value="undefined" />
          <el-option label="登录" value="login" />
          <el-option label="创建" value="create" />
          <el-option label="更新" value="update" />
          <el-option label="删除" value="delete" />
          <el-option label="导出" value="export" />
          <el-option label="其他" value="other" />
        </el-select>
      </div>

      <el-table :data="logs" v-loading="loading" style="width: 100%" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="userId" label="用户ID" width="100">
          <template #default="{ row }">
            {{ row.userId || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="用户邮箱" min-width="180">
          <template #default="{ row }">
            {{ row.userEmail || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)" size="small">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP地址" width="150">
          <template #default="{ row }">
            {{ row.ip || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          :page-sizes="[20, 50, 100]"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminAPI } from '@/api/admin'

interface Log {
  id: number
  userId: number | null
  userEmail: string | null
  type: string
  content: string
  ip: string | null
  createdAt: string
}

const loading = ref(false)
const logs = ref<Log[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const filterType = ref<string | undefined>(undefined)

const loadLogs = async () => {
  loading.value = true
  try {
    const data = await adminAPI.getLogs({
      page: currentPage.value,
      pageSize: pageSize.value,
      type: filterType.value
    })
    logs.value = data.data || []
    total.value = data.total || 0
  } catch (error) {
    ElMessage.error('加载日志失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadLogs()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadLogs()
}

const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    login: '登录',
    admin_op: '管理操作',
    email_fetch: '邮件拉取',
    error: '错误',
    register: '注册'
  }
  return typeMap[type] || type
}

const getTypeTag = (type: string) => {
  const tagMap: Record<string, string> = {
    login: 'primary',
    register: 'success',
    admin_op: 'warning',
    email_fetch: 'info',
    error: 'danger'
  }
  return tagMap[type] || 'info'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.logs-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
