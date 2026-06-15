/**
 * 商品管理 API
 */
import api from './request'

export default {
  getProducts: params => api.get('/products', { params }).then(r => r.data),
  addProduct: data => api.post('/products', data).then(r => r.data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data).then(r => r.data),
  deleteProduct: id => api.delete(`/products/${id}`).then(r => r.data),
  importProducts: items => api.post('/products/import', { items }).then(r => r.data),
}
