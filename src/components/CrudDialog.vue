<template>
  <el-dialog :title="title" v-model="visible" :width="width" @close="handleClose">
    <el-form ref="formRef" :model="form" :rules="rules" :label-width="labelWidth">
      <slot />
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  title: { type: String, default: '' },
  width: { type: String, default: '600px' },
  labelWidth: { type: String, default: '100px' },
  rules: { type: Object, default: () => ({}) },
  submitFn: { type: Function, required: true }
})

const emit = defineEmits(['success', 'close'])

const formRef = ref(null)
const visible = ref(false)
const submitting = ref(false)
const form = ref({})

const open = (data) => {
  form.value = data ? { ...data } : {}
  visible.value = true
}

const handleClose = () => {
  formRef.value?.resetFields()
  emit('close')
}

const handleSubmit = async () => {
  if (formRef.value) {
    try {
      await formRef.value.validate()
    } catch {
      return
    }
  }

  submitting.value = true
  try {
    await props.submitFn(form.value)
    visible.value = false
    ElMessage.success('操作成功')
    emit('success')
  } catch (e) {
    // 错误已由拦截器处理
  } finally {
    submitting.value = false
  }
}

defineExpose({ open, form })
</script>
