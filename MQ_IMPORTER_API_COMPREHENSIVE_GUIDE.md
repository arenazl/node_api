# MQ Importer API - Guía Completa de Implementación

## 📋 Resumen Ejecutivo

**MQ Importer API** es una aplicación Node.js que actúa como middleware entre sistemas modernos basados en JSON y sistemas mainframe legacy que utilizan strings de posiciones fijas. Su función principal es convertir bidirecccionalmente entre estos dos formatos, facilitando la integración de aplicaciones web modernas con sistemas bancarios tradicionales.

### Características Principales:
- **Conversión bidireccional**: JSON ↔ String de posiciones fijas
- **Gestión de servicios**: Carga de definiciones desde Excel
- **Configuración por canal**: Diferentes configuraciones para cada canal/servicio
- **Interfaz web completa**: 4 pestañas para gestión completa
- **API REST documentada**: Endpoints listos para integración
- **Cache de rendimiento**: Optimización para múltiples llamadas

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 16.x o superior
- npm 8.x o superior
- Windows/Linux/macOS

### Instalación Rápida
```bash
# Clonar repositorio o copiar archivos
cd C:\Code\mq importer-api\node_api

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# O iniciar en producción
npm start
```

### Variables de Entorno (.env)
```env
PORT=3000                           # Puerto del servidor
NODE_ENV=development               # Entorno (development/production)
FILE_UPLOAD_SIZE_LIMIT=50          # Límite de carga en MB
REQUEST_TIMEOUT=120000             # Timeout en ms (2 minutos)
ALLOWED_ORIGINS=*                  # CORS: '*' o dominios específicos
```

## 🏗️ Arquitectura del Sistema

### Flujo de Datos Principal

```
┌─────────────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│   Aplicación Web        │       │   MQ Importer API    │       │   Sistema Mainframe │
│   (Frontend JSON)       │ ←───→ │   (Middleware)       │ ←───→ │   (Strings Fijos)   │
└─────────────────────────┘       └──────────────────────┘       └─────────────────────┘
         JSON                      Conversión Bidireccional           String Fijo
```

### Estructura de Directorios

```
node_api/
├── server.js                    # 🚀 Punto de entrada principal
├── package.json                 # 📦 Definición del proyecto y dependencias
├── .env                        # 🔐 Variables de entorno
│
├── routes/                     # 🎯 ENDPOINTS API (Controladores)
│   ├── services.js            # ⭐ Endpoints principales (/sendmessage, /receivemessage)
│   ├── excel.js               # 📊 Carga y procesamiento de Excel
│   ├── service-config.js      # ⚙️ Configuración por servicio/canal
│   └── system-maintenance.js  # 🔧 Mantenimiento del sistema
│
├── utils/                      # 🔧 LÓGICA DE NEGOCIO
│   ├── message-creator.js     # ✅ JSON → String (IDA)
│   ├── message-analyzer.js    # ✅ String → JSON (VUELTA)
│   ├── service-lookup.js      # 🔍 Búsqueda y cache de servicios
│   ├── excel-parser.js        # 📄 Parser de archivos Excel
│   └── json-cleaner.js        # 🧹 Limpieza de JSON (quitar vacíos)
│
├── public/                     # 🌐 INTERFAZ WEB
│   ├── index.html             # 📱 UI principal con 4 pestañas
│   ├── js/                    # 📂 JavaScript del frontend
│   │   └── api_client/        
│   │       └── service-api-client.js  # 🔌 Cliente HTTP de ejemplo
│   └── css/                   # 🎨 Estilos
│
├── JsonStorage/               # 💾 ALMACENAMIENTO DE DATOS
│   ├── structures/            # 📋 Definiciones de servicios (JSON)
│   ├── settings/              # ⚙️ Configuraciones por canal
│   ├── uploads/               # 📤 Archivos Excel originales
│   └── headers/               # 📄 Headers de ejemplo
│
├── middleware/                # 🛡️ Middleware Express
│   └── request-logger.js      # 📝 Logger de requests
│
├── logs/                      # 📊 Archivos de log
└── tmp/                       # 🗑️ Archivos temporales
```

## 🔌 API Endpoints Principales

### 1. **Conversión IDA (JSON → String)**
```http
POST /api/services/sendmessage
Content-Type: application/json

Request Body:
{
  "header": {
    "serviceNumber": "1216",    // Número de servicio (requerido)
    "canal": "SM"              // Canal (requerido)
  },
  "parameters": {              // Campos del servicio
    "TIPO-DOC": "D",
    "NRO-DOC": "12345678",
    "NOMBRE": "JUAN PEREZ"
  }
}

Response:
{
  "request": { ... },          // Echo del request
  "response": "string_generado_de_posiciones_fijas",
  "estructura": { ... },       // Detalles de la estructura
  "estructuraCompleta": { ... } // Estructura completa del servicio
}
```

### 2. **Conversión VUELTA (String → JSON)**
```http
POST /api/services/receivemessage
Content-Type: application/json

Request Body:
{
  "header": {
    "serviceNumber": "1216",    // Número de servicio (requerido)
    "filterEmptyFields": true   // Filtrar campos vacíos (opcional)
  },
  "parameters": {
    "returnMsg": "SM1216SISTEMA...string_de_posiciones_fijas",  // String a parsear
    "simulate": false          // Si es true, genera datos simulados
  }
}

Response:
{
  "request": { ... },          // Echo del request
  "response": {                // JSON parseado
    "TIPO-DOC": "D",
    "NRO-DOC": "12345678",
    "NOMBRE": "JUAN PEREZ",
    "occurrence_1": [          // Arrays de ocurrencias
      { "CAMPO1": "VALOR1", "CAMPO2": "VALOR2" }
    ]
  }
}
```

### 3. **Listar Servicios Disponibles**
```http
GET /api/services
GET /api/services?refresh=true  // Forzar recarga de caché

Response:
{
  "services": [
    {
      "service_number": "1216",
      "service_name": "CONSULTA DE CLIENTE",
      "filename": "20250612T123456_SVO1216.xlsx",
      "timestamp": "2025-06-12T12:34:56.000Z"
    }
  ]
}
```

## 📊 Estructura de Datos

### Archivo de Estructura de Servicio (JSON)
Cada servicio tiene un archivo en `JsonStorage/structures/` con este formato:

```json
{
  "header_structure": {
    "fields": [
      {
        "name": "CANAL",
        "length": 3,
        "fieldType": "alfanumerico",
        "position": 1
      },
      {
        "name": "SERVICIO",
        "length": 4,
        "fieldType": "numerico",
        "position": 4
      }
    ],
    "totalLength": 102
  },
  "service_structure": {
    "serviceNumber": "1216",
    "serviceName": "CONSULTA DE CLIENTE",
    "request": {
      "elements": [
        {
          "type": "field",
          "name": "TIPO-DOC",
          "length": 1,
          "fieldType": "alfanumerico"
        },
        {
          "type": "occurrence",      // Arrays/Ocurrencias
          "id": "occ_1",
          "count": 10,                // Máximo 10 elementos
          "fields": [
            {
              "type": "field",
              "name": "CAMPO-ITEM",
              "length": 20,
              "fieldType": "alfanumerico"
            }
          ]
        }
      ]
    },
    "response": {
      "elements": [ ... ]             // Similar a request
    }
  }
}
```

### Archivo de Configuración por Canal
En `JsonStorage/settings/` se guardan configuraciones específicas:

```json
{
  "header": {
    "CANAL": "SM",
    "SERVICIO": "1216",
    "USUARIO": "SISTEMA",
    "TERMINAL": "WEB001"
  },
  "request": {
    "TIPO-DOC": "D",                  // Valores por defecto
    "campo_opcional": "valor_default"
  }
}
```

## 🔧 Componentes Clave del Código

### 1. **Message Creator** (`utils/message-creator.js`)
Convierte JSON a string de posiciones fijas:

```javascript
// Función principal
function createMessage(headerStructure, serviceStructure, messageData, section) {
    // 1. Crear cabecera con campos fijos
    const headerMessage = createHeaderMessage(headerStructure, messageData.header);
    
    // 2. Crear cuerpo del mensaje
    const dataMessage = createDataMessage(serviceStructure, messageData.data, section);
    
    // 3. Concatenar ambas partes
    return headerMessage + dataMessage;
}

// Formateo según tipo de campo
function formatValue(value, length, type, fieldName) {
    if (type === 'numerico') {
        // Rellenar con ceros a la izquierda
        return String(value).padStart(length, '0');
    } else {
        // Rellenar con espacios a la derecha
        return String(value).padEnd(length, ' ');
    }
}
```

### 2. **Message Analyzer** (`utils/message-analyzer.js`)
Convierte string de posiciones fijas a JSON:

```javascript
// Función principal
function parseMessage(message, headerStructure, serviceStructure) {
    // 1. Extraer y parsear cabecera
    const headerLength = calculateHeaderLength(headerStructure);
    const headerData = parseHeaderMessage(message.substring(0, headerLength), headerStructure);
    
    // 2. Parsear cuerpo del mensaje
    const dataMessage = message.substring(headerLength);
    const dataData = parseDataMessage(dataMessage, serviceStructure.response);
    
    return { header: headerData, data: dataData };
}

// Manejo de ocurrencias (arrays)
function parseOccurrence(message, startPosition, occurrenceElement, count) {
    const occurrenceData = [];
    let position = startPosition;
    
    for (let i = 0; i < count; i++) {
        const item = {};
        // Parsear cada campo de la ocurrencia
        for (const field of occurrenceElement.fields) {
            const value = message.substring(position, position + field.length).trim();
            item[field.name] = value;
            position += field.length;
        }
        occurrenceData.push(item);
    }
    
    return { occurrenceData, newPosition: position };
}
```

### 3. **Service Lookup** (`utils/service-lookup.js`)
Gestión y caché de servicios:

```javascript
// Cache global para rendimiento
global.serviceCache = {
    services: null,
    lastUpdate: null,
    structures: {}  // Cache de estructuras por serviceNumber
};

// Búsqueda de servicio con caché
async function findServiceByNumber(serviceNumber, useCache = true) {
    // 1. Verificar caché si está habilitado
    if (useCache && global.serviceCache.structures[serviceNumber]) {
        return global.serviceCache.structures[serviceNumber];
    }
    
    // 2. Buscar en archivos
    const structureFile = await findStructureFile(serviceNumber);
    
    // 3. Guardar en caché
    if (useCache) {
        global.serviceCache.structures[serviceNumber] = structureData;
    }
    
    return structureData;
}
```

## 🌐 Interfaz Web (Frontend)

La interfaz tiene 4 pestañas principales:

### 1. **CARGA** - Gestión de Archivos Excel
- Subir archivos Excel con definiciones de servicios
- Ver estructura parseada
- Validar formato

### 2. **CONFIGURACIÓN** - Setup por Canal
- Configurar valores por defecto para cada canal
- Definir parámetros de cabecera
- Guardar configuraciones específicas

### 3. **API** - Pruebas de Conversión
- **IDA**: Probar JSON → String
- **VUELTA**: Probar String → JSON
- Ver resultados en tiempo real
- Copiar ejemplos generados

### 4. **SERVICIOS** - Gestión de Versiones
- Listar todos los servicios disponibles
- Ver versiones históricas
- Gestionar archivos Excel y configuraciones
- Activar/desactivar servicios

## 🔄 Flujos de Trabajo Típicos

### 1. **Agregar Nuevo Servicio**
```
1. Subir Excel en pestaña CARGA
   ↓
2. Sistema parsea y genera estructura JSON
   ↓
3. Configurar valores por canal en CONFIGURACIÓN
   ↓
4. Servicio disponible en API
```

### 2. **Procesar Mensaje de Mainframe**
```
1. Mainframe envía string de posiciones fijas
   ↓
2. Aplicación llama POST /api/services/receivemessage
   ↓
3. API parsea según estructura del servicio
   ↓
4. Retorna JSON estructurado
```

### 3. **Enviar Mensaje a Mainframe**
```
1. Aplicación prepara JSON con datos
   ↓
2. Llama POST /api/services/sendmessage
   ↓
3. API genera string según estructura
   ↓
4. String listo para enviar a mainframe
```

## 🛡️ Manejo de Errores

### Validaciones Implementadas:
1. **Longitud de campos**: Validación estricta de longitudes
2. **Tipos de datos**: Numérico vs Alfanumérico
3. **Ocurrencias**: Validación de cantidad declarada vs real
4. **Campos requeridos**: ServiceNumber y Canal obligatorios

### Respuestas de Error:
```json
{
  "error": "Descripción del error",
  "details": "Información adicional (solo en development)"
}
```

## 🚀 Optimizaciones de Rendimiento

1. **Cache de Servicios**: Evita lecturas repetidas del disco
2. **Cache de Estructuras**: Mantiene en memoria las más usadas
3. **Procesamiento Asíncrono**: Todas las operaciones I/O son async
4. **Límites de Tamaño**: Control de archivos grandes (50MB default)
5. **Timeouts Configurables**: Prevención de requests colgados

## 📝 Ejemplo de Integración (Cliente)

```javascript
// Usando el ServiceApiClient incluido
const ServiceApiClient = window.ServiceApiClient;

// Enviar mensaje (IDA)
async function enviarMensaje() {
    try {
        const resultado = await ServiceApiClient.sendMessage(
            { serviceNumber: "1216", canal: "SM" },
            { "TIPO-DOC": "D", "NRO-DOC": "12345678" }
        );
        console.log("String generado:", resultado.response);
    } catch (error) {
        console.error("Error:", error);
    }
}

// Recibir mensaje (VUELTA)
async function recibirMensaje(stringMainframe) {
    try {
        const resultado = await ServiceApiClient.receiveMessage(
            { serviceNumber: "1216" },
            { returnMsg: stringMainframe }
        );
        console.log("JSON parseado:", resultado.response);
    } catch (error) {
        console.error("Error:", error);
    }
}
```

## 🔒 Consideraciones de Seguridad

1. **CORS Configurado**: Control de orígenes permitidos
2. **Validación de Entrada**: Todos los inputs son validados
3. **Sin Ejecución de Código**: Solo procesamiento de datos
4. **Logs de Auditoría**: Todas las operaciones son registradas
5. **Variables de Entorno**: Configuración sensible en .env

## 📈 Monitoreo y Salud

### Endpoint de Salud
```http
GET /health

Response:
{
  "status": "ok",
  "environment": {
    "nodeEnv": "development",
    "port": 3000,
    "platform": "win32",
    "nodeVersion": "v16.20.2"
  },
  "uptime": 12345,
  "memory": {
    "rss": "45 MB",
    "heapTotal": "20 MB",
    "heapUsed": "15 MB"
  },
  "directories": {
    "uploads": true,
    "structures": true,
    "logs": true,
    "tmp": true
  },
  "cache": {
    "services": 15,
    "structures": 5,
    "lastUpdate": "2025-06-29T10:30:00.000Z"
  }
}
```

## 🎯 Mejores Prácticas para Desarrollo

1. **Siempre usar el ServiceApiClient** para llamadas a la API
2. **Validar estructuras Excel** antes de cargar
3. **Configurar por canal** para evitar hardcodear valores
4. **Monitorear el cache** para detectar problemas de memoria
5. **Revisar logs** regularmente para errores no capturados
6. **Hacer backup** de JsonStorage antes de cambios mayores

## 🐛 Debugging y Troubleshooting

### Logs Disponibles:
- **Request logs**: En `middleware/request-logger.js`
- **Error logs**: En carpeta `logs/`
- **Console logs**: Extensivos en modo development

### Problemas Comunes:
1. **"Invalid Date" en versiones**: Verificar formato de timestamp en nombres de archivo
2. **Campos vacíos en respuesta**: Activar `filterEmptyFields` en request
3. **Error de longitud**: Revisar definición en Excel vs datos reales
4. **Cache desactualizado**: Usar endpoint `/api/services/refresh`

## 📚 Recursos Adicionales

- **Documentación API**: `/api` (interfaz web)
- **Ejemplos de Excel**: En `JsonStorage/uploads/`
- **Configuraciones de ejemplo**: En `JsonStorage/settings/`
- **Cliente de ejemplo**: `/public/js/api_client/service-api-client.js`

---

Esta implementación proporciona una solución robusta y escalable para la integración entre sistemas modernos y mainframes legacy, con una arquitectura clara y bien documentada que facilita el mantenimiento y la extensión futura del sistema.
