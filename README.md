# 🐾 流浪动物救助与领养管理系统

> 毕业设计项目 — Vue 3 + Express + MySQL 全栈应用

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
│   │   ├── layouts/ # 布局组件（前台/后台）
│   │   ├── router/  # 路由
│   │   ├── stores/  # 状态管理（Pinia）
│   │   ├── utils/   # 工具函数（Axios 封装等）
│   │   └── views/   # 页面组件
│   └── package.json
│
├── server/          # 后端 Express 项目
│   ├── config/      # 配置
│   ├── controllers/ # 控制器
│   ├── middlewares/ # 中间件
│   ├── models/      # 数据模型
│   ├── routes/      # 路由
│   ├── utils/       # 工具
│   ├── app.js       # 入口
│   └── package.json
│
├── database/        # 数据库脚本
│   └── init.sql
│
└── docs/            # 文档
```

## API 接口一览

| 模块 | 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|------|
| 认证 | POST | /api/auth/register | 注册 | 公开 |
| 认证 | POST | /api/auth/login | 登录 | 公开 |
| 认证 | GET | /api/auth/profile | 获取个人信息 | 登录 |
| 动物 | GET | /api/animals | 动物列表 | 公开 |
| 动物 | GET | /api/animals/:id | 动物详情 | 公开 |
| 动物 | POST | /api/animals | 录入动物 | 管理员 |
| 动物 | PUT | /api/animals/:id | 编辑动物 | 管理员 |
| 动物 | DELETE | /api/animals/:id | 删除动物 | 管理员 |
| 领养 | POST | /api/adoptions/apply | 提交申请 | 登录 |
| 领养 | GET | /api/adoptions/mine | 我的申请 | 登录 |
| 领养 | GET | /api/adoptions | 所有申请 | 管理员 |
| 领养 | PUT | /api/adoptions/:id/review | 审核申请 | 管理员 |
| 救助 | POST | /api/rescues | 提交求助 | 公开 |
| 救助 | GET | /api/rescues | 求助列表 | 管理员 |
| 救助 | PUT | /api/rescues/:id/status | 更新状态 | 管理员 |
| 内容 | GET | /api/content/announcements | 公告列表 | 公开 |
| 内容 | GET | /api/content/articles | 文章列表 | 公开 |
| 内容 | GET | /api/content/banners | 轮播图 | 公开 |
| 用户 | GET | /api/users | 用户列表 | 管理员 |
| 分类 | GET | /api/categories | 分类列表 | 公开 |

## 扩展方向

- [ ] ECharts 数据可视化大屏
- [ ] 地图集成（标记救助位置）
- [ ] 智能匹配推荐算法
- [x] 领养回访记录功能（已实现：后台录入回访、用户查看回访时间线）
- [ ] 微信小程序端
- [ ] 图片上传至 OSS/CDN
