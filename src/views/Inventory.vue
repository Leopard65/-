<template>
  <div>
    <PageHeader title="库存预警" description="低库存与按销售速度的智能补货建议">
      <template #actions>
        <span style="font-size:13px;color:#909399">备货周期 {{ leadDays }} 天</span>
        <el-tag type="danger" size="large">需补货 {{ list.length }} 项</el-tag>
      </template>
    </PageHeader>

    <el-card v-loading="loading">
      <el-table :data="list" border stripe style="width:100%">
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
            <el-button size="small" type="primary" @click="goToPurchase(row)">去进货</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && !list.length" description="库存充足，暂无需补货商品" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { reportsApi } from '@/api'
import PageHeader from '@/components/PageHeader.vue'

const router = useRouter()
const list = ref([])
const leadDays = ref(7)
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    const res = await reportsApi.getInventoryReplenish()
    list.value = res.data || []
    if (res.lead_days) leadDays.value = res.lead_days
  } catch (e) {
    console.error('获取补货建议失败:', e)
  } finally {
    loading.value = false
  }
}

const goToPurchase = (product) => {
  router.push({
    path: '/purchases',
    query: { product_id: product.id, product_name: product.name, qty: product.suggested }
  })
}

onMounted(load)
</script>
