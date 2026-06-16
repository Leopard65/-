<template>
  <el-tag :type="meta.type" :size="size" :effect="effect" :round="round">
    {{ meta.label }}
  </el-tag>
</template>

<script setup>
import { computed } from 'vue'
import {
  ANIMAL_STATUS,
  ADOPTION_STATUS,
  RESCUE_STATUS,
  URGENCY,
  ARTICLE_CATEGORY,
  PUBLISH_STATUS,
  ANIMAL_EVENT_TYPE,
  RESCUE_ACTION,
} from '@/utils/format'

const MAPS = {
  animal: ANIMAL_STATUS,
  adoption: ADOPTION_STATUS,
  rescue: RESCUE_STATUS,
  urgency: URGENCY,
  article: ARTICLE_CATEGORY,
  publish: PUBLISH_STATUS,
  animalEvent: ANIMAL_EVENT_TYPE,
  rescueAction: RESCUE_ACTION,
}

const props = defineProps({
  // 字典类型：animal | adoption | rescue | urgency | article | publish
  kind: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  size: { type: String, default: 'default' },
  effect: { type: String, default: 'light' },
  round: { type: Boolean, default: true },
})

const meta = computed(
  () => MAPS[props.kind]?.[props.value] || { label: props.value, type: '' }
)
</script>
