/**
 * 仪表盘 API
 */
import api from './request'

export default {
  getDashboard: () => api.get('/dashboard').then(r => r.data),
}
