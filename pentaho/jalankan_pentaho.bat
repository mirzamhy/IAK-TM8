@echo off
rem Menjalankan job ETL manufaktur lewat Kitchen (Pentaho PDI 9.3).
rem Ubah PDI_HOME bila folder data-integration dipindah.
set PDI_HOME=C:\Users\mirza\Downloads\pdi-ce-9.3.0.0-428\data-integration
set NoDefaultCurrentDirectoryInExePath=
cd /d "%PDI_HOME%"
call Kitchen.bat -file="%~dp000_job_etl_manufaktur.kjb" -level=Basic
pause
