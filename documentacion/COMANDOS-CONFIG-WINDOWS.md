# Comandos para Configuración e Instalación de MQ Importer API en Windows

Este documento proporciona los comandos específicos necesarios para instalar, configurar y ejecutar MQ Importer API como servicio en Windows. Use esta referencia rápida junto con las guías de instalación detalladas.

## Requisitos Previos

```powershell
# Verificar versiones instaladas
node --version    # Debería ser 16.x o superior
npm --version     # Debería ser 8.x o superior
```

## Instalación Básica

```batch
# Clonar o descomprimir en la ubicación deseada
# Ejemplo: C:\MQImporter\node_api

# Instalar dependencias
cd C:\ruta\a\node_api
npm install

# Crear archivo de configuración
copy .env.example .env

# Crear directorios necesarios (si no existen)
mkdir uploads
mkdir structures
mkdir logs
mkdir tmp
```

## Instalación PM2 (Recomendado)

```batch
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar la API como servicio
pm2 start server.js --name "mq-importer-api"

# Verificar estado
pm2 status

# Guardar configuración
pm2 save

# Para Windows: crear servicio con pm2-installer
# Ver documentación detallada en WINDOWS-DEPLOYMENT.md
```

## Instalación NSSM (Alternativa)

```batch
# Descargar NSSM de nssm.cc
# Extraer en una ubicación conocida, por ejemplo: C:\tools\nssm-2.24

# Abrir cmd como administrador e instalar servicio
C:\tools\nssm-2.24\win64\nssm.exe install MQImporterAPI

# Configurar en el diálogo que aparece:
# Application Path: C:\Program Files\nodejs\node.exe
# Startup Directory: C:\ruta\a\node_api
# Arguments: server.js

# Iniciar el servicio
nssm start MQImporterAPI

# Verificar estado
nssm status MQImporterAPI
```

## Gestión del Servicio con PM2

```batch
# Reiniciar el servicio
pm2 restart mq-importer-api

# Detener el servicio
pm2 stop mq-importer-api

# Iniciar el servicio
pm2 start mq-importer-api

# Ver logs en tiempo real
pm2 logs mq-importer-api

# Monitorizar uso de recursos
pm2 monit
```

## Gestión del Servicio con NSSM

```batch
# Reiniciar el servicio
nssm restart MQImporterAPI

# Detener el servicio
nssm stop MQImporterAPI

# Iniciar el servicio
nssm start MQImporterAPI

# Editar configuración
nssm edit MQImporterAPI

# Eliminar servicio (requiere confirmación)
nssm remove MQImporterAPI
```

## Verificación y Pruebas

```batch
# Verificar que la API está en ejecución
curl http://localhost:3000/health

# O abrir en el navegador:
# - http://localhost:3000        (interfaz web)
# - http://localhost:3000/health (estado del sistema)
# - http://localhost:3000/api    (documentación de la API)
```

## Configuraciones Adicionales

### Cambiar Puerto (en archivo .env)

```
PORT=4000
```

### Configuración de CORS (en archivo .env)

```
ALLOWED_ORIGINS=http://aplicacion1.ejemplo.com,http://aplicacion2.ejemplo.com
```

### Modificar Límites de Subida de Archivos (en archivo .env)

```
FILE_UPLOAD_SIZE_LIMIT=100
```

## Solución de Problemas

```batch
# Ver logs detallados
pm2 logs mq-importer-api --lines 100

# Eliminar e instalar de nuevo
pm2 delete mq-importer-api
pm2 start server.js --name "mq-importer-api" --log logs/app.log

# Actualizar PM2
npm install -g pm2@latest
```

## Accesos Rápidos

```
Interfaz Web:            http://[servidor]:3000
Estado del sistema:      http://[servidor]:3000/health
Documentación API:       http://[servidor]:3000/api
Servicios disponibles:   http://[servidor]:3000/api/services
```

---

**Nota:** Reemplace `[servidor]` con `localhost` para acceso local o con el nombre o IP del servidor para acceso remoto.

Para guías detalladas, consulte la documentación completa en [INDICE-DOCUMENTACION.md](INDICE-DOCUMENTACION.md).
