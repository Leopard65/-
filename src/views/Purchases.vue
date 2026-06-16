<template>
  <PageHeader title="进货管理" description="供应商进货入库与明细">
    <template #actions>
      <el-button type="primary" @click="openDialog()">新建进货单</el-button>
    </template>
  </PageHeader>
  <el-card>
    <!-- 进货记录列表 -->
    <el-table :data="purchases" v-loading="loading" stripe border style="width:100%">
      <el-table-column prop="id" label="单号" width="80" />
      <el-table-column prop="supplier_name" label="供应商" min-width="160">
        <template #default="{ row }">{{ row.supplier_name || '-' }}</template>
      </el-table-column>
      <el-table-column prop="total" label="总金额" width="140" align="right">
        <template #default="{ row }"><span class="num amount">{{ formatMoney(row.total) }}</span></template>
      </el-table-column>
      <el-table-column prop="created_at" label="进货时间" width="180" />
      <el-table-column label="明细" width="90">
        <template #default="{ row }">
          <el-button size="small" :icon="View" @click="showDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
    <EmptyState v-if="!loading && !purchases.length" description="暂无进货记录" />

    <!-- 分页 -->
    <div style="display:flex;justify-content:flex-end;margin-top:15px">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="load"
        @current-change="load"
      />
    </div>

    <!-- 新建进货单弹窗 -->
    <el-dialog v-model="dialogVisible" title="新建进货单" width="700px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="供应商">
          <el-select v-model="form.supplier_id" placeholder="选择供应商" clearable style="width:100%">
            <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="进货明细">
          <div style="width:100%">
            <div v-for="(item, i) in form.items" :key="i" class="purchase-line">
              <div class="purchase-line__main">
                <el-select v-model="item.product_id" placeholder="选择商品" filterable style="flex:2">
                  <el-option v-for="p in products" :key="p.id" :label="`${p.name} (库存:${p.stock})`" :value="p.id" />
                </el-select>
                <el-input-number v-model="item.quantity" :min="1" placeholder="数量" style="flex:1" />
                <el-input-number v-model="item.cost" :min="0" :precision="2" placeholder="单价" style="flex:1" />
                <span style="width:90px;text-align:right" class="num">{{ formatMoney(item.quantity * item.cost) }}</span>
                <el-button type="danger" :icon="Delete" circle size="small" @click="form.items.splice(i, 1)" />
              </div>
              <div class="purchase-line__batch">
                <span class="purchase-line__hint">保质期（选填，填到期日则登记批次）</span>
                <el-date-picker v-model="item.expiry_date" type="date" placeholder="到期日" value-format="YYYY-MM-DD" style="width:150px" />
                <el-input v-model="item.batch_no" placeholder="批次号" style="width:150px" />
              </div>
            </div>
            <el-button @click="form.items.push({ product_id: null, quantity: 1, cost: 0, batch_no: '', expiry_date: null })" style="width:100%">
              + 添加商品
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="合计">
          <span style="font-size:20px;font-weight:bold;color:var(--color-primary)" class="num">{{ formatMoney(formTotal) }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确认入库</el-button>
      </template>
    </el-dialog>

    <!-- 明细弹窗 -->
    <el-dialog v-model="detailVisible" title="进货明细" width="500px">
      <el-table :data="detailItems" stripe>
        <el-table-column prop="product_name" label="商品" />
        <el-table-column prop="quantity" label="数量" width="80" align="right" />
        <el-table-column prop="cost" label="单价" width="110" align="right">
          <template #default="{ row }"><span class="num">{{ formatMoney(row.cost) }}</span></template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Delete, View } from '@element-plus/icons-vue'
import { purchasesApi, suppliersApi, productsApi } from '@/api'
import { formatMoney } from '@/utils/format'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()

const purchases = ref([])
const suppliers = ref([])
const products = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const detailItems = ref([])
const form = ref({ supplier_id: null, items: [] })
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const formTotal = computed(() =>
  form.value.items.reduce((s, i) => s + i.quantity * i.cost, 0).toFixed(2)
)

const load = async () => {
  loading.value = true
  try {
    const res = await purchasesApi.getPurchases({ page: page.value, pageSize: pageSize.value })
    purchases.value = res.data
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const openDialog = () => {
  form.value = { supplier_id: null, items: [{ product_id: null, quantity: 1, cost: 0, batch_no: '', expiry_date: null }] }
  dialogVisible.value = true
}

const showDetail = (row) => {
  detailItems.value = row.items || []
  detailVisible.value = true
}

const handleSave = async () => {
  const valid = form.value.items.filter(i => i.product_id && i.quantity > 0)
  if (valid.length === 0) return ElMessage.warning('请添加进货商品')
  try {
    await purchasesApi.addPurchase({ supplier_id: form.value.supplier_id, items: valid })
    ElMessage.success('入库成功')
    dialogVisible.value = false
    load()
  } catch (e) {
    // 错误提示已由 request 拦截器统一处理
  }
}

onMounted(async () => {
  try {
    const [suppliersRes, productsRes] = await Promise.all([
      suppliersApi.getSuppliers(),
      productsApi.getProducts({ pageSize: 1000 })
    ])
    suppliers.value = suppliersRes.data || suppliersRes
    products.value = productsRes.data || productsRes
    load()

    // 处理从库存预警页面跳转过来的参数
    if (router.currentRoute.value.query.product_id) {
      openDialog()
      form.value.items[0].product_id = Number(router.currentRoute.value.query.product_id)
      const qty = Number(router.currentRoute.value.query.qty)
      if (qty > 0) form.value.items[0].quantity = qty
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  }
})
</script>

<style scoped>
.purchase-line {
  padding: 10px;
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-md);
  margin-bottom: 10px;
}
.purchase-line__main { display: flex; gap: 10px; align-items: center; }
.purchase-line__batch { display: flex; gap: 10px; align-items: center; margin-top: 8px; }
.purchase-line__hint { font-size: 12px; color: var(--text-secondary); flex: 1; }
</style>
