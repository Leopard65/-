<template>
  <div class="crud-table">
    <!-- 搜索栏 -->
    <div v-if="$slots.search" class="crud-table__search">
      <slot name="search" />
      <el-button type="primary" @click="$emit('search')">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
      <el-button @click="$emit('reset')">
        <el-icon><Refresh /></el-icon>
        重置
      </el-button>
    </div>

    <!-- 操作栏 -->
    <div class="crud-table__actions">
      <div class="crud-table__primary-actions">
        <el-button type="primary" @click="$emit('add')">
          <el-icon><Plus /></el-icon>
          新增
        </el-button>
        <slot name="actions" />
      </div>
      <slot name="toolbar" />
    </div>

    <!-- 数据表格 -->
    <el-table class="crud-table__table" :data="data" v-loading="loading" border stripe @selection-change="handleSelectionChange">
      <el-table-column v-if="showSelection" type="selection" width="55" />
      <slot />
      <el-table-column v-if="showActions" label="操作" :width="actionWidth" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="$emit('edit', row)">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button size="small" type="danger" link @click="$emit('delete', row)">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
          <slot name="row-actions" :row="row" />
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div v-if="pagination" class="crud-table__pager">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="currentPageSize"
        :page-sizes="pageSizes"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="$emit('size-change', $event)"
        @current-change="$emit('page-change', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plus, Search, Refresh, Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  pagination: { type: Object, default: null },
  showActions: { type: Boolean, default: true },
  showSelection: { type: Boolean, default: false },
  actionWidth: { type: String, default: '160' },
  pageSizes: { type: Array, default: () => [10, 20, 50, 100] }
})

const emit = defineEmits(['search', 'reset', 'add', 'edit', 'delete', 'page-change', 'size-change', 'selection-change'])

const currentPage = computed({
  get: () => props.pagination?.page || 1,
  set: (val) => emit('page-change', val)
})

const currentPageSize = computed({
  get: () => props.pagination?.pageSize || 20,
  set: (val) => emit('size-change', val)
})

const handleSelectionChange = (selection) => {
  emit('selection-change', selection)
}
</script>

<style scoped>
.crud-table {
  min-width: 0;
}

.crud-table__search,
.crud-table__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.crud-table__actions {
  justify-content: space-between;
}

.crud-table__primary-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.crud-table__table {
  width: 100%;
}

.crud-table__pager {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-4);
}

@media (max-width: 640px) {
  .crud-table__actions,
  .crud-table__pager {
    justify-content: flex-start;
  }
}
</style>
