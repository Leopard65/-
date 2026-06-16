<template>
  <router-link :to="`/animals/${animal.id}`" class="animal-card">
    <div class="ac-image">
      <img v-if="animal.image_url" v-imgfb :src="animal.image_url" :alt="animal.name" />
      <div v-else class="paw-ph"></div>
      <StatusTag
        v-if="showStatus && animal.status"
        kind="animal"
        :value="animal.status"
        size="small"
        class="ac-status"
      />
    </div>
    <div class="ac-body">
      <div class="ac-name">{{ animal.name }}</div>
      <div class="ac-meta">
        {{ animal.category_name || '未知' }}
        <template v-if="animal.breed_name"> · {{ animal.breed_name }}</template>
      </div>
      <div class="ac-chips">
        <span class="chip">{{ genderText(animal.gender) }}</span>
        <span v-if="animal.age" class="chip">{{ animal.age }}</span>
        <span v-if="animal.is_sterilized" class="chip chip-ok">已绝育</span>
        <span v-if="animal.is_vaccinated" class="chip chip-ok">已疫苗</span>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import StatusTag from './StatusTag.vue'
import { genderText } from '@/utils/format'

defineProps({
  animal: { type: Object, required: true },
  showStatus: { type: Boolean, default: true },
})
</script>

<style scoped>
.animal-card {
  display: block;
  background: var(--bg-card);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.animal-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
}
.ac-image {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--bg-soft);
}
.ac-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.animal-card:hover .ac-image img {
  transform: scale(1.06);
}
.ac-status {
  position: absolute;
  top: 10px;
  right: 10px;
  box-shadow: var(--shadow-sm);
}
.ac-body {
  padding: 12px 14px 14px;
}
.ac-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ac-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ac-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  font-size: 12px;
  line-height: 1;
  padding: 5px 8px;
  border-radius: 6px;
  background: var(--bg-soft);
  color: var(--text-regular);
}
.chip-ok {
  background: var(--brand-light);
  color: var(--brand-hover);
}
@media (max-width: 768px) {
  .ac-name {
    font-size: 15px;
  }
}
</style>
