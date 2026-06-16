<template>
  <el-upload
    class="image-upload"
    :show-file-list="false"
    :before-upload="onBefore"
    :http-request="onPick"
    accept="image/*"
  >
    <div class="iu-box" :style="boxStyle">
      <template v-if="preview">
        <img :src="preview" class="iu-img" />
        <div class="iu-mask">
          <el-icon><Camera /></el-icon>
          <span>更换图片</span>
        </div>
      </template>
      <div v-else class="iu-empty">
        <el-icon class="iu-plus"><Plus /></el-icon>
        <span class="iu-tip">{{ placeholder }}</span>
      </div>
    </div>
  </el-upload>
</template>

<script setup>
import { computed } from 'vue'
import { validateImage } from '@/utils/upload'

const props = defineProps({
  modelValue: { type: String, default: '' }, // 预览 URL
  placeholder: { type: String, default: '点击上传' },
  maxSize: { type: Number, default: 5 },
  width: { type: [Number, String], default: 160 },
  height: { type: [Number, String], default: 120 },
})
const emit = defineEmits(['update:modelValue', 'change'])

const preview = computed(() => props.modelValue)
const toCss = (v) => (typeof v === 'number' ? `${v}px` : v)
const boxStyle = computed(() => ({ width: toCss(props.width), height: toCss(props.height) }))

function onBefore(file) {
  return validateImage(file, { maxSize: props.maxSize })
}
// 仅本地预览，真实文件通过 change 事件交给父组件随表单一起提交
function onPick({ file }) {
  emit('update:modelValue', URL.createObjectURL(file))
  emit('change', file)
}
</script>

<style scoped>
.iu-box {
  position: relative;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-soft);
  transition: border-color 0.2s;
}
.image-upload:hover .iu-box {
  border-color: var(--brand);
}
.iu-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.iu-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.2s;
}
.iu-box:hover .iu-mask {
  opacity: 1;
}
.iu-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-secondary);
}
.iu-plus {
  font-size: 24px;
}
.iu-tip {
  font-size: 12px;
}
</style>
