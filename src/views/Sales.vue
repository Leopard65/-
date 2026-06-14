<template>
  <el-row :gutter="20">
    <!-- 左侧：收银操作 -->
    <el-col :span="14">
      <el-card>
        <template #header><span>🛒 销售收银</span></template>

        <!-- 搜索商品 -->
        <div style="display:flex;gap:10px;margin-bottom:15px">
          <el-input v-model="searchKeyword" placeholder="输入商品名称或条码搜索" clearable @keyup.enter="searchProduct" style="flex:1">
            <template #append>
              <el-button @click="searchProduct">搜索</el-button>
            </template>
          </el-input>
        </div>

        <!-- 搜索结果 -->
        <div v-if="searchResults.length" style="margin-bottom:15px; max-height:150px; overflow-y:auto; border:1px solid #eee; border-radius:4px">
          <div v-for="p in searchResults" :key="p.id" class="search-item" @click="addToCart(p)">
            <span>{{ p.name }}</span>
            <span style="color:#999">库存:{{ p.stock }}{{ p.unit }}</span>
            <span style="color:#409EFF;font-weight:bold">¥{{ p.price }}</span>
          </div>
        </div>

        <!-- 购物车 -->
        <el-table :data="cart" stripe border style="width:100%">
          <el-table-column prop="name" label="商品" />
          <el-table-column label="单价" width="100">
            <template #default="{ row }">¥{{ row.price }}</template>
          </el-table-column>
          <el-table-column label="数量" width="160">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="1" :max="row.stock" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="小计" width="100">
            <template #default="{ row }">¥{{ (row.price * row.quantity).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column width="60">
            <template #default="{ $index }">
              <el-button type="danger" :icon="Delete" circle size="small" @click="cart.splice($index, 1)" />
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!cart.length" description="购物车为空，请搜索添加商品" />
      </el-card>
    </el-col>

    <!-- 右侧：结算 -->
    <el-col :span="10">
      <el-card>
        <template #header><span>💰 结算</span></template>

        <!-- 会员选择 -->
        <div style="margin-bottom:15px">
          <div style="margin-bottom:5px;color:#666">会员（可选）</div>
          <el-select v-model="memberId" placeholder="选择会员享受积分" clearable filterable style="width:100%">
            <el-option v-for="m in members" :key="m.id" :label="`${m.name} (${m.phone})`" :value="m.id" />
          </el-select>
        </div>

        <!-- 支付方式 -->
        <div style="margin-bottom:15px">
          <div style="margin-bottom:5px;color:#666">支付方式</div>
          <el-radio-group v-model="payment">
            <el-radio-button value="cash">💵 现金</el-radio-button>
            <el-radio-button value="wechat">📱 微信</el-radio-button>
            <el-radio-button value="alipay">📱 支付宝</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 合计 -->
        <div style="background:#f5f7fa;padding:15px;border-radius:8px;margin-bottom:15px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span>商品数量</span>
            <span>{{ cartTotal.quantity }} 件</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:24px;font-weight:bold;color:#F56C6C">
            <span>合计</span>
            <span>¥{{ cartTotal.amount }}</span>
          </div>
        </div>

        <!-- 结算按钮 -->
        <el-button type="danger" size="large" style="width:100%;height:50px;font-size:18px" :disabled="!cart.length" @click="handleCheckout">
          确认结算
        </el-button>
      </el-card>

      <!-- 最近销售 -->
      <el-card style="margin-top:20px">
        <template #header><span>📋 最近销售记录</span></template>
        <el-table :data="recentSales" stripe size="small" style="width:100%">
          <el-table-column prop="id" label="单号" width="60" />
          <el-table-column prop="member_name" label="会员" width="80">
            <template #default="{ row }">{{ row.member_name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="total" label="金额" width="80">
            <template #default="{ row }">¥{{ row.total?.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="created_at" label="时间" />
        </el-table>
        <!-- 分页 -->
        <div style="display:flex;justify-content:flex-end;margin-top:10px">
          <el-pagination
            v-model:current-page="salesPage"
            v-model:page-size="salesPageSize"
            :page-sizes="[5, 10, 20]"
            :total="salesTotal"
            layout="total, sizes, prev, pager, next"
            @size-change="loadSales"
            @current-change="loadSales"
            small
          />
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import api from '../api'
import { printReceipt } from '../utils/receipt'

const router = useRouter()
const allProducts = ref([])
const searchKeyword = ref('')
const searchResults = ref([])
const cart = ref([])
const members = ref([])
const memberId = ref(null)
const payment = ref('cash')
const recentSales = ref([])
const salesPage = ref(1)
const salesPageSize = ref(5)
const salesTotal = ref(0)

const cartTotal = computed(() => ({
  quantity: cart.value.reduce((s, i) => s + i.quantity, 0),
  amount: cart.value.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)
}))

const searchProduct = () => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) { searchResults.value = []; return }
  searchResults.value = allProducts.value.filter(p =>
    (p.name && p.name.toLowerCase().includes(kw)) ||
    (p.barcode && p.barcode.includes(kw))
  )
}

const addToCart = (product) => {
  const exist = cart.value.find(c => c.product_id === product.id)
  if (exist) {
    if (exist.quantity < product.stock) exist.quantity++
    else ElMessage.warning('已达库存上限')
  } else {
    cart.value.push({
      product_id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      quantity: 1
    })
  }
  searchKeyword.value = ''
  searchResults.value = []
}

const loadSales = async () => {
  const res = await api.getSales({ page: salesPage.value, pageSize: salesPageSize.value })
  recentSales.value = res.data
  salesTotal.value = res.total
}

const handleCheckout = async () => {
  if (!cart.value.length) return
  await ElMessageBox.confirm(`确认收取 ¥${cartTotal.value.amount}？`, '结算确认', { type: 'success' })
  try {
    const result = await api.addSale({
      member_id: memberId.value || null,
      payment: payment.value,
      items: cart.value.map(c => ({ product_id: c.product_id, quantity: c.quantity, price: c.price }))
    })

    // 准备小票数据
    const saleData = {
      ...result,
      items: cart.value,
      member_name: memberId.value ? members.value.find(m => m.id === memberId.value)?.name : null,
      created_at: new Date().toISOString()
    }

    // 询问是否打印小票
    try {
      await ElMessageBox.confirm('是否打印小票？', '提示', {
        confirmButtonText: '打印',
        cancelButtonText: '不打印',
        type: 'info'
      })
      printReceipt(saleData)
    } catch {
      // 用户选择不打印
    }

    ElMessage.success('结算成功！')
    cart.value = []
    memberId.value = null
    // 刷新数据
    allProducts.value = await api.getProducts({ pageSize: 1000 })
    loadSales()
  } catch (e) {
    // 错误已由拦截器处理
  }
}

onMounted(async () => {
  try {
    allProducts.value = await api.getProducts({ pageSize: 1000 })
    members.value = await api.getMembers({ pageSize: 1000 })
    loadSales()
  } catch (e) {
    console.error('加载数据失败:', e)
  }
})

// 离开页面前确认
onBeforeRouteLeave((to, from, next) => {
  if (cart.value.length > 0) {
    ElMessageBox.confirm('购物车中有商品，确定要离开吗？', '提示', {
      type: 'warning'
    }).then(() => next()).catch(() => next(false))
  } else {
    next()
  }
})
</script>

<style scoped>
.search-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0;
}
.search-item:hover { background: #f5f7fa; }
</style>
