<template>
  <div class="cert-page">
    <div class="cert-toolbar no-print">
      <el-button @click="$router.back()">返回</el-button>
      <el-button type="primary" :disabled="!canShow" @click="printCert">🖨️ 打印 / 保存为 PDF</el-button>
    </div>

    <div v-if="loading" v-loading="true" style="height:200px"></div>

    <el-alert
      v-else-if="!canShow"
      class="no-print"
      type="warning"
      :closable="false"
      show-icon
      title="该领养申请尚未通过，暂不能生成领养证书"
    />

    <div v-else class="cert" id="cert">
      <div class="cert-inner">
        <div class="cert-emblem">🐾</div>
        <div class="cert-org">流浪动物救助与领养中心</div>
        <h1 class="cert-title">领 养 证 书</h1>
        <div class="cert-subtitle">ADOPTION CERTIFICATE</div>

        <p class="cert-body">
          兹证明 <span class="hl">{{ data.applicant_name }}</span> 女士/先生，
          于 <span class="hl">{{ approvedDate }}</span> 通过本中心审核，
          正式领养 <span class="hl">{{ data.animal_name }}</span>。
          望以爱心与责任相伴，给予它一生的陪伴与守护。
        </p>

        <div class="cert-photo" v-if="data.animal_image">
          <img v-imgfb :src="data.animal_image" :alt="data.animal_name" />
        </div>

        <div class="cert-meta">
          <div class="cert-info">
            <div><label>证书编号</label><span>{{ certNo }}</span></div>
            <div><label>领养动物</label><span>{{ data.animal_name }}</span></div>
            <div><label>领养人</label><span>{{ data.applicant_name }}</span></div>
            <div><label>签发日期</label><span>{{ approvedDate }}</span></div>
          </div>
          <div class="cert-qr">
            <img v-if="qrUrl" :src="qrUrl" alt="验证二维码" />
            <span>扫码查看动物档案</span>
          </div>
        </div>

        <div class="cert-foot">
          <div class="cert-seal">流浪动物救助与领养中心<br /><small>（盖章）</small></div>
          <div class="cert-date">{{ approvedDate }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import QRCode from 'qrcode'
import request from '@/utils/request'

const route = useRoute()
const loading = ref(true)
const data = reactive({})
const qrUrl = ref('')

const canShow = computed(() => data.status === 'approved' || data.status === 'completed')
const approvedDate = computed(() => (data.reviewed_at || data.created_at || '').slice(0, 10))
const certNo = computed(() => {
  const year = (data.reviewed_at || data.created_at || '').slice(0, 4) || '0000'
  return `LY-${year}-${String(data.id || 0).padStart(4, '0')}`
})

onMounted(async () => {
  try {
    const res = await request.get(`/adoptions/${route.params.id}`)
    Object.assign(data, res.data || {})
    if (canShow.value) {
      const text = [
        '流浪动物救助与领养中心 · 领养证书',
        `编号: ${certNo.value}`,
        `动物: ${data.animal_name}`,
        `领养人: ${data.applicant_name}`,
        `日期: ${approvedDate.value}`,
        `${window.location.origin}/animals/${data.animal_id}`,
      ].join('\n')
      qrUrl.value = await QRCode.toDataURL(text, { width: 200, margin: 1 })
    }
  } finally {
    loading.value = false
  }
})

function printCert() {
  window.print()
}
</script>

<style scoped>
.cert-page { max-width: 900px; margin: 0 auto; padding: 24px; }
.cert-toolbar { display: flex; justify-content: space-between; margin-bottom: 16px; }

.cert {
  background: #fff;
  padding: 14px;
  border: 2px solid #c9a45c;
  border-radius: 6px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}
.cert-inner {
  border: 1px solid #e0c690;
  padding: 40px 48px 32px;
  text-align: center;
  position: relative;
}
.cert-emblem { font-size: 56px; }
.cert-org { color: #b8860b; letter-spacing: 4px; font-size: 15px; margin-top: 4px; }
.cert-title { font-size: 40px; letter-spacing: 10px; color: #3a3a3a; margin: 14px 0 2px; }
.cert-subtitle { color: #b0a17c; letter-spacing: 3px; font-size: 13px; margin-bottom: 26px; }
.cert-body { font-size: 17px; line-height: 2.2; color: #444; text-align: left; text-indent: 2em; margin: 0 auto 22px; }
.cert-body .hl { color: #b8860b; font-weight: bold; padding: 0 4px; border-bottom: 1px solid #e0c690; }
.cert-photo { margin: 10px auto 22px; }
.cert-photo img { width: 160px; height: 160px; object-fit: cover; border-radius: 8px; border: 3px solid #f0e6cf; }
.cert-meta { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-top: 10px; }
.cert-info { text-align: left; flex: 1; }
.cert-info > div { margin-bottom: 10px; font-size: 14px; }
.cert-info label { display: inline-block; width: 76px; color: #999; }
.cert-info span { color: #333; font-weight: 500; }
.cert-qr { text-align: center; color: #999; font-size: 12px; }
.cert-qr img { width: 96px; height: 96px; display: block; margin-bottom: 4px; }
.cert-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 34px; padding-top: 16px; }
.cert-seal { color: #c0392b; font-size: 15px; line-height: 1.6; text-align: center; }
.cert-date { color: #666; font-size: 14px; }

@media print {
  .no-print { display: none !important; }
  .cert-page { padding: 0; max-width: none; }
  .cert { border: none; box-shadow: none; }
}
</style>
