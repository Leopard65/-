<template>
  <PageHeader title="退换货管理" description="退货申请、审核与退款">
    <template #actions>
      <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width:120px" @change="load">
        <el-option label="待审核" value="pending" />
        <el-option label="已完成" value="completed" />
        <el-option label="已拒绝" value="rejected" />
      </el-select>
      <el-button type="primary" @click="openDialog()">新建退单</el-button>
    </template>
  </PageHeader>
  <el-card>
    <!-- 退单列表 -->
    <el-table :data="returns" stripe border style="width:100%">
      <el-table-column prop="id" label="退单号" width="80" />
      <el-table-column prop="sale_id" label="原订单号" width="80" />
      <el-table-column prop="member_name" label="会员" width="100">
        <template #default="{ row }">{{ row.member_name || '-' }}</template>
      </el-table-column>
      <el-table-column prop="total" label="退款金额" width="100">
        <template #default="{ row }">¥{{ row.total?.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="退货原因" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'pending' && isAdmin" size="small" type="success" @click="handleApprove(row)">通过</el-button>
          <el-button v-if="row.status === 'pending' && isAdmin" size="small" type="danger" @click="handleReject(row)">拒绝</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="display:flex;justify-content:flex-end;margin-top:15px">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="load"
        @current-change="load"
      />
    </div>

    <!-- 新建退单弹窗 -->
    <el-dialog v-model="dialogVisible" title="新建退单" width="700px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="原订单号" required>
          <el-input-number v-model="form.sale_id" :min="1" style="width:200px" @change="loadSaleDetail" />
        </el-form-item>

        <el-form-item label="退货商品">
          <div style="width:100%">
            <div v-for="(item, i) in form.items" :key="i" style="display:flex;gap:10px;margin-bottom:10px;align-items:center">
              <el-select v-model="item.product_id" placeholder="选择商品" filterable style="flex:2" @change="onProductChange(item)">
                <el-option v-for="p in saleItems" :key="p.product_id" :label="`${p.product_name} (购买:${p.quantity})`" :value="p.product_id" />
              </el-select>
              <el-input-number v-model="item.quantity" :min="1" placeholder="数量" style="flex:1" />
              <el-input-number v-model="item.price" :precision="2" disabled placeholder="原单价" style="flex:1" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="form.items.splice(i, 1)" />
            </div>
            <el-button @click="form.items.push({ product_id: null, quantity: 1, price: 0 })" style="width:100%">
              + 添加退货商品
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="退货原因">
          <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="请输入退货原因" />
        </el-form-item>

        <el-form-item label="预估退款">
          <div>
            <span style="font-size:20px;font-weight:bold;color:#F56C6C">¥{{ formTotal }}</span>
            <span v-if="saleDiscount < 1" style="margin-left:10px;font-size:12px;color:#909399">
              （原单 {{ (saleDiscount * 10).toFixed(2) }} 折，按折后价退；实际以审核为准）
            </span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">提交退单</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="退单详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="退单号">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="原订单号">{{ detail.sale_id }}</el-descriptions-item>
        <el-descriptions-item label="会员">{{ detail.member_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(detail.status)">{{ statusText(detail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">¥{{ detail.total?.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detail.created_at }}</el-descriptions-item>
        <el-descriptions-item label="退货原因" :span="2">{{ detail.reason || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-divider>退货商品</el-divider>
      <el-table :data="detail.items" stripe size="small">
        <el-table-column prop="product_name" label="商品" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="price" label="单价" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { returnsApi, salesApi } from '@/api'
import { useUserStore } from '@/stores/user'
import PageHeader from '@/components/PageHeader.vue'

const userStore = useUserStore()
const returns = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterStatus = ref('')
const dialogVisible = ref(false)
const detailVisible = ref(false)
const detail = ref({})
const form = ref({ sale_id: null, items: [], reason: '' })
const saleItems = ref([])
const saleDiscount = ref(1)

const isAdmin = userStore.isAdmin

const formTotal = computed(() =>
  (form.value.items.reduce((s, i) => s + i.quantity * i.price, 0) * saleDiscount.value).toFixed(2)
)

const statusType = (status) => {
  const map = { pending: 'warning', completed: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

const statusText = (status) => {
  const map = { pending: '待审核', completed: '已完成', rejected: '已拒绝' }
  return map[status] || status
}

const load = async () => {
  const res = await returnsApi.getReturns({
    page: page.value,
    pageSize: pageSize.value,
    status: filterStatus.value || undefined
  })
  returns.value = res.data
  total.value = res.total
}

const openDialog = () => {
  form.value = { sale_id: null, items: [{ product_id: null, quantity: 1, price: 0 }], reason: '' }
  saleItems.value = []
  saleDiscount.value = 1
  dialogVisible.value = true
}

const loadSaleDetail = async (saleId) => {
  if (!saleId) return
  try {
    const sale = await salesApi.getSaleDetail(saleId)
    if (sale && sale.items) {
      saleItems.value = sale.items
      // 原单实际折扣 = 实收总额 / 明细原价合计（与服务端退款口径一致）
      const lineSum = sale.items.reduce((s, i) => s + i.price * i.quantity, 0)
      saleDiscount.value = lineSum > 0 ? sale.total / lineSum : 1
    }
    // 切换订单后清空已选退货商品的单价（待重新选择带出）
    form.value.items.forEach(it => onProductChange(it))
  } catch {
    saleItems.value = []
    saleDiscount.value = 1
  }
}

// 选中退货商品后，自动带出该商品在原单中的单价（服务端权威，禁止手改）
const onProductChange = (item) => {
  const matched = saleItems.value.find(p => p.product_id === item.product_id)
  item.price = matched ? matched.price : 0
}

const showDetail = async (row) => {
  try {
    const res = await returnsApi.getReturnDetail(row.id)
    detail.value = res
    detailVisible.value = true
  } catch {
    ElMessage.error('获取详情失败')
  }
}

const handleSave = async () => {
  if (!form.value.sale_id) return ElMessage.warning('请输入原订单号')
  const valid = form.value.items.filter(i => i.product_id && i.quantity > 0)
  if (valid.length === 0) return ElMessage.warning('请添加退货商品')

  try {
    await returnsApi.createReturn({
      sale_id: form.value.sale_id,
      items: valid,
      reason: form.value.reason
    })
    ElMessage.success('退单已创建')
    dialogVisible.value = false
    load()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '创建失败')
  }
}

const handleApprove = async (row) => {
  await ElMessageBox.confirm('确定审核通过此退单？', '审核确认', { type: 'success' })
  try {
    await returnsApi.approveReturn(row.id, { action: 'approve' })
    ElMessage.success('审核通过')
    load()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '审核失败')
  }
}

const handleReject = async (row) => {
  await ElMessageBox.confirm('确定拒绝此退单？', '审核确认', { type: 'warning' })
  try {
    await returnsApi.approveReturn(row.id, { action: 'reject' })
    ElMessage.success('已拒绝')
    load()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  }
}

onMounted(load)
</script>
