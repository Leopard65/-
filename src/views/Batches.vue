<template>
  <PageHeader title="批次 / 保质期" description="商品批次保质期登记、临期与过期预警、清理下架报损" />

  <!-- KPI 概览 -->
  <div class="metric-grid">
    <MetricCard label="临期批次" :value="formatNumber(summary.near)" tone="warning">
      <template #icon><el-icon><Clock /></el-icon></template>
    </MetricCard>
    <MetricCard label="过期批次" :value="formatNumber(summary.expired)" tone="danger">
      <template #icon><el-icon><CircleClose /></el-icon></template>
    </MetricCard>
    <MetricCard label="临期/过期货值（预计损耗）" :value="formatMoney(summary.lossAmount)" tone="accent">
      <template #icon><el-icon><Money /></el-icon></template>
    </MetricCard>
  </div>

  <SectionPanel>
    <FilterBar>
      <el-radio-group v-model="filter" @change="handleFilterChange">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="near">临期</el-radio-button>
        <el-radio-button value="expired">过期</el-radio-button>
        <el-radio-button value="normal">正常</el-radio-button>
        <el-radio-button value="cleared">已清理</el-radio-button>
      </el-radio-group>
      <el-select v-model="productId" placeholder="按商品筛选" filterable clearable style="width:200px" @change="reload">
        <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
      </el-select>
      <template #actions>
        <el-button type="primary" :icon="Plus" @click="openDialog()">新增批次</el-button>
      </template>
    </FilterBar>

    <el-table :data="list" v-loading="loading" border stripe style="width:100%">
      <el-table-column prop="product_name" label="商品" min-width="150" />
      <el-table-column prop="batch_no" label="批次号" width="120">
        <template #default="{ row }">{{ row.batch_no || '-' }}</template>
      </el-table-column>
      <el-table-column label="生产日期" width="120">
        <template #default="{ row }">{{ row.production_date ? formatDate(row.production_date) : '-' }}</template>
      </el-table-column>
      <el-table-column label="到期日" width="120">
        <template #default="{ row }">{{ formatDate(row.expiry_date) }}</template>
      </el-table-column>
      <el-table-column label="保质期状态" width="180">
        <template #default="{ row }">
          <StatusTag preset="batchExpiry" :value="row.expiry_status" />
          <span class="days-hint">{{ daysText(row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="100" align="right">
        <template #default="{ row }"><span class="num">{{ row.quantity }} {{ row.unit }}</span></template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><StatusTag preset="batchStatus" :value="row.status" /></template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link :disabled="row.status === 'cleared'" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="warning" link :disabled="row.status === 'cleared'" @click="handleClear(row)">清理下架</el-button>
          <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <EmptyState v-if="!loading && !list.length" description="暂无批次记录" />

    <div style="display:flex;justify-content:flex-end;margin-top:15px">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="reload"
        @current-change="load"
      />
    </div>
  </SectionPanel>

  <!-- 新增 / 编辑批次 -->
  <el-dialog v-model="dialogVisible" :title="form.id ? '编辑批次' : '新增批次'" width="460px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="商品" prop="product_id">
        <el-select v-model="form.product_id" placeholder="选择商品" filterable :disabled="!!form.id" style="width:100%">
          <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="批次号" prop="batch_no">
        <el-input v-model="form.batch_no" placeholder="选填，便于追溯" />
      </el-form-item>
      <el-form-item label="生产日期" prop="production_date">
        <el-date-picker v-model="form.production_date" type="date" placeholder="选填" value-format="YYYY-MM-DD" style="width:100%" />
      </el-form-item>
      <el-form-item label="到期日" prop="expiry_date">
        <el-date-picker v-model="form.expiry_date" type="date" placeholder="必填" value-format="YYYY-MM-DD" style="width:100%" />
      </el-form-item>
      <el-form-item label="数量" prop="quantity">
        <el-input-number v-model="form.quantity" :min="0" style="width:100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Clock, CircleClose, Money } from '@element-plus/icons-vue'
import { batchesApi, productsApi } from '@/api'
import { formatMoney, formatNumber, formatDate } from '@/utils/format'
import PageHeader from '@/components/PageHeader.vue'
import MetricCard from '@/components/MetricCard.vue'
import SectionPanel from '@/components/SectionPanel.vue'
import FilterBar from '@/components/FilterBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyState from '@/components/EmptyState.vue'

const list = ref([])
const products = ref([])
const summary = ref({ near: 0, expired: 0, lossAmount: 0 })
const loading = ref(false)
const filter = ref('all')
const productId = ref(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const dialogVisible = ref(false)
const formRef = ref(null)
const form = ref({})
const rules = {
  product_id: [{ required: true, message: '请选择商品', trigger: 'change' }],
  expiry_date: [{ required: true, message: '请选择到期日', trigger: 'change' }]
}

// 剩余天数文案（已清理或无到期日不显示）
const daysText = (row) => {
  if (row.status === 'cleared' || row.days_left == null) return ''
  if (row.days_left < 0) return `已过期 ${-row.days_left} 天`
  if (row.days_left === 0) return '今天到期'
  return `剩 ${row.days_left} 天`
}

const load = async () => {
  loading.value = true
  try {
    const res = await batchesApi.getBatches({
      filter: filter.value,
      product_id: productId.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    list.value = res.data
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const loadSummary = async () => {
  try {
    summary.value = await batchesApi.getBatchSummary()
  } catch {
    // 错误已由拦截器处理
  }
}

const refresh = () => { load(); loadSummary() }
const reload = () => { page.value = 1; load() }
const handleFilterChange = () => { page.value = 1; load() }

const openDialog = (row) => {
  form.value = row
    ? { id: row.id, product_id: row.product_id, batch_no: row.batch_no, production_date: row.production_date, expiry_date: row.expiry_date, quantity: row.quantity }
    : { product_id: null, batch_no: '', production_date: null, expiry_date: null, quantity: 0 }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

const handleSave = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return // 校验未通过
  }
  try {
    if (form.value.id) {
      await batchesApi.updateBatch(form.value.id, form.value)
    } else {
      await batchesApi.addBatch(form.value)
    }
    ElMessage.success('已保存')
    dialogVisible.value = false
    refresh()
  } catch {
    // 错误已由拦截器处理
  }
}

const handleClear = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定清理下架「${row.product_name}」该批次？将从库存扣减 ${row.quantity} ${row.unit || ''} 并计入损耗。`,
      '清理下架', { type: 'warning' }
    )
    const res = await batchesApi.clearBatch(row.id)
    ElMessage.success(`已下架 ${res.cleared_qty} 件，损耗 ${formatMoney(res.loss)}`)
    refresh()
  } catch (err) {
    if (err !== 'cancel') {
      // 错误已由拦截器处理
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('删除该批次记录？仅删除记录，不影响商品库存。', '提示', { type: 'warning' })
    await batchesApi.deleteBatch(row.id)
    ElMessage.success('已删除')
    refresh()
  } catch (err) {
    if (err !== 'cancel') {
      // 错误已由拦截器处理
    }
  }
}

onMounted(async () => {
  try {
    const res = await productsApi.getProducts({ pageSize: 1000 })
    products.value = res.data || res
  } catch {
    // 错误已由拦截器处理
  }
  refresh()
})
</script>

<style scoped>
.days-hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
