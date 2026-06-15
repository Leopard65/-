<template>
  <div class="adopt-mine-page">
    <h2>我的领养申请</h2>
    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="animal_name" label="动物" width="150">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:8px">
            <img v-if="row.animal_image" :src="row.animal_image" style="width:40px;height:40px;border-radius:4px;object-fit:cover" />
            <span>{{ row.animal_name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="applicant_name" label="申请人" width="100" />
      <el-table-column prop="phone" label="电话" width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="申请时间" width="170">
        <template #default="{ row }">{{ row.created_at?.slice(0, 16) }}</template>
      </el-table-column>
      <el-table-column prop="reject_reason" label="拒绝原因" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'approved' || row.status === 'completed'"
            text type="primary" size="small" @click="showFollowups(row)"
          >回访记录</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && list.length === 0" description="暂无申请记录" />

    <div class="pagination" v-if="total > pageSize">
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="loadData" />
    </div>

    <!-- 回访记录弹窗 -->
    <el-dialog v-model="followupVisible" title="领养回访记录" width="520px">
      <el-timeline v-if="followups.length" v-loading="followupLoading">
        <el-timeline-item
          v-for="f in followups"
          :key="f.id"
          :timestamp="(f.visit_date || '').slice(0, 10)"
          placement="top"
        >
          <p style="margin:0 0 4px;white-space:pre-wrap">{{ f.content }}</p>
          <p v-if="f.animal_condition" style="margin:0;color:#909399;font-size:13px">动物状况：{{ f.animal_condition }}</p>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else-if="!followupLoading" description="工作人员尚未添加回访记录" :image-size="60" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 10
const total = ref(0)

const followupVisible = ref(false)
const followupLoading = ref(false)
const followups = ref([])

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/adoptions/mine', { params: { page: page.value, pageSize } })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function showFollowups(row) {
  followupVisible.value = true
  followupLoading.value = true
  followups.value = []
  try {
    const res = await request.get(`/adoptions/${row.id}/followups`)
    followups.value = res.data || []
  } finally {
    followupLoading.value = false
  }
}

function statusText(s) {
  return { pending: '待审核', approved: '已通过', rejected: '已拒绝', completed: '已完成', cancelled: '已取消' }[s] || s
}
function statusType(s) {
  return { pending: 'warning', approved: 'success', rejected: 'danger', completed: 'info', cancelled: 'info' }[s] || ''
}
</script>

<style scoped>
.adopt-mine-page h2 { margin-bottom: 16px; }
.pagination { display: flex; justify-content: center; margin-top: 16px; }
</style>
