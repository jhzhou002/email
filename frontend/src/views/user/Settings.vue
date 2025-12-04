<template>
  <div class="settings-container">
    <el-container>
      <el-header>
        <div class="header-content">
          <el-button @click="router.back()" :icon="ArrowLeft">
            {{ t('common.back') }}
          </el-button>
          <h2>{{ t('user.settings') }}</h2>
          <div></div>
        </div>
      </el-header>

      <el-main>
        <el-card>
          <template #header>
            <h3>{{ t('user.changePassword') }}</h3>
          </template>

          <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" style="max-width: 500px">
            <el-form-item :label="t('user.oldPassword')" prop="oldPassword">
              <el-input v-model="form.oldPassword" type="password" show-password />
            </el-form-item>

            <el-form-item :label="t('user.newPassword')" prop="newPassword">
              <el-input v-model="form.newPassword" type="password" show-password />
            </el-form-item>

            <el-form-item :label="t('user.confirmPassword')" prop="confirmPassword">
              <el-input v-model="form.confirmPassword" type="password" show-password />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSubmit" :loading="loading">
                {{ t('common.save') }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { userAPI } from '@/api/user'

const router = useRouter()
const { t } = useI18n()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirm = (rule: any, value: any, callback: any) => {
  if (value !== form.value.newPassword) {
    callback(new Error('两次密码输入不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await userAPI.changePassword(form.value.oldPassword, form.value.newPassword)
      ElMessage.success(t('common.success'))
      form.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.settings-container {
  height: 100vh;
}

.el-header {
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.el-main {
  background: #f5f5f5;
}
</style>
