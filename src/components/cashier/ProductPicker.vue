<script setup>
import { computed, ref } from 'vue'
import { Cpu, Search } from '@element-plus/icons-vue'
import { formatMoney } from '@/utils/format'
import SectionPanel from '@/components/SectionPanel.vue'
import EmptyState from '@/components/EmptyState.vue'

const props = defineProps({
  searchKeyword: { type: String, default: '' },
  searchResults: { type: Array, default: () => [] },
  quickProducts: { type: Array, default: () => [] },
  scanMode: { type: Boolean, default: false }
})

const emit = defineEmits(['update:searchKeyword', 'search', 'add'])
const searchInputRef = ref(null)

const keyword = computed({
  get: () => props.searchKeyword,
  set: (value) => emit('update:searchKeyword', value)
})

const focusSearch = () => {
  searchInputRef.value?.focus?.()
}

const isSellable = (product) => product.status === 1 && product.stock > 0
const isLowStock = (product) => product.min_stock != null && product.stock > 0 && product.stock <= product.min_stock
const productStatusText = (product) => {
  if (product.status !== 1) return '已下架'
  if (product.stock <= 0) return '缺货'
  if (isLowStock(product)) return '低库存'
  return '可售'
}

defineExpose({ focusSearch })
</script>

<template>
  <SectionPanel class="cashier-panel product-picker">
    <template #title>
      <el-icon><Search /></el-icon>
      <span>选购商品</span>
    </template>

    <el-input
      ref="searchInputRef"
      v-model="keyword"
      placeholder="商品名称 / 条码（支持扫码枪）"
      clearable
      size="large"
      class="product-search"
      @keyup.enter="emit('search')"
    >
      <template #append>
        <el-button :icon="Search" @click="emit('search')" />
      </template>
    </el-input>

    <div v-if="scanMode" class="scan-hint">
      <el-icon><Cpu /></el-icon>
      <span>扫码枪模式已激活，请扫描条形码</span>
    </div>

    <div v-if="quickProducts.length" class="quick-products">
      <div class="section-label">
        <span>快捷商品</span>
        <small>点击直接加入购物车</small>
      </div>
      <div class="quick-grid">
        <button
          v-for="product in quickProducts"
          :key="product.id"
          type="button"
          class="quick-card"
          :class="{ 'is-low': isLowStock(product) }"
          @click="emit('add', product)"
        >
          <span class="quick-name">{{ product.name }}</span>
          <span class="quick-meta">
            <strong class="num">{{ formatMoney(product.price) }}</strong>
            <small>库存 {{ product.stock }}{{ product.unit }}</small>
          </span>
        </button>
      </div>
    </div>

    <div class="result-list">
      <div v-if="searchResults.length" class="section-label">
        <span>搜索结果</span>
        <small>{{ searchResults.length }} 项</small>
      </div>
      <div v-if="searchResults.length" class="result-stack">
        <button
          v-for="product in searchResults"
          :key="product.id"
          type="button"
          class="result-item"
          :class="{ 'is-disabled': !isSellable(product), 'is-low': isLowStock(product) }"
          :disabled="!isSellable(product)"
          @click="emit('add', product)"
        >
          <span class="result-main">
            <span class="result-name">{{ product.name }}</span>
            <span class="result-stock">库存 {{ product.stock }}{{ product.unit }}</span>
          </span>
          <span class="result-side">
            <el-tag size="small" :type="isSellable(product) ? (isLowStock(product) ? 'warning' : 'success') : 'info'" effect="light">
              {{ productStatusText(product) }}
            </el-tag>
            <span class="result-price num">{{ formatMoney(product.price) }}</span>
          </span>
        </button>
      </div>
      <EmptyState v-else :image-size="60" description="搜索商品名称或条码" />
    </div>
  </SectionPanel>
</template>

<style scoped>
.product-picker :deep(.panel__body) {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.product-search {
  flex: 0 0 auto;
}

.scan-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  color: var(--color-primary);
  background: var(--color-primary-light-9);
  border-radius: var(--radius-md);
  font-size: 12px;
}

.result-list {
  min-height: 0;
  margin-top: 14px;
  overflow-y: auto;
}

.section-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
}

.section-label small {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 400;
}

.quick-products {
  flex: 0 0 auto;
  margin-top: 14px;
  padding-bottom: 14px;
  border-bottom: 1px dashed var(--border-color-light);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.quick-card {
  min-width: 0;
  min-height: 78px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;
  cursor: pointer;
  text-align: left;
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, #fff, var(--bg-muted));
  transition: border-color var(--motion-fast), transform var(--motion-fast), box-shadow var(--motion-fast);
}

.quick-card:hover {
  border-color: var(--color-primary-light-5);
  box-shadow: 0 8px 20px rgba(22, 34, 29, 0.08);
  transform: translateY(-1px);
}

.quick-card.is-low {
  border-color: color-mix(in srgb, var(--color-warning) 38%, var(--border-color-light));
  background: linear-gradient(180deg, #fff, var(--bg-warm));
}

.quick-name {
  color: var(--text-primary);
  font-weight: 700;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.quick-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.quick-meta strong {
  color: var(--color-primary);
}

.quick-meta small {
  color: var(--text-secondary);
  font-size: 12px;
}

.result-stack {
  display: grid;
  gap: 8px;
}

.result-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  text-align: left;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color-light);
  background: #fff;
  transition: background var(--motion-fast), border-color var(--motion-fast), transform var(--motion-fast);
}

.result-item:hover {
  background: var(--color-primary-light-9);
  border-color: var(--color-primary-light-7);
  transform: translateY(-1px);
}

.result-item.is-low {
  background: var(--bg-warm);
}

.result-item.is-disabled {
  cursor: not-allowed;
  opacity: 0.66;
  background: var(--bg-muted);
}

.result-item.is-disabled:hover {
  border-color: var(--border-color-light);
  transform: none;
}

.result-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.result-name {
  color: var(--text-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-stock {
  color: var(--text-secondary);
  font-size: 12px;
}

.result-price {
  color: var(--color-primary);
  font-weight: 700;
}

.result-side {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 6px;
}
</style>
