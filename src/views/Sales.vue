<template>
  <el-row :gutter="20">
    <!-- 左侧：收银操作 -->
    <el-col :span="14">
      <el-card>
        <template #header><span>🛒 销售收银</span></template>

        <!-- 搜索商品 -->
        <div style="display:flex;gap:10px;margin-bottom:15px">
          <el-input
            ref="searchInputRef"
            v-model="searchKeyword"
            placeholder="输入商品名称或条码搜索（支持扫码枪）"
            clearable
            @keyup.enter="searchProduct"
            style="flex:1"
          >
            <template #append>
              <el-button @click="searchProduct">搜索</el-button>
            </template>
          </el-input>
        </div>

        <!-- 扫码状态提示 -->
        <div v-if="scanMode" style="margin-bottom:10px;padding:6px 12px;background:#e6f7ff;border:1px solid #91d5ff;border-radius:4px;font-size:12px;color:#1890ff">
          📡 扫码枪模式已激活 - 请直接扫描条形码
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
          <el-select v-model="memberId" placeholder="选择会员享折扣与积分" clearable filterable style="width:100%">
            <el-option
              v-for="m in members"
              :key="m.id"
              :label="`${m.name} (${m.phone})`"
              :value="m.id"
            >
              <span style="float:left">{{ m.name }}</span>
              <span style="float:right;color:#8492a6;font-size:13px">{{ m.level }}</span>
            </el-option>
          </el-select>
          <div v-if="selectedMember" class="member-hint">
            <el-tag size="small" :type="settlement.hasDiscount ? 'warning' : 'info'">{{ selectedMember.level }}</el-tag>
            <span v-if="settlement.hasDiscount">享 {{ (settlement.discount * 10).toFixed(2) }} 折</span>
            <span v-else>无折扣</span>
            <span>· 积分 ×{{ settlement.pointsRate }}</span>
          </div>
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
        <div class="settle-box">
          <div class="settle-row">
            <span>商品数量</span>
            <span>{{ cartTotal.quantity }} 件</span>
          </div>
          <div class="settle-row">
            <span>原价小计</span>
            <span>¥{{ settlement.original.toFixed(2) }}</span>
          </div>
          <div v-if="memberId && settlement.hasDiscount" class="settle-row settle-discount">
            <span>会员优惠（{{ (settlement.discount * 10).toFixed(2) }} 折）</span>
            <span>-¥{{ settlement.savings.toFixed(2) }}</span>
          </div>
          <div class="settle-total">
            <span>应付金额</span>
            <span class="settle-amount">¥{{ settlement.payable.toFixed(2) }}</span>
          </div>
          <div v-if="memberId" class="settle-row settle-points">
            <span>预计获得积分</span>
            <span>+{{ settlement.points }}</span>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { productsApi, membersApi, salesApi } from '@/api'
import { printReceipt } from '@/utils/receipt'

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
  await ElMessageBox.confirm(`确认收取 ¥${settlement.value.payable.toFixed(2)}？`, '结算确认', { type: 'success' })
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
.search-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0;
}
.search-item:hover { background: #f5f7fa; }

.member-hint {
  margin-top: 8px; font-size: 13px; color: #909399;
  display: flex; align-items: center; gap: 6px;
}

.settle-box {
  background: #f5f7fa; padding: 16px; border-radius: 8px; margin-bottom: 15px;
}
.settle-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px; color: #606266; font-size: 14px;
}
.settle-discount { color: #E6A23C; }
.settle-points { color: #67C23A; margin-bottom: 0; margin-top: 8px; }
.settle-total {
  display: flex; justify-content: space-between; align-items: baseline;
  padding-top: 10px; border-top: 1px dashed #dcdfe6;
}
.settle-total > span:first-child { font-size: 15px; color: #303133; }
.settle-amount { font-size: 28px; font-weight: bold; color: #F56C6C; }
</style>
