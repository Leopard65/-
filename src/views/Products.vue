<template>
  <el-card>
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span>商品管理</span>
        <div style="display:flex;gap:10px">
          <el-input v-model="keyword" placeholder="搜索商品名称/条码" clearable style="width:200px" @clear="load" @keyup.enter="load" />
          <el-select v-model="filterCategory" placeholder="分类筛选" clearable style="width:140px" @change="load">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <el-button type="primary" @click="openDialog()">新增商品</el-button>
        </div>
      </div>
    </template>

    <el-table :data="products" stripe border style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="商品名称" />
      <el-table-column prop="barcode" label="条码" width="140" />
      <el-table-column prop="category_name" label="分类" width="100" />
      <el-table-column prop="price" label="售价" width="80">
        <template #default="{ row }">¥{{ row.price }}</template>
      </el-table-column>
      <el-table-column prop="cost" label="成本" width="80">
        <template #default="{ row }">¥{{ row.cost }}</template>
      </el-table-column>
      <el-table-column prop="stock" label="库存" width="80">
        <template #default="{ row }">
          <el-tag :type="row.stock <= row.min_stock ? 'danger' : ''" size="small">{{ row.stock }}{{ row.unit }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑商品' : '新增商品'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="商品名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="条码">
          <el-input v-model="form.barcode" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category_id" placeholder="选择分类" clearable style="width:100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="10">
          <el-col :span="12">
            <el-form-item label="售价">
              <el-input-number v-model="form.price" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="成本价">
              <el-input-number v-model="form.cost" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="10">
          <el-col :span="12">
            <el-form-item label="库存">
              <el-input-number v-model="form.stock" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预警值">
              <el-input-number v-model="form.min_stock" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="单位">
          <el-input v-model="form.unit" placeholder="个/瓶/袋" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const products = ref([])
const categories = ref([])
const keyword = ref('')
const filterCategory = ref('')
const dialogVisible = ref(false)
const form = ref({})

const load = async () => {
  products.value = await api.getProducts({ keyword: keyword.value, category_id: filterCategory.value || undefined })
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { name: '', barcode: '', category_id: null, price: 0, cost: 0, stock: 0, min_stock: 10, unit: '个' }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.name) return ElMessage.warning('请输入商品名称')
  try {
    if (form.value.id) {
      await api.updateProduct(form.value.id, form.value)
    } else {
      await api.addProduct(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '操作失败')
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除「${row.name}」？`, '提示', { type: 'warning' })
  await api.deleteProduct(row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(async () => {
  categories.value = await api.getCategories()
  load()
})
</script>
