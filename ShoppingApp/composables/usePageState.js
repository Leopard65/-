import { ref } from 'vue'

export function usePageState() {
  const loading = ref(false)
  const error = ref('')

  const run = async (task, fallbackMessage = '网络开小差了') => {
    loading.value = true
    error.value = ''
    try {
      return await task()
    } catch (err) {
      error.value = err?.message || fallbackMessage
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    run
  }
}
