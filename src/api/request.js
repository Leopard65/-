/**
 * Axios 实例配置
 * 统一的请求/响应拦截器
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({ baseURL: '/api' })

// 请求拦截器 - 注入 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截器 - 统一错误处理
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

export default api
