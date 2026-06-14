/**
 * 报表统计 API
 */
import api from './request'

export default {
  getDailySales: params => api.get('/reports/sales/daily', { params }).then(r => r.data),
  getProductSalesRank: params => api.get('/reports/sales/products', { params }).then(r => r.data),
  getCategorySales: params => api.get('/reports/sales/categories', { params }).then(r => r.data),
  getPaymentStats: params => api.get('/reports/sales/payments', { params }).then(r => r.data),
  getInventoryWarning: () => api.get('/reports/inventory/warning').then(r => r.data),
  getInventoryValue: () => api.get('/reports/inventory/value').then(r => r.data),
  getGrossProfit: params => api.get('/reports/profit/gross', { params }).then(r => r.data),
  getMonthlyProfit: params => api.get('/reports/profit/monthly', { params }).then(r => r.data),
}
