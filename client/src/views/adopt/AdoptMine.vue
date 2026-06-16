<template>
  <div class="adopt-mine-page">
    <PageHeader title="我的领养申请" subtitle="查看申请进度、回访记录与领养证书" />

    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="animal_name" label="动物" width="160">
          <template #default="{ row }">
            <div class="animal-cell">
              <el-image v-if="row.animal_image" :src="row.animal_image" fit="cover" class="mini-thumb">
                <template #error><div class="mini-thumb paw-mini">🐾</div></template>
              </el-image>
              <div v-else class="mini-thumb paw-mini">🐾</div>
              <span>{{ row.animal_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="applicant_name" label="申请人" width="100" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><StatusTag kind="adoption" :value="row.status" size="small" /></template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="170">
          <template #default="{ row }">{{ fmtDate(row.created_at, 16) }}</template>
        </el-table-column>
        <el-table-column prop="reject_reason" label="拒绝原因" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'approved' || row.status === 'completed'"
              text type="primary" size="small" @click="showFollowups(row)"
            >回访记录</el-button>
            <el-button
              v-if="row.status === 'approved' || row.status === 'completed'"
              text type="warning" size="small" @click="$router.push(`/adopt/certificate/${row.id}`)"
            >领养证书</el-button>
          </template>
        </el-table-column>
      </el-table>
      <EmptyState v-if="!loading && list.length === 0" description="你还没有领养申请，去看看待领养的它们吧" />

      <div class="pagination" v-if="total > pageSize">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="loadData" />
      </div>
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
          <p v-if="f.animal_condition" style="margin:0 0 4px;color:#909399;font-size:13px">动物状况：{{ f.animal_condition }}</p>
          <p v-if="f.next_visit_date" style="margin:0 0 4px;color:var(--brand-hover);font-size:13px;font-weight:500">下次计划回访：{{ (f.next_visit_date || '').slice(0, 10) }}</p>
          <div v-if="f.photos && f.photos.length" class="fu-photos">
            <el-image
              v-for="(p, i) in f.photos"
              :key="i"
              :src="p"
              :preview-src-list="f.photos"
              :initial-index="i"
              fit="cover"
              class="fu-photo"
              preview-teleported
            >
              <template #error><div class="fu-photo-err">🐾</div></template>
            </el-image>
          </div>
        </el-timeline-item>
      </el-timeline>
      <EmptyState v-else-if="!followupLoading" description="工作人员尚未添加回访记录" :image-size="60" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fmtDate } from '@/utils/format'

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
</script>

<style scoped>
.animal-cell { display: flex; align-items: center; gap: 8px; }
.mini-thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; display: block; }
.paw-mini { display: flex; align-items: center; justify-content: center; background: var(--bg-soft); font-size: 18px; }
.fu-photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.fu-photo { width: 72px; height: 72px; border-radius: 6px; cursor: pointer; }
.fu-photo-err { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; background: var(--bg-soft); border-radius: 6px; font-size: 26px; }
</style>
