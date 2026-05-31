#!/bin/bash

echo "🚀 量子隧穿效应演示 - 部署脚本"
echo "===================================="
echo ""

ACTION=${1:-start}

case $ACTION in
    start)
        echo "📦 构建并启动容器..."
        docker-compose up -d --build
        echo ""
        echo "✅ 部署完成！"
        echo ""
        echo "🌐 访问地址: http://localhost"
        echo "📊 查看日志: docker-compose logs -f"
        echo "🔍 查看状态: docker-compose ps"
        ;;
    stop)
        echo "⏹  停止容器..."
        docker-compose down
        echo "✅ 已停止"
        ;;
    restart)
        echo "🔄 重启容器..."
        docker-compose restart
        echo "✅ 已重启"
        ;;
    logs)
        docker-compose logs -f
        ;;
    status)
        docker-compose ps
        ;;
    clean)
        echo "🧹 清理所有数据..."
        docker-compose down -v
        echo "✅ 已清理"
        ;;
    *)
        echo "❌ 未知命令: $ACTION"
        echo ""
        echo "可用命令:"
        echo "  start   - 构建并启动 (默认)"
        echo "  stop    - 停止容器"
        echo "  restart - 重启容器"
        echo "  logs    - 查看日志"
        echo "  status  - 查看状态"
        echo "  clean   - 清理所有数据"
        ;;
esac
