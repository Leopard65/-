/**
 * 退换货管理 API
 */
import api from './request'

export default {
  getReturns: params => api.get('/returns', { params }).then(r => r.data),
  getReturnDetail: id => api.get(`/returns/${id}`).then(r => r.data),
  createReturn: data => api.post('/returns', data).then(r => r.data),
  approveReturn: (id, data) => api.put(`/returns/${id}/approve`, data).then(r => r.data),
}
