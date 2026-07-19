import { mockService } from '@/mock/service'
import { ROUTES } from '@/constants/routes'
import { readAuthToken, clearAuthSession } from '@/utils/auth'
import { recordApiError } from '@/utils/diagnostics'
import runtimeConfig, { shouldPreferLocalMock, shouldUseManualDemoCloud } from '@/config/runtime'

let hasTriedManualCloudInit = false
let manualUniCloudClient = null
const CLOUD_CALL_TIMEOUT = 8000
const UPLOAD_SCENES = ['goods', 'evaluate', 'aftersale', 'avatar']

const initDemoCloudSpace = () => {
  if (manualUniCloudClient) return true
  if (hasTriedManualCloudInit) return false
  hasTriedManualCloudInit = true
  if (typeof uniCloud === 'undefined' || typeof uniCloud.init !== 'function') return false
  try {
    manualUniCloudClient = uniCloud.init(runtimeConfig.cloudSpace)
    return Boolean(manualUniCloudClient)
  } catch (error) {
    return false
  }
}

const invokeCloudFunction = (cloudFunction, action, params) => {
  const token = readAuthToken()
  const cloudClient = manualUniCloudClient || uniCloud
  return cloudClient.callFunction({
    name: cloudFunction,
    data: {
      action,
      params: {
        ...params,
        uniIdToken: token,
        token
      },
      uniIdToken: token,
      token
    }
  })
}

const normalizeCloudResult = (res) => {
  const result = res?.result
  if (result && result.code !== undefined) return result
  return null
}

const withTimeout = (promise, timeout = CLOUD_CALL_TIMEOUT) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('cloud call timeout')), timeout)
  promise
    .then(resolve)
    .catch(reject)
    .finally(() => clearTimeout(timer))
})

const getCurrentRoute = () => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  if (!current?.route) return ROUTES.home
  const query = current.options || {}
  const queryString = Object.keys(query)
    .map(key => `${key}=${encodeURIComponent(query[key])}`)
    .join('&')
  return `/${current.route}${queryString ? `?${queryString}` : ''}`
}

const clearLoginStorage = () => {
  clearAuthSession()
}

let isNavigatingLogin = false

const handleAuthFailure = (result, options = {}) => {
  if (Number(result?.code) !== 401 || options.handleAuthError === false) return
  clearLoginStorage()
  if (isNavigatingLogin) return
  const redirect = options.redirectUrl || getCurrentRoute()
  isNavigatingLogin = true
  uni.navigateTo({
    url: `${ROUTES.login}?redirect=${encodeURIComponent(redirect)}`,
    complete: () => {
      setTimeout(() => {
        isNavigatingLogin = false
      }, 500)
    }
  })
}

const formatCloudError = (error) => {
  const message = error?.message || error?.errMsg || ''
  if (/resource exhausted|resource busy|too many/i.test(message)) return '云数据库资源暂时繁忙，请稍后重试'
  if (/timeout|timed out/i.test(message)) return '云端响应超时，请检查网络后重试'
  if (/function not found|not found/i.test(message)) return '云函数未上传或名称不正确'
  if (/network|request|fail/i.test(message)) return '网络连接异常，请稍后重试'
  return message || '云端服务暂不可用，请确认服务空间已关联并上传云函数'
}

const classifyApiError = (resultOrError) => {
  const code = Number(resultOrError?.code || 0)
  const errCode = resultOrError?.errCode || ''
  const message = resultOrError?.msg || resultOrError?.message || ''

  if (code === 401 || /TOKEN_|登录|token/i.test(errCode + message)) return 'auth'
  if (code === 403 || /权限|forbidden/i.test(message)) return 'permission'
  if (/resource exhausted|资源.*繁忙/i.test(message)) return 'resource_busy'
  if (/timeout|timed out|超时/i.test(message)) return 'timeout'
  if (/function not found|云函数未上传|not found/i.test(message)) return 'cloud_function'
  if (/network|request|网络/i.test(message)) return 'network'
  return code >= 500 ? 'server' : 'business'
}

const logApiError = (cloudFunction, action, resultOrError) => {
  recordApiError({
    cloudFunction,
    action,
    category: classifyApiError(resultOrError),
    code: Number(resultOrError?.code || 0),
    msg: resultOrError?.msg || resultOrError?.message || '接口调用失败'
  })
}

const buildApiMeta = ({ source, cloudFunction, action, cloudError = null, retried = false }) => ({
  source,
  cloudFunction,
  action,
  retried,
  checkedAt: Date.now(),
  cloudError: cloudError
    ? {
        category: classifyApiError(cloudError),
        message: formatCloudError(cloudError)
      }
    : null
})

const attachApiMeta = (result, meta) => {
  const normalized = result || { code: 500, msg: '接口返回为空', data: null }
  const data = normalized.data && typeof normalized.data === 'object' && !Array.isArray(normalized.data)
    ? { ...normalized.data, __meta: meta, __source: meta.source }
    : normalized.data
  return {
    ...normalized,
    data,
    __meta: meta,
    __source: meta.source
  }
}

const showResultError = (result, options = {}) => {
  if (!options.showError || !result || result.code === 0) return
  uni.showToast({ title: result.msg || '操作失败，请稍后重试', icon: 'none' })
}

const getUploadExt = (filePath = '') => {
  const cleanPath = String(filePath).split('?')[0]
  const ext = cleanPath.includes('.') ? cleanPath.split('.').pop().toLowerCase() : ''
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg'
}

export const uploadImage = async (params = {}, options = {}) => {
  const { filePath = '', scene = 'goods' } = params
  const { loading = true, showError = true } = options
  if (!filePath) {
    const result = { code: 400, msg: '请选择要上传的图片', data: null }
    showResultError(result, { showError })
    return result
  }
  if (/^(https?:\/\/|cloud:\/\/)/.test(filePath)) {
    return { code: 0, msg: 'success', data: { url: filePath, fileID: filePath } }
  }
  if (typeof uniCloud === 'undefined' || typeof uniCloud.uploadFile !== 'function') {
    const result = { code: 503, msg: '云存储不可用，请确认服务空间已关联', data: null }
    showResultError(result, { showError })
    return result
  }

  const safeScene = UPLOAD_SCENES.includes(scene) ? scene : 'goods'
  const ext = getUploadExt(filePath)
  const cloudPath = `xc/${safeScene}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  if (loading) uni.showLoading({ title: '上传中', mask: true })
  try {
    const res = await withTimeout(uniCloud.uploadFile({ filePath, cloudPath }), CLOUD_CALL_TIMEOUT)
    const url = res.fileID || res.url || ''
    return { code: 0, msg: '上传成功', data: { url, fileID: res.fileID || url, cloudPath } }
  } catch (error) {
    const result = { code: 503, msg: formatCloudError(error), data: null }
    logApiError('uniCloud.uploadFile', safeScene, { ...error, ...result })
    showResultError(result, { showError })
    return result
  } finally {
    if (loading) uni.hideLoading()
  }
}

export const callApi = async (cloudFunction, action, params = {}, options = {}) => {
  const { loading = true, showError = true, preferMock = false, allowMock = true } = options
  const useMockFirst = preferMock || shouldPreferLocalMock()
  if (loading) uni.showLoading({ title: '加载中', mask: true })

  let cloudError = null
  try {
    if (!useMockFirst) {
      if (shouldUseManualDemoCloud()) initDemoCloudSpace()
      const result = normalizeCloudResult(await withTimeout(invokeCloudFunction(cloudFunction, action, params)))
      if (result) {
        if (result.code !== 0) logApiError(cloudFunction, action, result)
        handleAuthFailure(result, options)
        showResultError(result, { ...options, showError })
        return attachApiMeta(result, buildApiMeta({ source: 'cloud', cloudFunction, action }))
      }
    }
  } catch (error) {
    cloudError = error
    if (!useMockFirst && initDemoCloudSpace()) {
      try {
        const result = normalizeCloudResult(await withTimeout(invokeCloudFunction(cloudFunction, action, params)))
        if (result) {
          if (result.code !== 0) logApiError(cloudFunction, action, result)
          handleAuthFailure(result, options)
          showResultError(result, { ...options, showError })
          return attachApiMeta(result, buildApiMeta({ source: 'cloud', cloudFunction, action, retried: true }))
        }
      } catch (retryError) {
        cloudError = retryError
      }
    }
    // Local mock keeps the app usable before cloud spaces and third-party services are ready.
  } finally {
    if (loading) uni.hideLoading()
  }

  if (!allowMock) {
    const result = {
      code: 503,
      msg: formatCloudError(cloudError),
      data: null
    }
    logApiError(cloudFunction, action, { ...cloudError, ...result })
    showResultError(result, { ...options, showError })
    return attachApiMeta(result, buildApiMeta({ source: 'cloud-error', cloudFunction, action, cloudError }))
  }

  if (cloudError && !useMockFirst) logApiError(cloudFunction, action, cloudError)
  const fallback = await mockService.call(action, params, cloudFunction)
  if (fallback?.code !== 0) logApiError(cloudFunction, action, fallback)
  handleAuthFailure(fallback, options)
  showResultError(fallback, { ...options, showError })
  return attachApiMeta(
    fallback,
    buildApiMeta({
      source: useMockFirst ? 'mock' : 'mock-fallback',
      cloudFunction,
      action,
      cloudError
    })
  )
}

const bind = (cloudFunction, action, defaults = {}) => (params = {}, options = {}) =>
  callApi(cloudFunction, action, params, { ...defaults, ...options })

export const api = {
  user: {
    sendSmsCode: bind('user-center', 'sendSmsCode', { handleAuthError: false }),
    loginBySms: bind('user-center', 'loginBySms', { handleAuthError: false }),
    loginByPassword: bind('user-center', 'loginByPassword', { handleAuthError: false }),
    loginByWeixin: bind('user-center', 'loginByWeixin', { preferMock: true, handleAuthError: false }),
    register: bind('user-center', 'register', { handleAuthError: false }),
    checkToken: bind('user-center', 'checkToken', { handleAuthError: false }),
    setPassword: bind('user-center', 'setPassword'),
    bindMobile: bind('user-center', 'bindMobile'),
    getUserInfo: bind('user-center', 'getUserInfo'),
    updateUserInfo: bind('user-center', 'updateUserInfo'),
    changePassword: bind('user-center', 'changePassword'),
    requestAccountCancel: bind('user-center', 'requestAccountCancel'),
    getPrivacyStatus: bind('user-center', 'getPrivacyStatus'),
    updatePrivacyStatus: bind('user-center', 'updatePrivacyStatus'),
    logout: bind('user-center', 'logout')
  },
  goods: {
    getHomeData: bind('goods-center', 'getHomeData'),
    getCategoryList: bind('goods-center', 'getCategoryList'),
    getGoodsList: bind('goods-center', 'getGoodsList'),
    getGoodsByCategory: bind('goods-center', 'getGoodsByCategory'),
    getGoodsDetail: bind('goods-center', 'getGoodsDetail'),
    searchGoods: bind('goods-center', 'searchGoods')
  },
  cart: {
    addToCart: bind('cart-center', 'addToCart'),
    getCartList: bind('cart-center', 'getCartList'),
    updateCartQuantity: bind('cart-center', 'updateCartQuantity'),
    removeFromCart: bind('cart-center', 'removeFromCart'),
    clearCart: bind('cart-center', 'clearCart'),
    getCartCount: bind('cart-center', 'getCartCount')
  },
  order: {
    createOrder: bind('order-center', 'createOrder'),
    getOrderList: bind('order-center', 'getOrderList'),
    getOrderDetail: bind('order-center', 'getOrderDetail'),
    payOrder: bind('order-center', 'payOrder'),
    cancelOrder: bind('order-center', 'cancelOrder'),
    confirmReceive: bind('order-center', 'confirmReceive'),
    deleteOrder: bind('order-center', 'deleteOrder'),
    getLogistics: bind('order-center', 'getLogistics')
  },
  address: {
    getAddressList: bind('address-center', 'getAddressList'),
    addAddress: bind('address-center', 'addAddress'),
    updateAddress: bind('address-center', 'updateAddress'),
    deleteAddress: bind('address-center', 'deleteAddress'),
    setDefault: bind('address-center', 'setDefault'),
    getDefault: bind('address-center', 'getDefault')
  },
  service: {
    getCouponList: bind('service-center', 'getCouponList'),
    receiveCoupon: bind('service-center', 'receiveCoupon'),
    getCollectList: bind('service-center', 'getCollectList'),
    toggleCollect: bind('service-center', 'toggleCollect'),
    cancelCollect: bind('service-center', 'cancelCollect'),
    getMessageList: bind('service-center', 'getMessageList'),
    markAsRead: bind('service-center', 'markAsRead'),
    addEvaluate: bind('service-center', 'addEvaluate'),
    applyAfterSale: bind('service-center', 'applyAfterSale'),
    getAfterSaleList: bind('service-center', 'getAfterSaleList'),
    cancelAfterSale: bind('service-center', 'cancelAfterSale')
  },
  admin: {
    getDashboard: bind('admin-center', 'getDashboard'),
    getOpsReport: bind('admin-center', 'getOpsReport'),
    getGoodsList: bind('admin-center', 'getGoodsList'),
    createGoods: bind('admin-center', 'createGoods'),
    updateGoods: bind('admin-center', 'updateGoods'),
    deleteGoodsDraft: bind('admin-center', 'deleteGoodsDraft'),
    updateSkuList: bind('admin-center', 'updateSkuList'),
    updateGoodsStatus: bind('admin-center', 'updateGoodsStatus'),
    updateGoodsStock: bind('admin-center', 'updateGoodsStock'),
    getCouponList: bind('admin-center', 'getCouponList'),
    createCoupon: bind('admin-center', 'createCoupon'),
    updateCoupon: bind('admin-center', 'updateCoupon'),
    getCouponStats: bind('admin-center', 'getCouponStats'),
    updateCouponStatus: bind('admin-center', 'updateCouponStatus'),
    getMessageList: bind('admin-center', 'getMessageList'),
    publishMessage: bind('admin-center', 'publishMessage'),
    updateMessage: bind('admin-center', 'updateMessage'),
    getMessageStats: bind('admin-center', 'getMessageStats'),
    getOrderList: bind('admin-center', 'getOrderList'),
    shipOrder: bind('admin-center', 'shipOrder'),
    addOrderRemark: bind('admin-center', 'addOrderRemark'),
    updateShipment: bind('admin-center', 'updateShipment'),
    getAfterSaleList: bind('admin-center', 'getAfterSaleList'),
    auditAfterSale: bind('admin-center', 'auditAfterSale'),
    completeAfterSale: bind('admin-center', 'completeAfterSale'),
    addAfterSaleRemark: bind('admin-center', 'addAfterSaleRemark'),
    getOperationLogs: bind('admin-center', 'getOperationLogs')
  },
  diagnostics: {
    getHealthCheck: bind('admin-center', 'getHealthCheck'),
    getDeepHealthCheck: bind('admin-center', 'getDeepHealthCheck')
  },
  upload: {
    uploadImage
  },
  dev: {
    initStatus: bind('init-data', 'status'),
    seedDemo: bind('init-data', 'seed'),
    resetDemo: bind('init-data', 'resetDemo')
  }
}

export default api
