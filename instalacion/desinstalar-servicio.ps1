# Script para desinstalar el servicio MQ Importer API
# Ejecutar como Administrador

Write-Host "=== Desinstalando Servicio MQ Importer API (Rutas Relativas) ===" -ForegroundColor Yellow

# --- CONFIGURACIÓN DE RUTAS ---
# Determinar la ruta raíz de la aplicación basándose en la ubicación del script
$AppPath = (Get-Item $PSScriptRoot).Parent.FullName
# --- FIN DE LA CONFIGURACIÓN ---

# Construir ruta absoluta a nssm.exe
$NssmPath = Join-Path $AppPath "instalacion\nssm\nssm-2.24\win64\nssm.exe" # Asumiendo 64-bit

# Verificar que nssm.exe existe
if (-not (Test-Path $NssmPath)) {
    Write-Host "ERROR: nssm.exe no encontrado en $NssmPath" -ForegroundColor Red
    pause
    exit 1
}

# Verificar el estado actual del servicio
Write-Host "Verificando estado del servicio 'MQImporterAPI'..." -ForegroundColor Yellow
$status = & $NssmPath status MQImporterAPI

if ($status -eq "SERVICE_RUNNING") {
    Write-Host "Deteniendo servicio..." -ForegroundColor Yellow
    & $NssmPath stop MQImporterAPI
    Start-Sleep -Seconds 3
}

Write-Host "Desinstalando servicio..." -ForegroundColor Yellow
& $NssmPath remove MQImporterAPI confirm

if ($LASTEXITCODE -eq 0) {
    Write-Host "¡Servicio desinstalado exitosamente!" -ForegroundColor Green
    Write-Host "El servicio MQImporterAPI ha sido eliminado del sistema." -ForegroundColor Cyan
}
else {
    Write-Host "ERROR: No se pudo desinstalar el servicio." -ForegroundColor Red
    Write-Host "Código de salida: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Es posible que el servicio no existiera. Si el problema persiste, intenta gestionarlo desde 'services.msc'." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Yellow
pause
