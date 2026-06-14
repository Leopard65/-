/**
 * 认证相关 API
 */
import api from './request'

export default {
  login: data => api.post('/auth/login', data).then(r => r.data),
  getMe: () => api.get('/auth/me').then(r => r.data),
  changePassword: data => api.put('/auth/password', data).then(r => r.data),
}
