import { ROUTES } from '@/constants/routes'

export const getCurrentRoute = () => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const route = current?.route ? `/${current.route}` : ROUTES.home
  const options = current?.options || current?.$page?.options || {}
  const query = Object.entries(options)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
  return query ? `${route}?${query}` : route
}

export const requireLogin = (userStore, redirectUrl = getCurrentRoute()) => {
  if (userStore.isLogin) return true
  uni.navigateTo({
    url: `${ROUTES.login}?redirect=${encodeURIComponent(redirectUrl)}`
  })
  return false
}

export const go = (url, type = 'navigateTo') => {
  uni[type]({ url })
}
