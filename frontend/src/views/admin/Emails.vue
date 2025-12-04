<template>
  <div class="emails-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>邮件列表（全局）</span>
        </div>
      </template>

      <div class="table-toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索邮件主题、发件人..."
          style="width: 400px"
          clearable
          @change="loadEmails"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <el-table :data="emails" v-loading="loading" style="width: 100%" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="toAddr" label="收件地址" min-width="200" />
        <el-table-column prop="fromAddr" label="发件人" min-width="180" />
        <el-table-column prop="subject" label="主题" min-width="250">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">
              {{ row.subject || '(无主题)' }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="验证码" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.extractedCode" type="success" size="small">
              {{ row.extractedCode }}
            </el-tag>
            <span v-else style="color: #909399">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="receivedAt" label="接收时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.receivedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          :page-sizes="[20, 50, 100]"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 邮件详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="邮件详情" width="700px" destroy-on-close>
      <div v-if="selectedEmail" class="email-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="发件人">
            {{ selectedEmail.fromAddr }}
          </el-descriptions-item>
          <el-descriptions-item label="收件人">
            {{ selectedEmail.toAddr }}
          </el-descriptions-item>
          <el-descriptions-item label="主题" :span="2">
            {{ selectedEmail.subject || '(无主题)' }}
          </el-descriptions-item>
          <el-descriptions-item label="接收时间">
            {{ formatDate(selectedEmail.receivedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="验证码" v-if="selectedEmail.extractedCode">
            <el-tag type="success">{{ selectedEmail.extractedCode }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div class="email-body">
          <h4>邮件内容</h4>
          <div v-if="selectedEmail.bodyHtml" v-html="selectedEmail.bodyHtml" class="body-content"></div>
          <pre v-else-if="selectedEmail.bodyText" class="body-content">{{ selectedEmail.bodyText }}</pre>
          <p v-else style="color: #909399">暂无邮件内容</p>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminAPI } from '@/api/admin'
import type { Email } from '@/types'

const loading = ref(false)
const emails = ref<Email[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')

const detailDialogVisible = ref(false)
const selectedEmail = ref<Email | null>(null)

const loadEmails = async () => {
  loading.value = true
  try {
    const data = await adminAPI.getAllEmails({
      page: currentPage.value,
      pageSize: pageSize.value
    })
    emails.value = data.data || []
    total.value = data.total || 0
  } catch (error) {
    ElMessage.error('加载邮件列表失败')
  } finally {
    loading.value = false
  }
}

const handleView = (email: Email) => {
  selectedEmail.value = email
  detailDialogVisible.value = true
}

const handleDelete = async (email: Email) => {
  try {
    await ElMessageBox.confirm(
      '确认要删除这封邮件吗？此操作不可恢复。',
      '删除邮件',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    await adminAPI.deleteEmail(email.id)
    ElMessage.success('邮件已删除')
    await loadEmails()
  } catch (error) {
    // 用户取消或删除失败
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadEmails()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadEmails()
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

onMounted(() => {
  loadEmails()
})
</script>

<style scoped>
.emails-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
