# Script para iniciar el servicio MQ Importer API
# Ejecutar como Administrador

Write-Host "=== Iniciando Servicio MQ Importer API ===" -ForegroundColor Green

# Verificar que nssm.exe existe
if (-not (Test-Path ".\nssm.exe")) {
    Write-Host "ERROR: nssm.exe no encontrado en el directorio actual" -ForegroundColor Red
    Write-Host "Asegúrate de ejecutar este script desde: C:\Code\mq importer-api\node_api" -ForegroundColor Red
    pause
    exit 1
}

# Verificar el estado actual del servicio
Write-Host "Verificando estado del servicio..." -ForegroundColor Yellow
$status = .\nssm.exe status MQImporterAPI

if ($status -eq "SERVICE_STOPPED") {
    Write-Host "Servicio detenido. Iniciando..." -ForegroundColor Yellow
    .\nssm.exe start MQImporterAPI
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "¡Servicio iniciado exitosamente!" -ForegroundColor Green
        
        # Esperar un momento y verificar el estado
        Start-Sleep -Seconds 3
        $newStatus = .\nssm.exe status MQImporterAPI
        Write-Host "Estado actual: $newStatus" -ForegroundColor Cyan
        
        if ($newStatus -eq "SERVICE_RUNNING") {
            Write-Host ""
            Write-Host "=== Servicio funcionando correctamente ===" -ForegroundColor Green
            Write-Host "La API está disponible en: http://localhost:3000" -ForegroundColor Cyan
            Write-Host "Interfaz web: http://localhost:3000" -ForegroundColor Cyan
            Write-Host "Estado de salud: http://localhost:3000/health" -ForegroundColor Cyan
        } else {
            Write-Host "ADVERTENCIA: El servicio no está en estado RUNNING" -ForegroundColor Yellow
            Write-Host "Revisa los logs en la carpeta 'logs' para más información" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ERROR: No se pudo iniciar el servicio" -ForegroundColor Red
        Write-Host "Código de salida: $LASTEXITCODE" -ForegroundColor Red
    }
    
} elseif ($status -eq "SERVICE_RUNNING") {
    Write-Host "El servicio ya está en ejecución" -ForegroundColor Green
    Write-Host "La API está disponible en: http://localhost:3000" -ForegroundColor Cyan
    
} else {
    Write-Host "Estado del servicio: $status" -ForegroundColor Yellow
    Write-Host "Para más información, ejecuta: .\nssm.exe status MQImporterAPI" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Comandos útiles:" -ForegroundColor Cyan
Write-Host "  Detener servicio: .\nssm.exe stop MQImporterAPI" -ForegroundColor White
Write-Host "  Reiniciar servicio: .\nssm.exe restart MQImporterAPI" -ForegroundColor White
Write-Host "  Ver estado: .\nssm.exe status MQImporterAPI" -ForegroundColor White
Write-Host "  Gestionar desde Windows: services.msc" -ForegroundColor White

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Yellow
pause
