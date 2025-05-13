# Implementación en Windows de MQ Importer API

Esta guía detalla el proceso de instalación, configuración y ejecución de la API MQ Importer como un servicio en Windows, permitiendo que otras aplicaciones se conecten a ella.

## Requisitos Previos

- **Node.js**: Versión 16.x o superior
  - [Descargar e instalar Node.js](https://nodejs.org/)
- **npm**: Versión 8.x o superior (incluido con Node.js)
- **Git**: (Opcional, para clonar el repositorio)
  - [Descargar e instalar Git](https://git-scm.com/download/win)

## Instalación del Proyecto

### Opción 1: Desde el Repositorio Git

```bash
# Clonar el repositorio
git clone [URL_DEL_REPOSITORIO]
cd mq-importer-api/node_api

# Instalar dependencias
npm install
```

### Opción 2: Desde Archivos Comprimidos

1. Descomprimir el archivo del proyecto en la ubicación deseada
2. Abrir una terminal (cmd o PowerShell) en la carpeta `node_api`
3. Ejecutar `npm install`

## Configuración

### Archivo .env

Crear o modificar el archivo `.env` en la carpeta `node_api` con los siguientes parámetros:

```
# Puerto de la aplicación (por defecto: 3000)
PORT=3000

# Entorno de ejecución
NODE_ENV=production

# Configuración de límites de archivos
FILE_UPLOAD_SIZE_LIMIT=50

# Configuración de timeouts (en milisegundos)
REQUEST_TIMEOUT=120000

# Configuración CORS (orígenes permitidos, separados por comas)
# Use '*' para permitir cualquier origen o especifique dominios concretos
ALLOWED_ORIGINS=*
```

> **Importante**: Si esta API será accesible desde aplicaciones específicas, se recomienda listar esos dominios en `ALLOWED_ORIGINS` en lugar de usar `*`, por ejemplo: `ALLOWED_ORIGINS=https://app1.miempresa.com,https://app2.miempresa.com`

## Prueba de Ejecución

Antes de configurar como servicio, verifique que la aplicación funciona correctamente:

```bash
# Desde la carpeta node_api
npm start
```

Debería ver mensajes indicando que el servidor se ha iniciado. Abra un navegador y acceda a:
- `http://localhost:3000` - Interfaz web (accede a los archivos en la carpeta public)
- `http://localhost:3000/health` - Estado del sistema
- `http://localhost:3000/api` - Documentación de la API

> **Nota sobre la carpeta public**: El servidor automáticamente sirve todos los archivos HTML, CSS y JavaScript ubicados en la carpeta `public/` como contenido estático. No necesita configuración adicional para acceder a estos archivos a través del navegador.

## Ejecutar como Servicio en Windows

Existen varias opciones para ejecutar la API como un servicio en Windows. Recomendamos el uso de PM2, una herramienta de gestión de procesos para Node.js que facilita esta tarea.

### Opción 1: Usando PM2 (Recomendado)

1. **Instalar PM2 globalmente**:

```bash
npm install -g pm2
```

2. **Iniciar la API como servicio**:

```bash
# Navegar a la carpeta node_api
cd ruta\hacia\mq-importer-api\node_api

# Iniciar aplicación con PM2
pm2 start server.js --name "mq-importer-api"
```

3. **Configurar inicio automático al arrancar Windows**:

```bash
# Guardar la configuración actual
pm2 save

# Generar el script de inicio automático
pm2 startup

# Seguir las instrucciones mostradas en pantalla
```

4. **Verificar que el servicio está funcionando**:

```bash
pm2 status
```

### Opción 2: Usando nssm (Alternativa)

Si prefiere usar nssm (Non-Sucking Service Manager):

1. **Descargar e instalar nssm**:
   - [Descargar nssm](https://nssm.cc/download)
   - Extraer el archivo y colocar `nssm.exe` en una ubicación accesible

2. **Abrir una terminal como administrador y ejecutar**:

```bash
nssm install MQImporterAPI
```

3. **En la ventana que se abre, configurar**:
   - Path: Ruta a node.exe (ej: `C:\Program Files\nodejs\node.exe`)
   - Startup Directory: Ruta a la carpeta del proyecto (ej: `C:\ruta\hacia\mq-importer-api\node_api`)
   - Arguments: `server.js`
   - En la pestaña "Details", configurar nombre y descripción del servicio

4. **Iniciar el servicio**:

```bash
nssm start MQImporterAPI
```

## Acceder a la API y Contenido Web desde otras Aplicaciones

Una vez que el servicio está en ejecución, otras aplicaciones pueden acceder a la API a través de HTTP, y los usuarios pueden acceder a la interfaz web.

### URLs importantes

- **Base URL**: `http://[HOSTNAME]:3000` (donde HOSTNAME es el nombre o IP del servidor)
- **Ruta de la API**: `http://[HOSTNAME]:3000/api`
- **Estado de salud**: `http://[HOSTNAME]:3000/health`

### Ejemplos de Integración

#### Consumo desde aplicación JavaScript/Web

```javascript
// Usando fetch en una aplicación web
fetch('http://servidor-windows:3000/api/services')
  .then(response => response.json())
  .then(data => {
    console.log('Servicios disponibles:', data.services);
  })
  .catch(error => {
    console.error('Error al obtener servicios:', error);
  });
```

#### Consumo desde aplicación Node.js

```javascript
const axios = require('axios');

// Configuración base para todas las solicitudes
const api = axios.create({
  baseURL: 'http://servidor-windows:3000',
  timeout: 10000
});

// Obtener servicios disponibles
api.get('/api/services')
  .then(response => {
    console.log('Servicios:', response.data.services);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });

// Procesar un servicio específico
const procesarServicio = async (serviceNumber, stream) => {
  try {
    const response = await api.post('/api/services/process', {
      service_number: serviceNumber,
      stream: stream
    });
    return response.data;
  } catch (error) {
    console.error(`Error al procesar servicio ${serviceNumber}:`, error.message);
    throw error;
  }
};
```

#### Consumo desde aplicación Python

```python
import requests

API_BASE_URL = "http://servidor-windows:3000"

# Obtener servicios disponibles
def get_services():
    response = requests.get(f"{API_BASE_URL}/api/services")
    if response.status_code == 200:
        return response.json().get('services')
    else:
        raise Exception(f"Error al obtener servicios: {response.status_code}")

# Procesar un servicio
def process_service(service_number, stream=None):
    payload = {
        "service_number": service_number
    }
    if stream:
        payload["stream"] = stream
        
    response = requests.post(f"{API_BASE_URL}/api/services/process", json=payload)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Error al procesar servicio {service_number}: {response.status_code}")
```

## Monitorización y Mantenimiento

### Ver Logs (Usando PM2)

```bash
# Ver logs en tiempo real
pm2 logs mq-importer-api

# Ver últimos N líneas
pm2 logs mq-importer-api --lines 200
```

### Reiniciar el Servicio

```bash
# Con PM2
pm2 restart mq-importer-api

# Con nssm
nssm restart MQImporterAPI

# Con servicios de Windows
net stop MQImporterAPI
net start MQImporterAPI
```

### Actualizar la Aplicación

1. Detener el servicio
2. Actualizar los archivos del proyecto
3. Ejecutar `npm install` si hay cambios en las dependencias
4. Reiniciar el servicio

## Solución de Problemas

### El servicio no inicia

1. Verificar logs en la carpeta `logs` del proyecto
2. Comprobar que Node.js está instalado correctamente: `node --version`
3. Comprobar que las dependencias están instaladas: `npm ls`
4. Verificar que el puerto configurado (por defecto 3000) no está en uso

### Error de conexión desde otras aplicaciones

1. Verificar que el servicio está corriendo: `pm2 status` o `nssm status MQImporterAPI`
2. Comprobar que el firewall de Windows permite conexiones al puerto configurado
3. Verificar que la configuración CORS en `.env` permite el origen de la aplicación cliente
4. Probar la conexión localmente para descartar problemas de red

### Problemas de rendimiento

1. Monitorizar uso de recursos: `pm2 monit`
2. Considerar aumentar la memoria disponible para Node.js: agregar `--max-old-space-size=4096` a los argumentos
3. Revisar los logs en busca de errores o advertencias que puedan indicar problemas

## Backup y Recuperación

Es importante realizar copias de seguridad periódicas de:

1. Archivos de configuración (`.env`)
2. Directorio `structures/` - Contiene las estructuras JSON extraídas
3. Directorio `settings/` - Contiene configuraciones de servicios

Para una restauración completa:

1. Instalar la aplicación en un nuevo servidor
2. Restaurar los directorios mencionados
3. Iniciar el servicio

## Acceso a la Interfaz Web (Carpeta Public)

La aplicación sirve automáticamente todos los archivos HTML, CSS y JavaScript alojados en la carpeta `public/`. Esta es una característica incorporada en Express.js que facilita el acceso a la interfaz web.

### Cómo acceder al contenido web

1. **Acceso local**: `http://localhost:3000/` cargará automáticamente el archivo `public/index.html`
2. **Acceso remoto**: `http://[HOSTNAME]:3000/` donde HOSTNAME es el nombre o IP del servidor

### Archivos específicos
- Para archivos específicos en la carpeta public: `http://[HOSTNAME]:3000/archivo.html`
- Para archivos en subcarpetas: `http://[HOSTNAME]:3000/css/styles.css` o `http://[HOSTNAME]:3000/js/main.js`

### Seguridad para recursos estáticos

Si necesita restringir el acceso a ciertos archivos en la carpeta `public/`, considere:

1. Mover los archivos sensibles fuera de la carpeta `public/`
2. Implementar middleware de autenticación en las rutas específicas
3. Utilizar un proxy inverso como NGINX o IIS con reglas de acceso más detalladas

## Consideraciones de Seguridad

1. **Firewall**: Configurar el firewall de Windows para permitir solo conexiones necesarias al puerto de la API
2. **CORS**: Limitar los orígenes permitidos en `ALLOWED_ORIGINS` solo a las aplicaciones que necesitan acceso
3. **HTTPS**: Para entornos de producción, considerar configurar un proxy inverso con NGINX o IIS que maneje HTTPS
4. **Acceso a recursos estáticos**: Revise y restrinja según sea necesario el acceso a archivos en la carpeta `public/`
