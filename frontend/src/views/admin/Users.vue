<template>
  <div class="users-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
        </div>
      </template>

      <div class="table-toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户邮箱"
          style="width: 300px"
          clearable
          @change="loadUsers"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <el-table :data="users" v-loading="loading" style="width: 100%" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isAdmin ? 'danger' : 'success'">
              {{ row.isAdmin ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : 'info'">
              {{ row.status === 0 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="登录状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isLocked ? 'danger' : 'success'">
              {{ row.isLocked ? '已锁定' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最后登录" width="180">
          <template #default="{ row }">
            {{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="handleToggleStatus(row)"
              :disabled="row.isAdmin"
            >
              {{ row.status === 0 ? '禁用' : '启用' }}
            </el-button>
            <el-button
              link
              type="warning"
              size="small"
              @click="handleResetPassword(row)"
              :disabled="row.isAdmin"
            >
              重置密码
            </el-button>
            <el-button
              link
              type="info"
              size="small"
              @click="handleUnlockUser(row)"
              :disabled="!row.isLocked || row.isAdmin"
            >
              解锁
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              @click="handleDelete(row)"
              :disabled="row.isAdmin"
            >
              删除
            </el-button>
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
          :page-sizes="[10, 20, 50, 100]"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="resetPasswordDialogVisible" title="重置密码" width="400px">
      <el-form :model="resetPasswordForm" :rules="resetPasswordRules" ref="resetPasswordFormRef">
        <el-form-item label="用户邮箱">
          <el-input :value="currentUser?.email" disabled />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="resetPasswordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="resetPasswordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPasswordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmResetPassword" :loading="resetPasswordLoading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminAPI } from '@/api/admin'
import type { User } from '@/types'

const loading = ref(false)
const users = ref<User[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')

const resetPasswordDialogVisible = ref(false)
const resetPasswordLoading = ref(false)
const currentUser = ref<User | null>(null)
const resetPasswordFormRef = ref<FormInstance>()
const resetPasswordForm = ref({
  newPassword: '',
  confirmPassword: ''
})

const validatePasswordConfirm = (_rule: any, value: any, callback: any) => {
  if (value !== resetPasswordForm.value.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const resetPasswordRules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validatePasswordConfirm, trigger: 'blur' }
  ]
}

const loadUsers = async () => {
  loading.value = true
  try {
    const data = await adminAPI.getUsers({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined
    })
    users.value = data.data
    total.value = data.total
  } catch (error) {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadUsers()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadUsers()
}

const handleToggleStatus = async (user: User) => {
  const newStatus = user.status === 0 ? 1 : 0
  const action = newStatus === 0 ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(`确定要${action}用户 ${user.email} 吗？`, '提示', {
      type: 'warning'
    })

    await adminAPI.toggleUserStatus(user.id, newStatus)
    ElMessage.success(`${action}成功`)
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`${action}失败`)
    }
  }
}

const handleResetPassword = (user: User) => {
  currentUser.value = user
  resetPasswordForm.value = {
    newPassword: '',
    confirmPassword: ''
  }
  resetPasswordDialogVisible.value = true
}

const confirmResetPassword = async () => {
  if (!resetPasswordFormRef.value || !currentUser.value) return

  await resetPasswordFormRef.value.validate(async (valid) => {
    if (!valid) return

    resetPasswordLoading.value = true
    try {
      await adminAPI.resetUserPassword(currentUser.value!.id, resetPasswordForm.value.newPassword)
      ElMessage.success('密码重置成功')
      resetPasswordDialogVisible.value = false
    } catch (error) {
      ElMessage.error('密码重置失败')
    } finally {
      resetPasswordLoading.value = false
    }
  })
}

const handleUnlockUser = async (user: User) => {
  try {
    await ElMessageBox.confirm(`确定要解锁用户 ${user.email} 吗？`, '提示', {
      type: 'warning'
    })

    await adminAPI.unlockUser(user.id)
    ElMessage.success('用户已解锁')
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('解锁失败')
    }
  }
}

const handleDelete = async (user: User) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 ${user.email} 吗？删除后将无法恢复。`,
      '警告',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )

    await adminAPI.deleteUser(user.id)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
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
  loadUsers()
})
</script>

<style scoped>
.users-page {
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
