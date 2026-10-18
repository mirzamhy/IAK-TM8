@echo off
py -3 -B "%~dp0etl.py"
set "iak_etl_exit=%errorlevel%"
echo.
if "%iak_etl_exit%"=="0" (
    echo ETL berhasil. Hasil ada di folder data\03_integrated.
) else (
    echo ETL gagal. Periksa pesan di atas dan logs\latest.json.
)
pause
exit /b %iak_etl_exit%
