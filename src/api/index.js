import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({ baseURL: '/api' })

// 请求拦截器 - 注入 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截器 - 完善错误提示
api.interceptors.response.use(
  response => response,
  error => {
    const { status, data } = error.response || {};

    switch (status) {
      case 400:
        ElMessage.error(data?.error || '请求参数错误');
        break;
      case 401:
        ElMessage.error('登录已过期，请重新登录');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        break;
      case 403:
        ElMessage.error('权限不足');
        break;
      case 404:
        ElMessage.error('请求的资源不存在');
        break;
      case 500:
        ElMessage.error('服务器错误，请稍后重试');
        break;
      default:
        if (!error.response) {
          ElMessage.error('网络错误，请检查网络连接');
        }
    }

    return Promise.reject(error)
  }
)

export default {
  // 认证
  login: data => api.post('/auth/login', data).then(r => r.data),
  getMe: () => api.get('/auth/me').then(r => r.data),
  changePassword: data => api.put('/auth/password', data).then(r => r.data),

  // 仪表盘
  getDashboard: () => api.get('/dashboard').then(r => r.data),

  // 分类
  getCategories: () => api.get('/categories').then(r => r.data),
  addCategory: data => api.post('/categories', data).then(r => r.data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data).then(r => r.data),
  deleteCategory: id => api.delete(`/categories/${id}`).then(r => r.data),

  // 商品（分页）
  getProducts: params => api.get('/products', { params }).then(r => r.data),
  addProduct: data => api.post('/products', data).then(r => r.data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data).then(r => r.data),
  deleteProduct: id => api.delete(`/products/${id}`).then(r => r.data),

  // 会员（分页）
  getMembers: params => api.get('/members', { params }).then(r => r.data),
  addMember: data => api.post('/members', data).then(r => r.data),
  updateMember: (id, data) => api.put(`/members/${id}`, data).then(r => r.data),
  deleteMember: id => api.delete(`/members/${id}`).then(r => r.data),

  // 供应商（分页）
  getSuppliers: params => api.get('/suppliers', { params }).then(r => r.data),
  addSupplier: data => api.post('/suppliers', data).then(r => r.data),
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data).then(r => r.data),
  deleteSupplier: id => api.delete(`/suppliers/${id}`).then(r => r.data),

  // 进货（分页）
  getPurchases: params => api.get('/purchases', { params }).then(r => r.data),
  addPurchase: data => api.post('/purchases', data).then(r => r.data),

  // 销售（分页）
  getSales: params => api.get('/sales', { params }).then(r => r.data),
  addSale: data => api.post('/sales', data).then(r => r.data),
  getSaleDetail: id => api.get(`/sales/${id}`).then(r => r.data),

  // 退换货（分页）
  getReturns: params => api.get('/returns', { params }).then(r => r.data),
  getReturnDetail: id => api.get(`/returns/${id}`).then(r => r.data),
  createReturn: data => api.post('/returns', data).then(r => r.data),
  approveReturn: (id, data) => api.put(`/returns/${id}/approve`, data).then(r => r.data),

  // 会员等级
  getMemberLevels: () => api.get('/member-levels').then(r => r.data),
  addMemberLevel: data => api.post('/member-levels', data).then(r => r.data),
  updateMemberLevel: (id, data) => api.put(`/member-levels/${id}`, data).then(r => r.data),
  deleteMemberLevel: id => api.delete(`/member-levels/${id}`).then(r => r.data),

  // 操作日志（分页）
  getLogs: params => api.get('/logs', { params }).then(r => r.data),

  // 报表统计
  getDailySales: params => api.get('/reports/sales/daily', { params }).then(r => r.data),
  getProductSalesRank: params => api.get('/reports/sales/products', { params }).then(r => r.data),
  getCategorySales: params => api.get('/reports/sales/categories', { params }).then(r => r.data),
  getPaymentStats: params => api.get('/reports/sales/payments', { params }).then(r => r.data),
  getInventoryWarning: () => api.get('/reports/inventory/warning').then(r => r.data),
  getInventoryValue: () => api.get('/reports/inventory/value').then(r => r.data),
  getGrossProfit: params => api.get('/reports/profit/gross', { params }).then(r => r.data),
  getMonthlyProfit: params => api.get('/reports/profit/monthly', { params }).then(r => r.data),
}
