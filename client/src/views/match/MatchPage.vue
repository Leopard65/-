<template>
  <div class="match-page">
    <div class="match-hero">
      <h2>领养匹配测评</h2>
      <p>告诉我们你的情况，为你推荐最合适的毛孩子</p>
    </div>

    <el-card class="match-form" shadow="never">
      <el-form :model="form" label-width="92px">
        <el-form-item label="想养的类型">
          <el-select v-model="form.category_id" placeholder="不限">
            <el-option label="不限" value="" />
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="居住情况">
          <el-radio-group v-model="form.housing_type">
            <el-radio value="自有">自有住房</el-radio>
            <el-radio value="租房">租房</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="养宠经验">
          <el-radio-group v-model="form.has_experience">
            <el-radio value="no">新手</el-radio>
            <el-radio value="yes">有经验</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="日常活动量">
          <el-radio-group v-model="form.activity">
            <el-radio value="low">较少</el-radio>
            <el-radio value="medium">一般</el-radio>
            <el-radio value="high">充沛</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="期望性格">
          <el-checkbox-group v-model="form.personality">
            <el-checkbox value="亲人">亲人</el-checkbox>
            <el-checkbox value="安静">安静</el-checkbox>
            <el-checkbox value="活泼">活泼</el-checkbox>
            <el-checkbox value="温顺">温顺</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" round :loading="loading" @click="doMatch">开始匹配</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-if="searched" class="match-result">
      <h3 class="section-title">为你推荐（按匹配度排序）</h3>
      <EmptyState v-if="results.length === 0" description="暂无可领养动物" />
      <div class="result-grid">
        <el-card v-for="a in results" :key="a.id" class="result-card" shadow="hover">
          <div class="rc-top">
            <div class="rc-img">
              <img v-if="a.image_url" v-imgfb :src="a.image_url" :alt="a.name" />
              <div v-else class="paw-ph"></div>
            </div>
            <el-progress
              type="circle"
              :percentage="a.matchScore"
              :width="64"
              :color="scoreColor(a.matchScore)"
            />
          </div>
          <div class="rc-body">
            <div class="rc-head">
              <h4>{{ a.name }}</h4>
              <span class="rc-meta">{{ a.category_name }} · {{ a.breed_name || '未知品种' }}</span>
            </div>
            <div class="rc-reasons">
              <el-tag v-for="(r, i) in a.matchReasons.slice(0, 3)" :key="i" size="small" type="success" effect="plain" round>{{ r }}</el-tag>
              <span v-if="a.matchReasons.length === 0" class="rc-noreason">基础匹配</span>
            </div>
            <div class="rc-actions">
              <el-button text type="primary" size="small" @click="$router.push(`/animals/${a.id}`)">查看详情</el-button>
              <el-button text type="success" size="small" @click="$router.push(`/adopt/apply/${a.id}`)">申请领养</el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import EmptyState from '@/components/EmptyState.vue'

const loading = ref(false)
const searched = ref(false)
const results = ref([])
const categories = ref([])
const form = reactive({
  category_id: '',
  housing_type: '自有',
  has_experience: 'no',
  activity: 'medium',
  personality: [],
})

onMounted(async () => {
  try {
    const res = await request.get('/categories')
    categories.value = res.data || []
  } catch { /* 忽略 */ }
})

async function doMatch() {
  loading.value = true
  try {
    const prefs = { ...form, category_id: form.category_id || undefined }
    const res = await request.post('/animals/recommend', prefs)
    results.value = res.data || []
    searched.value = true
  } finally {
    loading.value = false
  }
}

function scoreColor(s) {
  if (s >= 80) return '#2f9e87'
  if (s >= 60) return '#e6a23c'
  return '#909399'
}
</script>

<style scoped>
.match-hero {
  background: linear-gradient(135deg, #2f9e87 0%, #3aa890 50%, #1f6757 100%);
  color: #fff;
  border-radius: var(--radius-lg);
  padding: 30px;
  margin-bottom: 20px;
  text-align: center;
}
.match-hero h2 { font-size: 26px; margin-bottom: 6px; color: #fff; }
.match-hero p { opacity: 0.92; }
.match-form { margin-bottom: 24px; max-width: 560px; border: none; box-shadow: var(--shadow-sm); border-radius: var(--radius); }
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.result-card { border: none; box-shadow: var(--shadow-sm); border-radius: var(--radius); }
.result-card :deep(.el-card__body) { padding: 14px; }
.rc-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.rc-img { width: 110px; height: 90px; border-radius: 8px; overflow: hidden; background: var(--bg-soft); flex-shrink: 0; }
.rc-img img { width: 100%; height: 100%; object-fit: cover; }
.rc-body { margin-top: 10px; }
.rc-head { display: flex; align-items: baseline; justify-content: space-between; }
.rc-head h4 { font-size: 16px; }
.rc-meta { font-size: 12px; color: var(--text-secondary); }
.rc-reasons { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; min-height: 24px; }
.rc-noreason { color: var(--text-placeholder); font-size: 12px; }
.rc-actions { display: flex; justify-content: flex-end; gap: 4px; }
</style>
