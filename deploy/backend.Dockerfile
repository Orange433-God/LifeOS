# LifeOS 后端（Express + Prisma + MySQL）
# 构建上下文 = 仓库根目录（.dockerignore 已排除 node_modules/.env/upload 等）
FROM node:20-alpine

WORKDIR /app
# 全仓库拷贝：npm workspaces 解析需要 frontend 的 package.json
COPY . .

# 仅安装后端 workspace 依赖（postinstall 自动 prisma generate）+ 编译到 dist/
RUN npm install -w backend && npm run build -w backend

WORKDIR /app/backend
EXPOSE 4000

# 启动前先应用数据库迁移（幂等），再启动服务
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
