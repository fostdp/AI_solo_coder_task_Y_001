@echo off
echo 🚀 量子隧穿效应演示 - 部署脚本
echo ====================================
echo.

set ACTION=%1
if "%ACTION%"=="" set ACTION=start

if "%ACTION%"=="start" (
    echo 📦 构建并启动容器...
    docker-compose up -d --build
    echo.
    echo ✅ 部署完成！
    echo.
    echo 🌐 访问地址: http://localhost
    echo 📊 查看日志: docker-compose logs -f
    echo 🔍 查看状态: docker-compose ps
    goto end
)

if "%ACTION%"=="stop" (
    echo ⏹  停止容器...
    docker-compose down
    echo ✅ 已停止
    goto end
)

if "%ACTION%"=="restart" (
    echo 🔄 重启容器...
    docker-compose restart
    echo ✅ 已重启
    goto end
)

if "%ACTION%"=="logs" (
    docker-compose logs -f
    goto end
)

if "%ACTION%"=="status" (
    docker-compose ps
    goto end
)

if "%ACTION%"=="clean" (
    echo 🧹 清理所有数据...
    docker-compose down -v
    echo ✅ 已清理
    goto end
)

echo ❌ 未知命令: %ACTION%
echo.
echo 可用命令:
echo   start   - 构建并启动 (默认)
echo   stop    - 停止容器
echo   restart - 重启容器
echo   logs    - 查看日志
echo   status  - 查看状态
echo   clean   - 清理所有数据

:end
