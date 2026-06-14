/**
 * 进货管理 API
 */
import api from './request'

export default {
  getPurchases: params => api.get('/purchases', { params }).then(r => r.data),
  addPurchase: data => api.post('/purchases', data).then(r => r.data),
}
