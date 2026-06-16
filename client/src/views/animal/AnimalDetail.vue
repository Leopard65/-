<template>
  <div class="animal-detail">
    <div v-if="loading && !animal" class="detail-top">
      <el-skeleton animated style="width: 100%">
        <template #template>
          <div style="display: flex; gap: 32px; width: 100%; flex-wrap: wrap">
            <el-skeleton-item variant="image" style="width: 420px; max-width: 100%; height: 315px; border-radius: 10px; flex-shrink: 0" />
            <div style="flex: 1; min-width: 220px">
              <el-skeleton-item variant="h1" style="width: 45%" />
              <el-skeleton-item variant="text" style="width: 85%; margin-top: 18px" />
              <el-skeleton-item variant="text" style="width: 75%; margin-top: 10px" />
              <el-skeleton-item variant="text" style="width: 65%; margin-top: 10px" />
              <el-skeleton-item variant="button" style="margin-top: 22px" />
            </div>
          </div>
        </template>
      </el-skeleton>
    </div>
    <template v-else-if="animal">
      <el-breadcrumb class="crumb" :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/animals' }">待领养动物</el-breadcrumb-item>
        <el-breadcrumb-item>{{ animal.name }}</el-breadcrumb-item>
      </el-breadcrumb>

      <div class="detail-top">
        <div class="detail-gallery">
          <el-image
            v-if="gallery.length"
            :src="gallery[activeIndex]"
            :preview-src-list="gallery"
            :initial-index="activeIndex"
            fit="cover"
            class="gallery-main"
            preview-teleported
          >
            <template #error><div class="paw-ph"></div></template>
          </el-image>
          <div v-else class="gallery-main"><div class="paw-ph"></div></div>

          <div v-if="gallery.length > 1" class="gallery-thumbs">
            <div
              v-for="(img, i) in gallery"
              :key="i"
              class="thumb"
              :class="{ active: i === activeIndex }"
              @click="activeIndex = i"
            >
              <el-image :src="img" fit="cover">
                <template #error><div class="paw-ph"></div></template>
              </el-image>
            </div>
          </div>
        </div>

        <div class="detail-info">
          <div class="name-row">
            <h1>{{ animal.name }}</h1>
            <StatusTag kind="animal" :value="animal.status" />
          </div>
          <p v-if="waitingDays !== null" class="waiting">
            <el-icon><Clock /></el-icon> 已在等待领养 {{ waitingDays }} 天
          </p>

          <div class="info-grid">
            <div class="info-item"><label>类型</label><span>{{ animal.category_name || '未知' }}</span></div>
            <div class="info-item"><label>品种</label><span>{{ animal.breed_name || '未知' }}</span></div>
            <div class="info-item"><label>性别</label><span>{{ genderText(animal.gender) }}</span></div>
            <div class="info-item"><label>年龄</label><span>{{ animal.age || '未知' }}</span></div>
            <div class="info-item"><label>毛色</label><span>{{ animal.color || '未知' }}</span></div>
            <div class="info-item"><label>体重</label><span>{{ animal.weight ? animal.weight + ' kg' : '未知' }}</span></div>
          </div>

          <div class="health-chips">
            <span class="hchip" :class="animal.is_sterilized ? 'on' : 'off'">
              {{ animal.is_sterilized ? '已绝育' : '未绝育' }}
            </span>
            <span class="hchip" :class="animal.is_vaccinated ? 'on' : 'off'">
              {{ animal.is_vaccinated ? '已接种疫苗' : '未接种疫苗' }}
            </span>
          </div>

          <div class="cta">
            <el-button
              v-if="animal.status === 'available'"
              type="primary"
              size="large"
              round
              @click="$router.push(`/adopt/apply/${animal.id}`)"
            >
              <el-icon style="margin-right: 6px"><House /></el-icon> 申请领养
            </el-button>
            <el-button v-else size="large" round disabled>
              {{ animal.status === 'adopted' ? '它已被领养' : '暂不可领养' }}
            </el-button>
            <span class="cta-tip">领养是一生的承诺，请理性决定 🐾</span>
          </div>
        </div>
      </div>

      <!-- 领养建议（规则推断） -->
      <div class="sec-card advice-card">
        <h3>领养建议 · 适合谁</h3>
        <div class="advice-tags">
          <el-tag v-for="(t, i) in advice.tags" :key="i" type="success" effect="plain" round>{{ t }}</el-tag>
        </div>
        <ul v-if="advice.tips.length" class="advice-tips">
          <li v-for="(tip, i) in advice.tips" :key="i">{{ tip }}</li>
        </ul>
      </div>

      <div class="detail-sections">
        <div class="sec-card">
          <h3>详细介绍</h3>
          <p>{{ animal.description || '暂无详细描述' }}</p>
        </div>
        <div class="sec-card">
          <h3>健康状况</h3>
          <p>{{ animal.health_status || '暂无健康信息' }}</p>
        </div>
        <div class="sec-card">
          <h3>性格特点</h3>
          <p>{{ animal.personality || '暂无性格描述' }}</p>
        </div>
        <div v-if="animal.location" class="sec-card">
          <h3>救助地点</h3>
          <p><el-icon><LocationInformation /></el-icon> {{ animal.location }}</p>
        </div>
      </div>

      <!-- 救助档案时间线 -->
      <div v-if="timeline.length" class="sec-card archive-card">
        <h3>救助档案</h3>
        <el-timeline>
          <el-timeline-item
            v-for="ev in timeline"
            :key="ev.id"
            :type="evType(ev.event_type)"
            :timestamp="fmtDate(ev.event_date)"
            placement="top"
          >
            <div class="ev-head">
              <StatusTag kind="animalEvent" :value="ev.event_type" size="small" />
              <span class="ev-title">{{ ev.title }}</span>
            </div>
            <p v-if="ev.description" class="ev-desc">{{ ev.description }}</p>
          </el-timeline-item>
        </el-timeline>
      </div>

      <!-- 相关推荐 -->
      <section v-if="related.length" class="section-block">
        <div class="section-head">
          <h3 class="section-title">也想认识它们</h3>
          <el-button text type="primary" @click="$router.push('/animals')">查看全部 →</el-button>
        </div>
        <div class="cards-grid">
          <AnimalCard v-for="a in related" :key="a.id" :animal="a" />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import request from '@/utils/request'
import StatusTag from '@/components/StatusTag.vue'
import AnimalCard from '@/components/AnimalCard.vue'
import { genderText, fmtDate, ANIMAL_EVENT_TYPE } from '@/utils/format'
import { buildAdoptionAdvice } from '@/utils/advice'

const route = useRoute()
const animal = ref(null)
const related = ref([])
const events = ref([])
const loading = ref(false)
const activeIndex = ref(0)

// 相册：封面 + images（JSON 字符串）合并去重
function parseList(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const a = JSON.parse(raw)
    return Array.isArray(a) ? a : []
  } catch { return [] }
}
const gallery = computed(() => {
  const all = []
  if (animal.value?.image_url) all.push(animal.value.image_url)
  for (const u of parseList(animal.value?.images)) {
    if (u && !all.includes(u)) all.push(u)
  }
  return all
})

const waitingDays = computed(() => {
  const base = animal.value?.rescue_date || animal.value?.created_at
  if (!base) return null
  const diff = Date.now() - new Date(base).getTime()
  const days = Math.floor(diff / 86400000)
  return days >= 0 ? days : null
})

const advice = computed(() => buildAdoptionAdvice(animal.value))

// 有档案事件则展示真实时间线；否则用救助日期兜底生成一条"建档"记录
const timeline = computed(() => {
  if (events.value.length) return events.value
  const base = animal.value?.rescue_date || animal.value?.created_at
  if (!base) return []
  return [{
    id: '_rescue',
    event_type: 'rescue',
    event_date: base,
    title: '建立救助档案',
    description: animal.value?.location ? `救助地点：${animal.value.location}` : '',
  }]
})

function evType(t) {
  return ANIMAL_EVENT_TYPE[t]?.type || 'primary'
}

async function load(id) {
  loading.value = true
  try {
    const res = await request.get(`/animals/${id}`)
    animal.value = res.data
    activeIndex.value = 0
    loadRelated()
    loadEvents(id)
  } finally {
    loading.value = false
  }
}

async function loadRelated() {
  try {
    const res = await request.get('/animals', { params: { status: 'available', pageSize: 5 } })
    related.value = (res.data?.list || [])
      .filter((a) => a.id !== animal.value?.id)
      .slice(0, 4)
  } catch { /* 忽略 */ }
}

async function loadEvents(id) {
  try {
    const res = await request.get(`/animals/${id}/events`)
    events.value = res.data || []
  } catch {
    events.value = []
  }
}

onMounted(() => load(route.params.id))
// 从"相关推荐"点进另一只时，同一路由组件需响应 id 变化
watch(() => route.params.id, (id) => { if (id) load(id) })
</script>

<style scoped>
.crumb {
  margin-bottom: 16px;
}
.detail-top {
  display: flex;
  gap: 32px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 24px;
  margin-bottom: 20px;
}
.detail-gallery {
  width: 420px;
  flex-shrink: 0;
}
.gallery-main {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-soft);
  display: block;
  cursor: zoom-in;
}
.gallery-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.thumb {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}
.thumb.active {
  border-color: var(--brand);
}
.thumb :deep(.el-image) {
  width: 100%;
  height: 100%;
}
.detail-info {
  flex: 1;
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.name-row h1 {
  font-size: 28px;
}
.waiting {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--accent);
  font-size: 13px;
  margin-bottom: 16px;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin: 18px 0;
}
.info-item {
  display: flex;
  gap: 8px;
  font-size: 14px;
}
.info-item label {
  color: var(--text-secondary);
  min-width: 44px;
}
.info-item span {
  color: var(--text-main);
}
.health-chips {
  display: flex;
  gap: 10px;
  margin-bottom: 22px;
}
.hchip {
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 20px;
}
.hchip.on {
  background: var(--brand-light);
  color: var(--brand-hover);
}
.hchip.off {
  background: var(--bg-soft);
  color: var(--text-secondary);
}
.cta {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.cta-tip {
  font-size: 12px;
  color: var(--text-secondary);
}

.sec-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 22px 24px;
}
.sec-card h3 {
  font-size: 16px;
  margin-bottom: 12px;
  padding-left: 12px;
  position: relative;
}
.sec-card h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 4px;
  border-radius: 2px;
  background: var(--brand);
}
.sec-card p {
  color: var(--text-regular);
  line-height: 1.9;
  white-space: pre-wrap;
}

/* 领养建议 */
.advice-card {
  margin-bottom: 20px;
}
.advice-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.advice-tips {
  margin: 14px 0 0;
  padding-left: 18px;
  color: var(--text-regular);
}
.advice-tips li {
  margin-bottom: 6px;
  line-height: 1.7;
}

.detail-sections {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

/* 救助档案 */
.archive-card {
  margin-bottom: 8px;
}
.archive-card .ev-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ev-title {
  font-weight: 600;
  color: var(--text-main);
}
.ev-desc {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

@media (max-width: 768px) {
  .detail-top {
    flex-direction: column;
    padding: 16px;
    gap: 18px;
  }
  .detail-gallery {
    width: 100%;
  }
  .name-row h1 {
    font-size: 23px;
  }
  .detail-sections {
    grid-template-columns: 1fr;
  }
}
</style>
