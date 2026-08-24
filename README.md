# LifeOS — 愿此身，行至山海

> 轻幻想 × 未来科技 × 温暖生活 —— 你的人生操作系统

**阶段 1：PC 端项目骨架（MySQL 版）**。前后端分离，包含完整的注册/登录/登出、JWT 双 token 认证、资料创建（自动生成生命属性 / 房间 / AI 同伴）与首页展示。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 18 + TypeScript(strict) + Vite 5 + TailwindCSS 3 + React Router 6 + react-hook-form + zod + axios |
| 后端 | Node.js + Express 4 + TypeScript(strict) + express-validator |
| 数据库 | MySQL 8 + Prisma ORM（Prisma 引擎内置 MySQL 驱动，无需额外安装 mysql2 包） |
| 认证 | JWT：access token 15 分钟 + refresh token 7 天（每次刷新轮换，落库 Session 表） |

## 目录结构

```
LifeOS
├── backend/                 # Express + Prisma 后端
│   ├── prisma/
│   │   ├── schema.prisma    # 7 个数据模型（User/UserProfile/LifeAssessment/LifeAttribute/Room/Companion/Session）
│   │   └── migrations/      # 初始迁移文件
│   ├── src/
│   │   ├── config/env.ts    # 环境变量（dotenv）
│   │   ├── lib/             # prisma 单例 / jwt 工具 / 统一响应 / 双 token 签发
│   │   ├── middleware/      # requireAuth 认证 / express-validator 校验 / 统一错误处理
│   │   ├── validators/      # 输入校验（含头像风格、偏好标签白名单）
│   │   ├── controllers/     # auth / profile 控制器
│   │   ├── routes/          # /api/auth、/api/profile 路由
│   │   ├── app.ts           # Express 应用
│   │   └── index.ts         # 入口（优雅退出）
│   └── .env / .env.example
├── frontend/                # Vite + React 前端
│   └── src/
│       ├── lib/             # types / axios 封装（401 自动刷新）/ 风格与标签常量
│       ├── context/         # AuthContext（登录态 + 资料状态）
│       ├── components/      # 路由守卫 / Logo / 登录卡片外壳
│       └── pages/           # Register / Login / ProfileSetup / Home 四个页面
├── package.json             # npm workspaces + concurrently 一键启动
├── pnpm-workspace.yaml      # pnpm 兼容
└── README.md
```

## 快速开始

### 1. 环境要求

- Node.js ≥ 20（已在 Node 24 验证）
- MySQL 8.x（本地或远程均可）

### 2. 创建数据库

```sql
CREATE DATABASE lifeos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 配置环境变量

```bash
cp backend/.env.example backend/.env   # 然后编辑 backend/.env
```

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `DATABASE_URL` | MySQL 连接串 | `mysql://root:你的密码@localhost:3306/lifeos` |
| `JWT_SECRET` | access token 签名密钥 | 生产环境务必换成随机强密钥 |
| `REFRESH_SECRET` | refresh token 签名密钥 | 同上 |
| `PORT` | 后端端口 | `4000` |
| `CLIENT_URL` | 前端地址（CORS 白名单） | `http://localhost:5173` |

> 若修改 `PORT`，需同步修改 `frontend/vite.config.ts` 中代理的 target。

### 4. 安装依赖（仓库根目录）

```bash
npm install     # 或 pnpm install（pnpm-workspace.yaml 已就绪）
```

### 5. 执行数据库迁移（首次运行必须）

```bash
npm run db:migrate   # 等价于 cd backend && npx prisma migrate dev
```

### 6. 启动（一条命令同时启动 AI 服务 + 前后端）

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:4000（健康检查 `/api/health`）
- AI 服务：http://localhost:8000（健康检查 `/api/ai/health`，由 `npm run dev:ai` 自动拉起；若端口已有运行中的 AI 服务则跳过，不会重复启动）

其他常用脚本（根目录）：`npm run dev:ai` / `npm run dev:backend` / `npm run dev:frontend` / `npm run build` / `npm run typecheck` / `npm run db:studio`（Prisma Studio 可视化数据）。

## 使用流程

1. **注册** `/register`：邮箱 + 密码（≥6 位），注册成功即自动登录。
2. **强制资料页** `/profile-setup`：登录后未创建资料时访问任何页面都会被强制引导到这里。
3. **提交资料**：昵称 + 5 种头像风格（现实/二次元/未来/奇幻/极简）+ 偏好标签多选（🌱成长 🧭探索 ✨创造 🏠生活 💞关系）。提交后数据库自动生成 **UserProfile + LifeAttribute（七维全 50）+ Room（modern）+ Companion（小伴·温暖）**。
4. **首页（数字房间）** `/`：2D 风格化房间视图——书桌必现，书架/画架/地图/绿植/照片墙/座椅/计划本按对应属性 ≥60 动态出现（分数越高丰富度越高），用户 Avatar 与 AI 伙伴小伴常驻房间；灯光（稳定力≥70 暖光）与窗外风景（探索力≥70 森林/海洋，≥85 海洋）随属性变化；悬停物品显示标签，点击弹出占位提示；首次进入有引导气泡。侧边栏提供「人生大盘」入口进入测评。
5. **人生测评** `/assessment`：14 题五级量表（7 维度 × 2 题），点击选项自动进入下一题，最后一题自动提交；已测评过的用户访问问卷页会自动跳转到结果页。测评完成后房间物品会随新属性自动变化（roomLayout 每次请求实时计算，不落库）。
6. **测评结果** `/assessment/result`：七维雷达图 + 当前阶段 + 优势/成长空间 + 成长方向建议，点击「进入我的世界」返回首页。

### 房间生成规则（roomLayout）

- `GET /api/profile` 每次请求按最新 LifeAttribute 实时计算 `roomLayout`（service 层，不持久化）
- 物品映射：学习力≥60 书架 / 创造力≥60 画架 / 探索力≥60 旅行地图 / 健康力≥60 绿植 / 连接力≥60 照片墙 / 稳定力≥60 舒适座椅 / 执行力≥60 计划本；书桌与 Avatar、AI 伙伴必现
- 丰富度：≥85 为 3 档、≥70 为 2 档、其余 1 档，前端按档位渲染点缀图标数量
- 环境：稳定力 ≥70 → `lighting: warm`（否则 cool）；探索力 ≥85 → 海洋、≥70 → 森林、否则城市

### 测评计分规则

- 每个维度 2 题，取该维度平均分映射到 0-100：`score = round(avg / 5 × 100)`
- 更新 `LifeAttribute` 的 7 个字段；`assessmentData` 保存完整答案与各维度原始平均分
- `resultSummary` 生成：阶段判断（起步期/探索期/成长期/绽放期，按综合均分）、优势（最高 2 维）、成长空间（剩余最低 2 维）、成长方向（50-80 字鼓励建议）
- 重复提交为覆盖更新（`LifeAssessment.userId` 唯一），不会新增记录

## API 一览

统一返回格式：`{ success: boolean, data?: any, message?: string }`

| 方法 | 路径 | 认证 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | — | 注册（body: email, password），成功即自动登录并返回双 token |
| POST | `/api/auth/login` | — | 登录，返回 accessToken + refreshToken |
| POST | `/api/auth/refresh` | — | 刷新（body: refreshToken），轮换并返回新双 token |
| POST | `/api/auth/logout` | ✅ | 登出，删除对应 Session（body 可选 refreshToken） |
| GET | `/api/profile` | ✅ | 联查 profile/attributes/room/companion；未创建资料时 `data: null` |
| POST | `/api/profile` | ✅ | 保存资料（body: nickname, avatarStyle, preferenceTags），事务内自动补齐其余三条初始记录（已存在则忽略） |
| PUT | `/api/profile/avatar` | ✅ | 更新头像配置（body: avatarConfig 对象） |
| GET | `/api/assessment/questions` | ✅ | 人生测评题目列表（14 题：7 维度 × 2，每题 5 个选项） |
| GET | `/api/assessment` | ✅ | 已有测评记录 + 当前七维属性；未测评时 `data: null` |
| POST | `/api/assessment/submit` | ✅ | 提交答案（body: answers），计算 0-100 得分、更新 LifeAttribute、生成 resultSummary 并覆盖保存 LifeAssessment |
| POST | `/api/room/entered` | ✅ | 标记首次进入房间（写入 Room.customConfig.hasEntered） |
| POST | `/api/companion/chat` | ✅ | AI 伙伴对话（body: message）：组装画像上下文调用 Python 微服务，SSE 流式透传（delta/done/error 事件） |
| POST | `/api/records/quick` | ✅ | 一句话快速记录（body: content, recordedAt?）：DeepSeek 自动分类/打标签/提取情绪（失败降级本地规则），返回记录 + 鼓励反馈 |
| GET | `/api/records/recent` | ✅ | 最近 N 条记录（query: limit，默认 10，按 recordedAt 降序） |
| DELETE | `/api/records/:id` | ✅ | 删除记录（校验归属，越权返回 404） |
| GET | `/api/dashboard/overview` | ✅ | 人生大盘全景：当前/初始属性、变化量、近期记录、进行中目标、AI 阶段总结（降级规则模板） |
| GET | `/api/dashboard/history` | ✅ | 属性趋势（query: days 默认 30）：快照时间序列，缺失日期前向填充 |
| POST/GET/PUT/DELETE | `/api/goals`、`/api/goals/:id` | ✅ | 目标 CRUD（创建默认 progress 0，未选提升属性按分类自动映射；删除级联行动） |
| POST | `/api/goals/breakdown` | ✅ | AI 目标拆解（body: goalTitle, goalDescription?, category?），失败降级通用四步模板 |
| POST | `/api/goals/:goalId/actions` | ✅ | 新建行动（order 自动递增），重算目标进度 |
| PUT/DELETE | `/api/actions/:id`、`/api/actions/:id/toggle` | ✅ | 行动更新/删除/切换完成，completedAt 自动维护，进度 = 完成数/总数×100 |
| GET | `/api/growth/timeline` | ✅ | 人生轨迹事件（记录/完成目标/首次测评三源合并，limit 默认 20） |
| GET | `/api/growth/trends` | ✅ | 属性趋势（period: month/quarter/year 控制范围，按月聚合+前向填充；数据点 <3 返回空数组） |
| GET | `/api/growth/summary` | ✅ | AI 人生阶段总结（period 同 trends；降级规则模板） |
| POST/PUT/GET/DELETE | `/api/friends`、`/api/friends/request`、`/api/friends/pending` | ✅ | 好友请求/处理/列表/解除（双向唯一，拒绝后可重新发起） |
| GET/PUT | `/api/privacy` | ✅ | 隐私设置（默认懒创建；allowRoomVisit 关闭等效 private） |
| GET/POST/GET | `/api/visit/room/:userId`、`/api/visit/record`、`/api/visit/stats` | ✅ | 只读参观房间（private/friends_only/public 权限）+ 访问记录 + 周/月统计 |
| GET | `/api/search/users?q=` | ✅ | 昵称搜索（尊重 allowSearch） |
| GET/PUT/POST/DELETE | `/api/settings` 系列 | ✅ | 设置中心：合并视图（懒创建）、profile/notification/appearance/general 分项更新、重置默认、JSON 导出、分项清除（records/goals/all）、邮箱确认注销账户 |
| GET/POST/PUT/DELETE | `/api/resources` 系列 | ✅ | 资源中心：列表（type/category/keyword/sort/collected 筛选+分页）、multipart 上传（50MB 限额、按用户分目录）、更新/删除（含物理文件）、收藏 toggle、下载计数、统计/精选/分类 |
| GET/DELETE | `/api/storage` | ✅ | 云空间：用量（10GB 默认额度）、孤儿文件清理；上传文件经 /api/uploads 静态托管 |
| GET/POST/DELETE | `/api/resources/related`、`/:id/link`、`/:id/unlink` | ✅ | 资源与目标/记录关联（MVP 用 JSON 数组字段） |
| GET | `/api/resources/:id/share`、`/api/resources/shared/:token` | ✅ | 分享：7 天有效 token，公开链接无需登录 |
| GET | `/api/resources/tags` | ✅ | 标签云（标签计数） |
| POST | `/api/resources/batch/delete`、`/api/resources/batch/move` | ✅ | 批量删除（连带物理文件）/批量移动分类 |
| GET | `/api/search/global?q=` | ✅ | 全局搜索：资源/记录/目标分组结果 |

### 属性快照机制

- 测评提交、快速记录成功后**异步**创建当天快照（不阻塞响应，当天已有则跳过）
- `AttributeSnapshot` 表是大盘趋势图的数据源；无快照时以当前属性为基线

curl 示例：

```bash
# 注册（自动登录）
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@lifeoshttp://localhost:5173.dev","password":"123456"}'

# 保存资料（替换为注册返回的 accessToken）
curl -X POST http://localhost:4000/api/profile \
  -H "Authorization: Bearer <accessToken>" -H 'Content-Type: application/json' \
  -d '{"nickname":"小海","avatarStyle":"fantasy","preferenceTags":["成长","探索","创造"]}'

# 刷新 token（替换为注册返回的 refreshToken）
curl -X POST http://localhost:4000/api/auth/refresh \
  -H 'Content-Type: application/json' -d '{"refreshToken":"<refreshToken>"}'
```

## 核心设计说明

- **双 token + 轮换**：access 15 分钟 / refresh 7 天，使用两把独立密钥签名；refresh token 落库 `Session` 表，每次刷新即轮换（旧 token 立即失效），登出即删除会话。
- **自动初始数据**：`POST /api/profile` 在同一个 Prisma 事务中 upsert 四条记录——`LifeAttribute`（七维全 50）、`Room`（modern）、`Companion`（小伴/温暖/初识）若已存在则只更新 profile，满足幂等。
- **MySQL 适配**：MySQL 不支持标量数组与 enum，`preferenceTags` 以 JSON 数组存储，`avatarStyle` 为字符串 + 应用层白名单校验（`validators/profile.validator.ts`）。
- **前端 401 自愈**：axios 拦截器在收到 401 时自动用 refresh token 换新 access token 并重放原请求（并发 401 共享同一次刷新）；刷新失败广播 `lifeos:auth-expired` 事件，AuthContext 清空登录态并跳转登录页。
- **强制资料页**：登录态在 `AuthContext` 中恢复时即拉取 `/api/profile`，`RequireProfile` / `RequireNoProfile` 守卫保证「未建资料进不了首页、已建资料回不去资料页」。
- **表单校验**：前端 react-hook-form + zod，后端 express-validator，双重校验。

## 验收标准对照

| 验收项 | 实现 |
| --- | --- |
| 注册、登录、登出正常，token 刷新正常 | `/api/auth/*` 四个接口 + Session 轮换 + axios 401 自动重放 |
| 登录后强制进资料页，提交后自动生成四件套 | `RequireNoProfile` 守卫 + `POST /api/profile` 事务 upsert |
| 首页正确显示昵称和资料摘要 | HomePage 展示昵称、头像风格、偏好标签（另展示房间与同伴） |
| `npm run dev` 同时启动前后端 | 根目录 concurrently（pnpm 亦可） |

## 常见问题

- **`npm install` 报 bcrypt 编译错误**：bcrypt@6 在 Node 20/24 有预编译二进制；若特殊环境仍编译失败，可换纯 JS 实现 `npm i bcryptjs && npm i -D @types/bcryptjs`，并将 `auth.controller.ts` 中 `import bcrypt from 'bcrypt'` 改为 `import bcrypt from 'bcryptjs'`（API 完全一致）。
- **`prisma migrate dev` 连不上数据库**：确认 `backend/.env` 的 `DATABASE_URL` 账号密码正确、数据库已创建、MySQL 服务已启动。
- **端口占用**：后端改 `PORT`（同步改 `frontend/vite.config.ts` 代理 target）；前端改 `vite.config.ts` 的 `server.port`。
- **生产部署**：用 `npm run db:deploy`（`prisma migrate deploy`）执行迁移，`npm run build` 构建，后端 `node dist/index.js` 启动，前端 `dist/` 部署到静态服务并配置 `/api` 反向代理。

## 下一步（阶段 2）

- 人生测评（`LifeAssessment` 模型与接口已预留）
- 头像配置编辑界面（`PUT /api/profile/avatar` 已就绪）
- 七维生命属性雷达图与房间/同伴交互
