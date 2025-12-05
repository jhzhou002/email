<template>
  <div class="register-container">
    <div class="register-card">
      <!-- Logo & Title -->
      <div class="brand-header">
        <div class="logo-wrapper">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M3 7L12 13L21 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="17" cy="9" r="2" fill="currentColor"/>
          </svg>
        </div>
        <h1 class="brand-title">加号邮箱</h1>
        <p class="brand-subtitle">Plus Email</p>
      </div>

      <!-- Register Form -->
      <el-form :model="form" :rules="rules" ref="formRef" class="register-form">
        <el-form-item prop="email">
          <el-input
            v-model="form.email"
            :placeholder="t('auth.emailPlaceholder')"
            size="large"
            :prefix-icon="Message"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="t('auth.passwordPlaceholder')"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-button
          type="primary"
          @click="handleRegister"
          :loading="loading"
          size="large"
          class="register-button"
        >
          {{ t('auth.register') }}
        </el-button>

        <div class="footer-links">
          <span class="link-text">已有账号？</span>
          <el-button link type="primary" @click="router.push('/login')" class="login-link">
            {{ t('auth.login') }}
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Message, Lock } from '@element-plus/icons-vue'
import { authAPI } from '@/api/auth'

const router = useRouter()
const { t } = useI18n()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = ref({
  email: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.value.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  email: [{ required: true, message: t('auth.emailPlaceholder'), trigger: 'blur' }],
  password: [
    { required: true, message: t('auth.passwordPlaceholder'), trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await authAPI.register(form.value.email, form.value.password)
      ElMessage.success(t('auth.registerSuccess'))
      router.push('/login')
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.register-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Brand Header */
.brand-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
  border-radius: 20px;
  margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.4);
}

.logo-icon {
  width: 48px;
  height: 48px;
  color: #ffffff;
}

.brand-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  font-size: 14px;
  color: #8b8b8b;
  margin: 0;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* Form Styles */
.register-form {
  margin-top: 32px;
}

.register-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.register-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 8px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.register-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.register-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.2);
}

.register-form :deep(.el-input__prefix) {
  font-size: 18px;
  color: #8b8b8b;
}

.register-form :deep(.el-input__inner) {
  font-size: 15px;
}

/* Register Button */
.register-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
  border: none;
  margin-top: 8px;
  box-shadow: 0 8px 20px rgba(14, 165, 233, 0.3);
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
}

.register-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(14, 165, 233, 0.4);
}

.register-button:active {
  transform: translateY(0);
}

/* Footer Links */
.footer-links {
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e8e8e8;
}

.link-text {
  font-size: 14px;
  color: #8b8b8b;
  margin-right: 8px;
}

.login-link {
  font-size: 14px;
  font-weight: 600;
  padding: 0;
}

.login-link:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 480px) {
  .register-card {
    padding: 36px 24px;
    border-radius: 16px;
  }

  .brand-title {
    font-size: 28px;
  }

  .logo-wrapper {
    width: 64px;
    height: 64px;
  }

  .logo-icon {
    width: 40px;
    height: 40px;
  }
}
</style>
