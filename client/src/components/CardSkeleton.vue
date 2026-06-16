<template>
  <div class="card-skeleton">
    <el-skeleton animated>
      <template #template>
        <el-skeleton-item variant="image" class="cs-img" :style="{ height: imgHeight }" />
        <div class="cs-body">
          <el-skeleton-item variant="text" style="width: 62%" />
          <el-skeleton-item variant="text" style="width: 40%; margin-top: 10px" />
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  height: { type: [String, Number], default: 150 },
})
const imgHeight = computed(() =>
  typeof props.height === 'number' ? `${props.height}px` : props.height
)
</script>

<style scoped>
.card-skeleton {
  background: var(--bg-card);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.cs-img {
  width: 100%;
  display: block;
}
.cs-body {
  padding: 14px;
}
</style>
