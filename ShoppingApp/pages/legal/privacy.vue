<script setup>
const sections = [
  {
    title: '信息收集',
    body: '我们会收集账号手机号、昵称、收货地址、订单、购物车、收藏、优惠券、评价和售后记录，用于完成登录、交易履约、售后服务和体验改进。'
  },
  {
    title: '设备与网络',
    body: 'App 会使用网络访问权限连接 uniCloud 服务。相机、定位、相册等能力只会在上传图片、选择地址或后续明确功能中按需触发。'
  },
  {
    title: '数据使用',
    body: '当前演示环境不接入真实支付、真实物流和真实推送。模拟支付与模拟物流仅用于业务流程演示，不会发起真实扣款或物流下单。'
  },
  {
    title: '数据保护',
    body: '登录 token 仅保存在本机与云端校验链路中。演示数据初始化只处理固定 demo 数据，不会主动清理你的真实用户数据。'
  },
  {
    title: '用户权利',
    body: '你可以在设置页退出登录、清理本地演示缓存、管理隐私授权，并提交账号注销申请。注销采用软禁用方式，订单和售后凭证会继续保留。'
  }
]
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__title">隐私政策</text>
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
