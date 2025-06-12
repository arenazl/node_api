# Script para desinstalar el servicio MQ Importer API
# Ejecutar como Administrador

Write-Host "=== Desinstalando Servicio MQ Importer API ===" -ForegroundColor Yellow

# Obtener el directorio actual para construir la ruta a nssm.exe
$currentDir = Get-Location
$nssmPath = Join-Path $currentDir "instalacion\nssm\nssm-2.24\win64\nssm.exe" # Asumiendo 64-bit

# Verificar que nssm.exe existe
if (-not (Test-Path $nssmPath)) {
    Write-Host "ERROR: nssm.exe no encontrado en $nssmPath" -ForegroundColor Red
    Write-Host "Asegúrate de que nssm.exe se encuentra en la ruta especificada y que la arquitectura (win32/win64) es correcta." -ForegroundColor Red
    pause
    exit 1
}

# Verificar el estado actual del servicio
Write-Host "Verificando estado del servicio..." -ForegroundColor Yellow
$status = & $nssmPath status MQImporterAPI

if ($status -eq "SERVICE_RUNNING") {
    Write-Host "Deteniendo servicio..." -ForegroundColor Yellow
    & $nssmPath stop MQImporterAPI
    Start-Sleep -Seconds 3
}

Write-Host "Desinstalando servicio..." -ForegroundColor Yellow
& $nssmPath remove MQImporterAPI confirm

if ($LASTEXITCODE -eq 0) {
    Write-Host "¡Servicio desinstalado exitosamente!" -ForegroundColor Green
    Write-Host "El servicio MQImporterAPI ha sido eliminado del sistema" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: No se pudo desinstalar el servicio" -ForegroundColor Red
    Write-Host "Código de salida: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Puedes intentar desinstalarlo manualmente desde services.msc" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Yellow
pause
