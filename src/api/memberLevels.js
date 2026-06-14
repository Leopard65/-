/**
 * 会员等级管理 API
 */
import api from './request'

export default {
  getMemberLevels: () => api.get('/member-levels').then(r => r.data),
  addMemberLevel: data => api.post('/member-levels', data).then(r => r.data),
  updateMemberLevel: (id, data) => api.put(`/member-levels/${id}`, data).then(r => r.data),
  deleteMemberLevel: id => api.delete(`/member-levels/${id}`).then(r => r.data),
}
