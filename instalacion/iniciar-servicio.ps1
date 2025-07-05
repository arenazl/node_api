# Script para iniciar el servicio MQ Importer API
# Ejecutar como Administrador

Write-Host "=== Iniciando Servicio MQ Importer API (Rutas Relativas) ===" -ForegroundColor Green

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

if ($status -eq "SERVICE_STOPPED") {
    Write-Host "Servicio detenido. Iniciando..." -ForegroundColor Yellow
    & $NssmPath start MQImporterAPI
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "¡Servicio iniciado exitosamente!" -ForegroundColor Green
        
        # Esperar un momento y verificar el estado
        Start-Sleep -Seconds 3
        $newStatus = & $NssmPath status MQImporterAPI
        Write-Host "Estado actual: $newStatus" -ForegroundColor Cyan
        
        if ($newStatus -eq "SERVICE_RUNNING") {
            Write-Host ""
            Write-Host "=== Servicio funcionando correctamente ===" -ForegroundColor Green
            Write-Host "La API está disponible en: http://localhost:3000" -ForegroundColor Cyan
            Write-Host "Interfaz web: http://localhost:3000" -ForegroundColor Cyan
        }
        else {
            Write-Host "ADVERTENCIA: El servicio no está en estado RUNNING" -ForegroundColor Yellow
            Write-Host "Revisa los logs en '$AppPath\logs' para más información" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "ERROR: No se pudo iniciar el servicio" -ForegroundColor Red
        Write-Host "Código de salida: $LASTEXITCODE" -ForegroundColor Red
    }
    
}
elseif ($status -eq "SERVICE_RUNNING") {
    Write-Host "El servicio ya está en ejecución" -ForegroundColor Green
    Write-Host "La API está disponible en: http://localhost:3000" -ForegroundColor Cyan
    
}
else {
    Write-Host "Estado del servicio: $status" -ForegroundColor Yellow
    Write-Host "Para más información, ejecuta: & '$NssmPath' status MQImporterAPI" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Comandos útiles:" -ForegroundColor Cyan
Write-Host "  Detener servicio: & '$NssmPath' stop MQImporterAPI" -ForegroundColor White
Write-Host "  Reiniciar servicio: & '$NssmPath' restart MQImporterAPI" -ForegroundColor White
Write-Host "  Ver estado: & '$NssmPath' status MQImporterAPI" -ForegroundColor White
Write-Host "  Gestionar desde Windows: services.msc" -ForegroundColor White

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Yellow
pause
