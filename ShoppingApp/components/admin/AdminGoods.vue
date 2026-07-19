<script setup>
import { computed, ref } from 'vue'
import { api } from '@/api/client'
import { formatMoney } from '@/utils/format'
import XEmpty from '@/components/x-empty/x-empty.vue'

const props = defineProps({
  filters: { type: Array, default: () => [] },
  activeFilter: { type: [String, Number], default: 'all' },
  keyword: { type: String, default: '' },
  goods: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  actionBusyId: { type: String, default: '' }
})

const emit = defineEmits(['change-filter', 'update-keyword', 'search', 'save', 'status', 'stock', 'delete'])

const showForm = ref(false)
const uploading = ref(false)
const draft = ref(createDraft())

const formTitle = computed(() => draft.value._id ? '编辑商品' : '新增商品')
const canSave = computed(() => Boolean(draft.value.name && Number(draft.value.price) >= 0 && !uploading.value && !props.actionBusyId))

function createDraft(item = null) {
  return {
    _id: item?._id || '',
    name: item?.name || '',
    subtitle: item?.subtitle || '',
    brand: item?.brand || '',
    category_id: item?.category_id || '',
    sub_category_id: item?.sub_category_id || '',
    price: item?.price ?? 0,
    original_price: item?.original_price ?? 0,
    stock: item?.stock ?? 0,
    sales: item?.sales ?? 0,
    sort: item?.sort ?? 0,
    status: item?.status ?? 0,
    image: item?.image || '',
    imagesText: (item?.images || []).join('\n'),
    detail: item?.detail || '',
    is_new: Boolean(item?.is_new),
    is_hot: Boolean(item?.is_hot),
    is_recommend: Number(item?.is_recommend || 0) === 1,
    sku_list: (item?.sku_list || []).map(sku => ({
      _id: sku._id || '',
      spec_values: sku.spec_values || '',
      price: sku.price ?? item?.price ?? 0,
      stock: sku.stock ?? 0,
      image: sku.image || '',
      sort: sku.sort ?? 0,
      status: sku.status ?? 1
    }))
  }
}

function openCreate() {
  draft.value = createDraft()
  showForm.value = true
}

function openEdit(item) {
  draft.value = createDraft(item)
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

function addSku() {
  draft.value.sku_list.push({
    spec_values: '',
    price: draft.value.price || 0,
    stock: 0,
    image: draft.value.image || '',
    sort: draft.value.sku_list.length,
    status: 1
  })
}

function removeSku(index) {
  draft.value.sku_list.splice(index, 1)
}

async function chooseImage(target, index = -1) {
  const chooseRes = await new Promise(resolve => {
    uni.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: resolve,
      fail: () => resolve(null)
    })
  })
  const filePath = chooseRes?.tempFiles?.[0]?.tempFilePath
  if (!filePath) return
  uploading.value = true
  const uploadRes = await api.upload.uploadImage({ filePath, scene: 'goods' })
  uploading.value = false
  if (uploadRes?.code !== 0) return
  const url = uploadRes.data?.url || uploadRes.data?.fileID || ''
  if (!url) return
  if (target === 'sku' && index >= 0) {
    draft.value.sku_list[index].image = url
    return
  }
  draft.value.image = url
  const images = draft.value.imagesText.split('\n').map(item => item.trim()).filter(Boolean)
  if (!images.includes(url)) images.unshift(url)
  draft.value.imagesText = images.slice(0, 8).join('\n')
}

function submitDraft() {
  if (!canSave.value) return
  const images = draft.value.imagesText.split('\n').map(item => item.trim()).filter(Boolean)
  emit('save', {
    ...draft.value,
    images,
    sku_list: draft.value.sku_list.map(item => ({
      ...item,
      price: Number(item.price || 0),
      stock: Number(item.stock || 0),
      sort: Number(item.sort || 0),
      status: Number(item.status ?? 1)
    }))
  })
  closeForm()
}

const goodsStatusText = (status) => Number(status) === 1 ? '上架' : '下架'
</script>

<template>
  <view class="admin-section">
    <view class="toolbar">
      <input
        class="search-input"
        :value="keyword"
        placeholder="搜索商品名称或品牌"
        confirm-type="search"
        @input="emit('update-keyword', $event.detail.value)"
        @confirm="emit('search')"
      />
      <button class="toolbar-btn" @click="emit('search')">搜索</button>
      <button class="toolbar-btn toolbar-btn--primary" @click="openCreate">新增</button>
    </view>

    <view v-if="showForm" class="edit-panel">
      <view class="edit-panel__head">
        <text class="edit-panel__title">{{ formTitle }}</text>
        <text class="edit-panel__close" @click="closeForm">关闭</text>
      </view>
      <input v-model="draft.name" class="form-input" placeholder="商品名称" maxlength="80" />
      <input v-model="draft.subtitle" class="form-input" placeholder="副标题" maxlength="80" />
      <view class="form-grid">
        <input v-model="draft.brand" class="form-input" placeholder="品牌" maxlength="40" />
        <input v-model="draft.category_id" class="form-input" placeholder="一级分类 ID" maxlength="40" />
      </view>
      <view class="form-grid">
        <input v-model="draft.sub_category_id" class="form-input" placeholder="二级分类 ID" maxlength="40" />
        <input v-model="draft.sort" class="form-input" type="number" placeholder="排序" />
      </view>
      <view class="form-grid">
        <input v-model="draft.price" class="form-input" type="digit" placeholder="价格" />
        <input v-model="draft.original_price" class="form-input" type="digit" placeholder="划线价" />
      </view>
      <view class="form-grid">
        <input v-model="draft.stock" class="form-input" type="number" placeholder="库存" />
        <picker :range="['下架', '上架']" :value="Number(draft.status)" @change="draft.status = Number($event.detail.value)">
          <view class="picker-field">{{ Number(draft.status) === 1 ? '上架' : '下架' }}</view>
        </picker>
      </view>
      <view class="image-row">
        <image v-if="draft.image" class="image-preview" :src="draft.image" mode="aspectFill"></image>
        <button class="image-btn" :loading="uploading" @click="chooseImage('main')">选择主图</button>
      </view>
      <textarea v-model="draft.imagesText" class="form-textarea" placeholder="轮播图 URL，每行一个；选择主图后会自动补入" />
      <textarea v-model="draft.detail" class="form-textarea" placeholder="商品详情" maxlength="500" />
      <view class="switch-row">
        <label class="switch-item"><switch :checked="draft.is_new" color="#2f5d50" @change="draft.is_new = $event.detail.value" />新品</label>
        <label class="switch-item"><switch :checked="draft.is_hot" color="#2f5d50" @change="draft.is_hot = $event.detail.value" />热销</label>
        <label class="switch-item"><switch :checked="draft.is_recommend" color="#2f5d50" @change="draft.is_recommend = $event.detail.value" />推荐</label>
      </view>

      <view class="sku-head">
        <text class="sku-head__title">SKU</text>
        <button class="mini-btn" @click="addSku">新增 SKU</button>
      </view>
      <view v-for="(sku, index) in draft.sku_list" :key="`${sku._id || 'new'}-${index}`" class="sku-row">
        <input v-model="sku.spec_values" class="form-input" placeholder="规格，如 颜色:雾白,尺码:M" />
        <view class="form-grid">
          <input v-model="sku.price" class="form-input" type="digit" placeholder="SKU 价格" />
          <input v-model="sku.stock" class="form-input" type="number" placeholder="SKU 库存" />
        </view>
        <view class="sku-actions">
          <button class="mini-btn" :loading="uploading" @click="chooseImage('sku', index)">SKU 图</button>
          <button class="mini-btn mini-btn--danger" @click="removeSku(index)">删除</button>
        </view>
      </view>

      <button class="save-btn" :disabled="!canSave" :loading="!!actionBusyId || uploading" @click="submitDraft">保存商品</button>
    </view>

    <scroll-view class="filters" scroll-x>
      <view class="filters__inner">
        <view
          v-for="item in filters"
          :key="item.value"
          class="filter-chip"
          :class="{ 'filter-chip--active': activeFilter === item.value }"
          @click="emit('change-filter', item.value)"
        >
          {{ item.label }}
        </view>
      </view>
    </scroll-view>

    <view v-for="item in goods" :key="item._id" class="record-card">
      <view class="goods-line">
        <image class="goods-line__image" :src="item.image" mode="aspectFill"></image>
        <view class="goods-line__body">
          <view class="record-card__head">
            <text class="goods-line__name text-ellipsis">{{ item.name }}</text>
            <text class="record-card__status">{{ goodsStatusText(item.status) }}</text>
          </view>
          <text class="goods-line__meta">{{ item.brand || '未设置品牌' }} · 库存 {{ item.stock || 0 }} · SKU {{ item.sku_count || 0 }}</text>
          <text class="goods-line__meta">¥{{ formatMoney(item.price) }}</text>
        </view>
      </view>
      <view class="record-card__actions">
        <button class="action-btn" :disabled="!!actionBusyId" @click="openEdit(item)">编辑</button>
        <button class="action-btn" :disabled="!!actionBusyId" @click="emit('stock', item)">库存</button>
        <button class="action-btn" :disabled="!!actionBusyId" @click="emit('delete', item)">删草稿</button>
        <button class="action-btn action-btn--primary" :loading="actionBusyId === item._id" :disabled="!!actionBusyId" @click="emit('status', item)">
          {{ Number(item.status) === 1 ? '下架' : '上架' }}
        </button>
      </view>
    </view>

    <XEmpty v-if="!loading && goods.length === 0" image="/static/empty-goods.png" title="暂无商品" desc="当前筛选条件下没有商品。" />
  </view>
</template>

<style scoped>
.admin-section {
  margin-top: 20rpx;
}

.toolbar,
.form-grid,
.record-card__head,
.sku-actions {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.toolbar {
  margin-bottom: 18rpx;
}

.search-input,
.form-input,
.form-textarea,
.picker-field {
  width: 100%;
  min-height: 72rpx;
  padding: 0 22rpx;
  color: #1f2522;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 16rpx;
  font-size: 25rpx;
}

.search-input {
  flex: 1;
}

.toolbar-btn,
.image-btn,
.mini-btn,
.save-btn,
.action-btn {
  margin: 0;
  border-radius: 999rpx;
}

.toolbar-btn {
  width: 108rpx;
  height: 72rpx;
  color: #2f5d50;
  background: #fff;
  border: 1rpx solid #d9d4ca;
  font-size: 24rpx;
  line-height: 72rpx;
}

.toolbar-btn--primary,
.save-btn,
.action-btn--primary {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.edit-panel,
.record-card {
  margin-bottom: 18rpx;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.edit-panel__head,
.image-row,
.sku-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.edit-panel__title,
.sku-head__title {
  color: #1f2522;
  font-size: 30rpx;
  font-weight: 900;
}

.edit-panel__close {
  color: #2f5d50;
  font-size: 24rpx;
  font-weight: 800;
}

.form-input,
.form-textarea,
.picker-field,
.image-row,
.switch-row,
.sku-head,
.sku-row {
  margin-top: 16rpx;
}

.form-grid .form-input,
.form-grid .picker-field {
  flex: 1;
  min-width: 0;
}

.picker-field {
  display: flex;
  align-items: center;
}

.form-textarea {
  height: 142rpx;
  padding-top: 18rpx;
  line-height: 1.5;
}

.image-preview {
  width: 124rpx;
  height: 124rpx;
  background: #eeebe3;
  border-radius: 16rpx;
}

.image-btn,
.mini-btn {
  height: 62rpx;
  padding: 0 24rpx;
  color: #2f5d50;
  background: #f7f5f0;
  border: 1rpx solid #d9d4ca;
  font-size: 24rpx;
  line-height: 62rpx;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
}

.switch-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  color: #59625d;
  font-size: 24rpx;
}

.sku-row {
  padding: 18rpx;
  background: #f7f5f0;
  border-radius: 18rpx;
}

.mini-btn--danger {
  color: #b84a3c;
}

.save-btn {
  height: 78rpx;
  margin-top: 20rpx;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 78rpx;
}

.filters {
  white-space: nowrap;
  margin-bottom: 18rpx;
}

.filters__inner {
  display: flex;
  gap: 14rpx;
}

.filter-chip {
  padding: 14rpx 24rpx;
  color: #59625d;
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.filter-chip--active {
  color: #fff;
  background: #2f5d50;
  border-color: #2f5d50;
}

.goods-line {
  display: flex;
}

.goods-line__image {
  width: 108rpx;
  height: 108rpx;
  flex-shrink: 0;
  background: #eeebe3;
  border-radius: 14rpx;
}

.goods-line__body {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
}

.goods-line__name,
.goods-line__meta {
  display: block;
}

.goods-line__name {
  flex: 1;
  min-width: 0;
  color: #1f2522;
  font-size: 27rpx;
  font-weight: 800;
}

.goods-line__meta {
  margin-top: 8rpx;
  color: #8a928d;
  font-size: 22rpx;
}

.record-card__status {
  flex-shrink: 0;
  color: #2f5d50;
  font-size: 25rpx;
  font-weight: 900;
}

.record-card__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 18rpx;
}

.action-btn {
  min-width: 128rpx;
  height: 62rpx;
  padding: 0 24rpx;
  color: #2f5d50;
  background: #fff;
  border: 1rpx solid #d9d4ca;
  font-size: 24rpx;
  line-height: 62rpx;
}

.toolbar-btn::after,
.image-btn::after,
.mini-btn::after,
.save-btn::after,
.action-btn::after {
  border: none;
}
</style>
