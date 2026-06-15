<template>
  <div class="category-manage">
    <h2>分类管理</h2>

    <el-row :gutter="20">
      <!-- 分类列表 -->
      <el-col :span="10">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>动物分类</span>
              <el-button type="primary" size="small" @click="showAddCategory">添加</el-button>
            </div>
          </template>
          <el-table :data="categories" stripe @row-click="selectCategory" highlight-current-row>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="sort_order" label="排序" width="70" />
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-popconfirm title="删除分类会同时删除其下品种，确认？" @confirm="deleteCategory(row.id)">
                  <template #reference>
                    <el-button text type="danger" size="small" @click.stop>删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 品种列表 -->
      <el-col :span="14">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>{{ selectedCategory ? selectedCategory.name + ' - 品种列表' : '请先选择分类' }}</span>
              <el-button type="primary" size="small" :disabled="!selectedCategory" @click="showAddBreed">添加品种</el-button>
            </div>
          </template>
          <el-table :data="breeds" stripe v-if="selectedCategory">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="品种名称" />
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-popconfirm title="确认删除？" @confirm="deleteBreed(row.id)">
                  <template #reference>
                    <el-button text type="danger" size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="请点击左侧分类查看品种" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加分类弹窗 -->
    <el-dialog v-model="catDialogVisible" title="添加分类" width="400px">
      <el-form :model="catForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="catForm.name" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="catForm.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addCategory">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加品种弹窗 -->
    <el-dialog v-model="breedDialogVisible" title="添加品种" width="400px">
      <el-form :model="breedForm" label-width="80px">
        <el-form-item label="品种名称">
          <el-input v-model="breedForm.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="breedDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addBreed">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const categories = ref([])
const breeds = ref([])
const selectedCategory = ref(null)

const catDialogVisible = ref(false)
const catForm = reactive({ name: '', sort_order: 0 })
const breedDialogVisible = ref(false)
const breedForm = reactive({ name: '' })

onMounted(() => loadCategories())

async function loadCategories() {
  const res = await request.get('/categories')
  categories.value = res.data || []
}

async function selectCategory(row) {
  selectedCategory.value = row
  const res = await request.get(`/categories/${row.id}/breeds`)
  breeds.value = res.data || []
}

function showAddCategory() {
  Object.assign(catForm, { name: '', sort_order: 0 })
  catDialogVisible.value = true
}

async function addCategory() {
  if (!catForm.name) return ElMessage.warning('请输入名称')
  await request.post('/categories', catForm)
  ElMessage.success('添加成功')
  catDialogVisible.value = false
  loadCategories()
}

async function deleteCategory(id) {
  await request.delete(`/categories/${id}`)
  ElMessage.success('删除成功')
  if (selectedCategory.value?.id === id) {
    selectedCategory.value = null
    breeds.value = []
  }
  loadCategories()
}

function showAddBreed() {
  breedForm.name = ''
  breedDialogVisible.value = true
}

async function addBreed() {
  if (!breedForm.name) return ElMessage.warning('请输入品种名称')
  await request.post('/categories/breeds', {
    category_id: selectedCategory.value.id,
    name: breedForm.name,
  })
  ElMessage.success('添加成功')
  breedDialogVisible.value = false
  selectCategory(selectedCategory.value)
}

async function deleteBreed(id) {
  await request.delete(`/categories/breeds/${id}`)
  ElMessage.success('删除成功')
  selectCategory(selectedCategory.value)
}
</script>

<style scoped>
.category-manage h2 { margin-bottom: 16px; }
</style>
