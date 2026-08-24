@echo off
REM 启动 AI 学习助手
echo ========================================
echo   AI 学习助手 - 多智能体教学系统
echo   纯文本链路全流程验证
echo ========================================

REM 检查是否有 .env 文件，无则提示演示模式
if not exist .env (
    echo [INFO] 未检测到 .env 文件，将以演示模式启动
    echo [INFO] 如需使用真实模型，请复制 .env.example 为 .env 并填入 API Key
) else (
    echo [INFO] 已检测到 .env 文件，将使用真实模式
)

echo.
echo 启动中，请稍候...
echo.
E:\anaconda\python.exe -m streamlit run app.py --server.runOnSave true

pause
