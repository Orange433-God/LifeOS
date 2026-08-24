# LifeOS 部署指南（Docker Compose 一键部署）

部署后任何人点击一个链接（`http://你的服务器IP` 或你的域名）即可打开完整系统：
前端页面（Caddy 托管）+ 后端 API + MySQL + AI 伙伴微服务，全部自动运行。

## 一、准备一台服务器

推荐任一 2C2G 以上的 Linux 服务器（Ubuntu 22.04+）：

- 国内：阿里云/腾讯云轻量应用服务器（2C2G 足够，注意开 80/443 端口安全组）
- 海外：任何 VPS（访问 DeepSeek API 更快）

## 二、服务器上执行（一次性）

```bash
# 1. 安装 Docker（官方脚本）
curl -fsSL https://get.docker.com | sh

# 2. 拉取代码
git clone https://github.com/Orange433-God/LifeOS.git
cd LifeOS

# 3. 配置环境变量（填写 DeepSeek Key 与随机密钥）
cp deploy/.env.example .env
vi .env    # 修改 MYSQL_ROOT_PASSWORD / JWT_SECRET / REFRESH_SECRET / DEEPSEEK_API_KEY / CLIENT_URL

# 4. 构建并启动（首次构建约 5-10 分钟）
docker compose up -d --build

# 5. 查看状态（db 健康 + backend/ai/web 运行中）
docker compose ps
```

完成后打开 **http://服务器IP** 即可注册使用。这个链接就是可以分享给别人的系统入口。

## 三、日常维护

```bash
docker compose logs -f backend     # 看后端日志
docker compose logs -f ai          # 看 AI 服务日志
docker compose up -d --build       # 更新代码后重新构建
docker compose down                # 停止（数据保留在 volume 里）
```

## 四、说明与常见问题

- **数据库迁移**：backend 容器启动时自动执行 `prisma migrate deploy`，无需手动操作。
- **数据持久化**：MySQL/上传文件/AI 记忆都在 Docker volume 里，重启不丢。
- **首次 AI 对话较慢**：AI 服务第一次启动会下载 Chroma 嵌入模型（约 79MB，来自 AWS S3，海外服务器秒下、国内服务器可能较慢——可参考 lifeos-ai-service/README.md 预置模型缓存）。
- **HTTPS**：目前按 http 访问。绑定域名后可把 deploy/Caddyfile 里的 `auto_https off` 去掉并改成域名，Caddy 会自动申请证书。
- **AI 服务不可用排查**：`docker compose logs ai` 看是否缺 DEEPSEEK_API_KEY 或下载模型卡住。
- **端口冲突**：服务器 80 端口被占用时，改 docker-compose.yml 的 `"80:80"` 为 `"8080:80"`，链接变成 `http://IP:8080`。

## 五、本地开发与线上部署的差异

| | 本地开发（npm run dev） | 线上部署（docker compose） |
|---|---|---|
| 前端 | Vite 5173 + 代理 | Caddy 80 托管静态 + 反代 /api |
| 后端 | tsx 热更新 :4000 | 编译产物 node dist :4000 |
| AI 服务 | 本机 venv uvicorn :8000 | 容器内 uvicorn :8000 |
| 数据库 | 本机 MySQL | MySQL 容器 |
