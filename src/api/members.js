/**
 * 会员管理 API
 */
import api from './request'

export default {
  getMembers: params => api.get('/members', { params }).then(r => r.data),
  addMember: data => api.post('/members', data).then(r => r.data),
  updateMember: (id, data) => api.put(`/members/${id}`, data).then(r => r.data),
  deleteMember: id => api.delete(`/members/${id}`).then(r => r.data),
}
