<template>
  <div>
    <PageHeader title="库存预警" description="低库存与按销售速度的智能补货建议">
      <template #actions>
        <div class="replenish-actions">
          <span class="replenish-actions__label">备货周期</span>
          <el-input-number
            v-model="leadDays"
            :min="1"
            :max="30"
            size="small"
            controls-position="right"
            @change="handleLeadDaysChange"
          />
          <el-button
            type="primary"
            :icon="DocumentAdd"
            :disabled="!selectedRows.length"
            @click="createPurchaseDraft"
          >
            生成采购草稿
          </el-button>
        </div>
        <el-tag type="danger" size="large">需补货 {{ rawList.length }} 项</el-tag>
      </template>
    </PageHeader>

    <FilterBar>
      <el-radio-group v-model="filterType" @change="handleFilterChange">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="low">低库存</el-radio-button>
        <el-radio-button value="out">缺货</el-radio-button>
      </el-radio-group>
      <template #actions>
        <el-tag v-if="selectedRows.length" type="success" effect="plain">已选 {{ selectedRows.length }} 项</el-tag>
        <el-tag effect="plain">{{ currentFilterLabel }} {{ list.length }} 项</el-tag>
      </template>
    </FilterBar>

    <el-card v-loading="loading">
      <el-table
        :data="list"
        row-key="id"
        border
        stripe
        style="width:100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="name" label="商品名称" min-width="140" />
        <el-table-column prop="category_name" label="分类" width="100">
          <template #default="{ row }">{{ row.category_name || '-' }}</template>
        </el-table-column>
        <el-table-column label="当前库存" width="110">
          <template #default="{ row }">
            <el-tag :type="row.stock === 0 ? 'danger' : (row.stock <= row.min_stock ? 'warning' : 'info')">
              {{ row.stock }} {{ row.unit }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="min_stock" label="安全库存" width="100">
          <template #default="{ row }">{{ row.min_stock }} {{ row.unit }}</template>
        </el-table-column>
        <el-table-column label="日均销量" width="100">
          <template #default="{ row }">{{ row.avg_daily }} {{ row.unit }}</template>
        </el-table-column>
        <el-table-column label="预计可售" width="120">
          <template #default="{ row }">
            <span v-if="row.days_left == null" style="color:#909399">无近期销量</span>
            <el-tag v-else :type="row.days_left <= 3 ? 'danger' : (row.days_left <= leadDays ? 'warning' : 'success')">
              {{ row.days_left }} 天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="建议补货" width="120">
          <template #default="{ row }">
            <span style="font-weight:bold;color:#409EFF">{{ row.suggested }} {{ row.unit }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="goToPurchase(row)">单品进货</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && !list.length" :description="emptyText" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DocumentAdd } from '@element-plus/icons-vue'
import { reportsApi } from '@/api'
import { stringifyPurchaseDraft } from '@/utils/purchaseDraft'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'

const route = useRoute()
const router = useRouter()
const rawList = ref([])
const selectedRows = ref([])
const filterType = ref('all')
const leadDays = ref(7)
const loading = ref(false)
const filterOptions = new Set(['all', 'low', 'out'])

const normalizeFilter = (value) => {
  const nextFilter = Array.isArray(value) ? value[0] : value
  return filterOptions.has(nextFilter) ? nextFilter : 'all'
}

const applyRouteFilter = () => {
  filterType.value = normalizeFilter(route.query.type)
  const queryLeadDays = Number(Array.isArray(route.query.lead_days) ? route.query.lead_days[0] : route.query.lead_days)
  if (queryLeadDays >= 1 && queryLeadDays <= 30) leadDays.value = queryLeadDays
}

const list = computed(() => {
  if (filterType.value === 'low') {
    return rawList.value.filter(row => row.stock > 0 && row.stock <= row.min_stock)
  }
  if (filterType.value === 'out') {
    return rawList.value.filter(row => row.stock === 0)
  }
  return rawList.value
})

const currentFilterLabel = computed(() => ({
  all: '当前需补货',
  low: '低库存',
  out: '缺货'
}[filterType.value] || '当前需补货'))

const emptyText = computed(() => ({
  all: '库存充足，暂无需补货商品',
  low: '暂无低库存商品',
  out: '暂无缺货商品'
}[filterType.value] || '库存充足，暂无需补货商品'))

const load = async () => {
  loading.value = true
  try {
    const res = await reportsApi.getInventoryReplenish({ lead_days: leadDays.value })
    rawList.value = res.data || []
    if (res.lead_days) leadDays.value = res.lead_days
  } catch (e) {
    console.error('获取补货建议失败:', e)
  } finally {
    loading.value = false
  }
}

const handleFilterChange = () => {
  const query = { ...route.query }
  if (filterType.value === 'all') delete query.type
  else query.type = filterType.value
  query.lead_days = leadDays.value
  router.replace({ path: '/inventory', query })
}

const handleLeadDaysChange = () => {
  const query = { ...route.query, lead_days: leadDays.value }
  router.replace({ path: '/inventory', query })
  load()
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const createPurchaseDraft = () => {
  const draft = stringifyPurchaseDraft(selectedRows.value)
  if (!draft) {
    ElMessage.warning('请选择需要补货的商品')
    return
  }

  router.push({
    path: '/purchases',
    query: {
      source: 'replenish',
      lead_days: leadDays.value,
      draft
    }
  })
}

const goToPurchase = (product) => {
  router.push({
    path: '/purchases',
    query: { source: 'replenish', lead_days: leadDays.value, product_id: product.id, product_name: product.name, qty: product.suggested }
  })
}

watch(() => route.query.type, applyRouteFilter)

onMounted(() => {
  applyRouteFilter()
  load()
})
</script>

<style scoped>
.replenish-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.replenish-actions__label {
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
