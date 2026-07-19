# 薪超购物 App

薪超购物是基于 `uni-app + Vue3 Composition API + Pinia + uniCloud` 的 App 优先购物应用。当前版本：`0.9.1`。

## 当前进度

- 用户端：首页、分类、搜索、商品列表、商品详情、登录/注册、购物车、订单确认、模拟支付、订单、评价、售后、地址、收藏、优惠券、消息已完成。
- 云端演示：`init-data` 支持 `seed / status / resetDemo`，体验账号为 `13800138000 / 123456`。
- 运营中心：概览、运营报表、订单治理、售后审核、商品/SKU、优惠券、消息、操作日志已完成。
- 发布底座：运行配置、诊断页、账号安全、隐私设置、协议/隐私政策、云端失败兜底已完成。
- 暂不接真实支付、真实物流、真实推送，继续使用模拟适配层。

## 0.9.1 更新

- 运行诊断拆分为默认轻量诊断和手动深度诊断，降低免费云数据库资源繁忙时的白屏/失败概率。
- `api/client.js` 为每次接口结果附加 `__source / __meta`，诊断页可明确显示“云端诊断 / 本地兜底诊断 / 云端失败”。
- `admin-center.getDeepHealthCheck` 新增深度检查接口，默认 `getHealthCheck` 只读取关键集合。
- 诊断页重写为正常中文文案，并新增来源提示组件，展示云端失败原因和重试入口。
- Android 云打包已切到自定义 keystore 参数；当前 HBuilderX CLI 长轮询未下载 APK，需继续观察 DCloud 云打包结果或在 HBuilderX 图形界面完成云端证书打包。

## 0.9.0 更新

- 新增 `admin-center.getOpsReport`，按订单、商品、SKU、优惠券、售后、消息、操作日志生成运营报表。
- 运营中心新增 `报表` Tab，展示支付收入、支付订单、客单价、库存风险、近 7 天订单趋势、销售 Top 商品和发布回归项。
- `admin-center` 对诊断与报表读取增加短重试和节流，降低免费云空间资源繁忙概率。
- 诊断页云端优先，云端资源繁忙时允许回落本地诊断，不再只显示失败卡片。
- mock 层新增同构报表计算，云端不可用时仍能展示本机演示数据。

## 项目结构

```text
api/                  前端接口入口，页面禁止直接调用 uniCloud.callFunction
components/           通用组件与运营中心子组件
composables/          组合式逻辑
config/runtime.js     运行配置、云空间、演示账号、能力开关
constants/            路由、状态码、订单/售后状态
mock/                 本地演示数据和 mock 服务
pages/                页面
stores/               Pinia 状态
uniCloud-aliyun/      云函数、公共模块、数据库 schema
utils/                工具函数
```

## 运行方式

1. 用 HBuilderX 导入 `F:\xinchaoapp\ShoppingApp`。
2. 右键 `uniCloud-aliyun` 关联阿里云服务空间。
3. Web 预览：运行到浏览器即可，本地使用 `localhost`，不需要域名。
4. App 真机：运行到手机或模拟器。
5. 微信小程序：运行到微信开发者工具。

## 云端初始化

入口：`我的 -> 云端初始化`。

- `seed`：幂等写入演示数据。
- `status`：查看演示数据数量。
- `resetDemo`：只清理固定 demo ID 前缀数据，不动真实用户数据。

## 运营中心

入口：`我的 -> 运营中心`。

- `概览`：在售商品、订单、售后、可用券、消息、用户统计。
- `报表`：收入、订单趋势、销售排行、库存风险、优惠券投放、服务待办、数据表读取和发布回归项。
- `订单`：按状态筛选，可模拟发货、编辑物流、添加运营备注。
- `售后`：按状态筛选，可审核、拒绝、完成退款和添加备注。
- `商品`：新增/编辑商品，维护 SKU、上下架、库存和草稿删除。
- `优惠券`：新增/编辑/启停，配置发放总量和每人限领。
- `消息`：发布/编辑系统、活动、订单消息。
- `日志`：查看运营动作摘要。

## 已验证

- 2026-06-25 `0.9.0`：
  - 所有云函数 `index.js` 和关键前端 JS 通过 `node --check`。
  - `pages.json`、`manifest.json`、所有数据库 schema 可解析。
  - HBuilderX `launch mp-weixin --compile true` 编译成功。
  - HBuilderX `publish app-android --type appResource` 编译成功。
  - 云函数 `admin-center` 上传成功。
  - 荣耀 NTH-AN00 真机：首页、我的、运行诊断、运营中心概览、运营报表可打开。
  - 运行诊断在云数据库资源繁忙时可回落本地诊断。
- 2026-06-25 `0.9.1`：
  - `api/client.js`、`mock/service.js`、`admin-center` 通过 `node --check`。
  - `pages.json`、`manifest.json`、数据库 schema 可解析。
  - HBuilderX `launch mp-weixin --compile true` 编译成功。
  - HBuilderX `publish app-android --type appResource` 编译成功。
  - 荣耀 NTH-AN00 真机：首页、我的、运行诊断、轻量诊断、深度诊断均可打开。
  - Android APK CLI 云打包已尝试使用自定义测试 keystore：`androidpacktype=0`、包名 `com.xinchao.shopping`；截至本次记录未在项目或 HBuilderX 缓存目录发现 APK 产物。

## 发布前检查

- App 真机：首页、Tab、详情、登录、购物车、下单支付、订单、售后、运营中心、运行诊断。
- 小程序：`mp-weixin` 编译成功，不缺页面、组件、静态资源。
- 云端：核心 schema、`xc-auth`、`admin-center`、`order-center`、`service-center`、`init-data` 已上传。
- 账号：体验账号 `13800138000 / 123456` 可登录并具备运营权限。
- 异常：云端失败、token 过期、资源繁忙、空数据时页面不白屏。

## npm H5 预览

项目源码位于仓库根目录而不是默认的 `src` 目录，npm 脚本会通过 `scripts/run-uni.mjs` 自动设置 `UNI_INPUT_DIR`：

```powershell
npm run dev:h5 -- --host 127.0.0.1 --port 5188
npm run build:h5
```

未配置云端凭据时，H5 会使用本地 mock 演示数据。需要连接演示 uniCloud 空间时，仅通过环境变量 `UNI_CLOUD_DEMO_CLIENT_SECRET` 注入密钥，不要把密钥写入源码或提交到版本管理。

历史版本中曾出现硬编码演示密钥。删除源码中的值不会撤销已泄露凭据，必须在阿里云/uniCloud 控制台轮换该密钥。
