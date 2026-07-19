<script setup>
import { computed, ref, shallowRef } from 'vue'
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { api } from '@/api/client'
import DiagnosticsSourceBanner from '@/components/dev/DiagnosticsSourceBanner.vue'
import { ROUTES } from '@/constants/routes'
import { useUserStore } from '@/stores/user'
import { readApiErrorLogs, clearApiErrorLogs } from '@/utils/diagnostics'
import runtimeConfig from '@/config/runtime'

const userStore = useUserStore()
const loading = shallowRef(false)
const checkMode = shallowRef('light')
const errorMessage = shallowRef('')
const result = ref(null)
const localErrors = ref([])

const collectionLabels = {
  home_banner: '首页 Banner',
  goods_category: '商品分类',
  goods: '商品',
  goods_sku: 'SKU',
  coupon: '优惠券',
  user_coupon: '用户券',
  message: '消息',
  goods_evaluate: '评价',
  user_address: '地址',
  order: '订单',
  after_sale: '售后',
  operation_log: '操作日志',
  'uni-id-users': '用户'
}

const health = computed(() => result.value?.data || {})
const auth = computed(() => health.value.auth || {})
const demoAccount = computed(() => health.value.demoAccount || {})
const apiMeta = computed(() => result.value?.__meta || health.value.__meta || {})

const sourceMeta = computed(() => {
  const runtimeSource = health.value.source || health.value.__source
  const source = apiMeta.value.source || runtimeSource || (health.value.runtime?.cloudFunction === 'mock' ? 'mock' : 'unknown')
  return {
    ...apiMeta.value,
    source,
    cloudError: apiMeta.value.cloudError || health.value.cloudError || null
  }
})

const diagnosticMode = computed(() => health.value.runtime?.diagnosticMode || checkMode.value)

const runtimeRows = computed(() => [
  { label: '应用版本', value: runtimeConfig.version },
  { label: '云函数版本', value: health.value.runtime?.version || '待检查' },
  { label: '检查模式', value: diagnosticMode.value === 'deep' ? '深度检查' : '轻量检查' },
  { label: '运行环境', value: runtimeConfig.runtimeEnv },
  { label: '服务空间', value: runtimeConfig.cloudSpace.spaceId || '未配置' },
  { label: 'Token 密钥', value: health.value.runtime?.authSecret === 'env-secret' ? '环境变量' : '演示密钥' },
  { label: '生产发布', value: runtimeConfig.releaseGuard.canPublishProd ? '未阻断' : '需配置 prod 云空间' },
  { label: '检查时间', value: formatDateTime(health.value.checked_at) || '待检查' }
])

const collectionRows = computed(() => {
  const collections = health.value.collections || {}
  return Object.keys(collectionLabels).map(key => {
    const item = collections[key]
    return {
      key,
      label: collectionLabels[key],
      ok: item ? Boolean(item.ok) : null,
      count: item ? Number(item.count || 0) : null,
      msg: item?.msg || (!item && diagnosticMode.value === 'light' ? '轻量检查未读取' : '')
    }
  })
})

const functionRows = computed(() => health.value.cloudFunctions || [])
const complianceRows = computed(() => health.value.compliance || [])
const releaseRows = computed(() => health.value.releaseChecks || runtimeConfig.releaseChecks.map(label => ({ label, status: 'manual' })))
const recentErrors = computed(() => localErrors.value.length ? localErrors.value : (health.value.recentErrors || []))

const pageStatus = computed(() => {
  if (loading.value) return { label: '正在检查', tone: 'muted', desc: '正在读取运行状态，请稍候。' }
  if (errorMessage.value) return { label: '诊断失败', tone: 'error', desc: errorMessage.value }
  if (!result.value) return { label: '待检查', tone: 'muted', desc: '打开页面后会自动执行轻量诊断。' }
  if (sourceMeta.value.source === 'mock-fallback') {
    return { label: '已使用本地兜底', tone: 'warn', desc: '云端暂不可用，页面已用本地演示数据保持可读。' }
  }
  return { label: '诊断完成', tone: 'ok', desc: result.value.msg || '运行状态已更新。' }
})

const authStatusText = computed(() => {
  if (auth.value.status === 'authenticated' && auth.value.isAdmin) return '已登录，具备运营权限'
  if (auth.value.status === 'authenticated') return '已登录，无运营权限'
  if (auth.value.status === 'invalid') return auth.value.msg || '登录状态无效'
  if (auth.value.status === 'cloud_busy') return auth.value.msg || '账号校验暂时繁忙'
  if (userStore.isLogin) return '本机已登录，云端待识别'
  return '未登录'
})

const localAuthText = computed(() => {
  if (!userStore.isLogin) return '未登录'
  return `${userStore.nickname || '已登录'} · ${userStore.phone || '本机已保存 token'}`
})

const statusClass = (ok) => ok ? 'status-pill--ok' : 'status-pill--warn'
const dotClass = (ok) => ok ? 'status-dot--ok' : (ok === null ? 'status-dot--muted' : '')

const releaseStatusText = (status) => {
  const map = {
    auto: '自动检查',
    mixed: '部分自动',
    manual: '手动验收'
  }
  return map[status] || status || '待确认'
}

const errorCategoryText = (category) => {
  const map = {
    auth: '登录',
    permission: '权限',
    resource_busy: '资源繁忙',
    timeout: '超时',
    cloud_function: '云函数',
    network: '网络',
    server: '服务端',
    business: '业务'
  }
  return map[category] || '未知'
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

function formatDateTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day} ${formatTime(time)}`
}

function refreshLocalErrors() {
  localErrors.value = readApiErrorLogs()
}

async function runCheck(mode = 'light') {
  if (loading.value) return
  loading.value = true
  checkMode.value = mode
  errorMessage.value = ''
  refreshLocalErrors()
  try {
    const request = mode === 'deep' ? api.diagnostics.getDeepHealthCheck : api.diagnostics.getHealthCheck
    const res = await request({}, {
      showError: false,
      handleAuthError: false
    })
    refreshLocalErrors()
    result.value = res
    if (res?.code !== 0) {
      errorMessage.value = res?.msg || '云端诊断失败，请确认 admin-center 已上传'
    }
  } catch (error) {
    errorMessage.value = error?.message || '诊断执行异常，请稍后重试'
  } finally {
    loading.value = false
  }
}

function clearErrors() {
  clearApiErrorLogs()
  refreshLocalErrors()
  uni.showToast({ title: '已清理', icon: 'success' })
}

function goInit() {
  uni.navigateTo({ url: ROUTES.cloudInit })
}

function goLogin() {
  uni.navigateTo({ url: `${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.diagnostics)}` })
}

onLoad(() => runCheck('light'))
onShow(refreshLocalErrors)
onPullDownRefresh(async () => {
  await runCheck('light')
  uni.stopPullDownRefresh()
})
</script>

<template>
  <view class="page">
    <view class="hero">
      <view>
        <text class="hero__eyebrow">Release Check</text>
        <text class="hero__title">运行诊断</text>
        <text class="hero__desc">检查云端、账号、数据表和发布项，优先用轻量诊断减少云数据库压力。</text>
      </view>
    </view>

    <DiagnosticsSourceBanner
      :meta="sourceMeta"
      :mode="diagnosticMode"
      :loading="loading"
      @refresh="runCheck('light')"
      @deep-check="runCheck('deep')"
    />

    <view class="status-card" :class="`status-card--${pageStatus.tone}`">
      <text class="status-card__title">{{ pageStatus.label }}</text>
      <text class="status-card__desc">{{ pageStatus.desc }}</text>
    </view>

    <view class="panel">
      <text class="panel__title">运行配置</text>
      <view v-for="item in runtimeRows" :key="item.label" class="info-row">
        <text>{{ item.label }}</text>
        <text>{{ item.value }}</text>
      </view>
    </view>

    <view class="panel">
      <view class="panel__head">
        <text class="panel__title">账号与权限</text>
        <text class="status-pill" :class="statusClass(auth.isAdmin)">{{ authStatusText }}</text>
      </view>
      <view class="info-row">
        <text>体验账号</text>
        <text>{{ demoAccount.mobile || runtimeConfig.demoAccount.mobile }}</text>
      </view>
      <view class="info-row">
        <text>本机状态</text>
        <text>{{ localAuthText }}</text>
      </view>
      <view class="info-row">
        <text>账号状态</text>
        <text>{{ demoAccount.exists ? '已创建' : '未创建' }}</text>
      </view>
      <view class="info-row">
        <text>管理员角色</text>
        <text>{{ demoAccount.isAdmin ? '已具备' : '未配置' }}</text>
      </view>
      <view class="panel-actions">
        <button class="mini-btn" @click="goLogin">登录账号</button>
        <button class="mini-btn mini-btn--primary" @click="goInit">云端初始化</button>
      </view>
    </view>

    <view class="panel">
      <text class="panel__title">核心数据表</text>
      <view class="count-grid">
        <view v-for="item in collectionRows" :key="item.key" class="count-card">
          <view class="count-card__head">
            <text class="count-card__label">{{ item.label }}</text>
            <text class="status-dot" :class="dotClass(item.ok)"></text>
          </view>
          <text class="count-card__num">{{ item.count === null ? '-' : item.count }}</text>
          <text v-if="item.msg" class="count-card__msg">{{ item.msg }}</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <text class="panel__title">云函数</text>
      <view v-for="item in functionRows" :key="item.name" class="info-row">
        <text>{{ item.name }}</text>
        <text>{{ item.status }}</text>
      </view>
    </view>

    <view class="panel">
      <text class="panel__title">合规页面</text>
      <view v-for="item in complianceRows" :key="item.key" class="info-row">
        <text>{{ item.label }}</text>
        <text>{{ item.ok ? item.version || item.status : '待配置' }}</text>
      </view>
    </view>

    <view class="panel">
      <view class="panel__head">
        <text class="panel__title">最近接口错误</text>
        <button v-if="recentErrors.length" class="mini-btn mini-btn--ghost" @click="clearErrors">清理</button>
      </view>
      <view v-if="recentErrors.length" class="error-list">
        <view v-for="item in recentErrors" :key="item.id || `${item.time}-${item.action}`" class="error-row">
          <view>
            <text class="error-row__title">{{ item.cloudFunction || 'local' }} · {{ item.action || 'unknown' }}</text>
            <text class="error-row__msg">{{ item.msg }}</text>
          </view>
          <view class="error-row__meta">
            <text>{{ errorCategoryText(item.category) }}</text>
            <text>{{ formatTime(item.time) }}</text>
          </view>
        </view>
      </view>
      <text v-else class="empty-text">暂无接口错误记录</text>
    </view>

    <view class="panel">
      <text class="panel__title">发布检查项</text>
      <view v-for="item in releaseRows" :key="item.key || item.label" class="check-row">
        <text>{{ item.label }}</text>
        <text>{{ releaseStatusText(item.status) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 28rpx 24rpx 64rpx;
  background: #f7f5f0;
  box-sizing: border-box;
}

.hero {
  padding: 32rpx 28rpx;
  color: #fff;
  background: #2f5d50;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 40rpx rgba(47, 93, 80, 0.2);
}

.hero__eyebrow,
.hero__title,
.hero__desc {
  display: block;
}

.hero__eyebrow {
  color: rgba(255, 255, 255, 0.72);
  font-size: 22rpx;
  font-weight: 700;
}

.hero__title {
  margin-top: 10rpx;
  font-size: 42rpx;
  font-weight: 900;
}

.hero__desc {
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 24rpx;
  line-height: 1.55;
}

.status-card,
.panel {
  margin-top: 22rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.status-card {
  border-color: #d8d2c7;
}

.status-card--ok {
  border-color: #c9ded3;
  background: #f1f7f3;
}

.status-card--warn {
  border-color: #eadfbd;
  background: #fffaf0;
}

.status-card--error {
  border-color: #eadbd6;
  background: #fff7f5;
}

.status-card__title,
.status-card__desc,
.panel__title {
  display: block;
}

.status-card__title {
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 900;
}

.status-card__desc {
  margin-top: 10rpx;
  color: #59625d;
  font-size: 24rpx;
  line-height: 1.55;
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.panel__title {
  margin-bottom: 14rpx;
  color: #1f2522;
  font-size: 31rpx;
  font-weight: 900;
}

.panel__head .panel__title {
  margin-bottom: 0;
}

.info-row,
.check-row {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  color: #59625d;
  border-bottom: 1rpx solid #f1eee7;
  font-size: 25rpx;
}

.info-row:last-child,
.check-row:last-child {
  border-bottom: none;
}

.info-row text:last-child,
.check-row text:last-child {
  color: #1f2522;
  font-weight: 700;
  text-align: right;
}

.status-pill {
  max-width: 300rpx;
  padding: 8rpx 14rpx;
  color: #8a928d;
  background: #f3f1ec;
  border-radius: 999rpx;
  font-size: 21rpx;
  font-weight: 800;
}

.status-pill--ok {
  color: #2f5d50;
  background: #eaf4ef;
}

.status-pill--warn {
  color: #b84a3c;
  background: #fff0ed;
}

.panel-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14rpx;
  margin-top: 18rpx;
}

.mini-btn {
  height: 70rpx;
  margin: 0;
  color: #2f5d50;
  background: #fbfaf7;
  border: 1rpx solid #dbe5df;
  border-radius: 16rpx;
  font-size: 25rpx;
  line-height: 70rpx;
}

.mini-btn--primary {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.mini-btn--ghost {
  width: 108rpx;
  height: 56rpx;
  color: #8a928d;
  background: #f7f5f0;
  border-color: #e7e3dc;
  font-size: 22rpx;
  line-height: 56rpx;
}

.mini-btn::after {
  border: none;
}

.count-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.count-card {
  min-height: 118rpx;
  padding: 18rpx;
  background: #faf8f3;
  border: 1rpx solid #eee9df;
  border-radius: 18rpx;
  box-sizing: border-box;
}

.count-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.count-card__label {
  color: #59625d;
  font-size: 22rpx;
  font-weight: 700;
}

.count-card__num {
  display: block;
  margin-top: 12rpx;
  color: #2f5d50;
  font-size: 34rpx;
  font-weight: 900;
}

.count-card__msg {
  display: block;
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 20rpx;
  line-height: 1.35;
}

.status-dot {
  width: 16rpx;
  height: 16rpx;
  flex-shrink: 0;
  background: #d8d2c7;
  border-radius: 50%;
}

.status-dot--ok {
  background: #2f5d50;
}

.status-dot--muted {
  background: #c7c0b4;
}

.error-list {
  margin-top: 12rpx;
}

.error-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f1eee7;
}

.error-row:last-child {
  border-bottom: none;
}

.error-row__title,
.error-row__msg,
.empty-text {
  display: block;
}

.error-row__title {
  color: #1f2522;
  font-size: 25rpx;
  font-weight: 800;
}

.error-row__msg {
  margin-top: 8rpx;
  color: #59625d;
  font-size: 22rpx;
  line-height: 1.45;
}

.error-row__meta {
  min-width: 112rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  color: #b84a3c;
  font-size: 21rpx;
  font-weight: 800;
}

.empty-text {
  margin-top: 12rpx;
  color: #8a928d;
  font-size: 24rpx;
}
</style>
