<template>
  <el-dialog :title="title" v-model="visible" :width="width" @close="handleClose" :close-on-click-modal="false">
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
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  title: { type: String, default: '' },
  width: { type: String, default: '600px' },
  labelWidth: { type: String, default: '100px' },
  rules: { type: Object, default: () => ({}) },
  submitFn: { type: Function, required: true },
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'success', 'close'])

const formRef = ref(null)
const submitting = ref(false)
const form = ref({})

// 弹窗显隐由内部 ref 驱动：调用方通过 ref 调用 open() 即可打开，
// 无需在父组件绑定 v-model；同时兼容父组件传入 v-model 的用法。
const visible = ref(props.modelValue)
watch(() => props.modelValue, (v) => { visible.value = v })
watch(visible, (v) => { if (v !== props.modelValue) emit('update:modelValue', v) })

// 打开弹窗
// 直接复用调用方传入的对象（调用方已传 {...row} 副本），使插槽内 v-model、
// 表单校验 :model 与 submitFn 操作同一对象，避免编辑值丢失。
const open = (data) => {
  form.value = data || {}
  visible.value = true
}

// 关闭弹窗
const handleClose = () => {
  formRef.value?.resetFields()
  emit('close')
}

// 提交表单
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

// 暴露方法和属性
defineExpose({ open, form, formRef })
</script>
