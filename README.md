# 🐾 流浪动物救助与领养管理系统

> 毕业设计项目 — Vue 3 + Express + MySQL 全栈应用

## 文档导航

| 文档 | 适用场景 |
|------|----------|
| [`docs/快速启动指南.md`](docs/快速启动指南.md) | 目标电脑已安装好 Node.js、MySQL 等环境时，按步骤快速跑起项目 |
| [`docs/部署交付说明.md`](docs/部署交付说明.md) | 从当前电脑打包交付到另一台电脑运行时使用 |
| [`docs/项目架构说明.md`](docs/项目架构说明.md) | 理解前后端结构、接口、数据库和扩展方向 |
| [`docs/环境安装教程.md`](docs/环境安装教程.md) | 目标电脑缺少 Node.js、MySQL、Git、VS Code 时使用 |

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + Element Plus + Vite + Vue Router + Pinia + Axios |
| 后端 | Node.js + Express + MySQL2 + JWT + bcryptjs |
| 数据库 | MySQL 8.0 |

## 功能模块

### 前台（公众端）
- 🏠 首页展示（轮播图、公告、推荐动物）
- 🐱 动物浏览（分类筛选、搜索、详情）
- 📝 在线领养申请
- 🆘 救助求助提交
- 📖 科普文章阅读
- 👤 用户注册/登录

### 后台（管理员端）
- 📊 数据看板
- 🐾 动物管理（CRUD、状态变更）
- 📋 领养审核（批准/拒绝）
- 🆘 救助管理（受理/处理/关闭）
- 👥 用户管理（启用/禁用）
- 📢 公告/文章/轮播图管理
- 🏷️ 分类与品种管理

## 快速启动

### 1. 安装环境
参考 `docs/环境安装教程.md`，安装 Node.js、MySQL、Git、VS Code。

### 2. 初始化数据库
```bash
cd server
npm install
cp .env.example .env     # 然后编辑 .env，填入数据库密码和 JWT_SECRET
npm run init-db          # 自动建库、建表、写入管理员与初始数据（可重复执行）
```
> 也可直接导入 SQL（与上面二选一）：
> `mysql -u root -p --default-character-set=utf8mb4 < database/init.sql`
> （命令行导入务必带 `--default-character-set=utf8mb4`，否则中文乱码）
>
> 详细的目标电脑部署 / 打包交付步骤见 [`docs/部署交付说明.md`](docs/部署交付说明.md)。

### 3. 启动后端
```bash
cd server
npm install
npm run dev             # 开发模式（自动重启）
# 或
npm start               # 生产模式
```
后端运行在 http://localhost:3000

### 4. 启动前端
```bash
cd client
npm install
npm run dev
```
前端运行在 http://localhost:5173

### 5. 登录后台
- 前台：http://localhost:5173
- 后台：http://localhost:5173/admin
- 管理员账号：`admin` / `admin123`

## 项目结构

```
stray-animal-rescue/
├── client/          # 前端 Vue 3 项目
│   ├── src/
│   │   ├── layouts/ # 前台/后台布局
│   │   ├── router/  # 路由与权限守卫
│   │   ├── stores/  # Pinia 用户状态
│   │   ├── utils/   # Axios 请求封装
│   │   └── views/   # 前台与后台页面
│   └── package.json
│
├── server/          # 后端 Express 项目
│   ├── config/      # 配置
│   ├── controllers/ # 控制器
│   ├── middlewares/ # 中间件
│   ├── models/      # 数据模型
│   ├── routes/      # 路由
│   ├── scripts/     # 初始化脚本
│   ├── utils/       # 工具
│   ├── app.js       # 入口
│   └── package.json
│
├── database/        # 数据库脚本
│   └── init.sql
│
└── docs/            # 文档
```

## 核心 API 接口一览

| 模块 | 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|------|
| 认证 | POST | /api/auth/register | 注册 | 公开 |
| 认证 | POST | /api/auth/login | 登录 | 公开 |
| 认证 | GET | /api/auth/profile | 获取个人信息 | 登录 |
| 认证 | PUT | /api/auth/profile | 更新个人信息 | 登录 |
| 认证 | PUT | /api/auth/password | 修改密码 | 登录 |
| 动物 | GET | /api/animals | 动物列表 | 公开 |
| 动物 | GET | /api/animals/stats | 动物统计 | 公开 |
| 动物 | GET | /api/animals/:id | 动物详情 | 公开 |
| 动物 | POST | /api/animals | 录入动物 | 管理员 |
| 动物 | PUT | /api/animals/:id | 编辑动物 | 管理员 |
| 动物 | DELETE | /api/animals/:id | 删除动物 | 管理员 |
| 领养 | POST | /api/adoptions/apply | 提交申请 | 登录 |
| 领养 | GET | /api/adoptions/mine | 我的申请 | 登录 |
| 领养 | GET | /api/adoptions | 所有申请 | 管理员 |
| 领养 | PUT | /api/adoptions/:id/review | 审核申请 | 管理员 |
| 领养回访 | GET | /api/adoptions/:id/followups | 查看回访记录 | 登录/管理员 |
| 领养回访 | POST | /api/adoptions/:id/followups | 添加回访记录 | 管理员 |
| 领养回访 | DELETE | /api/adoptions/:id/followups/:fid | 删除回访记录 | 管理员 |
| 救助 | POST | /api/rescues | 提交求助 | 公开 |
| 救助 | GET | /api/rescues | 求助列表 | 管理员 |
| 救助 | GET | /api/rescues/:id | 求助详情 | 公开 |
| 救助 | PUT | /api/rescues/:id/status | 更新状态 | 管理员 |
| 内容 | GET | /api/content/announcements | 公告列表 | 公开 |
| 内容 | GET | /api/content/announcements/all | 公告后台列表 | 管理员 |
| 内容 | POST | /api/content/announcements | 创建公告 | 管理员 |
| 内容 | PUT/DELETE | /api/content/announcements/:id | 编辑/删除公告 | 管理员 |
| 内容 | GET | /api/content/articles | 文章列表 | 公开 |
| 内容 | GET | /api/content/articles/:id | 文章详情 | 公开 |
| 内容 | GET | /api/content/articles/all | 文章后台列表 | 管理员 |
| 内容 | POST | /api/content/articles | 创建文章 | 管理员 |
| 内容 | PUT/DELETE | /api/content/articles/:id | 编辑/删除文章 | 管理员 |
| 内容 | GET | /api/content/banners | 轮播图 | 公开 |
| 内容 | GET | /api/content/banners/all | 轮播图后台列表 | 管理员 |
| 内容 | POST | /api/content/banners | 创建轮播图 | 管理员 |
| 内容 | PUT/DELETE | /api/content/banners/:id | 编辑/删除轮播图 | 管理员 |
| 用户 | GET | /api/users | 用户列表 | 管理员 |
| 用户 | GET | /api/users/:id | 用户详情 | 管理员 |
| 用户 | PUT | /api/users/:id/status | 启用/禁用用户 | 管理员 |
| 分类 | GET | /api/categories | 分类列表 | 公开 |
| 分类 | GET | /api/categories/:id/breeds | 分类下品种 | 公开 |
| 分类 | GET | /api/categories/breeds/all | 全部品种 | 公开 |
| 分类 | POST | /api/categories | 创建分类 | 管理员 |
| 分类 | DELETE | /api/categories/:id | 删除分类 | 管理员 |
| 分类 | POST | /api/categories/breeds | 创建品种 | 管理员 |
| 分类 | DELETE | /api/categories/breeds/:id | 删除品种 | 管理员 |

> 详细结构请看 [`docs/项目架构说明.md`](docs/项目架构说明.md)。交付到另一台电脑时，请以 [`docs/部署交付说明.md`](docs/部署交付说明.md) 为准。

## 扩展方向

- [ ] ECharts 数据可视化大屏
- [ ] 地图集成（标记救助位置）
- [ ] 智能匹配推荐算法
- [x] 领养回访记录功能（已实现：后台录入回访、用户查看回访时间线）
- [ ] 微信小程序端
- [ ] 图片上传至 OSS/CDN
