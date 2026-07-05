<template>
  <PageHeader title="销售收银" description="商品结算、会员折扣与小票打印" />

  <div class="cashier-grid">
    <ProductPicker
      ref="productPickerRef"
      v-model:search-keyword="searchKeyword"
      :search-results="searchResults"
      :quick-products="quickProducts"
      :scan-mode="scanMode"
      @search="handleSearchSubmit"
      @add="addToCart"
    />
    <CartPanel
      :cart="cart"
      :cart-total="cartTotal"
      @clear="clearCart"
      @remove="removeCartItem"
    />
    <CheckoutPanel
      v-model:member-id="memberId"
      v-model:payment="payment"
      :members="members"
      :selected-member="selectedMember"
      :settlement="settlement"
      :cart-total="cartTotal"
      :disabled="!cart.length"
      @checkout="handleCheckout"
    />
  </div>

  <!-- 最近销售记录 -->
  <SectionPanel title="最近销售记录">
    <el-table :data="recentSales" stripe size="small" class="recent-table">
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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { productsApi, membersApi, salesApi } from '@/api'
import { printReceipt } from '@/utils/receipt'
import { formatMoney } from '@/utils/format'
import PageHeader from '@/components/PageHeader.vue'
import SectionPanel from '@/components/SectionPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import ProductPicker from '@/components/cashier/ProductPicker.vue'
import CartPanel from '@/components/cashier/CartPanel.vue'
import CheckoutPanel from '@/components/cashier/CheckoutPanel.vue'

const router = useRouter()
const productPickerRef = ref(null)
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
  if (handleCashierShortcut(e)) return

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

const quickProducts = computed(() => {
  return allProducts.value
    .filter(p => p.status === 1 && p.stock > 0)
    .slice()
    .sort((a, b) => {
      const aHealthy = a.min_stock == null || a.stock > a.min_stock
      const bHealthy = b.min_stock == null || b.stock > b.min_stock
      if (aHealthy !== bHealthy) return aHealthy ? -1 : 1
      return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
    })
    .slice(0, 12)
})

const isSellableProduct = (product) => product.status === 1 && product.stock > 0

const focusSearch = () => {
  nextTick(() => productPickerRef.value?.focusSearch?.())
}

const clearSearch = () => {
  searchKeyword.value = ''
  searchResults.value = []
}

const getSearchMatches = () => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return []
  return allProducts.value.filter(p =>
    (p.name && p.name.toLowerCase().includes(kw)) ||
    (p.barcode && p.barcode.includes(kw))
  )
}

const searchProduct = () => {
  searchResults.value = getSearchMatches()
}

const handleSearchSubmit = ({ source } = {}) => {
  searchProduct()
  if (source !== 'enter') return
  const sellable = searchResults.value.filter(isSellableProduct)
  if (sellable.length === 1) addToCart(sellable[0])
}

const addToCart = (product) => {
  if (!isSellableProduct(product)) {
    ElMessage.warning(product.status !== 1 ? `商品「${product.name}」已下架` : `商品「${product.name}」库存不足`)
    return
  }
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
  clearSearch()
  focusSearch()
}

const clearCart = async () => {
  if (!cart.value.length) return
  try {
    await ElMessageBox.confirm('确定清空当前购物车？', '清空确认', { type: 'warning' })
    cart.value = []
    focusSearch()
  } catch {
    // 用户取消
  }
}

const removeCartItem = (index) => {
  cart.value.splice(index, 1)
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
    focusSearch()
  } catch (e) {
    // 错误已由拦截器处理
  }
}

const isEditableTarget = (target) => {
  if (!target) return false
  const tag = target.tagName
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || Boolean(target.closest?.('.el-input, .el-textarea, .el-select'))
}

const isOverlayOpen = () => Boolean(document.querySelector('.el-overlay, .el-select-dropdown'))

const handleCashierShortcut = (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return false
  if (isEditableTarget(e.target) || isOverlayOpen()) return false

  if (e.key === '/') {
    e.preventDefault()
    focusSearch()
    return true
  }

  if (e.key === 'F8') {
    e.preventDefault()
    if (!cart.value.length) return true
    handleCheckout()
    return true
  }

  if (e.key === 'Escape') {
    if (!searchKeyword.value && !searchResults.value.length) return true
    e.preventDefault()
    clearSearch()
    focusSearch()
    return true
  }

  return false
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
.cashier-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.86fr) minmax(440px, 1.28fr) minmax(300px, 0.86fr);
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.cashier-grid :deep(.cashier-panel) {
  height: 590px;
  display: flex;
  flex-direction: column;
}

.cashier-grid :deep(.panel__header) {
  min-height: 58px;
}

.cashier-grid :deep(.panel__body) {
  flex: 1;
}

.recent-table { width: 100%; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }

@media (max-width: 1280px) {
  .cashier-grid {
    grid-template-columns: minmax(280px, 0.9fr) minmax(390px, 1.2fr) minmax(280px, 0.9fr);
  }
}

@media (max-width: 1100px) {
  .cashier-grid {
    grid-template-columns: 1fr;
  }

  .cashier-grid :deep(.cashier-panel) {
    height: auto;
    min-height: 420px;
  }
}
</style>
