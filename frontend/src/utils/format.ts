/**
 * 格式化日期时间
 * @param dateStr 日期字符串
 * @returns 格式化后的日期时间字符串
 */
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-'

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return '-'
    }

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch (error) {
    console.error('Date format error:', error)
    return '-'
  }
}

/**
 * 将 snake_case 对象键转换为 camelCase
 */
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 转换对象的所有键从 snake_case 到 camelCase
 */
export const convertKeysToCamelCase = <T = any>(obj: any): T => {
  if (obj === null || obj === undefined) return obj

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item)) as any
  }

  if (typeof obj === 'object') {
    const converted: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = toCamelCase(key)
        converted[camelKey] = convertKeysToCamelCase(obj[key])
      }
    }
    return converted
  }

  return obj
}
