/**
 * 供应商管理 API
 */
import api from './request'

export default {
  getSuppliers: params => api.get('/suppliers', { params }).then(r => r.data),
  addSupplier: data => api.post('/suppliers', data).then(r => r.data),
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data).then(r => r.data),
  deleteSupplier: id => api.delete(`/suppliers/${id}`).then(r => r.data),
}
