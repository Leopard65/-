<template>
  <div class="login-page" @mousemove="onMouseMove">
    <!-- 左侧品牌 + 卡通角色面板 -->
    <div class="login-brand">
      <div class="brand-top">
        <div class="brand-logo"><el-icon><Shop /></el-icon></div>
        <span class="brand-name">超市管理系统</span>
      </div>

      <!-- 卡通角色舞台 -->
      <div class="stage-wrap">
        <div class="stage">
          <!-- 紫色高个（后层） -->
          <div
            ref="purpleRef"
            class="char"
            :style="{
              left: '70px', width: '180px',
              height: (isTyping || (hasPwd && !showPassword)) ? '440px' : '400px',
              background: '#6C3FF5', borderRadius: '10px 10px 0 0', zIndex: 1,
              transform: (hasPwd && showPassword)
                ? 'skewX(0deg)'
                : (isTyping || (hasPwd && !showPassword))
                  ? `skewX(${(purplePos.bodySkew) - 12}deg) translateX(40px)`
                  : `skewX(${purplePos.bodySkew}deg)`,
            }"
          >
            <div
              class="eyes"
              :style="{
                gap: '32px',
                left: (hasPwd && showPassword) ? '20px' : isLookingAtEachOther ? '55px' : `${45 + purplePos.faceX}px`,
                top: (hasPwd && showPassword) ? '35px' : isLookingAtEachOther ? '65px' : `${40 + purplePos.faceY}px`,
              }"
            >
              <EyeBall :size="18" :pupil-size="7" :max-distance="5" pupil-color="#2D2D2D"
                :is-blinking="isPurpleBlinking" :mx="mouseX" :my="mouseY"
                :force-x="purpleForce.x" :force-y="purpleForce.y" />
              <EyeBall :size="18" :pupil-size="7" :max-distance="5" pupil-color="#2D2D2D"
                :is-blinking="isPurpleBlinking" :mx="mouseX" :my="mouseY"
                :force-x="purpleForce.x" :force-y="purpleForce.y" />
            </div>
          </div>

          <!-- 黑色中个（中层） -->
          <div
            ref="blackRef"
            class="char"
            :style="{
              left: '240px', width: '120px', height: '310px',
              background: '#2D2D2D', borderRadius: '8px 8px 0 0', zIndex: 2,
              transform: (hasPwd && showPassword)
                ? 'skewX(0deg)'
                : isLookingAtEachOther
                  ? `skewX(${blackPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
                  : (isTyping || (hasPwd && !showPassword))
                    ? `skewX(${blackPos.bodySkew * 1.5}deg)`
                    : `skewX(${blackPos.bodySkew}deg)`,
            }"
          >
            <div
              class="eyes"
              :style="{
                gap: '24px',
                left: (hasPwd && showPassword) ? '10px' : isLookingAtEachOther ? '32px' : `${26 + blackPos.faceX}px`,
                top: (hasPwd && showPassword) ? '28px' : isLookingAtEachOther ? '12px' : `${32 + blackPos.faceY}px`,
              }"
            >
              <EyeBall :size="16" :pupil-size="6" :max-distance="4" pupil-color="#2D2D2D"
                :is-blinking="isBlackBlinking" :mx="mouseX" :my="mouseY"
                :force-x="blackForce.x" :force-y="blackForce.y" />
              <EyeBall :size="16" :pupil-size="6" :max-distance="4" pupil-color="#2D2D2D"
                :is-blinking="isBlackBlinking" :mx="mouseX" :my="mouseY"
                :force-x="blackForce.x" :force-y="blackForce.y" />
            </div>
          </div>

          <!-- 橙色半圆（前左） -->
          <div
            ref="orangeRef"
            class="char"
            :style="{
              left: '0px', width: '240px', height: '200px', zIndex: 3,
              background: '#FF9B6B', borderRadius: '120px 120px 0 0',
              transform: (hasPwd && showPassword) ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew}deg)`,
            }"
          >
            <div
              class="eyes eyes-fast"
              :style="{
                gap: '32px',
                left: (hasPwd && showPassword) ? '50px' : `${82 + orangePos.faceX}px`,
                top: (hasPwd && showPassword) ? '85px' : `${90 + orangePos.faceY}px`,
              }"
            >
              <Pupil :size="12" :max-distance="5" pupil-color="#2D2D2D" :mx="mouseX" :my="mouseY"
                :force-x="(hasPwd && showPassword) ? -5 : null" :force-y="(hasPwd && showPassword) ? -4 : null" />
              <Pupil :size="12" :max-distance="5" pupil-color="#2D2D2D" :mx="mouseX" :my="mouseY"
                :force-x="(hasPwd && showPassword) ? -5 : null" :force-y="(hasPwd && showPassword) ? -4 : null" />
            </div>
          </div>

          <!-- 黄色中个（前右） -->
          <div
            ref="yellowRef"
            class="char"
            :style="{
              left: '310px', width: '140px', height: '230px',
              background: '#E8D754', borderRadius: '70px 70px 0 0', zIndex: 4,
              transform: (hasPwd && showPassword) ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew}deg)`,
            }"
          >
            <div
              class="eyes eyes-fast"
              :style="{
                gap: '24px',
                left: (hasPwd && showPassword) ? '20px' : `${52 + yellowPos.faceX}px`,
                top: (hasPwd && showPassword) ? '35px' : `${40 + yellowPos.faceY}px`,
              }"
            >
              <Pupil :size="12" :max-distance="5" pupil-color="#2D2D2D" :mx="mouseX" :my="mouseY"
                :force-x="(hasPwd && showPassword) ? -5 : null" :force-y="(hasPwd && showPassword) ? -4 : null" />
              <Pupil :size="12" :max-distance="5" pupil-color="#2D2D2D" :mx="mouseX" :my="mouseY"
                :force-x="(hasPwd && showPassword) ? -5 : null" :force-y="(hasPwd && showPassword) ? -4 : null" />
            </div>
            <div
              class="mouth"
              :style="{
                left: (hasPwd && showPassword) ? '10px' : `${40 + yellowPos.faceX}px`,
                top: (hasPwd && showPassword) ? '88px' : `${88 + yellowPos.faceY}px`,
              }"
            />
          </div>
        </div>
      </div>

    </div>

    <!-- 右侧登录表单 -->
    <div class="login-form-wrap">
      <div class="login-form">
        <div class="mobile-logo"><el-icon><Shop /></el-icon><span>超市管理系统</span></div>
        <h2 class="form-title">欢迎回来！</h2>
        <p class="form-sub">请登录以继续管理您的门店</p>

        <el-form :model="form" label-width="64px" @keyup.enter="handleLogin">
          <el-form-item label="用户名">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
              autocomplete="username"
              size="large"
              @focus="isTyping = true"
              @blur="isTyping = false"
            />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              autocomplete="current-password"
              size="large"
              @focus="isTyping = true"
              @blur="isTyping = false"
            >
              <template #suffix>
                <el-icon class="pwd-toggle" @click="showPassword = !showPassword">
                  <View v-if="showPassword" /><Hide v-else />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="large" class="login-submit" :loading="loading" @click="handleLogin">
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="form-tip">默认账号：admin / admin123</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Hide, Lock, Shop, User, View } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

/* ============ 眼睛：白眼球 + 会追踪鼠标的瞳孔（可强制注视 / 眨眼） ============ */
const EyeBall = defineComponent({
  name: 'EyeBall',
  props: {
    size: { type: Number, default: 48 },
    pupilSize: { type: Number, default: 16 },
    maxDistance: { type: Number, default: 10 },
    eyeColor: { type: String, default: 'white' },
    pupilColor: { type: String, default: 'black' },
    isBlinking: { type: Boolean, default: false },
    mx: { type: Number, default: 0 },
    my: { type: Number, default: 0 },
    forceX: { type: [Number, null], default: null },
    forceY: { type: [Number, null], default: null },
  },
  setup(props) {
    const el = ref(null)
    const offset = computed(() => {
      if (props.forceX !== null && props.forceY !== null) {
        return { x: props.forceX, y: props.forceY }
      }
      if (!el.value) return { x: 0, y: 0 }
      const r = el.value.getBoundingClientRect()
      const dx = props.mx - (r.left + r.width / 2)
      const dy = props.my - (r.top + r.height / 2)
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), props.maxDistance)
      const a = Math.atan2(dy, dx)
      return { x: Math.cos(a) * dist, y: Math.sin(a) * dist }
    })
    return () => h('div', {
      ref: el,
      class: 'eyeball',
      style: {
        width: `${props.size}px`,
        height: props.isBlinking ? '2px' : `${props.size}px`,
        backgroundColor: props.eyeColor,
      },
    }, props.isBlinking ? [] : [
      h('div', {
        class: 'pupil',
        style: {
          width: `${props.pupilSize}px`,
          height: `${props.pupilSize}px`,
          backgroundColor: props.pupilColor,
          transform: `translate(${offset.value.x}px, ${offset.value.y}px)`,
        },
      }),
    ])
  },
})

/* ============ 瞳孔：无眼白，只有一个会追踪鼠标的小圆点 ============ */
const Pupil = defineComponent({
  name: 'Pupil',
  props: {
    size: { type: Number, default: 12 },
    maxDistance: { type: Number, default: 5 },
    pupilColor: { type: String, default: 'black' },
    mx: { type: Number, default: 0 },
    my: { type: Number, default: 0 },
    forceX: { type: [Number, null], default: null },
    forceY: { type: [Number, null], default: null },
  },
  setup(props) {
    const el = ref(null)
    const offset = computed(() => {
      if (props.forceX !== null && props.forceY !== null) {
        return { x: props.forceX, y: props.forceY }
      }
      if (!el.value) return { x: 0, y: 0 }
      const r = el.value.getBoundingClientRect()
      const dx = props.mx - (r.left + r.width / 2)
      const dy = props.my - (r.top + r.height / 2)
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), props.maxDistance)
      const a = Math.atan2(dy, dx)
      return { x: Math.cos(a) * dist, y: Math.sin(a) * dist }
    })
    return () => h('div', {
      ref: el,
      class: 'pupil',
      style: {
        width: `${props.size}px`,
        height: `${props.size}px`,
        backgroundColor: props.pupilColor,
        transform: `translate(${offset.value.x}px, ${offset.value.y}px)`,
      },
    })
  },
})

/* ============ 登录逻辑（保持原有封装不变） ============ */
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const showPassword = ref(false)
const form = reactive({ username: '', password: '' })
const hasPwd = computed(() => form.password.length > 0)

/* ============ 交互动画状态 ============ */
const mouseX = ref(0)
const mouseY = ref(0)
const isTyping = ref(false)
const isLookingAtEachOther = ref(false)
const isPurpleBlinking = ref(false)
const isBlackBlinking = ref(false)
const isPurplePeeking = ref(false)

const purpleRef = ref(null)
const blackRef = ref(null)
const orangeRef = ref(null)
const yellowRef = ref(null)

const onMouseMove = (e) => {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

/* 计算角色身体倾斜 + 面部偏移（朝向鼠标） */
const calcPos = (elRef) => {
  const node = elRef.value
  if (!node) return { faceX: 0, faceY: 0, bodySkew: 0 }
  const r = node.getBoundingClientRect()
  const dx = mouseX.value - (r.left + r.width / 2)
  const dy = mouseY.value - (r.top + r.height / 3)
  return {
    faceX: Math.max(-15, Math.min(15, dx / 20)),
    faceY: Math.max(-10, Math.min(10, dy / 30)),
    bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
  }
}
const purplePos = computed(() => calcPos(purpleRef))
const blackPos = computed(() => calcPos(blackRef))
const orangePos = computed(() => calcPos(orangeRef))
const yellowPos = computed(() => calcPos(yellowRef))

/* 显示密码时集体避嫌；紫色小家伙偶尔偷瞄；打字时互相对视 */
const purpleForce = computed(() => {
  if (hasPwd.value && showPassword.value) {
    return isPurplePeeking.value ? { x: 4, y: 5 } : { x: -4, y: -4 }
  }
  if (isLookingAtEachOther.value) return { x: 3, y: 4 }
  return { x: null, y: null }
})
const blackForce = computed(() => {
  if (hasPwd.value && showPassword.value) return { x: -4, y: -4 }
  if (isLookingAtEachOther.value) return { x: 0, y: -4 }
  return { x: null, y: null }
})

/* 随机眨眼调度（3~7 秒） */
let purpleTimer = null
let blackTimer = null
const randInterval = () => Math.random() * 4000 + 3000
const scheduleBlink = (flag, setTimer) => {
  const t = setTimeout(() => {
    flag.value = true
    setTimeout(() => {
      flag.value = false
      scheduleBlink(flag, setTimer)
    }, 150)
  }, randInterval())
  setTimer(t)
}

/* 聚焦输入时短暂对视 800ms */
let lookTimer = null
const startLookAtEachOther = () => {
  clearTimeout(lookTimer)
  isLookingAtEachOther.value = true
  lookTimer = setTimeout(() => { isLookingAtEachOther.value = false }, 800)
}

/* 显示密码时，紫色小家伙每 2~5 秒偷瞄一次 */
let peekTimer = null
const schedulePeek = () => {
  clearTimeout(peekTimer)
  peekTimer = setTimeout(() => {
    isPurplePeeking.value = true
    setTimeout(() => { isPurplePeeking.value = false; schedulePeek() }, 800)
  }, Math.random() * 3000 + 2000)
}

onMounted(() => {
  scheduleBlink(isPurpleBlinking, (t) => { purpleTimer = t })
  scheduleBlink(isBlackBlinking, (t) => { blackTimer = t })
})
onBeforeUnmount(() => {
  clearTimeout(purpleTimer)
  clearTimeout(blackTimer)
  clearTimeout(lookTimer)
  clearTimeout(peekTimer)
})

/* 用侦听驱动“对视 / 偷瞄”，避免在模板里写副作用 */
watch(isTyping, (v) => { if (v) startLookAtEachOther() })
watch([hasPwd, showPassword], ([hp, sp]) => {
  if (hp && sp) schedulePeek()
  else { clearTimeout(peekTimer); isPurplePeeking.value = false }
})

const handleLogin = async () => {
  if (loading.value) return
  if (!form.username || !form.password) {
    return ElMessage.warning('请输入用户名和密码')
  }
  loading.value = true
  try {
    await userStore.login({ username: form.username, password: form.password })
    ElMessage.success('登录成功')
    router.push('/')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: minmax(560px, 1.12fr) minmax(460px, 0.88fr);
  min-height: 100dvh;
  background: var(--bg-page);
}

/* ===== 左侧品牌 / 角色舞台 ===== */
.login-brand {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: clamp(28px, 3.2vw, 56px);
  color: #fff;
  background:
    radial-gradient(120% 90% at 20% 15%, rgba(217, 154, 24, 0.18), transparent 45%),
    linear-gradient(160deg, var(--color-primary) 0%, var(--color-primary-dark) 70%, #0b3a29 100%);
}
.login-brand::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 26px 26px;
  pointer-events: none;
}
.brand-top {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 12px;
  font-size: 20px; font-weight: 700;
}
.brand-logo {
  width: 40px; height: 40px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: var(--color-accent);
}
.brand-name { letter-spacing: 1px; }

/* 舞台 */
.stage-wrap {
  position: relative; z-index: 2;
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  min-height: 0;
  padding: 32px 0 20px;
}
.stage {
  position: relative;
  width: 550px; height: 400px;
  transform: scale(0.88);
  transform-origin: bottom center;
}
.char {
  position: absolute;
  bottom: 0;
  transform-origin: bottom center;
  transition: all 0.7s ease-in-out;
}
.eyes {
  position: absolute;
  display: flex;
  transition: all 0.7s ease-in-out;
}
.eyes-fast { transition: all 0.2s ease-out; }
.mouth {
  position: absolute;
  width: 80px; height: 4px;
  background: #2D2D2D; border-radius: 999px;
  transition: all 0.2s ease-out;
}

/* ===== 眼睛 / 瞳孔（子组件内部用类名，样式集中在此） ===== */
.login-brand :deep(.eyeball) {
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  transition: height 0.15s ease;
}
.login-brand :deep(.pupil) {
  border-radius: 50%;
  transition: transform 0.1s ease-out;
}

/* ===== 右侧表单 ===== */
.login-form-wrap {
  min-width: 0;
  display: flex; align-items: center; justify-content: center;
  padding: clamp(24px, 4vw, 64px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.26)),
    var(--bg-page);
}
.login-form {
  position: relative;
  width: min(438px, 100%);
  padding: 36px 38px 30px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(223, 230, 223, 0.92);
  border-radius: var(--radius-lg);
  box-shadow: 0 18px 48px rgba(22, 34, 29, 0.10);
}
.login-form::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
}
.mobile-logo {
  display: none;
  align-items: center; justify-content: center; gap: 10px;
  font-size: 18px; font-weight: 700; color: var(--text-primary);
  margin-bottom: 28px;
}
.mobile-logo .el-icon { color: var(--color-primary); font-size: 24px; }
.form-title {
  margin: 0; text-align: center;
  font-size: 28px; font-weight: 800; color: var(--text-primary);
  letter-spacing: 0;
  line-height: 1.25;
}
.form-sub {
  margin: 8px 0 30px;
  text-align: center; color: var(--text-secondary); font-size: 14px;
}
.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}
.login-form :deep(.el-form-item__label) {
  color: var(--text-regular);
  font-weight: 600;
  justify-content: flex-start;
}
.login-form :deep(.el-input__wrapper) {
  min-height: 44px;
  border-radius: var(--radius-md);
}
.login-submit { width: 100%; height: 46px; font-weight: 700; font-size: 15px; }
.pwd-toggle { cursor: pointer; color: var(--text-placeholder); }
.pwd-toggle:hover { color: var(--color-primary); }
.form-tip {
  text-align: center; color: var(--text-placeholder);
  font-size: 12px; margin-top: 10px;
}

@media (min-width: 1600px) {
  .login-page {
    grid-template-columns: minmax(760px, 1.18fr) minmax(560px, 0.82fr);
  }
  .stage { transform: scale(0.98); }
  .login-form { width: min(460px, 100%); }
}

@media (max-width: 1120px) {
  .login-page {
    grid-template-columns: minmax(500px, 1fr) minmax(420px, 0.9fr);
  }
  .stage { transform: scale(0.78); }
}

/* ===== 窄屏：隐藏舞台，仅留表单 ===== */
@media (max-width: 900px) {
  .login-page {
    display: flex;
  }
  .login-brand { display: none; }
  .login-form-wrap {
    width: 100%;
    min-height: 100dvh;
    justify-content: flex-start;
    padding: 20px;
  }
  .login-form {
    flex: 0 1 min(340px, calc(100vw - 40px));
    width: min(340px, calc(100vw - 40px));
    max-width: min(340px, calc(100vw - 40px));
    min-width: 0;
    padding: 28px 24px 24px;
  }
  .mobile-logo { display: flex; }
  .form-title { font-size: 26px; }
  .login-form :deep(.el-form-item) {
    display: block;
  }
  .login-form :deep(.el-form-item__label) {
    height: auto;
    margin-bottom: 6px;
    line-height: 1.4;
  }
  .login-form :deep(.el-form-item__content) {
    min-width: 0;
    margin-left: 0 !important;
  }
  .login-form :deep(.el-input) {
    width: 100%;
    min-width: 0;
  }
}

@media (min-width: 520px) and (max-width: 900px) {
  .login-form {
    flex-basis: min(420px, calc(100vw - 40px));
    width: min(420px, calc(100vw - 40px));
    max-width: min(420px, calc(100vw - 40px));
  }
}
</style>
