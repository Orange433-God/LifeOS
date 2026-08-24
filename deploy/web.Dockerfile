# LifeOS 前端（Vite 构建 + Caddy 静态托管 + /api 反向代理）
# 构建上下文 = 仓库根目录（.dockerignore 已排除 node_modules 等）
FROM node:20-alpine AS build

WORKDIR /app
COPY . .

# 仅安装前端 workspace 依赖 + 构建静态产物
RUN npm install -w frontend && npm run build -w frontend

FROM caddy:2-alpine
COPY --from=build /app/frontend/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
