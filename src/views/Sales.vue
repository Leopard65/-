<template>
  <PageHeader title="销售收银" description="商品结算、会员折扣与小票打印" />

  <el-row :gutter="16" class="cashier">
    <!-- 左：选购商品 -->
    <el-col :span="7">
      <SectionPanel class="col-panel">
        <template #title><el-icon><Search /></el-icon> 选购商品</template>

        <el-input
          ref="searchInputRef"
          v-model="searchKeyword"
          placeholder="商品名称 / 条码（支持扫码枪）"
          clearable
          size="large"
          @keyup.enter="searchProduct"
        >
          <template #append>
            <el-button :icon="Search" @click="searchProduct" />
          </template>
        </el-input>

        <div v-if="scanMode" class="scan-hint">
          <el-icon><Cpu /></el-icon> 扫码枪模式已激活 — 请扫描条形码
        </div>

        <div class="result-list">
          <div v-if="searchResults.length">
            <div v-for="p in searchResults" :key="p.id" class="result-item" @click="addToCart(p)">
              <div class="result-main">
                <span class="result-name">{{ p.name }}</span>
                <span class="result-stock">库存 {{ p.stock }}{{ p.unit }}</span>
              </div>
              <span class="result-price num">{{ formatMoney(p.price) }}</span>
            </div>
          </div>
          <EmptyState v-else :image-size="60" description="搜索商品名称或条码" />
        </div>
      </SectionPanel>
    </el-col>

    <!-- 中：购物车清单 -->
    <el-col :span="10">
      <SectionPanel class="col-panel">
        <template #title><el-icon><ShoppingCart /></el-icon> 购物车清单</template>
        <template #actions>
          <span class="cart-count">共 {{ cartTotal.quantity }} 件</span>
          <el-button v-if="cart.length" link type="danger" :icon="Delete" @click="cart = []">清空</el-button>
        </template>

        <el-table v-if="cart.length" :data="cart" size="default" class="cart-table">
          <el-table-column prop="name" label="商品" min-width="110" show-overflow-tooltip />
          <el-table-column label="单价" width="78" align="right">
            <template #default="{ row }"><span class="num">{{ formatMoney(row.price) }}</span></template>
          </el-table-column>
          <el-table-column label="数量" width="120" align="center">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="1" :max="row.stock" size="small" controls-position="right" style="width:96px" />
            </template>
          </el-table-column>
          <el-table-column label="小计" width="92" align="right">
            <template #default="{ row }"><span class="num amount">{{ formatMoney(row.price * row.quantity) }}</span></template>
          </el-table-column>
          <el-table-column width="46" align="center">
            <template #default="{ $index }">
              <el-button type="danger" :icon="Delete" circle size="small" plain @click="cart.splice($index, 1)" />
            </template>
          </el-table-column>
        </el-table>
        <EmptyState v-else description="购物车为空，请从左侧搜索添加商品" />
      </SectionPanel>
    </el-col>

    <!-- 右：结算面板 -->
    <el-col :span="7">
      <SectionPanel class="col-panel">
        <template #title><el-icon><Money /></el-icon> 结算</template>

        <div class="settle-field">
          <label>会员（可选）</label>
          <el-select v-model="memberId" placeholder="选择会员享折扣与积分" clearable filterable style="width:100%">
            <el-option v-for="m in members" :key="m.id" :label="`${m.name} (${m.phone})`" :value="m.id">
              <span style="float:left">{{ m.name }}</span>
              <span style="float:right;color:var(--text-secondary);font-size:13px">{{ m.level }}</span>
            </el-option>
          </el-select>
          <div v-if="selectedMember" class="member-hint">
            <el-tag size="small" :type="settlement.hasDiscount ? 'warning' : 'info'" effect="light">{{ selectedMember.level }}</el-tag>
            <span v-if="settlement.hasDiscount">享 {{ (settlement.discount * 10).toFixed(2) }} 折</span>
            <span v-else>无折扣</span>
            <span>· 积分 ×{{ settlement.pointsRate }}</span>
          </div>
        </div>

        <div class="settle-field">
          <label>支付方式</label>
          <el-radio-group v-model="payment" class="pay-group">
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

        <el-button type="primary" size="large" class="checkout-btn" :icon="Checked" :disabled="!cart.length" @click="handleCheckout">
          确认结算 · {{ formatMoney(settlement.payable) }}
        </el-button>
      </SectionPanel>
    </el-col>
  </el-row>

  <!-- 最近销售记录 -->
  <SectionPanel title="最近销售记录">
    <el-table :data="recentSales" stripe size="small" style="width:100%">
      <el-table-column prop="id" label="单号" width="80" />
      <el-table-column prop="member_name" label="会员" min-width="100">
        <template #default="{ row }">{{ row.member_name || '-' }}</template>
      </el-table-column>
      <el-table-column prop="payment" label="支付" width="90">
        <template #default="{ row }">{{ payText(row.payment) }}</template>
      </el-table-column>
      <el-table-column prop="total" label="金额" width="120" align="right">
        <template #default="{ row }"><span class="num amount">{{ formatMoney(row.total) }}</span></template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="180" />
    </el-table>
    <EmptyState v-if="!recentSales.length" description="暂无销售记录" />
    <div class="pager">
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
  </SectionPanel>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Search, ShoppingCart, Money, Checked, Cpu } from '@element-plus/icons-vue'
import { productsApi, membersApi, salesApi } from '@/api'
import { printReceipt } from '@/utils/receipt'
import { formatMoney } from '@/utils/format'
import PageHeader from '@/components/PageHeader.vue'
import SectionPanel from '@/components/SectionPanel.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const searchInputRef = ref(null)
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

const payText = (p) => ({ cash: '现金', wechat: '微信', alipay: '支付宝' }[p] || p || '-')

// ========== 扫码枪模拟 ==========
const scanMode = ref(false)
const scanBuffer = ref('')
let scanTimer = null
const SCAN_TIMEOUT = 100 // 扫码枪输入间隔阈值（ms）
const MIN_BARCODE_LENGTH = 4 // 最短条码长度

/**
 * 扫码枪识别逻辑：
 * 扫码枪本质是快速键盘输入，特征为：
 * 1. 短时间内（<100ms）连续输入多个字符
 * 2. 最后以 Enter 键结束
 * 3. 输入速度远快于人工打字
 */
const handleKeyDown = (e) => {
  // 忽略组合键和功能键
  if (e.ctrlKey || e.altKey || e.metaKey) return
  if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(e.key)) return

  // 如果焦点在输入框内，不拦截（允许手动输入）
  const activeEl = document.activeElement
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    // 但如果是搜索框的 Enter，正常处理
    return
  }

  // Enter 键 -> 尝试识别为条码
  if (e.key === 'Enter') {
    if (scanBuffer.value.length >= MIN_BARCODE_LENGTH) {
      e.preventDefault()
      handleBarcodeScan(scanBuffer.value.trim())
    }
    scanBuffer.value = ''
    scanMode.value = false
    clearTimeout(scanTimer)
    return
  }

  // 普通字符 -> 追加到缓冲区
  if (e.key.length === 1) {
    // 检测快速连续输入（扫码枪特征）
    const now = Date.now()
    clearTimeout(scanTimer)

    scanBuffer.value += e.key
    scanMode.value = true

    // 超时未继续输入 -> 判定为人工输入，清空缓冲
    scanTimer = setTimeout(() => {
      scanBuffer.value = ''
      scanMode.value = false
    }, SCAN_TIMEOUT * 3) // 给扫码枪更多容错时间
  }
}

/**
 * 处理扫码枪读入的条码
 */
const handleBarcodeScan = async (barcode) => {
  if (!barcode) return

  // 在本地商品列表中查找
  let product = allProducts.value.find(p => p.barcode === barcode)

  // 本地没找到，尝试从服务端精确查询
  if (!product) {
    try {
      const res = await productsApi.getProducts({ keyword: barcode, pageSize: 1 })
      if (res.data && res.data.length > 0) {
        product = res.data.find(p => p.barcode === barcode) || res.data[0]
        // 刷新本地缓存
        allProducts.value = (await productsApi.getProducts({ pageSize: 1000 })).data
      }
    } catch {
      // 查询失败静默处理
    }
  }

  if (product) {
    if (product.status !== 1) {
      ElMessage.warning(`商品「${product.name}」已下架`)
      return
    }
    addToCart(product)
    ElMessage.success(`扫码添加: ${product.name}`)
  } else {
    ElMessage.warning(`未找到条码「${barcode}」对应的商品`)
  }
}

// ========== 购物车逻辑 ==========
const cartTotal = computed(() => ({
  quantity: cart.value.reduce((s, i) => s + i.quantity, 0),
  amount: cart.value.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)
}))

// 当前选中会员
const selectedMember = computed(() => members.value.find(m => m.id === memberId.value) || null)

// 结算明细预览（口径与服务端一致：应付=round(原价×折扣)，积分=floor(应付×倍率)）
const settlement = computed(() => {
  const original = cart.value.reduce((s, i) => s + i.price * i.quantity, 0)
  const m = selectedMember.value
  const discount = m && m.level_discount != null ? m.level_discount : 1
  const pointsRate = m && m.level_points_rate != null ? m.level_points_rate : 1
  const payable = Math.round(original * discount * 100) / 100
  const savings = Math.round((original - payable) * 100) / 100
  const points = m ? Math.floor(payable * pointsRate) : 0
  return { original, discount, pointsRate, payable, savings, points, hasDiscount: discount < 1 }
})

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
  const res = await salesApi.getSales({ page: salesPage.value, pageSize: salesPageSize.value })
  recentSales.value = res.data
  salesTotal.value = res.total
}

const handleCheckout = async () => {
  if (!cart.value.length) return
  await ElMessageBox.confirm(`确认收取 ${formatMoney(settlement.value.payable)}？`, '结算确认', { type: 'success' })
  try {
    const result = await salesApi.addSale({
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
    allProducts.value = (await productsApi.getProducts({ pageSize: 1000 })).data
    loadSales()
  } catch (e) {
    // 错误已由拦截器处理
  }
}

onMounted(async () => {
  try {
    allProducts.value = (await productsApi.getProducts({ pageSize: 1000 })).data
    members.value = (await membersApi.getMembers({ pageSize: 1000 })).data
    loadSales()
  } catch (e) {
    console.error('加载数据失败:', e)
  }

  // 注册扫码枪监听
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  // 清理扫码枪监听
  document.removeEventListener('keydown', handleKeyDown)
  clearTimeout(scanTimer)
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
.cashier { margin-bottom: 20px; }
/* 三栏等高，内容区像收银界面 */
.col-panel { height: 560px; display: flex; flex-direction: column; }
.col-panel :deep(.panel__body) { flex: 1; overflow-y: auto; }

/* 扫码提示 */
.scan-hint {
  display: flex; align-items: center; gap: 6px;
  margin-top: 12px; padding: 8px 12px;
  background: var(--color-primary-light-9); color: var(--color-primary);
  border-radius: var(--radius-md); font-size: 12px;
}

/* 搜索结果 */
.result-list { margin-top: 14px; }
.result-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; cursor: pointer; border-radius: var(--radius-md);
  border: 1px solid var(--border-color-light); margin-bottom: 8px;
  transition: background 0.15s, border-color 0.15s;
}
.result-item:hover { background: var(--color-primary-light-9); border-color: var(--color-primary-light-7); }
.result-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.result-name { color: var(--text-primary); font-weight: 500; }
.result-stock { font-size: 12px; color: var(--text-secondary); }
.result-price { color: var(--color-primary); font-weight: 600; }

/* 购物车 */
.cart-count { font-size: 13px; color: var(--text-secondary); margin-right: 8px; }
.cart-table { width: 100%; }

/* 结算 */
.settle-field { margin-bottom: 16px; }
.settle-field label { display: block; margin-bottom: 6px; font-size: 13px; color: var(--text-regular); }
.pay-group { display: flex; }
.pay-group :deep(.el-radio-button) { flex: 1; }
.pay-group :deep(.el-radio-button__inner) { width: 100%; }
.member-hint { margin-top: 8px; font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }

.settle-box { background: var(--bg-muted); padding: 16px; border-radius: var(--radius-lg); margin-bottom: 16px; }
.settle-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; color: var(--text-regular); font-size: 14px; }
.settle-discount { color: var(--color-warning); }
.settle-points { color: var(--color-success); margin-bottom: 0; margin-top: 10px; }
.settle-total { display: flex; justify-content: space-between; align-items: baseline; padding-top: 12px; border-top: 1px dashed var(--border-color); }
.settle-total > span:first-child { font-size: 15px; color: var(--text-primary); font-weight: 600; }
.settle-amount { font-size: 30px; font-weight: 700; color: var(--color-danger); }

.checkout-btn { width: 100%; height: 52px; font-size: 17px; font-weight: 600; }

.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
