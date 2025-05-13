# Script para instalar MQ Importer API como servicio en Windows
# Ejecutar con permisos de administrador: PowerShell -ExecutionPolicy Bypass -File instalar-como-servicio.ps1

# Verificar si se está ejecutando como administrador
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Este script debe ejecutarse como administrador. Por favor, cierre esta ventana y ejecútelo con permisos de administrador." -ForegroundColor Red
    Write-Host "Presione cualquier tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Definir ruta de la aplicación
$appPath = Split-Path -Parent $PSScriptRoot

Write-Host "Instalando MQ Importer API como servicio de Windows..." -ForegroundColor Cyan
Set-Location $appPath

# Paso 1: Verificar instalación de Node.js
try {
    $nodeVersion = node -v
    Write-Host "Node.js $nodeVersion está instalado." -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js no está instalado o no está en el PATH." -ForegroundColor Red
    Write-Host "Por favor, instale Node.js desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Paso 2: Verificar/Instalar PM2 globalmente
try {
    $pm2Check = npm list -g pm2
    if ($pm2Check -match "pm2@") {
        Write-Host "PM2 ya está instalado." -ForegroundColor Green
    } else {
        Write-Host "Instalando PM2 globalmente..." -ForegroundColor Yellow
        npm install -g pm2
        if ($LASTEXITCODE -ne 0) { throw "Error al instalar PM2" }
        Write-Host "PM2 instalado correctamente." -ForegroundColor Green
    }
} catch {
    Write-Host "Instalando PM2 globalmente..." -ForegroundColor Yellow
    npm install -g pm2
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: No se pudo instalar PM2. Verifique su conexión a Internet y permisos." -ForegroundColor Red
        exit 1
    }
    Write-Host "PM2 instalado correctamente." -ForegroundColor Green
}

# Paso 3: Instalar dependencias del proyecto si no existen
if (-not (Test-Path -Path "node_modules")) {
    Write-Host "Instalando dependencias del proyecto..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: No se pudieron instalar las dependencias del proyecto." -ForegroundColor Red
        exit 1
    }
    Write-Host "Dependencias instaladas correctamente." -ForegroundColor Green
} else {
    Write-Host "Las dependencias del proyecto ya están instaladas." -ForegroundColor Green
}

# Paso 4: Verificar si el archivo .env existe, si no, crearlo
if (-not (Test-Path -Path ".env")) {
    Write-Host "Creando archivo .env desde .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Archivo .env creado. Puede editarlo para personalizar la configuración." -ForegroundColor Green
} else {
    Write-Host "El archivo .env ya existe." -ForegroundColor Green
}

# Paso 5: Iniciar la aplicación con PM2
Write-Host "Iniciando MQ Importer API con PM2..." -ForegroundColor Yellow
pm2 start ecosystem.config.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No se pudo iniciar la aplicación con PM2." -ForegroundColor Red
    exit 1
}
Write-Host "MQ Importer API iniciada correctamente con PM2." -ForegroundColor Green

# Paso 6: Guardar configuración de PM2
Write-Host "Guardando configuración de PM2..." -ForegroundColor Yellow
pm2 save
if ($LASTEXITCODE -ne 0) {
    Write-Host "ADVERTENCIA: No se pudo guardar la configuración de PM2." -ForegroundColor Yellow
}

# Paso 7: Configurar PM2 para iniciar con Windows
Write-Host "Configurando PM2 para iniciar con Windows..." -ForegroundColor Yellow
pm2 startup
if ($LASTEXITCODE -ne 0) {
    Write-Host "ADVERTENCIA: No se pudo configurar PM2 para iniciar automáticamente con Windows." -ForegroundColor Yellow
    Write-Host "Puede ejecutar manualmente 'pm2 startup' siguiendo las instrucciones proporcionadas." -ForegroundColor Yellow
} else {
    Write-Host "PM2 configurado para iniciar con Windows." -ForegroundColor Green
}

# Mostrar estado del servicio
pm2 status

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "MQ Importer API instalada y configurada como servicio" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "La API está accesible en: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Comandos útiles:" -ForegroundColor Yellow
Write-Host "- Ver logs: pm2 logs mq-importer-api" -ForegroundColor White
Write-Host "- Reiniciar servicio: pm2 restart mq-importer-api" -ForegroundColor White
Write-Host "- Detener servicio: pm2 stop mq-importer-api" -ForegroundColor White
Write-Host "- Iniciar servicio: pm2 start mq-importer-api" -ForegroundColor White
Write-Host "- Ver estado: pm2 status" -ForegroundColor White
Write-Host ""
Write-Host "Presione cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
