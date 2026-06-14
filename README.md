# 超市管理系统

基于 **Vue 3 + Express + SQLite** 的全栈超市管理系统，覆盖商品、分类、销售收银、进货、会员、供应商、退换货、库存预警、报表统计、操作日志等模块。用于毕业设计展示。

> 详细使用教程见 [使用说明文档.md](./使用说明文档.md)；答辩讲解材料见 [答辩说明.md](./答辩说明.md)。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 · Vite 5 · Element Plus · Pinia · Vue Router · ECharts · xlsx |
| 后端 | Node.js · Express 5 · better-sqlite3 · JWT · bcryptjs · multer |
| 数据库 | SQLite（首次启动自动建表 + 种子数据，文件 `server/supermarket.db`） |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. （可选）生成约 30 天演示数据：销售/进货/退货/会员积分/低库存预警
#    ⚠️ 会重置交易类数据，建议在后端未启动时运行
npm run seed:demo

# 3. 启动后端（端口 3000）
npm run server

# 4. 启动前端（端口 5173，已配置 /api 与 /uploads 代理）
npm run dev
#    打开 http://localhost:5173

# 或：一键同时启动前后端
npm start

# 生产构建
npm run build
```

**默认管理员账号**：`admin` / `admin123`

> 端口 5173 被占用时 Vite 会自动顺延（5174…），以终端输出为准。

## npm 脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动前端开发服务器（Vite） |
| `npm run server` | 启动后端 API 服务（Express, 3000） |
| `npm start` | 同时启动前后端（concurrently） |
| `npm run build` | 前端生产构建到 `dist/` |
| `npm run seed:demo` | 生成演示数据（重置交易类数据后写入约 30 天历史） |

## 功能模块

- **登录认证**：JWT + bcrypt，路由守卫 + 角色菜单
- **仪表盘**：今日销售额/订单、商品/会员总数、库存预警、热销 TOP5、近 7 天趋势
- **商品管理**：增删改查、搜索、分类筛选、图片上传、软删除/恢复、上下架、导出 Excel
- **分类管理**：增删改，删除前校验"分类下有商品则禁止"
- **销售收银**：商品搜索 / **扫码枪输入** / 购物车 / 会员折扣 / 库存校验 / 结算扣库存 / 打印小票
- **进货管理**：选供应商 + 多商品入库，加库存、更新成本价（事务）
- **会员管理**：增删改、积分、累计消费、等级自动升级
- **供应商管理**：增删改、分页
- **退换货**：按销售单退货、退货数量校验、审核通过/拒绝、恢复库存、回退积分
- **库存预警**：低于最低库存的商品列表 +「去进货」联动
- **报表统计**：日销售（含退款/净额）、商品排行、分类销售、支付方式、库存价值、**净毛利润（已扣退货）** + ECharts 图表
- **操作日志**：关键操作落库，仅管理员可见

## 项目结构

```
supermarket-system/
├── server/                 # 后端
│   ├── index.js            # 入口，挂载所有 API（端口 3000）
│   ├── db.js               # SQLite 建表 + 种子数据
│   ├── config.js           # 共享配置（JWT/端口等）
│   ├── seed-demo.js        # 演示数据生成脚本
│   ├── middleware/         # auth（JWT/角色）、upload（图片上传）
│   ├── routes/             # 各业务模块路由
│   └── utils/logger.js     # 操作日志
├── src/                    # 前端
│   ├── api/                # 按业务域拆分的 API 模块 + axios 实例
│   ├── stores/             # Pinia 状态（用户）
│   ├── components/         # 通用组件（CrudTable / CrudDialog / 布局）
│   ├── views/              # 各页面
│   ├── router/ utils/      # 路由、工具（导出、小票）
│   └── main.js
├── 使用说明文档.md          # 面向使用者的操作手册
├── 答辩说明.md             # 面向答辩的讲解材料
└── vite.config.js          # 别名 @ + /api、/uploads 代理
```

## 说明

- 数据库、`uploads/`、`dist/`、`node_modules/` 均已在 `.gitignore` 中，不纳入版本控制。
- 报表中的销售/利润均为**净额**（已扣除审核通过的退货），日报表额外给出毛销售额、退款与净销售额。
