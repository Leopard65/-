import api from './request'

export default {
  getAdjustments: params => api.get('/inventory/adjustments', { params }).then(r => r.data),
  addAdjustment: data => api.post('/inventory/adjustments', data).then(r => r.data)
}
