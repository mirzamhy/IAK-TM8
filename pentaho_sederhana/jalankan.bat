@echo off
rem Menjalankan transformation 1-8 berurutan lewat Kitchen (Pentaho PDI 9.3).
set PDI_HOME=C:\Users\mirza\Downloads\pdi-ce-9.3.0.0-428\data-integration
set NoDefaultCurrentDirectoryInExePath=
cd /d "%PDI_HOME%"
call Kitchen.bat -file="%~dp0jalankan_semua.kjb" -level=Basic
pause
