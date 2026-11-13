@echo off
cd /d "D:\VIT\5th sem\CNT\files\CampusConnect_v2\CampusConnect"
for /f "usebackq tokens=1,* delims==" %%A in (.env) do (
    set "line=%%A"
    if not "!line:~0,1!"=="#" (
        set "%%A=%%B"
    )
)
setlocal EnableDelayedExpansion
for /f "usebackq tokens=1,* delims==" %%A in (.env) do (
    echo %%A | findstr /v "^#" >nul 2>&1
    if not errorlevel 1 (
        set "%%A=%%B"
    )
)
set FEATURE_ACADEMICS=true
java -jar backend\target\campusconnect-backend-0.0.1-SNAPSHOT.jar
