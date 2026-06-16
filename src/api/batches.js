/**
 * 商品批次 / 保质期 API
 */
import api from './request'

export default {
  getBatches: params => api.get('/batches', { params }).then(r => r.data),
  getBatchSummary: params => api.get('/batches/summary', { params }).then(r => r.data),
  addBatch: data => api.post('/batches', data).then(r => r.data),
  updateBatch: (id, data) => api.put(`/batches/${id}`, data).then(r => r.data),
  deleteBatch: id => api.delete(`/batches/${id}`).then(r => r.data),
  clearBatch: id => api.post(`/batches/${id}/clear`).then(r => r.data),
}
