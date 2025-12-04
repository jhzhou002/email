<template>
  <div class="email-view-container">
    <el-container>
      <el-header>
        <div class="header-content">
          <el-button @click="router.back()" :icon="ArrowLeft">
            {{ t('common.back') }}
          </el-button>
          <h2>{{ t('email.detail') }}</h2>
          <div></div>
        </div>
      </el-header>

      <el-main v-loading="loading">
        <el-card v-if="email">
          <template #header>
            <div class="email-header">
              <h3>{{ email.subject }}</h3>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item :label="t('email.from')">
              {{ email.fromAddr }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('email.time')">
              {{ formatDate(email.receivedAt) }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('email.code')" v-if="email.extractedCode">
              <el-tag type="success" size="large" @click="copyCode(email.extractedCode!)">
                {{ email.extractedCode }}
                <el-icon style="margin-left: 5px"><CopyDocument /></el-icon>
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <el-divider />

          <div class="email-body">
            <div v-if="email.bodyHtml" v-html="email.bodyHtml"></div>
            <pre v-else-if="email.bodyText">{{ email.bodyText }}</pre>
            <p v-else>暂无邮件内容</p>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { ArrowLeft, CopyDocument } from '@element-plus/icons-vue'
import { emailAPI } from '@/api/email'
import type { Email } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const loading = ref(false)
const email = ref<Email | null>(null)

const loadEmail = async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    email.value = await emailAPI.getEmailById(id)
  } catch (error) {
    ElMessage.error('加载邮件失败')
    router.back()
  } finally {
    loading.value = false
  }
}

const copyCode = (code: string) => {
  navigator.clipboard.writeText(code)
  ElMessage.success(t('email.copiedSuccess'))
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString()
}

onMounted(() => {
  loadEmail()
})
</script>

<style scoped>
.email-view-container {
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

.email-header h3 {
  margin: 0;
}

.email-body {
  margin-top: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 4px;
  max-height: calc(100vh - 400px);
  overflow-y: auto;
  overflow-x: hidden;
}

.email-body pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.email-body :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
