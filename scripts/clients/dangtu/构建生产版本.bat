@echo off
setlocal
chcp 65001 >nul
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
cd /d "%~dp0..\..\..\client"

if not exist package.json (
    echo 未找到当图客户端 client\package.json，请先初始化或更新 client 子仓库。
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo 未找到 npm，请先安装 Node.js。
    pause
    exit /b 1
)

where cargo >nul 2>nul
if errorlevel 1 (
    echo 未找到 cargo，请先安装 Rust。
    pause
    exit /b 1
)

if /i "%~1"=="--check" (
    echo 当图客户端生产构建脚本检查通过。
    exit /b 0
)

echo 正在构建当图客户端生产版本...
echo 检查并释放端口 1420...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":1420 "') do (
    echo 发现进程 PID %%a 占用端口 1420，正在终止...
    taskkill /PID %%a /F 2>nul
)
echo 端口就绪

call npm run build:app
set "EXIT_CODE=%ERRORLEVEL%"
pause
exit /b %EXIT_CODE%
