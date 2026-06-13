<template>
  <el-card>
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span>库存预警</span>
        <el-tag type="danger" size="large">预警商品: {{ warnings.length }} 个</el-tag>
      </div>
    </template>

    <el-table :data="warnings" border stripe style="width:100%">
      <el-table-column label="图片" width="80">
        <template #default="{ row }">
          <el-image v-if="row.image" :src="row.image" style="width:40px;height:40px;border-radius:4px" fit="cover" />
          <span v-else style="color:#999">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="商品名称" />
      <el-table-column prop="barcode" label="条形码" width="140" />
      <el-table-column prop="category_name" label="分类" width="100" />
      <el-table-column prop="stock" label="当前库存" width="100">
        <template #default="{ row }">
          <el-tag :type="row.stock === 0 ? 'danger' : 'warning'">
            {{ row.stock }} {{ row.unit }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="min_stock" label="最低库存" width="100">
        <template #default="{ row }">{{ row.min_stock }} {{ row.unit }}</template>
      </el-table-column>
      <el-table-column label="缺口" width="100">
        <template #default="{ row }">
          <span style="color: #f56c6c; font-weight: bold;">
            {{ row.min_stock - row.stock }} {{ row.unit }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="goToPurchase(row)">
            去进货
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!warnings.length" description="暂无库存预警商品" />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const warnings = ref([])

const loadWarnings = async () => {
  try {
    warnings.value = await api.getInventoryWarning()
  } catch (e) {
    console.error('获取库存预警失败:', e)
  }
}

const goToPurchase = (product) => {
  router.push({
    path: '/purchases',
    query: { product_id: product.id, product_name: product.name }
  })
}

onMounted(loadWarnings)
</script>
