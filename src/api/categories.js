/**
 * 分类管理 API
 */
import api from './request'

export default {
  getCategories: () => api.get('/categories').then(r => r.data),
  addCategory: data => api.post('/categories', data).then(r => r.data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data).then(r => r.data),
  deleteCategory: id => api.delete(`/categories/${id}`).then(r => r.data),
}
