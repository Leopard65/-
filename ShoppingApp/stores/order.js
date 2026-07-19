import { defineStore } from 'pinia'
import { api } from '@/api/client'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orderList: [],
    currentOrder: null
  }),

  actions: {
    async getOrderList(params = {}) {
      const res = await api.order.getOrderList(params)
      if (res && res.code === 0) {
        this.orderList = res.data?.list || res.data || []
      }
      return res
    },
    async getOrderDetail(orderId) {
      const res = await api.order.getOrderDetail({ order_id: orderId })
      if (res && res.code === 0) this.currentOrder = res.data
      return res
    },
    async createOrder(params) {
      return api.order.createOrder(params)
    },
    async payOrder(params) {
      const res = await api.order.payOrder(params)
      if (res && res.code === 0) this.currentOrder = res.data
      return res
    }
  }
})
