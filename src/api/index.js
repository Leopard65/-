import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default {
  // 仪表盘
  getDashboard: () => api.get('/dashboard').then(r => r.data),

  // 分类
  getCategories: () => api.get('/categories').then(r => r.data),
  addCategory: data => api.post('/categories', data).then(r => r.data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data).then(r => r.data),
  deleteCategory: id => api.delete(`/categories/${id}`).then(r => r.data),

  // 商品
  getProducts: params => api.get('/products', { params }).then(r => r.data),
  addProduct: data => api.post('/products', data).then(r => r.data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data).then(r => r.data),
  deleteProduct: id => api.delete(`/products/${id}`).then(r => r.data),

  // 会员
  getMembers: params => api.get('/members', { params }).then(r => r.data),
  addMember: data => api.post('/members', data).then(r => r.data),
  updateMember: (id, data) => api.put(`/members/${id}`, data).then(r => r.data),
  deleteMember: id => api.delete(`/members/${id}`).then(r => r.data),

  // 供应商
  getSuppliers: () => api.get('/suppliers').then(r => r.data),
  addSupplier: data => api.post('/suppliers', data).then(r => r.data),
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data).then(r => r.data),
  deleteSupplier: id => api.delete(`/suppliers/${id}`).then(r => r.data),

  // 进货
  getPurchases: () => api.get('/purchases').then(r => r.data),
  addPurchase: data => api.post('/purchases', data).then(r => r.data),

  // 销售
  getSales: () => api.get('/sales').then(r => r.data),
  addSale: data => api.post('/sales', data).then(r => r.data),
}
