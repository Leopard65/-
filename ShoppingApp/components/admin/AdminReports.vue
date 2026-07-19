<script setup>
import { computed } from 'vue'
import XEmpty from '@/components/x-empty/x-empty.vue'
import { formatDateTime } from '@/utils/format'

const props = defineProps({
  report: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['refresh'])

const safeSummary = computed(() => props.report?.summary || {})
const trendRows = computed(() => props.report?.orderTrend || [])
const topGoodsRows = computed(() => props.report?.topGoods || [])
const inventoryRiskRows = computed(() => props.report?.inventoryRisks || [])
const releaseRows = computed(() => props.report?.releaseReadiness || [])
const collectionRows = computed(() => props.report?.collectionStatus || [])
const serviceRows = computed(() => props.report?.serviceRisks || [])
const recentLogs = computed(() => props.report?.recentLogs || [])

const metricCards = computed(() => [
  { key: 'revenue', label: '支付收入', value: formatMoney(safeSummary.value.revenue), hint: '模拟支付口径' },
  { key: 'orders', label: '支付订单', value: safeSummary.value.paidOrderCount || 0, hint: `总订单 ${safeSummary.value.orderCount || 0}` },
  { key: 'avg', label: '客单价', value: formatMoney(safeSummary.value.avgOrderAmount), hint: '支付订单均值' },
  { key: 'risk', label: '库存风险', value: safeSummary.value.inventoryRiskCount || 0, hint: '低库存/缺 SKU' }
])

const maxTrendAmount = computed(() => {
  const maxAmount = Math.max(...trendRows.value.map(item => Number(item.amount || 0)), 0)
  const maxCount = Math.max(...trendRows.value.map(item => Number(item.count || 0)), 0)
  return Math.max(maxAmount, maxCount, 1)
})

const trendWithWidth = computed(() => trendRows.value.map(item => {
  const base = Number(item.amount || 0) || Number(item.count || 0)
  return {
    ...item,
    barWidth: `${Math.max(8, Math.round((base / maxTrendAmount.value) * 100))}%`
  }
}))

const couponSummary = computed(() => {
  const stats = props.report?.couponStats || {}
  return [
    { label: '券模板', value: stats.couponCount || 0 },
    { label: '已领取', value: stats.issued || 0 },
    { label: '已使用', value: stats.used || 0 },
    { label: '使用率', value: `${safeSummary.value.couponUseRate || 0}%` }
  ]
})

function formatMoney(value) {
  const amount = Number(value || 0)
  return `¥${amount.toFixed(2)}`
}

function statusText(status = '') {
  const map = {
    ok: '正常',
    warning: '需关注',
    action: '待处理',
    blocked: '阻断',
    manual: '手动验收'
  }
  return map[status] || '待确认'
}

function statusClass(status = '') {
  return `status-pill--${status || 'manual'}`
}

function logActionText(action = '') {
  const map = {
    createGoods: '创建商品',
    updateGoods: '编辑商品',
    updateSkuList: '编辑 SKU',
    createCoupon: '创建优惠券',
    updateCoupon: '编辑优惠券',
    publishMessage: '发布消息',
    updateMessage: '编辑消息',
    shipOrder: '订单发货',
    updateShipment: '编辑物流',
    addOrderRemark: '订单备注',
    auditAfterSale: '审核售后',
    completeAfterSale: '完成退款',
    addAfterSaleRemark: '售后备注'
  }
  return map[action] || action || '运营操作'
}
</script>

<template>
  <view class="admin-section">
    <view class="report-hero">
      <view class="report-hero__copy">
        <text class="report-hero__eyebrow">0.9.0 发布回归</text>
        <text class="report-hero__title">运营报表</text>
        <text class="report-hero__desc">
          汇总交易、库存、优惠券、售后与发布检查，适合真机验收前快速巡检。
        </text>
      </view>
      <button class="report-hero__refresh" :loading="loading" @click="emit('refresh')">刷新</button>
    </view>

    <view class="metric-grid">
      <view v-for="item in metricCards" :key="item.key" class="metric-card">
        <text class="metric-card__value">{{ item.value }}</text>
        <text class="metric-card__label">{{ item.label }}</text>
        <text class="metric-card__hint">{{ item.hint }}</text>
      </view>
    </view>

    <view class="report-panel">
      <view class="panel-head">
        <text class="panel-head__title">近 {{ report.windowDays || 7 }} 天订单趋势</text>
        <text class="panel-head__meta">{{ report.checked_at ? formatDateTime(report.checked_at) : '待刷新' }}</text>
      </view>
      <view v-for="item in trendWithWidth" :key="item.key" class="trend-row">
        <text class="trend-row__label">{{ item.label }}</text>
        <view class="trend-row__track">
          <view class="trend-row__bar" :style="{ width: item.barWidth }"></view>
        </view>
        <text class="trend-row__value">{{ item.count }} 单</text>
      </view>
      <XEmpty
        v-if="!loading && trendRows.length === 0"
        image="/static/empty-order.png"
        title="暂无趋势数据"
        desc="完成一次下单支付后，这里会显示近 7 天趋势。"
      />
    </view>

    <view class="report-panel">
      <view class="panel-head">
        <text class="panel-head__title">发布回归项</text>
        <text class="panel-head__meta">自动巡检</text>
      </view>
      <view v-for="item in releaseRows" :key="item.key" class="check-row">
        <view class="check-row__copy">
          <text class="check-row__title">{{ item.label }}</text>
          <text class="check-row__desc">{{ item.desc || item.value || '待确认' }}</text>
        </view>
        <view class="status-pill" :class="statusClass(item.status)">
          {{ statusText(item.status) }}
        </view>
      </view>
    </view>

    <view class="report-panel">
      <view class="panel-head">
        <text class="panel-head__title">商品与库存风险</text>
        <text class="panel-head__meta">{{ safeSummary.goodsCount || 0 }} 个在售商品</text>
      </view>
      <view v-for="item in inventoryRiskRows" :key="item.key" class="risk-row">
        <view class="risk-row__copy">
          <text class="risk-row__title">{{ item.title }}</text>
          <text class="risk-row__desc">{{ item.desc }}</text>
        </view>
        <text class="risk-row__value">{{ item.value }}</text>
      </view>
      <XEmpty
        v-if="!loading && inventoryRiskRows.length === 0"
        image="/static/empty-cart.png"
        title="暂无库存风险"
        desc="低库存和缺 SKU 项会自动显示在这里。"
      />
    </view>

    <view class="report-panel">
      <view class="panel-head">
        <text class="panel-head__title">销售 Top 商品</text>
        <text class="panel-head__meta">按支付订单金额</text>
      </view>
      <view v-for="item in topGoodsRows" :key="item.goods_id" class="rank-row">
        <text class="rank-row__name text-ellipsis">{{ item.name }}</text>
        <text class="rank-row__count">{{ item.quantity }} 件</text>
        <text class="rank-row__amount">{{ formatMoney(item.amount) }}</text>
      </view>
      <XEmpty
        v-if="!loading && topGoodsRows.length === 0"
        image="/static/empty-order.png"
        title="暂无销售排行"
        desc="支付订单产生后，会按商品销售额生成排行。"
      />
    </view>

    <view class="split-grid">
      <view class="report-panel report-panel--compact">
        <text class="admin-panel__title">优惠券</text>
        <view v-for="item in couponSummary" :key="item.label" class="mini-row">
          <text class="mini-row__label">{{ item.label }}</text>
          <text class="mini-row__value">{{ item.value }}</text>
        </view>
      </view>

      <view class="report-panel report-panel--compact">
        <text class="admin-panel__title">服务待办</text>
        <view v-for="item in serviceRows" :key="item.key" class="mini-row">
          <text class="mini-row__label">{{ item.label }}</text>
          <text class="mini-row__value">{{ item.value }}</text>
        </view>
      </view>
    </view>

    <view class="report-panel">
      <view class="panel-head">
        <text class="panel-head__title">数据表读取</text>
        <text class="panel-head__meta">云端/本地同构</text>
      </view>
      <view class="collection-grid">
        <view v-for="item in collectionRows" :key="item.key" class="collection-cell">
          <text class="collection-cell__name">{{ item.key }}</text>
          <text class="collection-cell__count">{{ item.ok ? item.count : '异常' }}</text>
        </view>
      </view>
    </view>

    <view class="report-panel">
      <view class="panel-head">
        <text class="panel-head__title">最近运营动作</text>
        <text class="panel-head__meta">审计摘要</text>
      </view>
      <view v-for="item in recentLogs" :key="item._id" class="log-row">
        <text class="log-row__title">{{ logActionText(item.action) }}</text>
        <text class="log-row__meta">{{ item.operator_name || '运营人员' }} · {{ formatDateTime(item.create_date) }}</text>
      </view>
      <XEmpty
        v-if="!loading && recentLogs.length === 0"
        image="/static/empty-message.png"
        title="暂无运营动作"
        desc="创建商品、发券或审核售后后会记录到这里。"
      />
    </view>
  </view>
</template>

<style scoped>
.admin-section {
  margin-top: 20rpx;
}

.report-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  padding: 28rpx;
  color: #fff;
  background: #233d35;
  border-radius: 22rpx;
  box-shadow: 0 18rpx 42rpx rgba(35, 61, 53, 0.18);
}

.report-hero__copy {
  flex: 1;
  min-width: 0;
}

.report-hero__eyebrow,
.report-hero__title,
.report-hero__desc,
.metric-card__value,
.metric-card__label,
.metric-card__hint,
.panel-head__title,
.panel-head__meta,
.check-row__title,
.check-row__desc,
.risk-row__title,
.risk-row__desc,
.log-row__title,
.log-row__meta {
  display: block;
}

.report-hero__eyebrow {
  color: rgba(255, 255, 255, 0.68);
  font-size: 22rpx;
  font-weight: 800;
}

.report-hero__title {
  margin-top: 10rpx;
  font-size: 42rpx;
  font-weight: 900;
}

.report-hero__desc {
  margin-top: 10rpx;
  color: rgba(255, 255, 255, 0.76);
  font-size: 24rpx;
  line-height: 1.5;
}

.report-hero__refresh {
  width: 120rpx;
  height: 60rpx;
  flex-shrink: 0;
  margin: 0;
  color: #233d35;
  background: #fff;
  border-radius: 999rpx;
  font-size: 24rpx;
  line-height: 60rpx;
}

.report-hero__refresh::after {
  border: none;
}

.metric-grid,
.split-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-top: 18rpx;
}

.metric-card,
.report-panel {
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.metric-card {
  min-height: 154rpx;
  padding: 24rpx;
  box-sizing: border-box;
}

.metric-card__value {
  color: #2f5d50;
  font-size: 38rpx;
  font-weight: 900;
}

.metric-card__label {
  margin-top: 8rpx;
  color: #1f2522;
  font-size: 26rpx;
  font-weight: 900;
}

.metric-card__hint {
  margin-top: 6rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.report-panel {
  margin-top: 18rpx;
  padding: 24rpx;
}

.report-panel--compact {
  margin-top: 0;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.panel-head__title,
.admin-panel__title {
  color: #1f2522;
  font-size: 29rpx;
  font-weight: 900;
}

.panel-head__meta {
  flex-shrink: 0;
  color: #8a928d;
  font-size: 22rpx;
}

.trend-row,
.check-row,
.risk-row,
.rank-row,
.mini-row,
.log-row {
  border-bottom: 1rpx solid #f1eee7;
}

.trend-row {
  min-height: 58rpx;
  display: grid;
  grid-template-columns: 76rpx 1fr 76rpx;
  align-items: center;
  gap: 14rpx;
  color: #59625d;
  font-size: 23rpx;
}

.trend-row:last-child,
.check-row:last-child,
.risk-row:last-child,
.rank-row:last-child,
.mini-row:last-child,
.log-row:last-child {
  border-bottom: none;
}

.trend-row__track {
  height: 14rpx;
  overflow: hidden;
  background: #f0ece4;
  border-radius: 999rpx;
}

.trend-row__bar {
  height: 100%;
  background: #2f5d50;
  border-radius: 999rpx;
}

.trend-row__value {
  color: #1f2522;
  text-align: right;
  font-weight: 800;
}

.check-row,
.risk-row {
  min-height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 14rpx 0;
}

.check-row__copy,
.risk-row__copy {
  flex: 1;
  min-width: 0;
}

.check-row__title,
.risk-row__title {
  color: #1f2522;
  font-size: 26rpx;
  font-weight: 800;
}

.check-row__desc,
.risk-row__desc {
  margin-top: 6rpx;
  color: #8a928d;
  font-size: 22rpx;
  line-height: 1.45;
}

.status-pill {
  min-width: 108rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #59625d;
  background: #f4f0e8;
  border-radius: 999rpx;
  font-size: 21rpx;
  font-weight: 800;
}

.status-pill--ok {
  color: #2f5d50;
  background: #e9f3ee;
}

.status-pill--warning {
  color: #8a5a12;
  background: #fff5d9;
}

.status-pill--action {
  color: #8f3d2f;
  background: #fdebe7;
}

.status-pill--blocked {
  color: #8f2d2d;
  background: #ffe5e5;
}

.risk-row__value,
.rank-row__amount,
.rank-row__count,
.mini-row__value,
.collection-cell__count {
  color: #2f5d50;
  font-weight: 900;
}

.rank-row,
.mini-row {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  color: #59625d;
  font-size: 24rpx;
}

.rank-row__name {
  flex: 1;
  min-width: 0;
  color: #1f2522;
  font-weight: 800;
}

.rank-row__count,
.rank-row__amount {
  flex-shrink: 0;
  font-size: 23rpx;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
}

.collection-cell {
  min-height: 86rpx;
  padding: 16rpx;
  background: #f8f5ef;
  border-radius: 16rpx;
  box-sizing: border-box;
}

.collection-cell__name,
.collection-cell__count {
  display: block;
}

.collection-cell__name {
  color: #8a928d;
  font-size: 21rpx;
}

.collection-cell__count {
  margin-top: 8rpx;
  font-size: 30rpx;
}

.mini-row__label {
  color: #59625d;
}

.log-row {
  min-height: 74rpx;
  padding: 14rpx 0;
}

.log-row__title {
  color: #1f2522;
  font-size: 25rpx;
  font-weight: 800;
}

.log-row__meta {
  margin-top: 6rpx;
  color: #8a928d;
  font-size: 22rpx;
}
</style>
