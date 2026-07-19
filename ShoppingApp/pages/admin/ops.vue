<script setup>
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import XEmpty from '@/components/x-empty/x-empty.vue'
import AdminOverview from '@/components/admin/AdminOverview.vue'
import AdminReports from '@/components/admin/AdminReports.vue'
import AdminOrders from '@/components/admin/AdminOrders.vue'
import AdminAfterSales from '@/components/admin/AdminAfterSales.vue'
import AdminGoods from '@/components/admin/AdminGoods.vue'
import AdminCoupons from '@/components/admin/AdminCoupons.vue'
import AdminMessages from '@/components/admin/AdminMessages.vue'
import AdminLogs from '@/components/admin/AdminLogs.vue'
import { useAdminOps } from '@/composables/useAdminOps'

const {
  tabs,
  orderFilters,
  afterSaleFilters,
  goodsFilters,
  couponFilters,
  messageTypes,
  logTargets,
  activeTab,
  loading,
  permissionError,
  permissionTitle,
  permissionActionText,
  actionBusyId,
  hasLoaded,
  orderFilter,
  afterSaleFilter,
  goodsFilter,
  couponFilter,
  messageFilter,
  logTarget,
  goodsKeyword,
  opsReport,
  orders,
  afterSales,
  goodsRows,
  couponRows,
  messageRows,
  operationLogs,
  statCards,
  orderStatusRows,
  afterSaleStatusRows,
  loadAll,
  loadOpsReport,
  loadGoods,
  switchTab,
  handlePermissionAction,
  changeOrderFilter,
  changeAfterSaleFilter,
  changeGoodsFilter,
  changeCouponFilter,
  changeMessageFilter,
  changeLogTarget,
  previewMessage,
  shipOrder,
  updateShipment,
  addOrderRemark,
  auditAfterSale,
  completeAfterSale,
  addAfterSaleRemark,
  toggleGoodsStatus,
  editGoodsStock,
  saveGoods,
  deleteGoodsDraft,
  saveCoupon,
  toggleCouponStatus,
  saveMessage
} = useAdminOps()

function setGoodsKeyword(value) {
  goodsKeyword.value = value
}

onLoad(async () => {
  await loadAll()
  hasLoaded.value = true
})

onShow(() => {
  if (hasLoaded.value) loadAll()
})

onPullDownRefresh(async () => {
  await loadAll()
  uni.stopPullDownRefresh()
})
</script>

<template>
  <view class="page">
    <view class="ops-head">
      <view class="ops-head__copy">
        <text class="ops-head__title">运营中心</text>
        <text class="ops-head__desc">商品、订单、售后、优惠券、消息与操作日志</text>
      </view>
      <button class="ops-head__refresh" :loading="loading" @click="loadAll">刷新</button>
    </view>

    <XEmpty
      v-if="permissionError"
      image="/static/empty-message.png"
      :title="permissionTitle"
      :desc="permissionError"
      :action-text="permissionActionText"
      @action="handlePermissionAction"
    />

    <view v-else>
      <scroll-view class="tab-scroll" scroll-x>
        <view class="segmented">
          <view
            v-for="item in tabs"
            :key="item.value"
            class="segmented__item"
            :class="{ 'segmented__item--active': activeTab === item.value }"
            @click="switchTab(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
      </scroll-view>

      <AdminOverview
        v-if="activeTab === 'overview'"
        :stat-cards="statCards"
        :order-status-rows="orderStatusRows"
        :after-sale-status-rows="afterSaleStatusRows"
      />

      <AdminReports
        v-if="activeTab === 'reports'"
        :report="opsReport"
        :loading="loading"
        @refresh="loadOpsReport"
      />

      <AdminOrders
        v-if="activeTab === 'orders'"
        :filters="orderFilters"
        :active-filter="orderFilter"
        :orders="orders"
        :loading="loading"
        :action-busy-id="actionBusyId"
        @change-filter="changeOrderFilter"
        @ship="shipOrder"
        @shipment="updateShipment"
        @remark="addOrderRemark"
      />

      <AdminAfterSales
        v-if="activeTab === 'afterSales'"
        :filters="afterSaleFilters"
        :active-filter="afterSaleFilter"
        :after-sales="afterSales"
        :loading="loading"
        :action-busy-id="actionBusyId"
        @change-filter="changeAfterSaleFilter"
        @audit="auditAfterSale"
        @complete="completeAfterSale"
        @remark="addAfterSaleRemark"
      />

      <AdminGoods
        v-if="activeTab === 'goods'"
        :filters="goodsFilters"
        :active-filter="goodsFilter"
        :keyword="goodsKeyword"
        :goods="goodsRows"
        :loading="loading"
        :action-busy-id="actionBusyId"
        @change-filter="changeGoodsFilter"
        @update-keyword="setGoodsKeyword"
        @search="loadGoods"
        @save="saveGoods"
        @status="toggleGoodsStatus"
        @stock="editGoodsStock"
        @delete="deleteGoodsDraft"
      />

      <AdminCoupons
        v-if="activeTab === 'coupons'"
        :filters="couponFilters"
        :active-filter="couponFilter"
        :coupons="couponRows"
        :loading="loading"
        :action-busy-id="actionBusyId"
        @change-filter="changeCouponFilter"
        @save="saveCoupon"
        @status="toggleCouponStatus"
      />

      <AdminMessages
        v-if="activeTab === 'messages'"
        :message-types="messageTypes"
        :active-filter="messageFilter"
        :messages="messageRows"
        :loading="loading"
        :action-busy-id="actionBusyId"
        @change-filter="changeMessageFilter"
        @save="saveMessage"
        @preview="previewMessage"
      />

      <AdminLogs
        v-if="activeTab === 'logs'"
        :targets="logTargets"
        :active-target="logTarget"
        :logs="operationLogs"
        :loading="loading"
        @change-target="changeLogTarget"
      />
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx 140rpx;
  background: #f7f5f0;
  box-sizing: border-box;
}

.ops-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx;
  color: #fff;
  background: #2f5d50;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 40rpx rgba(47, 93, 80, 0.2);
}

.ops-head__copy {
  flex: 1;
  min-width: 0;
}

.ops-head__title,
.ops-head__desc {
  display: block;
}

.ops-head__title {
  font-size: 40rpx;
  font-weight: 900;
}

.ops-head__desc {
  margin-top: 10rpx;
  color: rgba(255, 255, 255, 0.76);
  font-size: 24rpx;
  line-height: 1.5;
}

.ops-head__refresh {
  width: 132rpx;
  height: 64rpx;
  flex-shrink: 0;
  margin: 0;
  color: #2f5d50;
  background: #fff;
  border-radius: 999rpx;
  font-size: 25rpx;
  line-height: 64rpx;
}

.ops-head__refresh::after {
  border: none;
}

.tab-scroll {
  margin-top: 22rpx;
  white-space: nowrap;
}

.segmented {
  display: flex;
  gap: 8rpx;
  padding: 8rpx;
  background: #ebe7df;
  border-radius: 18rpx;
}

.segmented__item {
  min-width: 112rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #59625d;
  border-radius: 14rpx;
  font-size: 26rpx;
  font-weight: 700;
}

.segmented__item--active {
  color: #1f2522;
  background: #fff;
  box-shadow: 0 6rpx 16rpx rgba(31, 37, 34, 0.08);
}
</style>
