/**
 * 用户管理 API（仅管理员可用）
 */
import api from './request'

export default {
  getUsers: () => api.get('/users').then(r => r.data),
  addUser: data => api.post('/users', data).then(r => r.data),
  updateUser: (id, data) => api.put(`/users/${id}`, data).then(r => r.data),
}
