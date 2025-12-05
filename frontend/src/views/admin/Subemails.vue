<template>
  <div class="subemails-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>子邮箱列表</span>
          <div class="header-buttons">
            <el-button type="success" :icon="Plus" @click="handleAdd">
              添加子邮箱
            </el-button>
            <el-button type="primary" :icon="Plus" @click="generateDialogVisible = true">
              批量生成
            </el-button>
          </div>
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
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="email" label="邮箱地址" min-width="200" />
        <el-table-column prop="remark" label="备注" min-width="150">
          <template #default="{ row }">
            {{ row.remark || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.assignedUserId ? 'success' : 'info'">
              {{ row.assignedUserId ? '已分配' : '未分配' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户邮箱" min-width="180">
          <template #default="{ row }">
            {{ row.userEmail || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row.id)">
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

    <!-- 添加/编辑子邮箱对话框 -->
    <el-dialog v-model="editDialogVisible" :title="isEdit ? '编辑子邮箱' : '添加子邮箱'" width="500px">
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px">
        <el-form-item label="邮箱地址" prop="email">
          <el-input
            v-model="editForm.email"
            placeholder="请输入完整的邮箱地址"
            clearable
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="editForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息（可选）"
            maxlength="255"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 生成子邮箱对话框 -->
    <el-dialog v-model="generateDialogVisible" title="批量生成子邮箱" width="500px" @open="handleDialogOpen">
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
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { adminAPI } from '@/api/admin'

interface Subemail {
  id: number
  email: string
  remark: string
  assignedUserId: number | null
  userEmail: string | null
  updatedAt: string
}

const loading = ref(false)
const subemails = ref<Subemail[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const filterAssigned = ref<boolean | undefined>(undefined)

// 编辑对话框
const editDialogVisible = ref(false)
const isEdit = ref(false)
const currentSubemail = ref<Subemail | null>(null)
const submitLoading = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = ref({
  email: '',
  remark: ''
})

const editRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

// 生成对话框
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

const handleAdd = () => {
  isEdit.value = false
  currentSubemail.value = null
  editForm.value = { email: '', remark: '' }
  editDialogVisible.value = true
}

const handleEdit = (row: Subemail) => {
  isEdit.value = true
  currentSubemail.value = row
  editForm.value = { email: row.email, remark: row.remark || '' }
  editDialogVisible.value = true
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个子邮箱吗？', '警告', { type: 'warning' })
    await adminAPI.deleteSubemail(id)
    ElMessage.success('删除成功')
    loadSubemails()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSubmit = async () => {
  if (!editFormRef.value) return

  await editFormRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      if (isEdit.value && currentSubemail.value) {
        await adminAPI.updateSubemail(currentSubemail.value.id, editForm.value.email, editForm.value.remark)
        ElMessage.success('更新成功')
      } else {
        await adminAPI.addSubemail(editForm.value.email, editForm.value.remark)
        ElMessage.success('添加成功')
      }
      editDialogVisible.value = false
      loadSubemails()
    } catch (error) {
      ElMessage.error(isEdit.value ? '更新失败' : '添加失败')
    } finally {
      submitLoading.value = false
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

.header-buttons {
  display: flex;
  gap: 8px;
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
