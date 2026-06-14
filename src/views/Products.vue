<template>
  <el-card>
    <template #header>
      <span>商品管理</span>
    </template>

    <CrudTable
      :data="products"
      :loading="loading"
      :pagination="{ page, pageSize, total }"
      action-width="160"
      @add="openDialog()"
      @edit="openDialog"
      @delete="handleDelete"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
      @search="load"
      @reset="handleReset"
    >
      <template #search>
        <el-input v-model="keyword" placeholder="搜索商品名称/条码" clearable style="width:200px" @clear="load" @keyup.enter="load" />
        <el-select v-model="filterCategory" placeholder="分类筛选" clearable style="width:140px" @change="load">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </template>

      <template #actions>
        <el-button type="success" @click="handleExport">
          <el-icon style="margin-right:5px"><Download /></el-icon>
          导出
        </el-button>
      </template>

      <el-table-column label="图片" width="80">
        <template #default="{ row }">
          <el-image v-if="row.image" :src="row.image" style="width:40px;height:40px;border-radius:4px" fit="cover" />
          <span v-else style="color:#999">无</span>
        </template>
      </el-table-column>
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
    </CrudTable>

    <CrudDialog
      ref="dialogRef"
      :title="form.id ? '编辑商品' : '新增商品'"
      width="500px"
      label-width="80px"
      :rules="rules"
      :submit-fn="handleSave"
      @success="load"
    >
      <el-form-item label="商品名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="条码" prop="barcode">
        <el-input v-model="form.barcode" />
      </el-form-item>
      <el-form-item label="分类" prop="category_id">
        <el-select v-model="form.category_id" placeholder="选择分类" clearable style="width:100%">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-form-item label="售价" prop="price">
            <el-input-number v-model="form.price" :min="0" :precision="2" style="width:100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="成本价" prop="cost">
            <el-input-number v-model="form.cost" :min="0" :precision="2" style="width:100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-form-item label="库存" prop="stock">
            <el-input-number v-model="form.stock" :min="0" style="width:100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="预警值" prop="min_stock">
            <el-input-number v-model="form.min_stock" :min="0" style="width:100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="单位" prop="unit">
        <el-input v-model="form.unit" placeholder="个/瓶/袋" />
      </el-form-item>
      <el-form-item label="商品图片">
        <el-upload
          class="product-uploader"
          action="/api/upload/image"
          :headers="uploadHeaders"
          :show-file-list="false"
          :on-success="handleImageSuccess"
          :before-upload="beforeImageUpload"
        >
          <img v-if="form.image" :src="form.image" class="product-image" />
          <el-icon v-else class="upload-icon"><Plus /></el-icon>
        </el-upload>
      </el-form-item>
    </CrudDialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download } from '@element-plus/icons-vue'
import { productsApi, categoriesApi } from '@/api'
import { useUserStore } from '@/stores/user'
import { exportProducts } from '@/utils/export'
import CrudTable from '@/components/CrudTable.vue'
import CrudDialog from '@/components/CrudDialog.vue'

const userStore = useUserStore()
const products = ref([])
const categories = ref([])
const keyword = ref('')
const filterCategory = ref('')
const loading = ref(false)
const dialogRef = ref(null)
const form = ref({})
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  barcode: [
    { pattern: /^\d{0,13}$/, message: '条形码为数字格式', trigger: 'blur' }
  ],
  price: [
    { required: true, message: '请输入售价', trigger: 'blur' }
  ],
  category_id: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ]
}

const load = async () => {
  loading.value = true
  try {
    const res = await productsApi.getProducts({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      category_id: filterCategory.value || undefined
    })
    products.value = res.data
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const handlePageChange = (val) => {
  page.value = val
  load()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  page.value = 1
  load()
}

const handleReset = () => {
  keyword.value = ''
  filterCategory.value = ''
  page.value = 1
  load()
}

const openDialog = (row) => {
  form.value = row ? { ...row } : { name: '', barcode: '', category_id: null, price: 0, cost: 0, stock: 0, min_stock: 10, unit: '个', image: '' }
  dialogRef.value?.open(form.value)
}

const beforeImageUpload = (file) => {
  const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) ElMessage.error('只能上传图片!')
  if (!isLt5M) ElMessage.error('图片大小不能超过 5MB!')
  return isImage && isLt5M
}

const handleImageSuccess = (response) => {
  form.value.image = response.url
}

const handleSave = async (formData) => {
  if (formData.id) {
    await productsApi.updateProduct(formData.id, formData)
  } else {
    await productsApi.addProduct(formData)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」？删除后可在回收站恢复`, '提示', { type: 'warning' })
    await productsApi.deleteProduct(row.id)
    ElMessage.success('已删除')
    load()
  } catch (err) {
    if (err !== 'cancel') {
      // 错误已由拦截器处理
    }
  }
}

const handleExport = () => {
  exportProducts(products.value)
  ElMessage.success('导出成功')
}

onMounted(async () => {
  categories.value = await categoriesApi.getCategories()
  load()
})
</script>

<style scoped>
.product-uploader {
  width: 120px;
  height: 120px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-uploader:hover {
  border-color: #409EFF;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-icon {
  font-size: 28px;
  color: #8c939d;
}
</style>
