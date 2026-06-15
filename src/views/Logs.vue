<template>
  <PageHeader title="操作日志" description="系统关键操作的审计记录">
    <template #actions>
      <el-input v-model="filters.username" placeholder="用户名" clearable style="width:120px" @clear="load" @keyup.enter="load" />
      <el-select v-model="filters.action" placeholder="操作类型" clearable style="width:120px" @change="load">
        <el-option label="登录" value="login" />
        <el-option label="新增" value="create" />
        <el-option label="修改" value="update" />
        <el-option label="删除" value="delete" />
        <el-option label="恢复" value="restore" />
        <el-option label="审核通过" value="approve" />
        <el-option label="审核拒绝" value="reject" />
      </el-select>
      <el-select v-model="filters.module" placeholder="模块" clearable style="width:120px" @change="load">
        <el-option label="认证" value="auth" />
        <el-option label="商品" value="products" />
        <el-option label="会员" value="members" />
        <el-option label="供应商" value="suppliers" />
        <el-option label="销售" value="sales" />
        <el-option label="退换货" value="returns" />
        <el-option label="分类" value="categories" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width:260px" @change="handleDateChange" />
    </template>
  </PageHeader>
  <el-card>
    <el-table :data="logs" stripe border style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="created_at" label="时间" width="180" />
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="action" label="操作" width="100">
        <template #default="{ row }">
          <el-tag :type="actionType(row.action)">{{ actionText(row.action) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="module" label="模块" width="100">
        <template #default="{ row }">
          <el-tag type="info">{{ moduleText(row.module) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="target_id" label="对象ID" width="80" />
      <el-table-column prop="detail" label="详情">
        <template #default="{ row }">
          <span v-if="row.detail">{{ formatDetail(row.detail) }}</span>
          <span v-else style="color:#999">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="ip" label="IP地址" width="140" />
    </el-table>

    <!-- 分页 -->
    <div style="display:flex;justify-content:flex-end;margin-top:15px">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="load"
        @current-change="load"
      />
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { logsApi } from '@/api'
import PageHeader from '@/components/PageHeader.vue'

const logs = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dateRange = ref(null)
const filters = ref({
  username: '',
  action: '',
  module: ''
})

const actionType = (action) => {
  const map = {
    login: 'primary',
    create: 'success',
    update: 'warning',
    delete: 'danger',
    restore: 'success',
    approve: 'success',
    reject: 'danger',
    import: 'primary'
  }
  return map[action] || 'info'
}

const actionText = (action) => {
  const map = {
    login: '登录',
    create: '新增',
    update: '修改',
    delete: '删除',
    restore: '恢复',
    approve: '审核通过',
    reject: '审核拒绝',
    import: '导入'
  }
  return map[action] || action
}

const moduleText = (module) => {
  const map = {
    auth: '认证',
    products: '商品',
    members: '会员',
    member_levels: '会员等级',
    suppliers: '供应商',
    sales: '销售',
    purchases: '进货',
    returns: '退换货',
    categories: '分类',
    users: '用户'
  }
  return map[module] || module
}

const formatDetail = (detail) => {
  try {
    const obj = JSON.parse(detail)
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(', ')
  } catch {
    return detail
  }
}

const handleDateChange = (val) => {
  if (val) {
    filters.value.start_date = val[0]
    filters.value.end_date = val[1]
  } else {
    filters.value.start_date = undefined
    filters.value.end_date = undefined
  }
  load()
}

const load = async () => {
  try {
    const res = await logsApi.getLogs({
      page: page.value,
      pageSize: pageSize.value,
      ...filters.value
    })
    logs.value = res.data
    total.value = res.total
  } catch (e) {
    console.error('获取日志失败:', e)
  }
}

onMounted(load)
</script>
