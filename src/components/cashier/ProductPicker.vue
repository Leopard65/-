<script setup>
import { computed, ref } from 'vue'
import { Cpu, Search } from '@element-plus/icons-vue'
import { formatMoney } from '@/utils/format'
import SectionPanel from '@/components/SectionPanel.vue'
import EmptyState from '@/components/EmptyState.vue'

const props = defineProps({
  searchKeyword: { type: String, default: '' },
  searchResults: { type: Array, default: () => [] },
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

    <div class="result-list">
      <div v-if="searchResults.length" class="result-stack">
        <button
          v-for="product in searchResults"
          :key="product.id"
          type="button"
          class="result-item"
          @click="emit('add', product)"
        >
          <span class="result-main">
            <span class="result-name">{{ product.name }}</span>
            <span class="result-stock">库存 {{ product.stock }}{{ product.unit }}</span>
          </span>
          <span class="result-price num">{{ formatMoney(product.price) }}</span>
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
  flex: 0 0 auto;
  color: var(--color-primary);
  font-weight: 700;
}
</style>
