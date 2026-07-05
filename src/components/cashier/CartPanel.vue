<script setup>
import { Delete, ShoppingCart } from '@element-plus/icons-vue'
import { formatMoney } from '@/utils/format'
import SectionPanel from '@/components/SectionPanel.vue'
import EmptyState from '@/components/EmptyState.vue'

defineProps({
  cart: { type: Array, default: () => [] },
  cartTotal: { type: Object, required: true }
})

const emit = defineEmits(['clear', 'remove'])
</script>

<template>
  <SectionPanel class="cashier-panel cart-panel">
    <template #title>
      <el-icon><ShoppingCart /></el-icon>
      <span>购物车清单</span>
    </template>
    <template #actions>
      <span class="cart-count">共 {{ cartTotal.quantity }} 件</span>
      <el-button v-if="cart.length" link type="danger" :icon="Delete" @click="emit('clear')">
        清空
      </el-button>
    </template>

    <el-table v-if="cart.length" :data="cart" size="default" class="cart-table">
      <el-table-column prop="name" label="商品" min-width="130" show-overflow-tooltip />
      <el-table-column label="单价" width="86" align="right">
        <template #default="{ row }">
          <span class="num">{{ formatMoney(row.price) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="124" align="center">
        <template #default="{ row }">
          <el-input-number
            v-model="row.quantity"
            :min="1"
            :max="row.stock"
            size="small"
            controls-position="right"
            class="qty-input"
          />
        </template>
      </el-table-column>
      <el-table-column label="小计" width="106" align="right">
        <template #default="{ row }">
          <span class="num amount">{{ formatMoney(row.price * row.quantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column width="50" align="center">
        <template #default="{ $index }">
          <el-button type="danger" :icon="Delete" circle size="small" plain @click="emit('remove', $index)" />
        </template>
      </el-table-column>
    </el-table>
    <EmptyState v-else description="购物车为空，请从左侧搜索添加商品" />
  </SectionPanel>
</template>

<style scoped>
.cart-panel :deep(.panel__body) {
  min-height: 0;
  overflow-y: auto;
}

.cart-count {
  margin-right: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.cart-table {
  width: 100%;
}

.qty-input {
  width: 96px;
}
</style>
