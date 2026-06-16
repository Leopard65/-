<template>
  <div class="adopt-manage">
    <h2>领养管理</h2>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" @change="loadData">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="animal_name" label="动物" width="120" />
        <el-table-column prop="user_nickname" label="申请人" width="100" />
        <el-table-column prop="applicant_name" label="姓名" width="100" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="reason" label="理由" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="160">
          <template #default="{ row }">{{ row.created_at?.slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button text type="success" size="small" @click="handleReview(row.id, 'approved')">通过</el-button>
              <el-button text type="danger" size="small" @click="showRejectDialog(row)">拒绝</el-button>
            </template>
            <el-button text size="small" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="loadData" />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="申请详情" width="640px">
      <el-descriptions :column="2" border v-if="currentItem">
        <el-descriptions-item label="动物">{{ currentItem.animal_name }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentItem.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ currentItem.phone }}</el-descriptions-item>
        <el-descriptions-item label="住房">{{ currentItem.housing_type || '未填' }}</el-descriptions-item>
        <el-descriptions-item label="养宠经验">{{ currentItem.has_pet_exp ? '有' : '无' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusText(currentItem.status) }}</el-descriptions-item>
        <el-descriptions-item label="理由" :span="2">{{ currentItem.reason }}</el-descriptions-item>
        <el-descriptions-item v-if="currentItem.reject_reason" label="拒绝原因" :span="2">{{ currentItem.reject_reason }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="currentItem && (currentItem.status === 'approved' || currentItem.status === 'completed')" class="cert-entry">
        <el-button type="warning" plain size="small" @click="$router.push(`/adopt/certificate/${currentItem.id}`)">📜 查看 / 打印领养证书</el-button>
      </div>

      <!-- 领养回访 -->
      <div class="followup-section" v-if="currentItem">
        <div class="followup-head">
          <span class="followup-title">📋 领养回访记录</span>
        </div>

        <el-timeline v-if="followups.length" v-loading="followupLoading">
          <el-timeline-item
            v-for="f in followups"
            :key="f.id"
            :timestamp="(f.visit_date || '').slice(0, 10) + (f.operator_name ? ' · ' + f.operator_name : '')"
            placement="top"
          >
            <div class="followup-item">
              <p class="followup-content">{{ f.content }}</p>
              <p v-if="f.animal_condition" class="followup-cond">动物状况：{{ f.animal_condition }}</p>
              <div v-if="f.photos && f.photos.length" class="followup-photos">
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
              <el-button text type="danger" size="small" @click="deleteFollowup(f.id)">删除</el-button>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else-if="!followupLoading" description="暂无回访记录" :image-size="50" />

        <!-- 新增回访 -->
        <template v-if="currentItem.status === 'approved' || currentItem.status === 'completed'">
          <el-divider content-position="left">新增回访</el-divider>
          <el-form :model="followupForm" label-width="80px" size="small">
            <el-form-item label="回访日期">
              <el-date-picker v-model="followupForm.visit_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
            </el-form-item>
            <el-form-item label="动物状况">
              <el-input v-model="followupForm.animal_condition" placeholder="如：健康、活泼，体重正常" />
            </el-form-item>
            <el-form-item label="回访内容">
              <el-input v-model="followupForm.content" type="textarea" :rows="3" placeholder="本次回访的详细记录" />
            </el-form-item>
            <el-form-item label="回访照片">
              <el-upload
                v-model:file-list="followupPhotos"
                list-type="picture-card"
                :auto-upload="false"
                :limit="6"
                accept="image/*"
              >
                <span style="font-size:22px;color:#8c939d">+</span>
              </el-upload>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="savingFollowup" @click="addFollowup">保存回访</el-button>
            </el-form-item>
          </el-form>
        </template>
        <el-alert v-else type="info" :closable="false" show-icon style="margin-top:12px"
          title="仅“已通过”的领养申请可以添加回访记录" />
      </div>
    </el-dialog>

    <!-- 拒绝弹窗 -->
    <el-dialog v-model="rejectVisible" title="拒绝申请" width="400px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请输入拒绝原因" />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="reviewLoading" @click="handleReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const filters = reactive({ status: '' })

const detailVisible = ref(false)
const currentItem = ref(null)
const rejectVisible = ref(false)
const rejectReason = ref('')
const rejectId = ref(null)
const reviewLoading = ref(false)

// 领养回访
const followups = ref([])
const followupLoading = ref(false)
const savingFollowup = ref(false)
const followupForm = reactive({ visit_date: '', content: '', animal_condition: '' })
const followupPhotos = ref([])

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const res = await request.get('/adoptions', { params: { ...filters, page: page.value, pageSize } })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function handleReview(id, status) {
  await request.put(`/adoptions/${id}/review`, { status })
  ElMessage.success('审核完成')
  loadData()
}

function showRejectDialog(row) {
  rejectId.value = row.id
  rejectReason.value = ''
  rejectVisible.value = true
}

async function handleReject() {
  reviewLoading.value = true
  try {
    await request.put(`/adoptions/${rejectId.value}/review`, {
      status: 'rejected',
      reject_reason: rejectReason.value,
    })
    ElMessage.success('已拒绝')
    rejectVisible.value = false
    loadData()
  } finally {
    reviewLoading.value = false
  }
}

function showDetail(row) {
  currentItem.value = row
  detailVisible.value = true
  loadFollowups(row.id)
}

async function loadFollowups(applicationId) {
  followupLoading.value = true
  followups.value = []
  Object.assign(followupForm, { visit_date: '', content: '', animal_condition: '' })
  followupPhotos.value = []
  try {
    const res = await request.get(`/adoptions/${applicationId}/followups`)
    followups.value = res.data || []
  } finally {
    followupLoading.value = false
  }
}

async function addFollowup() {
  if (!followupForm.visit_date || !followupForm.content) {
    return ElMessage.warning('请填写回访日期和回访内容')
  }
  savingFollowup.value = true
  try {
    const fd = new FormData()
    fd.append('visit_date', followupForm.visit_date)
    fd.append('content', followupForm.content)
    fd.append('animal_condition', followupForm.animal_condition || '')
    followupPhotos.value.forEach((f) => { if (f.raw) fd.append('photos', f.raw) })
    await request.post(`/adoptions/${currentItem.value.id}/followups`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    ElMessage.success('回访记录已保存')
    loadFollowups(currentItem.value.id)
  } finally {
    savingFollowup.value = false
  }
}

async function deleteFollowup(fid) {
  await request.delete(`/adoptions/${currentItem.value.id}/followups/${fid}`)
  ElMessage.success('删除成功')
  loadFollowups(currentItem.value.id)
}

function statusText(s) {
  return { pending: '待审核', approved: '已通过', rejected: '已拒绝', completed: '已完成', cancelled: '已取消' }[s] || s
}
function statusType(s) {
  return { pending: 'warning', approved: 'success', rejected: 'danger', completed: 'info', cancelled: 'info' }[s] || ''
}
</script>

<style scoped>
.filter-card { margin-bottom: 16px; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
.cert-entry { margin-top: 14px; }
.followup-section { margin-top: 20px; }
.followup-title { font-weight: bold; font-size: 15px; }
.followup-head { margin-bottom: 12px; }
.followup-item { background: #f7f8fa; border-radius: 6px; padding: 8px 12px; }
.followup-content { margin: 0 0 4px; color: #333; white-space: pre-wrap; }
.followup-cond { margin: 0 0 4px; color: #909399; font-size: 13px; }
.followup-photos { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0; }
.fu-photo { width: 72px; height: 72px; border-radius: 6px; cursor: pointer; }
.fu-photo-err { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; background: #eef0f3; border-radius: 6px; font-size: 26px; }
</style>
