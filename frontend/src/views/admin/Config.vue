<template>
  <div class="config-page">
    <!-- IMAP配置 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>IMAP 配置</span>
          <el-button type="primary" size="small" @click="handleTestImap" :loading="testLoading">
            测试连接
          </el-button>
        </div>
      </template>

      <el-form 
        :model="imapConfig" 
        :rules="imapRules" 
        ref="imapFormRef" 
        label-width="120px"
        :disabled="!isEditing"
      >
        <el-form-item label="IMAP服务器" prop="imap_server">
          <el-input 
            v-model="imapConfig.imap_server" 
            placeholder="例如: imap.gmail.com"
            clearable
          />
        </el-form-item>

        <el-form-item label="IMAP端口" prop="imap_port">
          <el-input-number 
            v-model.number="imapConfig.imap_port" 
            :min="1"
            :max="65535"
            placeholder="例如: 993"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="IMAP用户名" prop="imap_user">
          <el-input 
            v-model="imapConfig.imap_user" 
            placeholder="邮箱地址或用户名"
            clearable
          />
        </el-form-item>

        <el-form-item label="IMAP密码" prop="imap_pass">
          <el-input 
            v-model="imapConfig.imap_pass" 
            type="password"
            placeholder="IMAP密码或应用专用密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="邮件检查间隔" prop="check_interval">
          <el-input-number
            v-model.number="imapConfig.check_interval"
            :min="1"
            placeholder="单位: 分钟"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <div style="margin-left: 120px; margin-top: 20px;">
        <el-button v-if="isEditing" type="primary" @click="handleSaveImap" :loading="saveLoading">
          保存配置
        </el-button>
        <el-button v-if="isEditing" @click="isEditing = false">
          取消编辑
        </el-button>
        <el-button v-if="!isEditing" @click="isEditing = true">
          编辑配置
        </el-button>
      </div>
    </el-card>

    <!-- SMTP配置与邮件测试 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>SMTP 配置与邮件测试</span>
        </div>
      </template>

      <el-form
        :model="smtpConfig"
        :rules="smtpRules"
        ref="smtpFormRef"
        label-width="120px"
        :disabled="!isSmtpEditing"
      >
        <el-form-item label="SMTP服务器" prop="smtp_server">
          <el-input
            v-model="smtpConfig.smtp_server"
            placeholder="例如: smtp.gmail.com"
            clearable
          />
        </el-form-item>

        <el-form-item label="SMTP端口" prop="smtp_port">
          <el-input-number
            v-model.number="smtpConfig.smtp_port"
            :min="1"
            :max="65535"
            placeholder="例如: 587 或 465"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="SMTP用户名" prop="smtp_user">
          <el-input
            v-model="smtpConfig.smtp_user"
            placeholder="邮箱地址或用户名"
            clearable
          />
        </el-form-item>

        <el-form-item label="SMTP密码" prop="smtp_pass">
          <el-input
            v-model="smtpConfig.smtp_pass"
            type="password"
            placeholder="SMTP密码或应用专用密码"
            show-password
            clearable
          />
        </el-form-item>
      </el-form>

      <div style="margin-left: 120px; margin-top: 20px; display: flex; gap: 10px;">
        <el-button v-if="isSmtpEditing" type="primary" @click="handleSaveSmtp" :loading="saveSmtpLoading">
          保存配置
        </el-button>
        <el-button v-if="isSmtpEditing" @click="isSmtpEditing = false">
          取消编辑
        </el-button>
        <el-button v-if="!isSmtpEditing" @click="isSmtpEditing = true">
          编辑配置
        </el-button>
        <el-button type="success" @click="testEmailDialogVisible = true" :disabled="!smtpConfig.smtp_server">
          测试邮件发送
        </el-button>
      </div>
    </el-card>

    <!-- 域名配置 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>域名配置</span>
        </div>
      </template>

      <el-form
        :model="domainConfig"
        :rules="domainRules"
        ref="domainFormRef"
        label-width="120px"
        :disabled="!isDomainEditing"
      >
        <el-form-item label="主域名" prop="main_domain">
          <el-input
            v-model="domainConfig.main_domain"
            placeholder="例如: aihubzone.shop 或 mail.example.com"
            clearable
          />
          <span style="color: #909399; font-size: 12px; margin-top: 5px; display: block;">
            用于生成子邮箱，支持主域名或二级域名
          </span>
        </el-form-item>
      </el-form>

      <div style="margin-left: 120px; margin-top: 20px;">
        <el-button v-if="isDomainEditing" type="primary" @click="handleSaveDomain" :loading="saveDomainLoading">
          保存配置
        </el-button>
        <el-button v-if="isDomainEditing" @click="isDomainEditing = false">
          取消编辑
        </el-button>
        <el-button v-if="!isDomainEditing" @click="isDomainEditing = true">
          编辑配置
        </el-button>
      </div>
    </el-card>

    <!-- 测试邮件发送对话框 -->
    <el-dialog v-model="testEmailDialogVisible" title="测试邮件发送" width="500px">
      <el-form :model="testEmailForm" :rules="testEmailRules" ref="testEmailFormRef" label-width="100px">
        <el-form-item label="收件人邮箱" prop="recipient">
          <el-input
            v-model="testEmailForm.recipient"
            placeholder="请输入收件人邮箱地址"
            clearable
          />
        </el-form-item>
        <el-alert
          title="将发送一封测试邮件到指定邮箱，用于验证SMTP配置是否正确"
          type="info"
          :closable="false"
          style="margin-top: 10px"
        />
      </el-form>
      <template #footer>
        <el-button @click="testEmailDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSendTestEmail" :loading="testEmailLoading">
          发送测试邮件
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { adminAPI } from '@/api/admin'

const imapFormRef = ref<FormInstance>()
const smtpFormRef = ref<FormInstance>()
const domainFormRef = ref<FormInstance>()
const testEmailFormRef = ref<FormInstance>()

const isEditing = ref(false)
const isSmtpEditing = ref(false)
const isDomainEditing = ref(false)

const saveLoading = ref(false)
const saveSmtpLoading = ref(false)
const saveDomainLoading = ref(false)
const testLoading = ref(false)
const testEmailLoading = ref(false)

const testEmailDialogVisible = ref(false)

const imapConfig = ref({
  imap_server: '',
  imap_port: 993,
  imap_user: '',
  imap_pass: '',
  check_interval: 5
})

const smtpConfig = ref({
  smtp_server: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: ''
})

const domainConfig = ref({
  main_domain: ''
})

const testEmailForm = ref({
  recipient: ''
})

const imapRules: FormRules = {
  imap_server: [
    { required: true, message: '请输入IMAP服务器地址', trigger: 'blur' }
  ],
  imap_port: [
    { required: true, message: '请输入IMAP端口', trigger: 'blur' }
  ],
  imap_user: [
    { required: true, message: '请输入IMAP用户名', trigger: 'blur' }
  ],
  imap_pass: [
    { required: true, message: '请输入IMAP密码', trigger: 'blur' }
  ]
}

const smtpRules: FormRules = {
  smtp_server: [
    { required: true, message: '请输入SMTP服务器地址', trigger: 'blur' }
  ],
  smtp_port: [
    { required: true, message: '请输入SMTP端口', trigger: 'blur' }
  ],
  smtp_user: [
    { required: true, message: '请输入SMTP用户名', trigger: 'blur' }
  ],
  smtp_pass: [
    { required: true, message: '请输入SMTP密码', trigger: 'blur' }
  ]
}

const domainRules: FormRules = {
  main_domain: [
    { required: true, message: '请输入主域名', trigger: 'blur' }
  ]
}

const testEmailRules: FormRules = {
  recipient: [
    { required: true, message: '请输入收件人邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ]
}

const loadSettings = async () => {
  try {
    const settings = await adminAPI.getSettings()

    // 注意：由于响应拦截器会将 snake_case 转换为 camelCase
    // 所以这里使用 camelCase 的键名
    if (settings.imapServer) {
      imapConfig.value = {
        imap_server: settings.imapServer || '',
        imap_port: parseInt(settings.imapPort) || 993,
        imap_user: settings.imapUser || '',
        imap_pass: settings.imapPass || '',
        check_interval: parseInt(settings.checkInterval) || 5
      }
    }

    if (settings.smtpServer) {
      smtpConfig.value = {
        smtp_server: settings.smtpServer || '',
        smtp_port: parseInt(settings.smtpPort) || 587,
        smtp_user: settings.smtpUser || '',
        smtp_pass: settings.smtpPass || ''
      }
    }

    if (settings.mainDomain) {
      domainConfig.value = {
        main_domain: settings.mainDomain || ''
      }
    }
  } catch (error) {
    ElMessage.error('加载配置失败')
  }
}

const handleTestImap = async () => {
  if (!imapFormRef.value) return

  await imapFormRef.value.validate(async (valid) => {
    if (!valid) return

    testLoading.value = true
    try {
      await adminAPI.testImap({
        imap_server: imapConfig.value.imap_server,
        imap_port: String(imapConfig.value.imap_port),
        imap_user: imapConfig.value.imap_user,
        imap_pass: imapConfig.value.imap_pass
      })
      ElMessage.success('IMAP连接测试成功！')
    } catch (error) {
      ElMessage.error('IMAP连接测试失败，请检查配置')
    } finally {
      testLoading.value = false
    }
  })
}

const handleSaveImap = async () => {
  if (!imapFormRef.value) return

  await imapFormRef.value.validate(async (valid) => {
    if (!valid) return

    saveLoading.value = true
    try {
      await adminAPI.updateSettings({
        imap_server: imapConfig.value.imap_server,
        imap_port: String(imapConfig.value.imap_port),
        imap_user: imapConfig.value.imap_user,
        imap_pass: imapConfig.value.imap_pass,
        check_interval: String(imapConfig.value.check_interval)
      })
      ElMessage.success('IMAP配置保存成功！')
      isEditing.value = false
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      saveLoading.value = false
    }
  })
}

const handleSaveDomain = async () => {
  if (!domainFormRef.value) return

  await domainFormRef.value.validate(async (valid) => {
    if (!valid) return

    saveDomainLoading.value = true
    try {
      await adminAPI.updateSettings({
        main_domain: domainConfig.value.main_domain
      })
      ElMessage.success('域名配置保存成功！')
      isDomainEditing.value = false
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      saveDomainLoading.value = false
    }
  })
}

const handleSaveSmtp = async () => {
  if (!smtpFormRef.value) return

  await smtpFormRef.value.validate(async (valid) => {
    if (!valid) return

    saveSmtpLoading.value = true
    try {
      await adminAPI.updateSettings({
        smtp_server: smtpConfig.value.smtp_server,
        smtp_port: String(smtpConfig.value.smtp_port),
        smtp_user: smtpConfig.value.smtp_user,
        smtp_pass: smtpConfig.value.smtp_pass
      })
      ElMessage.success('SMTP配置保存成功！')
      isSmtpEditing.value = false
    } catch (error) {
      // 错误已在拦截器处理
    } finally {
      saveSmtpLoading.value = false
    }
  })
}

const handleSendTestEmail = async () => {
  if (!testEmailFormRef.value) return

  await testEmailFormRef.value.validate(async (valid) => {
    if (!valid) return

    testEmailLoading.value = true
    try {
      await adminAPI.sendTestEmail(testEmailForm.value.recipient)
      ElMessage.success('测试邮件发送成功，请检查收件箱！')
      testEmailDialogVisible.value = false
      testEmailForm.value.recipient = ''
    } catch (error) {
      ElMessage.error('测试邮件发送失败')
    } finally {
      testEmailLoading.value = false
    }
  })
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.config-page {
  padding: 0;
}

.config-card {
  margin-bottom: 20px;
}

.config-card:last-child {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
