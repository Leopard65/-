import { defineStore } from 'pinia'
import { api } from '@/api/client'
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', {
  state: () => ({
    cartList: [],
    cartCount: 0,
    loading: false
  }),

  getters: {
    checkedGoods: (state) => state.cartList.filter(item => item.checked && !item.disabled),
    checkedTotal: (state) => state.cartList
      .filter(item => item.checked && !item.disabled)
      .reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
    checkedCount: (state) => state.cartList
      .filter(item => item.checked && !item.disabled)
      .reduce((sum, item) => sum + Number(item.quantity), 0),
    isAllChecked: (state) => state.cartList.length > 0 && state.cartList.every(item => item.checked || item.disabled),
    validList: (state) => state.cartList.filter(item => !item.disabled),
    invalidList: (state) => state.cartList.filter(item => item.disabled),
    hasInvalid: (state) => state.cartList.some(item => item.disabled)
  },

  actions: {
    async getCartList() {
      const userStore = useUserStore()
      if (!userStore.isLogin) {
        this.cartList = []
        this.cartCount = 0
        return
      }
      this.loading = true
      const res = await api.cart.getCartList({}, { showError: false })
      if (res && res.code === 0) {
        this.cartList = (res.data || []).map(item => ({ ...item, checked: item.checked !== false }))
        this.cartCount = this.cartList.reduce((sum, item) => sum + Number(item.quantity), 0)
      }
      this.loading = false
    },
    async addToCart(params) {
      const res = await api.cart.addToCart(params)
      if (res && res.code === 0) {
        uni.showToast({ title: res.msg || '已加入购物车', icon: 'success' })
        await this.getCartList()
      }
      return res
    },
    async updateQuantity(cartId, quantity) {
      const res = await api.cart.updateCartQuantity({ cart_id: cartId, quantity })
      if (res && res.code === 0) {
        const item = this.cartList.find(row => row._id === cartId)
        if (item) item.quantity = quantity
        this.cartCount = this.cartList.reduce((sum, row) => sum + Number(row.quantity), 0)
      }
      return res
    },
    async removeGoods(cartIds) {
      const res = await api.cart.removeFromCart({ cart_ids: cartIds })
      if (res && res.code === 0) {
        this.cartList = this.cartList.filter(item => !cartIds.includes(item._id))
        this.cartCount = this.cartList.reduce((sum, row) => sum + Number(row.quantity), 0)
      }
      return res
    },
    async removeInvalid() {
      const ids = this.cartList.filter(item => item.disabled).map(item => item._id)
      if (!ids.length) return
      return this.removeGoods(ids)
    },
    async clearCart() {
      const res = await api.cart.clearCart()
      if (res && res.code === 0) {
        this.cartList = []
        this.cartCount = 0
      }
      return res
    },
    toggleCheck(cartId) {
      const item = this.cartList.find(row => row._id === cartId)
      if (item && !item.disabled) item.checked = !item.checked
    },
    toggleAllCheck() {
      const checked = !this.isAllChecked
      this.cartList.forEach(item => {
        if (!item.disabled) item.checked = checked
      })
    }
  }
})
