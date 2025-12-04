<template>
  <div class="subemails-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>子邮箱列表</span>
          <el-button type="primary" :icon="Plus" @click="generateDialogVisible = true">
            生成子邮箱
          </el-button>
        </div>
      </template>

      <div class="table-toolbar">
        <el-radio-group v-model="filterAssigned" @change="loadSubemails">
          <el-radio-button :label="undefined">全部</el-radio-button>
          <el-radio-button :label="false">未分配</el-radio-button>
          <el-radio-button :label="true">已分配</el-radio-button>
        </el-radio-group>
      </div>

      <el-table :data="subemails" v-loading="loading" style="width: 100%" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="email" label="邮箱地址" min-width="250" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.assignedUserId ? 'success' : 'info'">
              {{ row.assignedUserId ? '已分配' : '未分配' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assignedUserId" label="用户ID" width="100">
          <template #default="{ row }">
            {{ row.assignedUserId || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="用户邮箱" min-width="200">
          <template #default="{ row }">
            {{ row.userEmail || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
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

    <!-- 生成子邮箱对话框 -->
    <el-dialog v-model="generateDialogVisible" title="生成子邮箱" width="500px" @open="handleDialogOpen">
      <el-form :model="generateForm" :rules="generateRules" ref="generateFormRef" label-width="100px">
        <el-form-item label="生成数量" prop="count">
          <el-input-number
            v-model="generateForm.count"
            :min="1"
            :max="100"
            placeholder="请输入生成数量"
          />
          <span style="margin-left: 10px; color: #909399">最多100个</span>
        </el-form-item>
        <el-alert
          title="将使用系统配置中的主域名生成子邮箱，格式为: 8位随机字符@域名"
          type="info"
          :closable="false"
        />
      </el-form>
      <template #footer>
        <el-button @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleGenerate" :loading="generateLoading">
          生成
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { adminAPI } from '@/api/admin'

interface Subemail {
  id: number
  email: string
  assignedUserId: number | null
  userEmail: string | null
  createdAt: string
}

const loading = ref(false)
const subemails = ref<Subemail[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const filterAssigned = ref<boolean | undefined>(undefined)

const generateDialogVisible = ref(false)
const generateLoading = ref(false)
const generateFormRef = ref<FormInstance>()
const generateForm = ref({
  count: 10,
  domain: ''
})

const generateRules: FormRules = {
  count: [{ required: true, message: '请输入生成数量', trigger: 'blur' }]
}

const loadSubemails = async () => {
  loading.value = true
  try {
    const data = await adminAPI.getSubemails({
      page: currentPage.value,
      pageSize: pageSize.value,
      isAssigned: filterAssigned.value
    })
    subemails.value = data.data
    total.value = data.total
  } catch (error) {
    ElMessage.error('加载子邮箱列表失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadSubemails()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadSubemails()
}

const handleDialogOpen = async () => {
  try {
    const settings = await adminAPI.getSettings()
    // 注意：由于响应拦截器会将 snake_case 转换为 camelCase
    if (settings.mainDomain) {
      generateForm.value.domain = settings.mainDomain
    } else {
      ElMessage.warning('请先在系统配置中设置主域名')
      generateDialogVisible.value = false
    }
  } catch (error) {
    ElMessage.error('获取系统配置失败')
    generateDialogVisible.value = false
  }
}

const handleGenerate = async () => {
  if (!generateFormRef.value) return

  // 检查是否有域名配置
  if (!generateForm.value.domain) {
    ElMessage.warning('请先在系统配置中设置主域名')
    return
  }

  await generateFormRef.value.validate(async (valid) => {
    if (!valid) return

    generateLoading.value = true
    try {
      await adminAPI.generateSubemails(generateForm.value.count, generateForm.value.domain)
      ElMessage.success(`成功生成 ${generateForm.value.count} 个子邮箱`)
      generateDialogVisible.value = false
      loadSubemails()
    } catch (error) {
      ElMessage.error('生成子邮箱失败')
    } finally {
      generateLoading.value = false
    }
  })
}

const formatDate = (dateStr: string) => {
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
  loadSubemails()
})
</script>

<style scoped>
.subemails-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-toolbar {
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
