import { defineStore } from 'pinia'
import { ref } from 'vue'

interface ErrorLog {
  id: string
  message: string
  timestamp: Date
  level: 'error' | 'warning' | 'info'
  data?: any
}

export const useErrorLogStore = defineStore('errorLog', () => {
  const errors = ref<ErrorLog[]>([])
  const maxErrors = 50 // 最多保留50条错误

  function addError(message: string, level: 'error' | 'warning' | 'info' = 'error', data?: any) {
    const error: ErrorLog = {
      id: Date.now().toString(),
      message,
      timestamp: new Date(),
      level,
      data
    }

    errors.value.unshift(error) // 新错误放在前面

    // 超过限制时删除最老的错误
    if (errors.value.length > maxErrors) {
      errors.value.pop()
    }

    console.log(`📋 [ErrorLog] ${level.toUpperCase()}: ${message}`, data)
  }

  function clearErrors() {
    errors.value = []
  }

  function removeError(id: string) {
    errors.value = errors.value.filter(e => e.id !== id)
  }

  return {
    errors,
    addError,
    clearErrors,
    removeError
  }
})
