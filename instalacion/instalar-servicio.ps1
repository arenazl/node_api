# Script para instalar MQ Importer API como servicio de Windows usando NSSM
# Ejecutar como Administrador

Write-Host "=== Instalando MQ Importer API como Servicio de Windows (Rutas Relativas) ===" -ForegroundColor Green

# --- CONFIGURACIÓN DE RUTAS ---
# Determinar la ruta raíz de la aplicación basándose en la ubicación del script
# $PSScriptRoot es la carpeta 'instalacion'. El padre de 'instalacion' es la raíz de la app.
$AppPath = (Get-Item $PSScriptRoot).Parent.FullName
# Ruta donde se espera que esté Node.js (esto no puede ser relativo)
$NodePath = "C:\Program Files\nodejs\node.exe"
# --- FIN DE LA CONFIGURACIÓN ---

Write-Host "Ruta de la aplicación detectada: $AppPath" -ForegroundColor Yellow

# Construir rutas absolutas dinámicamente
$NssmPath = Join-Path $AppPath "instalacion\nssm\nssm-2.24\win64\nssm.exe" # Asumiendo 64-bit
$ServerJsPath = Join-Path $AppPath "server.js"
$LogDir = Join-Path $AppPath "logs"

# Verificar que nssm.exe existe
if (-not (Test-Path $NssmPath)) {
    Write-Host "ERROR: nssm.exe no encontrado en $NssmPath" -ForegroundColor Red
    Write-Host "Asegúrate de que la estructura de carpetas es correcta." -ForegroundColor Red
    pause
    exit 1
}

# Verificar que node.exe existe
if (-not (Test-Path $NodePath)) {
    Write-Host "ERROR: Node.js no encontrado en $NodePath" -ForegroundColor Red
    Write-Host "Si Node.js está en otra ruta, por favor edita este script." -ForegroundColor Red
    pause
    exit 1
}

# Verificar que server.js existe
if (-not (Test-Path $ServerJsPath)) {
    Write-Host "ERROR: server.js no encontrado en $ServerJsPath" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Instalando servicio 'MQImporterAPI'..." -ForegroundColor Yellow

# Instalar el servicio con rutas absolutas
& $NssmPath install MQImporterAPI "$NodePath" "$ServerJsPath"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Servicio instalado exitosamente!" -ForegroundColor Green
    
    # Configurar el directorio de trabajo
    Write-Host "Configurando directorio de trabajo a: $AppPath" -ForegroundColor Yellow
    & $NssmPath set MQImporterAPI AppDirectory "$AppPath"
    
    # Configurar descripción del servicio
    Write-Host "Configurando descripción del servicio..." -ForegroundColor Yellow
    & $NssmPath set MQImporterAPI Description "MQ Importer API - Servicio para procesamiento de mensajes MQ"
    
    # Configurar tipo de inicio (automático)
    Write-Host "Configurando inicio automático..." -ForegroundColor Yellow
    & $NssmPath set MQImporterAPI Start SERVICE_AUTO_START
    
    # Configurar reinicio en caso de fallo
    Write-Host "Configurando reinicio automático..." -ForegroundColor Yellow
    & $NssmPath set MQImporterAPI AppRestartDelay 5000
    
    # Configurar logs
    Write-Host "Configurando logs en: $LogDir" -ForegroundColor Yellow
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    & $NssmPath set MQImporterAPI AppStdout (Join-Path $LogDir "service-output.log")
    & $NssmPath set MQImporterAPI AppStderr (Join-Path $LogDir "service-error.log")
    
    Write-Host "=== Configuración completada ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para iniciar el servicio, puedes usar el script 'iniciar-servicio.ps1' o ejecutar:" -ForegroundColor Cyan
    Write-Host "& '$NssmPath' start MQImporterAPI" -ForegroundColor White
    Write-Host ""
    Write-Host "Para gestionar el servicio desde Windows:" -ForegroundColor Cyan
    Write-Host "services.msc" -ForegroundColor White
    
}
else {
    Write-Host "ERROR: Falló la instalación del servicio" -ForegroundColor Red
    Write-Host "Código de salida: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Yellow
pause
