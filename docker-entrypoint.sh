#!/bin/sh

set -e

echo "🚀 量子隧穿效应演示 - 容器启动中..."

echo "📁 检查数据文件..."
if [ ! -f experiments.json ]; then
    echo "[]" > experiments.json
    echo "✅ 创建新的实验数据文件"
fi

echo "🌐 启动 Node.js 后端服务..."
node server.js &
NODE_PID=$!

sleep 2

echo "🔄 启动 Nginx 反向代理..."
nginx -g 'daemon off;' &
NGINX_PID=$!

echo "✅ 服务启动完成！"
echo ""
echo "📊 服务列表:"
echo "   - Nginx 反向代理: 端口 80"
echo "   - Node.js 后端: 端口 3000"
echo "   - gzip/Brotli 压缩: 已启用"
echo "   - PWA 离线支持: 已启用"
echo ""
echo "🌐 访问地址: http://localhost"
echo ""

wait $NODE_PID $NGINX_PID
