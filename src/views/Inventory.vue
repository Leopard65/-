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
          <el-button :icon="Edit" @click="openAdjustment()">库存操作</el-button>
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
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="goToPurchase(row)">单品进货</el-button>
            <el-button size="small" @click="openAdjustment(row)">调整</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && !list.length" :description="emptyText" />
    </el-card>

    <SectionPanel title="库存操作记录" style="margin-top:20px">
      <template #actions>
        <el-tag effect="plain">最近 {{ adjustmentRecords.length }} 条</el-tag>
      </template>
      <el-table :data="adjustmentRecords" v-loading="adjustmentLoading" stripe size="small">
        <el-table-column prop="product_name" label="商品" min-width="140" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="adjustmentTypeMeta(row.type).type" effect="light">{{ adjustmentTypeMeta(row.type).text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变更" width="90" align="right">
          <template #default="{ row }">
            <span class="num" :class="row.quantity_delta < 0 ? 'amount--danger' : 'amount--success'">
              {{ row.quantity_delta > 0 ? '+' : '' }}{{ row.quantity_delta }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="120" align="right">
          <template #default="{ row }">{{ row.before_stock }} -> {{ row.after_stock }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.reason || '-' }}</template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column prop="created_at" label="时间" width="170" />
      </el-table>
      <EmptyState v-if="!adjustmentLoading && !adjustmentRecords.length" description="暂无库存操作记录" />
      <div class="adjustment-pager">
        <el-pagination
          v-model:current-page="adjustmentPage"
          v-model:page-size="adjustmentPageSize"
          :page-sizes="[10, 20, 50]"
          :total="adjustmentTotal"
          layout="total, sizes, prev, pager, next"
          small
          @size-change="loadAdjustments"
          @current-change="loadAdjustments"
        />
      </div>
    </SectionPanel>

    <el-dialog v-model="adjustmentVisible" title="库存盘点 / 调整 / 报损" width="520px">
      <el-form :model="adjustmentForm" label-width="90px">
        <el-form-item label="操作类型">
          <el-radio-group v-model="adjustmentForm.type">
            <el-radio-button value="count">盘点</el-radio-button>
            <el-radio-button value="adjust">调整</el-radio-button>
            <el-radio-button value="loss">报损</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="商品">
          <el-select v-model="adjustmentForm.product_id" filterable placeholder="选择商品" style="width:100%">
            <el-option
              v-for="product in products"
              :key="product.id"
              :label="`${product.name}（库存 ${product.stock}${product.unit}）`"
              :value="product.id"
            />
          </el-select>
          <div v-if="selectedProduct" class="stock-preview">
            当前库存 {{ selectedProduct.stock }} {{ selectedProduct.unit }}，预警值 {{ selectedProduct.min_stock }} {{ selectedProduct.unit }}
          </div>
        </el-form-item>
        <el-form-item :label="quantityLabel">
          <el-input-number
            v-model="adjustmentForm.quantity"
            :min="quantityMin"
            :precision="0"
            controls-position="right"
            style="width:100%"
          />
          <div v-if="selectedProduct && adjustmentForm.quantity != null" class="stock-preview">
            操作后库存 {{ previewAfterStock }} {{ selectedProduct.unit }}
          </div>
        </el-form-item>
        <el-form-item label="原因">
          <el-input
            v-model="adjustmentForm.reason"
            type="textarea"
            :rows="3"
            placeholder="例如：月末盘点、破损报损、手工纠偏"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustmentVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingAdjustment" @click="saveAdjustment">确认提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DocumentAdd, Edit } from '@element-plus/icons-vue'
import { inventoryApi, productsApi, reportsApi } from '@/api'
import { stringifyPurchaseDraft } from '@/utils/purchaseDraft'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import SectionPanel from '@/components/SectionPanel.vue'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const rawList = ref([])
const products = ref([])
const selectedRows = ref([])
const filterType = ref('all')
const leadDays = ref(7)
const loading = ref(false)
const adjustmentVisible = ref(false)
const adjustmentLoading = ref(false)
const savingAdjustment = ref(false)
const adjustmentRecords = ref([])
const adjustmentPage = ref(1)
const adjustmentPageSize = ref(10)
const adjustmentTotal = ref(0)
const adjustmentForm = ref({ product_id: null, type: 'count', quantity: 0, reason: '' })
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

const selectedProduct = computed(() =>
  products.value.find(product => product.id === adjustmentForm.value.product_id) || null
)

const quantityLabel = computed(() => ({
  count: '盘点库存',
  adjust: '增加数量',
  loss: '报损数量'
}[adjustmentForm.value.type] || '数量'))

const quantityMin = computed(() => adjustmentForm.value.type === 'count' ? 0 : 1)

const previewAfterStock = computed(() => {
  const product = selectedProduct.value
  if (!product) return 0
  const quantity = Number(adjustmentForm.value.quantity || 0)
  if (adjustmentForm.value.type === 'count') return quantity
  if (adjustmentForm.value.type === 'adjust') return product.stock + quantity
  return Math.max(0, product.stock - quantity)
})

const adjustmentTypeMeta = (type) => ({
  count: { text: '盘点', type: 'primary' },
  adjust: { text: '调整', type: 'success' },
  loss: { text: '报损', type: 'danger' }
}[type] || { text: type || '-', type: 'info' })

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

const loadProducts = async () => {
  const res = await productsApi.getProducts({ pageSize: 1000 })
  products.value = res.data || []
}

const loadAdjustments = async () => {
  adjustmentLoading.value = true
  try {
    const res = await inventoryApi.getAdjustments({ page: adjustmentPage.value, pageSize: adjustmentPageSize.value })
    adjustmentRecords.value = res.data || []
    adjustmentTotal.value = res.total || 0
  } catch (e) {
    console.error('获取库存操作记录失败:', e)
  } finally {
    adjustmentLoading.value = false
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

const openAdjustment = (product) => {
  const currentProduct = product || null
  adjustmentForm.value = {
    product_id: currentProduct?.id || null,
    type: 'count',
    quantity: currentProduct?.stock ?? 0,
    reason: ''
  }
  adjustmentVisible.value = true
}

const saveAdjustment = async () => {
  if (!adjustmentForm.value.product_id) {
    ElMessage.warning('请选择商品')
    return
  }
  savingAdjustment.value = true
  try {
    await inventoryApi.addAdjustment(adjustmentForm.value)
    ElMessage.success('库存操作已记录')
    adjustmentVisible.value = false
    await Promise.all([load(), loadProducts(), loadAdjustments()])
  } catch (e) {
    // 统一错误提示由拦截器处理
  } finally {
    savingAdjustment.value = false
  }
}

watch(() => route.query.type, applyRouteFilter)

onMounted(() => {
  applyRouteFilter()
  load()
  loadProducts()
  loadAdjustments()
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

.adjustment-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-3);
}

.stock-preview {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}
</style>
