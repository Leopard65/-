/**
 * 销售管理 API
 */
import api from './request'

export default {
  getSales: params => api.get('/sales', { params }).then(r => r.data),
  addSale: data => api.post('/sales', data).then(r => r.data),
  getSaleDetail: id => api.get(`/sales/${id}`).then(r => r.data),
}
