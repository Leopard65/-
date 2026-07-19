import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    networkReady: true,
    lastError: ''
  }),
  actions: {
    setError(message) {
      this.lastError = message || ''
    },
    clearError() {
      this.lastError = ''
    }
  }
})
