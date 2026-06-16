<template>
  <div class="empty-state">
    <el-empty :description="description" :image-size="imageSize">
      <slot />
    </el-empty>
  </div>
</template>

<script setup>
/**
 * 统一空状态：固定描述口径与图标尺寸，可在默认插槽放操作按钮。
 */
defineProps({
  description: { type: String, default: '暂无数据' },
  imageSize: { type: Number, default: 80 }
})
</script>
