<script setup>
import { Checked, Money } from '@element-plus/icons-vue'
import { formatMoney } from '@/utils/format'
import SectionPanel from '@/components/SectionPanel.vue'

defineProps({
  members: { type: Array, default: () => [] },
  memberId: { type: [Number, String, null], default: null },
  payment: { type: String, default: 'cash' },
  selectedMember: { type: Object, default: null },
  settlement: { type: Object, required: true },
  cartTotal: { type: Object, required: true },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:memberId', 'update:payment', 'checkout'])
</script>

<template>
  <SectionPanel class="cashier-panel checkout-panel">
    <template #title>
      <el-icon><Money /></el-icon>
      <span>结算</span>
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
</style>
