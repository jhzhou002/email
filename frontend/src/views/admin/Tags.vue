<template>
  <div class="tags-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>标签列表</span>
          <el-button type="primary" :icon="Plus" @click="handleAdd">添加标签</el-button>
        </div>
      </template>

      <el-table :data="tags" v-loading="loading" style="width: 100%" border>
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="nameZh" label="中文名称" min-width="150" />
        <el-table-column prop="nameEn" label="英文名称" min-width="180" />
        <el-table-column prop="createdAt" label="创建时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑标签对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑标签' : '添加标签'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="中文名称" prop="nameZh">
          <el-input v-model="form.nameZh" placeholder="请输入中文名称" />
        </el-form-item>
        <el-form-item label="英文名称" prop="nameEn">
          <el-input v-model="form.nameEn" placeholder="请输入英文名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
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
import { emailAPI } from '@/api/email'
import type { Tag } from '@/types'

const loading = ref(false)
const tags = ref<Tag[]>([])

const dialogVisible = ref(false)
const submitLoading = ref(false)
const isEdit = ref(false)
const currentTag = ref<Tag | null>(null)
const formRef = ref<FormInstance>()
const form = ref({
  nameZh: '',
  nameEn: ''
})

const rules: FormRules = {
  nameZh: [{ required: true, message: '请输入中文名称', trigger: 'blur' }],
  nameEn: [{ required: true, message: '请输入英文名称', trigger: 'blur' }]
}

const loadTags = async () => {
  loading.value = true
  try {
    tags.value = await emailAPI.getTags()
  } catch (error) {
    ElMessage.error('加载标签列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  currentTag.value = null
  form.value = {
    nameZh: '',
    nameEn: ''
  }
  dialogVisible.value = true
}

const handleEdit = (tag: Tag) => {
  isEdit.value = true
  currentTag.value = tag
  form.value = {
    nameZh: tag.nameZh,
    nameEn: tag.nameEn
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      if (isEdit.value && currentTag.value) {
        await adminAPI.updateTag(currentTag.value.id, form.value.nameZh, form.value.nameEn)
        ElMessage.success('更新成功')
      } else {
        await adminAPI.addTag(form.value.nameZh, form.value.nameEn)
        ElMessage.success('添加成功')
      }
      dialogVisible.value = false
      loadTags()
    } catch (error) {
      ElMessage.error(isEdit.value ? '更新失败' : '添加失败')
    } finally {
      submitLoading.value = false
    }
  })
}

const handleDelete = async (tag: Tag) => {
  try {
    await ElMessageBox.confirm(`确定要删除标签 "${tag.nameZh}" 吗？`, '警告', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    })

    await adminAPI.deleteTag(tag.id)
    ElMessage.success('删除成功')
    loadTags()
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
  loadTags()
})
</script>

<style scoped>
.tags-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
