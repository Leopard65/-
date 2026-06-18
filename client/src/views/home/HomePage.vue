<template>
  <div class="home-page">
    <!-- 第一屏：轮播 / 主视觉 -->
    <section class="hero">
      <el-carousel v-if="banners.length" height="420px" :interval="5000" arrow="hover">
        <el-carousel-item v-for="item in banners" :key="item.id">
          <div class="hero-slide" :style="{ backgroundImage: `url(${item.image_url})` }">
            <div class="hero-mask">
              <div class="hero-text">
                <h2>{{ item.title }}</h2>
                <div class="hero-actions">
                  <el-button type="primary" size="large" round @click="$router.push('/animals')">浏览待领养</el-button>
                  <el-button size="large" round class="hero-ghost" @click="$router.push('/rescue')">我要救助</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>

      <div v-else class="hero-fallback">
        <h1>给流浪的生命，一个温暖的家</h1>
        <p>科学救助 · 透明领养 · 用心陪伴每一段双向奔赴</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" round @click="$router.push('/animals')">我要领养</el-button>
          <el-button size="large" round class="hero-ghost" @click="$router.push('/rescue')">发现流浪动物</el-button>
        </div>
      </div>
    </section>

    <!-- 救助成果 -->
    <section class="impact">
      <div v-for="m in impactStats" :key="m.label" class="impact-item">
        <div class="impact-num"><CountUp :value="m.value" /></div>
        <div class="impact-label">{{ m.label }}</div>
      </div>
    </section>

    <!-- 公告 -->
    <section v-if="announcements.length" class="notice">
      <el-icon class="notice-icon"><Bell /></el-icon>
      <span class="notice-tag">最新公告</span>
      <div class="notice-track">
        <div v-for="item in announcements" :key="item.id" class="notice-item">
          <el-tag v-if="item.is_top" type="danger" size="small" effect="plain" round>置顶</el-tag>
          <span class="notice-title">{{ item.title }}</span>
          <span class="notice-date">{{ item.created_at?.slice(0, 10) }}</span>
        </div>
      </div>
    </section>

    <!-- 待领养动物推荐 -->
    <section class="section-block">
      <div class="section-head">
        <div>
          <h3 class="section-title">待领养的它们</h3>
          <p class="section-subtitle">每一个都在等待属于自己的家</p>
        </div>
        <el-button text type="primary" @click="$router.push('/animals')">查看全部 →</el-button>
      </div>
      <div v-if="loadingAnimals" class="cards-grid">
        <CardSkeleton v-for="i in 8" :key="i" :height="170" />
      </div>
      <div v-else-if="animals.length" class="cards-grid">
        <AnimalCard v-for="animal in animals" :key="animal.id" :animal="animal" />
      </div>
      <EmptyState v-else description="暂无可领养动物，敬请期待" />
    </section>

    <!-- 如何领养 -->
    <section class="section-block">
      <div class="section-head">
        <h3 class="section-title">领养，怎么开始？</h3>
      </div>
      <div class="steps">
        <div v-for="(s, i) in steps" :key="i" class="step">
          <div class="step-no">{{ i + 1 }}</div>
          <h4>{{ s.title }}</h4>
          <p>{{ s.desc }}</p>
        </div>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section class="section-block quick-links">
      <div class="quick-link" @click="$router.push('/rescue')">
        <el-icon class="ql-icon ql-rescue"><FirstAidKit /></el-icon>
        <h4>发现流浪动物</h4>
        <p>提交救助信息，让我们一起帮助它</p>
      </div>
      <div class="quick-link" @click="$router.push('/match')">
        <el-icon class="ql-icon ql-match"><MagicStick /></el-icon>
        <h4>领养匹配测评</h4>
        <p>回答几个问题，找到最合适的伙伴</p>
      </div>
      <div class="quick-link" @click="$router.push('/articles')">
        <el-icon class="ql-icon ql-read"><Reading /></el-icon>
        <h4>科学养宠知识</h4>
        <p>领养须知与科普，从这里开始</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'
import AnimalCard from '@/components/AnimalCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import CardSkeleton from '@/components/CardSkeleton.vue'
import CountUp from '@/components/CountUp.vue'

const banners = ref([])
const announcements = ref([])
const animals = ref([])
const loadingAnimals = ref(true)
const stats = ref({ total: 0, rescued: 0, available: 0, adopted: 0, fostered: 0 })

const steps = [
  { title: '浏览与了解', desc: '查看待领养动物的健康、性格与故事' },
  { title: '提交申请', desc: '填写领养申请，让我们了解你的情况' },
  { title: '审核沟通', desc: '工作人员审核并与你确认领养细节' },
  { title: '接它回家', desc: '领取电子证书，开启温暖的陪伴' },
]

const impactStats = computed(() => [
  { label: '累计救助', value: stats.value.total || 0 },
  { label: '在站待领养', value: stats.value.available || 0 },
  { label: '成功领养', value: stats.value.adopted || 0 },
  { label: '爱心寄养', value: stats.value.fostered || 0 },
])

onMounted(() => {
  request.get('/content/banners').then(res => { banners.value = res.data || [] }).catch(() => {})
  request.get('/content/announcements').then(res => { announcements.value = res.data || [] }).catch(() => {})
  request.get('/animals', { params: { status: 'available', pageSize: 8 } }).then(res => {
    animals.value = res.data?.list || []
  }).catch(() => {}).finally(() => { loadingAnimals.value = false })
  request.get('/animals/stats').then(res => { stats.value = res.data || stats.value }).catch(() => {})
})
</script>

<style scoped>
/* —— 第一屏 —— */
.hero {
  margin: -24px -20px 0;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  overflow: hidden;
}
.hero-slide {
  height: 420px;
  background-size: cover;
  background-position: center;
}
.hero-mask {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8%;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.1) 70%);
}
.hero-text h2 {
  color: #fff;
  font-size: 34px;
  margin-bottom: 22px;
  max-width: 560px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}
.hero-fallback {
  height: 420px;
  background: linear-gradient(135deg, #2f9e87 0%, #3aa890 50%, #1f6757 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-align: center;
  padding: 0 24px;
}
.hero-fallback h1 {
  color: #fff;
  font-size: 38px;
  margin-bottom: 14px;
}
.hero-fallback p {
  font-size: 17px;
  opacity: 0.92;
  margin-bottom: 28px;
}
.hero-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.hero-ghost {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.7);
  color: #fff;
}
.hero-ghost:hover {
  background: rgba(255, 255, 255, 0.28);
  border-color: #fff;
  color: #fff;
}

/* —— 救助成果 —— */
.impact {
  margin-top: 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 26px 20px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.impact-item {
  text-align: center;
  border-right: 1px solid var(--border-light);
}
.impact-item:last-child {
  border-right: none;
}
.impact-num {
  font-size: 32px;
  font-weight: 800;
  color: var(--brand);
  line-height: 1.1;
}
.impact-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 6px;
}

/* —— 公告 —— */
.notice {
  margin-top: 24px;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.notice-icon {
  color: var(--accent);
  font-size: 18px;
}
.notice-tag {
  font-weight: 700;
  color: var(--text-main);
  flex-shrink: 0;
  font-size: 14px;
}
.notice-track {
  flex: 1;
  min-width: 0;
}
.notice-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
}
.notice-item + .notice-item {
  border-top: 1px dashed var(--border-light);
}
.notice-title {
  flex: 1;
  font-size: 14px;
  color: var(--text-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.notice-date {
  color: var(--text-secondary);
  font-size: 12px;
  flex-shrink: 0;
}

/* —— 领养步骤 —— */
.steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.step {
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 22px 20px;
}
.step-no {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand-light);
  color: var(--brand);
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.step h4 {
  font-size: 16px;
  margin-bottom: 6px;
}
.step p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* —— 快捷入口 —— */
.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}
.quick-link {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 30px 24px;
  cursor: pointer;
  transition: transform 0.25s, box-shadow 0.25s;
  box-shadow: var(--shadow-sm);
}
.quick-link:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}
.ql-icon {
  font-size: 30px;
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.ql-rescue { background: var(--accent-light); color: var(--accent); }
.ql-match { background: var(--brand-light); color: var(--brand); }
.ql-read { background: var(--tone-violet-bg); color: var(--tone-violet); }
.quick-link h4 {
  font-size: 17px;
  margin-bottom: 6px;
}
.quick-link p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

@media (max-width: 768px) {
  .hero {
    margin: -16px -14px 0;
  }
  .hero-slide,
  .hero-mask,
  .hero-fallback {
    height: 300px;
  }
  .hero-text h2,
  .hero-fallback h1 {
    font-size: 24px;
  }
  .impact {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 18px 10px;
  }
  .impact-item:nth-child(2) {
    border-right: none;
  }
  .impact-num {
    font-size: 26px;
  }
  .steps {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
