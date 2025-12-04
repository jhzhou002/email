<template>
  <div class="login-container">
    <div class="login-card">
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

      <!-- Login Form -->
      <el-form :model="form" :rules="rules" ref="formRef" class="login-form">
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
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item prop="captchaAnswer">
          <el-input
            v-model.number="form.captchaAnswer"
            :placeholder="`${captchaQuestion || '验证码'}`"
            size="large"
            :prefix-icon="Key"
            @keyup.enter="handleLogin"
          >
            <template #append>
              <el-button @click="loadCaptcha" :icon="Refresh" />
            </template>
          </el-input>
        </el-form-item>

        <el-button
          type="primary"
          @click="handleLogin"
          :loading="loading"
          size="large"
          class="login-button"
        >
          {{ t('auth.login') }}
        </el-button>

        <div class="footer-links">
          <span class="link-text">还没有账号？</span>
          <el-button link type="primary" @click="router.push('/register')" class="register-link">
            {{ t('auth.register') }}
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Refresh, Message, Lock, Key } from '@element-plus/icons-vue'
import { authAPI } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const captchaQuestion = ref('')
const captchaAnswer = ref(0)

const form = ref({
  email: '',
  password: '',
  captchaAnswer: undefined as number | undefined
})

const rules: FormRules = {
  email: [{ required: true, message: t('auth.emailPlaceholder'), trigger: 'blur' }],
  password: [{ required: true, message: t('auth.passwordPlaceholder'), trigger: 'blur' }],
  captchaAnswer: [{ required: true, message: '请输入验证码答案', trigger: 'blur' }]
}

const loadCaptcha = async () => {
  try {
    const data = await authAPI.getCaptcha()
    captchaQuestion.value = data.question
    captchaAnswer.value = data.answer
    console.log('✅ 验证码已加载:', captchaQuestion.value)
  } catch (error) {
    console.error('❌ 获取验证码失败:', error)
    ElMessage.error('获取验证码失败')
  }
}

const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      console.log('🔐 开始登录...')
      console.log('📧 邮箱:', form.value.email)
      
      const data = await authAPI.login(
        form.value.email,
        form.value.password,
        form.value.captchaAnswer!,
        captchaAnswer.value
      )

      console.log('✅ 登录成功，收到 Token')
      console.log('📝 AccessToken:', data.accessToken.substring(0, 20) + '...')
      console.log('🔄 RefreshToken:', data.refreshToken.substring(0, 20) + '...')

      authStore.setTokens(data.accessToken, data.refreshToken)
      console.log('💾 Token 已存储到 localStorage')

      const userInfo = await authAPI.getCurrentUser()
      console.log('👤 获取用户信息:', userInfo.user)
      
      authStore.setUser(userInfo.user)
      console.log('💾 用户信息已存储')
      console.log('👑 用户角色:', userInfo.user.isAdmin ? '管理员' : '普通用户')

      ElMessage.success(t('auth.loginSuccess'))

      if (userInfo.user.isAdmin) {
        console.log('🚀 重定向到管理员仪表盘: /admin/dashboard')
        router.push('/admin/dashboard')
      } else {
        console.log('🚀 重定向到用户邮箱列表: /inbox')
        router.push('/inbox')
      }
    } catch (error: any) {
      console.error('❌ 登录失败:', error)
      console.error('错误消息:', error.message)
      console.error('响应数据:', error.response?.data)
      
      // 显示错误消息，时间更长以便用户看到
      const errorMsg = error.response?.data?.message || error.message || '登录失败，请稍后重试'
      ElMessage.error({
        message: errorMsg,
        duration: 5000, // 5秒显示
        showClose: true
      })
      
      // 延迟后重新加载验证码
      setTimeout(() => {
        loadCaptcha()
      }, 1000)
    } finally {
      loading.value = false
    }
  })
}

onMounted(() => {
  loadCaptcha()
})
</script>

<style scoped>
.login-container {
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

.login-card {
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
.login-form {
  margin-top: 32px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 8px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.2);
}

.login-form :deep(.el-input__prefix) {
  font-size: 18px;
  color: #8b8b8b;
}

.login-form :deep(.el-input__inner) {
  font-size: 15px;
}

.login-form :deep(.el-input-group__append) {
  border-radius: 0 12px 12px 0;
  background: #f5f5f5;
  border: none;
  box-shadow: none;
}

.login-form :deep(.el-input-group__append .el-button) {
  background: transparent;
  border: none;
  color: #0ea5e9;
}

/* Login Button */
.login-button {
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

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(14, 165, 233, 0.4);
}

.login-button:active {
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

.register-link {
  font-size: 14px;
  font-weight: 600;
  padding: 0;
}

.register-link:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 480px) {
  .login-card {
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
