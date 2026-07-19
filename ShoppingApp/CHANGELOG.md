# 变更日志 CHANGELOG

本文件记录「薪超购物 App」的所有实质性改动。每次代码/配置/云函数变更都应在此追加一条，最新日期在最上方。

格式约定：按日期分组，每条标注 `[等级-编号] 简述`，并列出涉及的文件与改动要点。等级沿用代码审查清单 P0（阻断）/P1（严重）/P2（一般）/P3（优化）。

---

## 2026-06-28

### [P1-23] 购物车 SKU 有效性与库存一致性加固
- `uniCloud-aliyun/cloudfunctions/cart-center/index.js`：`addToCart` 不再把不存在/不匹配/停用的 SKU 当作默认商品加入购物车；`getCartList` 回查 `goods_sku` 并把规格删除、规格停用、规格售罄标记为失效；`updateCartQuantity` 更新前重新校验商品和 SKU 当前库存。
- `mock/service.js`：本地兜底服务同步云端规则，避免 mock 下错误 SKU 被自动替换成首个 SKU，保证真机断云或云繁忙时行为一致。
- `pages/product/detail.vue`：价格与库存改用空值合并，SKU 库存为 `0` 时不再回退到商品总库存；加购和立即购买会阻止售罄规格。

### 真机回归记录
- 设备：荣耀 NTH-AN00（`AN2FVB1906015946`）。
- 已实测：首页、分类、商品详情、规格面板、加购、购物车、订单确认、模拟收银台、支付结果、订单列表状态筛选、订单详情、运行诊断、运营中心订单模块。
- 结果：核心链路可跑通；订单列表进入详情未复现“订单不存在/白屏”；诊断页能识别体验账号已登录并具备运营权限。当前云端偶发 `云数据库资源暂时繁忙` 时页面会展示本地兜底，不白屏。

## 2026-06-26

### [P2-13] 购物车「店铺分组 + 失效区」（精简演示版）
本应用无店铺数据模型（单店自营），分组采用统一虚拟店头「🏪 薪超优选·自营」。
- `uniCloud-aliyun/cloudfunctions/cart-center/index.js`：`getCartList` 回查 `goods` 表，给每条记录打 `disabled` + `invalid_reason`（下架 `status!==1` / 售罄 `goods.stock<=0` / 已删除查不到），仅运行时计算、不写回 cart 表、不同步价格快照。
- `mock/service.js`：`getCartList` 做等价判定，保证断网/回落体验一致。
- `stores/cart.js`：新增 `validList` / `invalidList` / `hasInvalid` getter 与 `removeInvalid` action（原有 `checked*` getter 早已 filter `disabled`，无需改）。
- `pages/cart/cart.vue`：模板拆「店头有效区（整组全选，复用 cart-item）」+「失效区（灰显 / 无勾选 / 显原因 / 清空失效）」。
- schema 未改。演示数据：`goods-cushion`（库存0→售罄）、`goods-scarf`（status0→下架）。

### [P3-21] goods-center 商品查询改为数据库查询
- `uniCloud-aliyun/cloudfunctions/goods-center/index.js`：`getGoodsList` 废弃「全表 `limit(1000)` 拉回内存过滤」，改为 `db.command` and/or + `db.RegExp`（name/subtitle/brand 模糊）+ 价格 `gte`/`lte` + `orderBy` + `skip`/`limit` 分页 + `count()`；删除 `sortGoods`/`paginate`，新增 `applySort`。

### [P3-19] 商品列表页价格/品牌筛选 UI
- `pages/product/list.vue`：新增「筛选」折叠面板（价格区间 min/max + 品牌单选 chips），`query` 增加 `brand`/`minPrice`/`maxPrice`；品牌选项在首次无筛选加载时从结果采集（`brandOptions`）。后端 goods-center 与 mock 均已支持这些参数。

### [P3-20] 废弃 API 替换 chooseImage → chooseMedia
- `pages/aftersale/apply.vue`、`pages/evaluate/evaluate.vue`、`components/admin/AdminGoods.vue`：三处由 `uni.chooseImage` 改为 `uni.chooseMedia({ mediaType:['image'] })`，成功回调改读 `res.tempFiles[].tempFilePath`。

### [P3-16] 图标符号统一为单色（轻量方案，不引入字体文件）
- `components/uni-icons/uni-icons.vue`：将仅有的 2 个彩色 emoji（`bell` 🔔→⊚、`trash` 🗑→⌫）替换为单色字形，全集现为单色、跨端一致。

### [P3-22] 补全 manifest Android 权限
- `manifest.json`：`app-plus.distribute.android.permissions` 由空补为 INTERNET / ACCESS_NETWORK_STATE / ACCESS_WIFI_STATE / CAMERA / READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE。

### 线上环境验证（无代码改动，过程记录）
- 通过 Node 签名脚本（spaceId + clientSecret + endpoint `api.next.bspapp.com`，匿名授权拿 token → `serverless.function.runtime.invoke`）直连线上 uniCloud，无需 HBuilderX/真机即完成验证。
- 结论：线上连接链路全通；线上库有完整数据（6 个上架商品 + 售罄抱枕 + 下架围巾）；体验账号 `13800138000` 登录→加购→查购物车全链路跑通；**`cart-center` 线上已是新版**（`getCartList` 返回含 `disabled`/`invalid_reason`），P2-13 失效区线上生效。
- 注意：该免费空间存在间歇性 `PrePayResourceExhausted`（资源限流），重试可过；真机上表现为偶发失败回落 mock。

> 本批需在 HBuilderX 重新上传的云函数：`cart-center`、`goods-center`（schema 未改）。

---

## 2026-06-25 及更早（首轮代码审查整改）

一次完整代码审查后分批落地的修复（详见各云函数/页面源码）：

- **[P0-2]** 登录不再恒为管理员：`api/client.js` 去掉 loginBySms 的 preferMock；`mock/service.js` 新增 `resolveMockLoginUser`，仅体验账号 `13800138000` 映射管理员。
- **[P1-3]** `admin-center` 诊断接口对非管理员脱敏（隐藏集合计数/体验账号明细/authSecret）。
- **[P1-4]** `init-data` 鉴权：冷启动可匿名 seed，已初始化后需管理员；`resetDemo` 始终需管理员。
- **[P1-5]** `config/runtime.js` clientSecret 改为环境变量可注入（`UNI_CLOUD_DEMO_CLIENT_SECRET` / `UNI_CLOUD_PROD_*`）。
- **[P1-6]** 收口越权：移除用户侧 shipOrder/auditAfterSale/completeAfterSale，发货/审核/完成退款仅 `admin-center`；待发货按钮改「申请退款」；aftersale/list 用户端只剩「取消申请」。
- **[P1-7]** 超时订单惰性取消：`order-center` getOrderList/getOrderDetail + mock 的 `expireMockPendingOrders`。
- **[P1-8]** 售后拒绝/取消恢复订单原状态：`after_sale` 记 `prev_order_status`；`admin-center.auditAfterSale` 拒绝分支 + `service-center.cancelAfterSale` + mock + schema。
- **[P2-9]** `pages/order/detail.vue` `meta?.label` 防御。
- **[P2-10]** `pages/product/detail.vue` 加「已售 + 评价简短展示」。
- **[P2-11]** `pages/order/confirm.vue` 支付方式选择并透传收银台（`order-center.createOrder` 落库 `pay_method`）。
- **[P2-12]** `pages/order/list.vue` 加「退款/售后」Tab（跳 aftersale/list）。
- **[P2-14]** `user-center` 出口返回结构统一为 `{code,msg,data}`（`normalizeUserResult`；不动 xc-auth 内部 verifyToken；`stores/user.js` + privacy.vue + mock 同步）；附带修复 `xc-auth.sendSmsCode` 的 `ok({code:'123456'})` 字段冲突 bug。
- **[P2-15]** 登录引导：设置密码（xc-auth/user-center `sanitizeUser` 加 `hasPassword`）+ 微信绑定手机号（api/client 暴露 setPassword/bindMobile；mock 兜底；login.vue 串联，均可跳过）。
- **[P3-17]** `pages/order/list.vue` 上拉分页。
- **[P3-18]** `pages/order/pay.vue` 收银台倒计时 + 超时禁用。

### 已知遗留
- **[P0-1]** 微信小程序 `manifest.mp-weixin.appid` 为空 —— 属业务决策（是否提审小程序），未做。

### 关键约束（改动时务必遵守）
- 不能改 `xc-auth.verifyToken` 的顶层返回结构（order/cart/service/address/admin-center 内部都直接依赖 `tokenResult.uid/userInfo/code`）。
- 改了云函数/schema 必须在 HBuilderX 重新上传才在云端生效；纯前端 + mock 改动可本机演示。
- 体验账号：`13800138000` / `123456`（admin+operator）。
