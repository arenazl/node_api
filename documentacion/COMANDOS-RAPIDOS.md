# Comandos Rápidos para MQ Importer API

Este documento contiene los comandos más comunes para administrar el servicio MQ Importer API en Windows.

## Instalación Rápida

```powershell
# Ejecutar como administrador
PowerShell -ExecutionPolicy Bypass -File ejemplos-integracion\instalar-como-servicio.ps1
```

## Comandos Básicos (usando PM2)

### Iniciar el servicio

```powershell
pm2 start mq-importer-api
```

### Detener el servicio

```powershell
pm2 stop mq-importer-api
```

### Reiniciar el servicio

```powershell
pm2 restart mq-importer-api
```

### Ver los registros (logs)

```powershell
pm2 logs mq-importer-api
```

### Ver estado del servicio

```powershell
pm2 status
```

## Configuración de Ambiente

### Crear archivo de configuración

```powershell
copy .env.example .env
```

Luego edite el archivo `.env` según sus necesidades.

## Pruebas del Servicio

### Probar el servicio 1004 (Consulta cliente por NIP)

```powershell
node ejemplos-integracion\client-1004.js
```

## Instalación Manual Paso a Paso

1. Instalar PM2 globalmente:
   ```powershell
   npm install -g pm2
   ```

2. Iniciar la API usando PM2:
   ```powershell
   pm2 start ecosystem.config.js
   ```

3. Guardar la configuración:
   ```powershell
   pm2 save
   ```

4. Configurar el inicio automático con Windows:
   ```powershell
   pm2 startup
   ```
   Siga las instrucciones que aparecen en pantalla.

## Acceso a la API

- **Interfaz Web de Documentación**: http://localhost:3000
- **Endpoint del Servicio 1004**: http://localhost:3000/service-1004/consultar
- **Monitoreo de Salud**: http://localhost:3000/health

## Resolución de Problemas

### Verificar que el servicio esté en ejecución

```powershell
pm2 list
```

### Reiniciar todos los servicios de PM2

```powershell
pm2 restart all
```

### Eliminar un servicio de PM2

```powershell
pm2 delete mq-importer-api
```

### Eliminar todos los servicios de PM2

```powershell
pm2 delete all
```

### Limpiar los registros de PM2

```powershell
pm2 flush
