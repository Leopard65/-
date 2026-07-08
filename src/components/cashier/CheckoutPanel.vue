<script setup>
import { computed } from 'vue'
import { Checked, Delete, Money, RefreshLeft } from '@element-plus/icons-vue'
import { formatMoney } from '@/utils/format'
import SectionPanel from '@/components/SectionPanel.vue'

const props = defineProps({
  members: { type: Array, default: () => [] },
  memberId: { type: [Number, String, null], default: null },
  payment: { type: String, default: 'cash' },
  cashReceived: { type: [Number, String, null], default: null },
  selectedMember: { type: Object, default: null },
  settlement: { type: Object, required: true },
  cartTotal: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  heldSales: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:memberId', 'update:payment', 'update:cashReceived', 'checkout', 'hold', 'resumeHeld', 'removeHeld'])

const cashChange = computed(() => {
  const received = Number(props.cashReceived || 0)
  const payable = Number(props.settlement.payable || 0)
  if (received <= 0) return 0
  return Math.round((received - payable) * 100) / 100
})

const isCashShort = computed(() => props.payment === 'cash' && Number(props.cashReceived || 0) > 0 && cashChange.value < 0)
</script>

<template>
  <SectionPanel class="cashier-panel checkout-panel">
    <template #title>
      <el-icon><Money /></el-icon>
      <span>结算</span>
    </template>
    <template #actions>
      <el-button link type="warning" :disabled="disabled" @click="emit('hold')">挂单 F4</el-button>
    </template>

    <div class="settle-field">
      <label>会员（可选）</label>
      <el-select
        :model-value="memberId"
        placeholder="选择会员享折扣与积分"
        clearable
        filterable
        class="full-field"
        @update:model-value="emit('update:memberId', $event)"
      >
        <el-option v-for="member in members" :key="member.id" :label="`${member.name} (${member.phone})`" :value="member.id">
          <span class="member-option__name">{{ member.name }}</span>
          <span class="member-option__level">{{ member.level }}</span>
        </el-option>
      </el-select>
      <div v-if="selectedMember" class="member-hint">
        <el-tag size="small" :type="settlement.hasDiscount ? 'warning' : 'info'" effect="light">
          {{ selectedMember.level }}
        </el-tag>
        <span v-if="settlement.hasDiscount">享 {{ (settlement.discount * 10).toFixed(2) }} 折</span>
        <span v-else>无折扣</span>
        <span>· 积分 ×{{ settlement.pointsRate }}</span>
      </div>
    </div>

    <div class="settle-field">
      <label>支付方式</label>
      <el-radio-group :model-value="payment" class="pay-group" @update:model-value="emit('update:payment', $event)">
        <el-radio-button value="cash">现金</el-radio-button>
        <el-radio-button value="wechat">微信</el-radio-button>
        <el-radio-button value="alipay">支付宝</el-radio-button>
      </el-radio-group>
    </div>

    <div v-if="payment === 'cash'" class="settle-field">
      <label>现金实收</label>
      <el-input-number
        :model-value="cashReceived"
        :min="0"
        :precision="2"
        :step="1"
        controls-position="right"
        class="full-field"
        placeholder="输入实收金额自动计算找零"
        @update:model-value="emit('update:cashReceived', $event)"
      />
      <div class="cash-change" :class="{ 'is-short': isCashShort }">
        <span>{{ isCashShort ? '仍差' : '找零' }}</span>
        <strong class="num">{{ formatMoney(Math.abs(cashChange)) }}</strong>
      </div>
    </div>

    <div class="settle-box">
      <div class="settle-row">
        <span>商品数量</span>
        <span class="num">{{ cartTotal.quantity }} 件</span>
      </div>
      <div class="settle-row">
        <span>原价小计</span>
        <span class="num">{{ formatMoney(settlement.original) }}</span>
      </div>
      <div v-if="memberId && settlement.hasDiscount" class="settle-row settle-discount">
        <span>会员优惠（{{ (settlement.discount * 10).toFixed(2) }} 折）</span>
        <span class="num">-{{ formatMoney(settlement.savings) }}</span>
      </div>
      <div class="settle-total">
        <span>应付金额</span>
        <span class="settle-amount num">{{ formatMoney(settlement.payable) }}</span>
      </div>
      <div v-if="memberId" class="settle-row settle-points">
        <span>预计获得积分</span>
        <span class="num">+{{ settlement.points }}</span>
      </div>
    </div>

    <el-button type="primary" size="large" class="checkout-btn" :icon="Checked" :disabled="disabled" @click="emit('checkout')">
      确认结算 · {{ formatMoney(settlement.payable) }}
    </el-button>

    <div class="held-orders">
      <div class="held-orders__head">
        <span>挂单</span>
        <small>{{ heldSales.length }} 单</small>
      </div>
      <div v-if="heldSales.length" class="held-orders__list">
        <div v-for="order in heldSales" :key="order.id" class="held-order">
          <div class="held-order__main">
            <strong>{{ order.label }}</strong>
            <small>{{ order.quantity }} 件 · {{ formatMoney(order.amount) }} · {{ order.createdAt }}</small>
          </div>
          <div class="held-order__actions">
            <el-button :icon="RefreshLeft" circle size="small" type="primary" plain @click="emit('resumeHeld', order.id)" />
            <el-button :icon="Delete" circle size="small" type="danger" plain @click="emit('removeHeld', order.id)" />
          </div>
        </div>
      </div>
      <div v-else class="held-orders__empty">暂无挂单</div>
    </div>
  </SectionPanel>
</template>

<style scoped>
.checkout-panel :deep(.panel__body) {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.settle-field {
  margin-bottom: 16px;
}

.settle-field label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-regular);
  font-size: 13px;
}

.full-field {
  width: 100%;
}

.member-option__name {
  float: left;
}

.member-option__level {
  float: right;
  color: var(--text-secondary);
  font-size: 13px;
}

.member-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.pay-group {
  display: flex;
  width: 100%;
}

.pay-group :deep(.el-radio-button) {
  flex: 1;
}

.pay-group :deep(.el-radio-button__inner) {
  width: 100%;
}

.cash-change {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 8px 10px;
  color: var(--color-success);
  background: var(--color-primary-light-9);
  border-radius: var(--radius-md);
  font-size: 13px;
}

.cash-change.is-short {
  color: var(--color-danger);
  background: #fff1f0;
}

.cash-change strong {
  font-size: 16px;
}

.settle-box {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-muted);
}

.settle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--text-regular);
  font-size: 14px;
}

.settle-discount {
  color: var(--color-warning);
}

.settle-points {
  margin-top: 10px;
  margin-bottom: 0;
  color: var(--color-success);
}

.settle-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
}

.settle-total > span:first-child {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
}

.settle-amount {
  color: var(--color-danger);
  font-size: 30px;
  font-weight: 800;
}

.checkout-btn {
  width: 100%;
  height: 52px;
  margin-top: auto;
  font-size: 17px;
  font-weight: 700;
}

.held-orders {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
}

.held-orders__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
}

.held-orders__head small,
.held-orders__empty {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 400;
}

.held-orders__list {
  display: grid;
  gap: 8px;
  max-height: 138px;
  overflow-y: auto;
}

.held-order {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
}

.held-order__main {
  flex: 1;
  min-width: 0;
}

.held-order__main strong,
.held-order__main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.held-order__main strong {
  color: var(--text-primary);
  font-size: 13px;
}

.held-order__main small {
  color: var(--text-secondary);
  font-size: 12px;
}

.held-order__actions {
  display: flex;
  gap: 6px;
}
</style>
