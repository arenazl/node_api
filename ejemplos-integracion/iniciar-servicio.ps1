# Script de PowerShell para iniciar el servicio MQ Importer API
# Autor: Equipo MQ Importer
# Fecha: Mayo 2025
# Descripción: Este script inicia el servicio MQ Importer API en Windows
#              y configura el entorno necesario para su ejecución.

# Configuración de variables
$serviceName = "mq-importer-api"
$apiPort = 3000
$nodeEnv = "production"  # Cambiar a "development" para modo desarrollo
$apiDirectory = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Función para verificar instalación de Node.js
function Test-NodeInstallation {
    try {
        $nodeVersion = node -v
        $npmVersion = npm -v
        
        Write-Host "Node.js encontrado: $nodeVersion" -ForegroundColor Green
        Write-Host "npm encontrado: $npmVersion" -ForegroundColor Green
        
        # Verificar versiones mínimas requeridas
        $nodeVersionNum = $nodeVersion.Substring(1) -split '\.'
        $npmVersionNum = $npmVersion -split '\.'
        
        if ([int]$nodeVersionNum[0] -lt 16) {
            Write-Warning "Se recomienda Node.js versión 16.x o superior. Considere actualizar."
        }
        
        if ([int]$npmVersionNum[0] -lt 8) {
            Write-Warning "Se recomienda npm versión 8.x o superior. Considere actualizar."
        }
        
        return $true
    }
    catch {
        Write-Host "Error: No se pudo encontrar Node.js instalado." -ForegroundColor Red
        Write-Host "Por favor, instale Node.js desde https://nodejs.org/" -ForegroundColor Red
        return $false
    }
}

# Función para verificar instalación de PM2
function Test-PM2Installation {
    try {
        $pm2Version = pm2 -v
        Write-Host "PM2 encontrado: $pm2Version" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "PM2 no está instalado." -ForegroundColor Yellow
        Write-Host "Para ejecutar como servicio, instale PM2 con: npm install -g pm2" -ForegroundColor Yellow
        return $false
    }
}

# Función para verificar archivos de configuración
function Test-ConfigFiles {
    $envFile = Join-Path -Path $apiDirectory -ChildPath ".env"
    
    if (!(Test-Path $envFile)) {
        Write-Host "Archivo .env no encontrado. Creando archivo de configuración por defecto..." -ForegroundColor Yellow
        
        $envContent = @"
# Puerto de la aplicación (por defecto: 3000)
PORT=$apiPort

# Entorno de ejecución
NODE_ENV=$nodeEnv

# Configuración de límites de archivos
FILE_UPLOAD_SIZE_LIMIT=50

# Configuración de timeouts (en milisegundos)
REQUEST_TIMEOUT=120000

# Configuración CORS (orígenes permitidos, separados por comas)
# Use '*' para permitir cualquier origen o especifique dominios concretos
ALLOWED_ORIGINS=*
"@
        
        Set-Content -Path $envFile -Value $envContent
        Write-Host "Archivo .env creado con configuración por defecto." -ForegroundColor Green
    }
    else {
        Write-Host "Archivo .env encontrado." -ForegroundColor Green
    }
    
    # Verificar directorios necesarios
    $dirs = @("uploads", "structures", "logs", "tmp")
    
    foreach ($dir in $dirs) {
        $path = Join-Path -Path $apiDirectory -ChildPath $dir
        if (!(Test-Path $path)) {
            Write-Host "Creando directorio $dir..." -ForegroundColor Yellow
            New-Item -Path $path -ItemType Directory | Out-Null
        }
    }
}

# Función para iniciar el servicio
function Start-MQImporterService {
    param (
        [switch]$UsePM2,
        [switch]$DevMode
    )
    
    # Cambiar al directorio de la API
    Set-Location -Path $apiDirectory
    
    # Instalar dependencias si es necesario
    if (!(Test-Path (Join-Path -Path $apiDirectory -ChildPath "node_modules"))) {
        Write-Host "Instalando dependencias..." -ForegroundColor Yellow
        npm install
    }
    
    # Iniciar el servicio
    if ($UsePM2) {
        # Con PM2
        if ($DevMode) {
            Write-Host "Iniciando servicio en modo desarrollo con PM2..." -ForegroundColor Cyan
            pm2 start server.js --name $serviceName -- --watch
        }
        else {
            Write-Host "Iniciando servicio en modo producción con PM2..." -ForegroundColor Cyan
            pm2 start server.js --name $serviceName
        }
        
        Write-Host "Servicio iniciado. Para ver el estado, ejecute: pm2 status" -ForegroundColor Green
        Write-Host "Para ver los logs, ejecute: pm2 logs $serviceName" -ForegroundColor Green
    }
    else {
        # Directamente con Node.js
        if ($DevMode) {
            Write-Host "Iniciando servicio en modo desarrollo..." -ForegroundColor Cyan
            Write-Host "Presione Ctrl+C para detener el servicio." -ForegroundColor Yellow
            npm run dev
        }
        else {
            Write-Host "Iniciando servicio..." -ForegroundColor Cyan
            Write-Host "Presione Ctrl+C para detener el servicio." -ForegroundColor Yellow
            npm start
        }
    }
}

# Función principal
function Main {
    Write-Host "=== MQ Importer API - Script de Inicio ===" -ForegroundColor Cyan
    
    # Verificar Node.js
    if (!(Test-NodeInstallation)) {
        return
    }
    
    # Verificar archivos de configuración
    Test-ConfigFiles
    
    # Preguntar modo de ejecución
    $hasPM2 = Test-PM2Installation
    
    $options = @("1) Iniciar servicio directamente (modo normal)")
    if ($hasPM2) {
        $options += "2) Iniciar servicio con PM2 (como servicio en segundo plano)"
    }
    $options += "3) Iniciar en modo desarrollo (con recarga automática)"
    if ($hasPM2) {
        $options += "4) Iniciar en modo desarrollo con PM2"
    }
    $options += "5) Salir"
    
    Write-Host "`nSeleccione una opción:" -ForegroundColor Yellow
    $options | ForEach-Object { Write-Host $_ }
    
    $choice = Read-Host "`nOpción"
    
    switch ($choice) {
        "1" { Start-MQImporterService }
        "2" { 
            if ($hasPM2) { 
                Start-MQImporterService -UsePM2 
            } else {
                Write-Host "Opción no válida. PM2 no está instalado." -ForegroundColor Red
            }
        }
        "3" { Start-MQImporterService -DevMode }
        "4" { 
            if ($hasPM2) { 
                Start-MQImporterService -UsePM2 -DevMode 
            } else {
                Write-Host "Opción no válida. PM2 no está instalado." -ForegroundColor Red
            }
        }
        "5" { return }
        default { Write-Host "Opción no válida." -ForegroundColor Red }
    }
}

# Ejecutar la función principal
Main
