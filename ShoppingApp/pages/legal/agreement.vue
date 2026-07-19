<script setup>
const sections = [
  {
    title: '服务范围',
    body: '薪超购物提供商品浏览、购物车、订单、优惠券、收藏、评价、消息和售后等购物服务。当前版本为演示环境，支付、物流和推送均为模拟能力。'
  },
  {
    title: '账号使用',
    body: '你应妥善保管账号与密码。体验账号用于演示和验收，不应承载真实交易资金、真实物流或敏感个人信息。普通账号可修改密码并提交注销申请。'
  },
  {
    title: '交易规则',
    body: '商品价格、库存、优惠金额、订单状态和售后状态以云端接口校验结果为准。模拟支付成功不代表发生真实扣款。'
  },
  {
    title: '售后服务',
    body: '当前售后审核和退款完成为演示处理。正式上线时，相关能力应迁移到商家管理后台或运营系统。'
  },
  {
    title: '服务调整',
    body: '我们会根据开发进度持续调整功能、接口和演示数据。重大变更会在版本说明或相关页面中提示。'
  }
]
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__title">用户协议</text>
      <text class="hero__desc">更新日期：2026-06-24</text>
    </view>

    <view class="article">
      <view v-for="item in sections" :key="item.title" class="section">
        <text class="section__title">{{ item.title }}</text>
        <text class="section__body">{{ item.body }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 28rpx 24rpx 72rpx;
  background: #f7f5f0;
  box-sizing: border-box;
}

.hero,
.article {
  background: #fff;
  border: 1rpx solid #e7e3dc;
  border-radius: 22rpx;
}

.hero {
  padding: 30rpx 26rpx;
}

.hero__title,
.hero__desc,
.section__title,
.section__body {
  display: block;
}

.hero__title {
  color: #1f2522;
  font-size: 38rpx;
  font-weight: 900;
}

.hero__desc {
  margin-top: 10rpx;
  color: #8a928d;
  font-size: 23rpx;
}

.article {
  margin-top: 22rpx;
  padding: 6rpx 26rpx 26rpx;
}

.section {
  padding-top: 24rpx;
}

.section__title {
  color: #2f5d50;
  font-size: 29rpx;
  font-weight: 900;
}

.section__body {
  margin-top: 12rpx;
  color: #59625d;
  font-size: 26rpx;
  line-height: 1.75;
}
</style>
