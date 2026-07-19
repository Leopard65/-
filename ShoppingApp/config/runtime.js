const env = typeof process !== 'undefined' && process.env ? process.env : {}

const CLOUD_SPACES = {
  demo: {
    provider: 'aliyun',
    spaceId: 'mp-11f42428-64cb-465f-904b-84dbf494b9d3',
    // 仅在本地 H5 明确注入演示密钥时连接云空间；否则使用本地 mock。
    clientSecret: env.UNI_CLOUD_DEMO_CLIENT_SECRET || '',
    endpoint: 'https://api.next.bspapp.com'
  },
  dev: {
    provider: 'aliyun',
    spaceId: 'mp-11f42428-64cb-465f-904b-84dbf494b9d3',
    clientSecret: env.UNI_CLOUD_DEMO_CLIENT_SECRET || '',
    endpoint: 'https://api.next.bspapp.com'
  },
  prod: {
    provider: 'aliyun',
    spaceId: env.UNI_CLOUD_PROD_SPACE_ID || '',
    clientSecret: env.UNI_CLOUD_PROD_CLIENT_SECRET || '',
    endpoint: 'https://api.next.bspapp.com'
  }
}

const runtimeEnv = env.VUE_APP_RUNTIME_ENV || env.UNI_APP_RUNTIME_ENV || 'demo'

export const runtimeConfig = {
  appName: '薪超购物',
  version: '0.9.1',
  runtimeEnv,
  cloudSpace: CLOUD_SPACES[runtimeEnv] || CLOUD_SPACES.demo,
  releaseGuard: {
    prodCloudConfigured: Boolean(CLOUD_SPACES.prod.spaceId && CLOUD_SPACES.prod.clientSecret),
    demoSecretForLocalPreview: Boolean(CLOUD_SPACES.demo.clientSecret),
    canPublishProd: runtimeEnv !== 'prod' || Boolean(CLOUD_SPACES.prod.spaceId && CLOUD_SPACES.prod.clientSecret)
  },
  demoAccount: {
    username: '13800138000',
    mobile: '13800138000',
    password: '123456',
    nickname: '薪超体验官',
    adminRoles: ['admin', 'operator']
  },
  features: {
    demoMode: runtimeEnv !== 'prod',
    mockPayment: true,
    mockLogistics: true,
    mockPush: true,
    diagnostics: true
  },
  legal: {
    agreementVersion: '2026.06.24',
    privacyVersion: '2026.06.24'
  },
  releaseChecks: [
    'App 真机运行',
    '微信小程序编译',
    'uniCloud 服务空间关联',
    '云函数上传',
    '数据库 schema 上传',
    '演示数据初始化',
    '体验账号登录',
    '订单与售后闭环',
    '账号安全与注销申请',
    '隐私授权设置',
    '运行诊断无阻断项',
    '运营中心商品券消息维护',
    '优惠券领取使用恢复闭环',
    '运营操作日志',
    '商品与SKU编辑',
    '运营报表与发布回归中心',
    '云存储图片上传',
    '订单幂等与补偿'
  ]
}

export const shouldUseManualDemoCloud = () =>
  runtimeConfig.features.demoMode &&
  Boolean(runtimeConfig.cloudSpace.clientSecret) &&
  env.UNI_PLATFORM === 'h5' &&
  env.NODE_ENV === 'development'

export const shouldPreferLocalMock = () =>
  runtimeConfig.features.demoMode &&
  !runtimeConfig.cloudSpace.clientSecret &&
  env.UNI_PLATFORM === 'h5' &&
  env.NODE_ENV === 'development'

export default runtimeConfig
