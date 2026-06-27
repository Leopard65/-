<template>
  <div class="adopt-manage admin-view">
    <PageHeader title="领养管理" subtitle="审核领养申请并记录领养回访">
      <el-button :loading="exporting" @click="exportData">
        <el-icon style="margin-right: 4px"><Download /></el-icon> 导出
      </el-button>
    </PageHeader>

    <div class="filter-pills">
      <button
        v-for="opt in adoptionStatusOptions"
        :key="opt.value"
        type="button"
        class="filter-pill"
        :class="{ active: filters.status === opt.value }"
        @click="selectStatus(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="list-summary">
      <div class="list-summary__main">
        <span>当前结果</span>
        <strong>{{ total }}</strong>
        <span>条领养申请</span>
      </div>
      <div class="list-summary__meta">
        <span>状态：{{ activeStatusLabel }}</span>
        <span>优先处理“待审核”，通过后可继续回访记录</span>
      </div>
    </div>

    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="animal_name" label="动物" width="120" show-overflow-tooltip />
        <el-table-column prop="user_nickname" label="申请人" width="100" show-overflow-tooltip />
        <el-table-column prop="applicant_name" label="姓名" width="100" show-overflow-tooltip />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="reason" label="理由" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><StatusTag kind="adoption" :value="row.status" size="small" /></template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.created_at, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-popconfirm title="确认通过该领养申请？" width="200" @confirm="handleReview(row.id, 'approved')">
                <template #reference>
                  <el-button text type="success" size="small">通过</el-button>
                </template>
              </el-popconfirm>
              <el-button text type="danger" size="small" @click="showRejectDialog(row)">拒绝</el-button>
            </template>
            <el-popconfirm v-if="row.status === 'approved'" title="确认该领养已完成办理？" width="220" @confirm="handleComplete(row.id)">
              <template #reference>
                <el-button text type="success" size="small">标记完成</el-button>
              </template>
            </el-popconfirm>
            <el-button text type="primary" size="small" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="loadData" />
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="申请详情"
      width="920px"
      top="5vh"
      class="admin-detail-dialog"
      destroy-on-close
    >
      <template v-if="currentItem">
        <div class="detail-hero">
          <div class="detail-hero__main">
            <span class="detail-eyebrow">领养申请 #{{ currentItem.id }}</span>
            <h3>{{ currentItem.animal_name }} · {{ currentItem.applicant_name || '未填写姓名' }}</h3>
            <p>
              {{ currentItem.user_nickname || '前台用户' }} 提交于
              {{ fmtDate(currentItem.created_at, 16) }}，请结合居住条件、养宠经验和申请理由判断是否通过。
            </p>
          </div>
          <div class="detail-actions">
            <StatusTag kind="adoption" :value="currentItem.status" size="small" />
            <el-button
              v-if="currentItem.status === 'approved' || currentItem.status === 'completed'"
              type="warning"
              plain
              size="small"
              @click="$router.push(`/adopt/certificate/${currentItem.id}`)"
            >
              查看 / 打印证书
            </el-button>
          </div>
        </div>

        <div class="detail-grid">
          <section class="detail-panel">
            <div class="detail-panel__head">
              <div>
                <span class="detail-panel__title">申请人与条件</span>
                <span class="detail-panel__subtitle">用于审核沟通与风险判断</span>
              </div>
            </div>
            <dl class="detail-kv-list">
              <div class="detail-kv">
                <dt>联系电话</dt>
                <dd>{{ currentItem.phone || '未填写' }}</dd>
              </div>
              <div class="detail-kv">
                <dt>住房情况</dt>
                <dd>{{ currentItem.housing_type || '未填写' }}</dd>
              </div>
              <div class="detail-kv">
                <dt>养宠经验</dt>
                <dd>{{ currentItem.has_pet_exp ? '有' : '无' }}</dd>
              </div>
              <div class="detail-kv">
                <dt>当前状态</dt>
                <dd><StatusTag kind="adoption" :value="currentItem.status" size="small" /></dd>
              </div>
              <div class="detail-kv detail-kv--wide">
                <dt>申请理由</dt>
                <dd class="detail-prose">{{ currentItem.reason || '未填写' }}</dd>
              </div>
              <div v-if="currentItem.reject_reason" class="detail-kv detail-kv--wide">
                <dt>拒绝原因</dt>
                <dd class="detail-prose">{{ currentItem.reject_reason }}</dd>
              </div>
            </dl>
          </section>

          <section class="detail-panel">
            <div class="detail-panel__head">
              <div>
                <span class="detail-panel__title">审核动作</span>
                <span class="detail-panel__subtitle">列表中也可执行同样操作</span>
              </div>
            </div>
            <div class="review-actions">
              <template v-if="currentItem.status === 'pending'">
                <el-popconfirm title="确认通过该领养申请？" width="220" @confirm="handleReview(currentItem.id, 'approved')">
                  <template #reference>
                    <el-button type="success">通过申请</el-button>
                  </template>
                </el-popconfirm>
                <el-button type="danger" plain @click="showRejectDialog(currentItem)">拒绝申请</el-button>
              </template>
              <el-popconfirm
                v-else-if="currentItem.status === 'approved'"
                title="确认该领养已完成办理？"
                width="240"
                @confirm="handleComplete(currentItem.id)"
              >
                <template #reference>
                  <el-button type="success">标记完成</el-button>
                </template>
              </el-popconfirm>
              <el-alert
                v-else
                type="info"
                :closable="false"
                show-icon
                title="当前状态无需进一步审核操作"
              />
            </div>
          </section>

          <section class="detail-panel span-2">
            <div class="detail-panel__head">
              <div>
                <span class="detail-panel__title">领养回访记录</span>
                <span class="detail-panel__subtitle">通过后记录回访情况，形成后续跟踪闭环</span>
              </div>
            </div>

            <div class="followup-layout">
              <div class="followup-history" v-loading="followupLoading">
                <el-timeline v-if="followups.length">
                  <el-timeline-item
                    v-for="f in followups"
                    :key="f.id"
                    :timestamp="(f.visit_date || '').slice(0, 10) + (f.operator_name ? ' · ' + f.operator_name : '')"
                    placement="top"
                  >
                    <div class="followup-item">
                      <p class="followup-content">{{ f.content }}</p>
                      <p v-if="f.animal_condition" class="followup-cond">动物状况：{{ f.animal_condition }}</p>
                      <p v-if="f.next_visit_date" class="followup-next">下次计划回访：{{ (f.next_visit_date || '').slice(0, 10) }}</p>
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
                          <template #error><div class="fu-photo-err"><el-icon><Picture /></el-icon></div></template>
                        </el-image>
                      </div>
                      <el-popconfirm title="确认删除该回访记录？" @confirm="deleteFollowup(f.id)">
                        <template #reference>
                          <el-button text type="danger" size="small">删除</el-button>
                        </template>
                      </el-popconfirm>
                    </div>
                  </el-timeline-item>
                </el-timeline>
                <EmptyState v-else-if="!followupLoading" description="暂无回访记录" :image-size="50" />
              </div>

              <div v-if="currentItem.status === 'approved' || currentItem.status === 'completed'" class="followup-composer">
                <span class="followup-title">新增回访</span>
                <el-form :model="followupForm" label-width="82px" size="small">
                  <el-form-item label="回访日期">
                    <el-date-picker v-model="followupForm.visit_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
                  </el-form-item>
                  <el-form-item label="动物状况">
                    <el-input v-model="followupForm.animal_condition" placeholder="如：健康、活泼，体重正常" />
                  </el-form-item>
                  <el-form-item label="回访内容">
                    <el-input v-model="followupForm.content" type="textarea" :rows="3" placeholder="本次回访的详细记录" />
                  </el-form-item>
                  <el-form-item label="下次回访">
                    <el-date-picker v-model="followupForm.next_visit_date" type="date" value-format="YYYY-MM-DD" placeholder="计划日期（选填）" />
                  </el-form-item>
                  <el-form-item label="回访照片">
                    <el-upload
                      v-model:file-list="followupPhotos"
                      list-type="picture-card"
                      :auto-upload="false"
                      :limit="6"
                      accept="image/*"
                    >
                      <el-icon><Plus /></el-icon>
                    </el-upload>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="savingFollowup" @click="addFollowup">保存回访</el-button>
                  </el-form-item>
                </el-form>
              </div>
              <el-alert
                v-else
                class="followup-composer"
                type="info"
                :closable="false"
                show-icon
                title="仅“已通过”或“已完成”的领养申请可以添加回访记录"
              />
            </div>
          </section>
        </div>
      </template>
    </el-dialog>

    <!-- 拒绝弹窗 -->
    <el-dialog
      v-model="rejectVisible"
      title="拒绝申请"
      width="480px"
      class="admin-edit-dialog"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="dialog-intro">拒绝原因会作为后台审核记录保存，也便于后续沟通复核。</div>
      <el-input v-model="rejectReason" type="textarea" :rows="4" placeholder="请输入拒绝原因，将通知申请人" />
      <template #footer>
        <div class="dialog-actions">
          <el-button @click="rejectVisible = false">取消</el-button>
          <el-button type="danger" :loading="reviewLoading" @click="handleReject">确认拒绝</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyState from '@/components/EmptyState.vue'
import { ADOPTION_STATUS, fmtDate, dictLabel } from '@/utils/format'
import { fetchAllPages, exportCsv } from '@/utils/export'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const filters = reactive({ status: '' })
const exporting = ref(false)

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
const followupForm = reactive({ visit_date: '', content: '', animal_condition: '', next_visit_date: '' })
const followupPhotos = ref([])

const adoptionStatusOptions = computed(() => [
  { value: '', label: '全部' },
  ...Object.entries(ADOPTION_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
])

const activeStatusLabel = computed(() => (
  filters.status ? dictLabel(ADOPTION_STATUS, filters.status) : '全部状态'
))

onMounted(() => loadData())

function selectStatus(status) {
  filters.status = status
  onSearch()
}

function onSearch() {
  page.value = 1
  loadData()
}
function resetFilters() {
  filters.status = ''
  onSearch()
}

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
  if (currentItem.value?.id === id) {
    currentItem.value = { ...currentItem.value, status }
  }
  loadData()
}

async function handleComplete(id) {
  await request.put(`/adoptions/${id}/complete`)
  ElMessage.success('已标记为完成')
  if (currentItem.value?.id === id) {
    currentItem.value = { ...currentItem.value, status: 'completed' }
  }
  loadData()
}

async function exportData() {
  exporting.value = true
  try {
    const rows = await fetchAllPages('/adoptions', { ...filters })
    exportCsv(`领养申请_${fmtDate(new Date().toISOString())}.csv`, [
      { label: 'ID', value: (r) => r.id },
      { label: '动物', value: (r) => r.animal_name },
      { label: '申请账号', value: (r) => r.user_nickname },
      { label: '申请人', value: (r) => r.applicant_name },
      { label: '电话', value: (r) => r.phone },
      { label: '状态', value: (r) => dictLabel(ADOPTION_STATUS, r.status) },
      { label: '申请时间', value: (r) => fmtDate(r.created_at, 16) },
    ], rows)
    ElMessage.success(`已导出 ${rows.length} 条`)
  } finally {
    exporting.value = false
  }
}

function showRejectDialog(row) {
  rejectId.value = row.id
  rejectReason.value = ''
  rejectVisible.value = true
}

async function handleReject() {
  const reason = rejectReason.value.trim()
  if (!reason) return ElMessage.warning('请填写拒绝原因')
  reviewLoading.value = true
  try {
    await request.put(`/adoptions/${rejectId.value}/review`, {
      status: 'rejected',
      reject_reason: reason,
    })
    ElMessage.success('已拒绝')
    rejectVisible.value = false
    if (currentItem.value?.id === rejectId.value) {
      currentItem.value = { ...currentItem.value, status: 'rejected', reject_reason: reason }
    }
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
  Object.assign(followupForm, { visit_date: '', content: '', animal_condition: '', next_visit_date: '' })
  followupPhotos.value = []
  try {
    const res = await request.get(`/adoptions/${applicationId}/followups`)
    followups.value = res.data || []
  } finally {
    followupLoading.value = false
  }
}

async function addFollowup() {
  const content = followupForm.content.trim()
  if (!followupForm.visit_date || !content) {
    return ElMessage.warning('请填写回访日期和回访内容')
  }
  savingFollowup.value = true
  try {
    const fd = new FormData()
    fd.append('visit_date', followupForm.visit_date)
    fd.append('content', content)
    fd.append('animal_condition', followupForm.animal_condition.trim() || '')
    if (followupForm.next_visit_date) fd.append('next_visit_date', followupForm.next_visit_date)
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
</script>

<style scoped>
.review-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.review-actions :deep(.el-button) {
  width: 100%;
}
.followup-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  align-items: start;
}
.followup-history {
  min-height: 180px;
}
.followup-title {
  display: block;
  margin-bottom: 12px;
  color: var(--text-main);
  font-weight: 700;
  font-size: 14px;
}
.followup-composer {
  min-width: 0;
  padding: 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
}
.followup-composer :deep(.el-date-editor.el-input),
.followup-composer :deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
}
.followup-composer :deep(.el-upload--picture-card) {
  width: 78px;
  height: 78px;
}
.followup-item {
  background: var(--bg-soft);
  border-radius: 6px;
  padding: 10px 12px;
}
.followup-content {
  margin: 0 0 6px;
  color: var(--text-main);
  white-space: pre-wrap;
}
.followup-cond {
  margin: 0 0 4px;
  color: var(--text-secondary);
  font-size: 13px;
}
.followup-next {
  margin: 0 0 6px;
  color: var(--brand-hover);
  font-size: 13px;
  font-weight: 500;
}
.followup-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}
.fu-photo {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  cursor: pointer;
}
.fu-photo-err {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-soft);
  border-radius: 6px;
  font-size: 26px;
}
</style>
