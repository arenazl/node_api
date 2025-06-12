# Script para instalar MQ Importer API como servicio de Windows usando NSSM
# Ejecutar como Administrador

Write-Host "=== Instalando MQ Importer API como Servicio de Windows ===" -ForegroundColor Green

# Verificar que estamos en el directorio correcto
$currentDir = Get-Location
Write-Host "Directorio actual: $currentDir" -ForegroundColor Yellow

# Definir la ruta a nssm.exe
$nssmPath = Join-Path $currentDir "instalacion\nssm\nssm-2.24\win64\nssm.exe" # Asumiendo 64-bit

# Verificar que nssm.exe existe
if (-not (Test-Path $nssmPath)) {
    Write-Host "ERROR: nssm.exe no encontrado en $nssmPath" -ForegroundColor Red
    Write-Host "Asegúrate de que nssm.exe se encuentra en la ruta especificada y que la arquitectura (win32/win64) es correcta." -ForegroundColor Red
    pause
    exit 1
}

# Verificar que node.exe existe
$nodePath = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $nodePath)) {
    Write-Host "ERROR: Node.js no encontrado en $nodePath" -ForegroundColor Red
    pause
    exit 1
}

# Verificar que server.js existe
if (-not (Test-Path ".\server.js")) {
    Write-Host "ERROR: server.js no encontrado en el directorio actual" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Instalando servicio MQImporterAPI..." -ForegroundColor Yellow

# Instalar el servicio
& $nssmPath install MQImporterAPI "$nodePath" "server.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Servicio instalado exitosamente!" -ForegroundColor Green
    
    # Configurar el directorio de trabajo
    Write-Host "Configurando directorio de trabajo..." -ForegroundColor Yellow
    & $nssmPath set MQImporterAPI AppDirectory "$currentDir"
    
    # Configurar descripción del servicio
    Write-Host "Configurando descripción del servicio..." -ForegroundColor Yellow
    & $nssmPath set MQImporterAPI Description "MQ Importer API - Servicio para procesamiento de mensajes MQ"
    
    # Configurar tipo de inicio (automático)
    Write-Host "Configurando inicio automático..." -ForegroundColor Yellow
    & $nssmPath set MQImporterAPI Start SERVICE_AUTO_START
    
    # Configurar reinicio en caso de fallo
    Write-Host "Configurando reinicio automático..." -ForegroundColor Yellow
    & $nssmPath set MQImporterAPI AppRestartDelay 5000
    
    # Configurar logs
    Write-Host "Configurando logs..." -ForegroundColor Yellow
    $logDir = Join-Path $currentDir "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    & $nssmPath set MQImporterAPI AppStdout "$logDir\service-output.log"
    & $nssmPath set MQImporterAPI AppStderr "$logDir\service-error.log"
    
    Write-Host "=== Configuración completada ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para iniciar el servicio, ejecuta:" -ForegroundColor Cyan
    Write-Host "$nssmPath start MQImporterAPI" -ForegroundColor White
    Write-Host ""
    Write-Host "Para verificar el estado:" -ForegroundColor Cyan
    Write-Host "$nssmPath status MQImporterAPI" -ForegroundColor White
    Write-Host ""
    Write-Host "Para gestionar el servicio desde Windows:" -ForegroundColor Cyan
    Write-Host "services.msc" -ForegroundColor White
    
} else {
    Write-Host "ERROR: Falló la instalación del servicio" -ForegroundColor Red
    Write-Host "Código de salida: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Yellow
pause
