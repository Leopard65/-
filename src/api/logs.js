/**
 * 操作日志 API
 */
import api from './request'

export default {
  getLogs: params => api.get('/logs', { params }).then(r => r.data),
}
