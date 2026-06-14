<template>
  <router-view />
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Microsoft YaHei', sans-serif; }

/* 打印样式 - 仅打印小票区域 */
@media print {
  body * {
    visibility: hidden !important;
  }
  #receipt-content,
  #receipt-content *,
  .receipt,
  .receipt * {
    visibility: visible !important;
  }
  #receipt-content,
  .receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 300px;
  }
  /* 隐藏非打印元素 */
  .el-header, .el-aside, .el-main > *:not(#receipt-preview-overlay) {
    display: none !important;
  }
}
</style>
