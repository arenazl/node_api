# Componentes y Tecnologías - MQ Importer API

## Stack Tecnológico

### Backend

- **Node.js**: v16.x - Runtime JavaScript
- **Express.js**: v4.18.2 - Framework web
- **Winston**: v3.17.0 - Sistema de logging
- **Morgan**: v1.10.0 - Middleware de logging HTTP
- **CORS**: v2.8.5 - Cross-Origin Resource Sharing
- **dotenv**: v16.3.1 - Gestión de variables de entorno

### Procesamiento de Archivos

- **XLSX**: v0.18.5 - Lectura y escritura de archivos Excel
- **express-fileupload**: v1.4.0 - Manejo de uploads
- **fs-extra**: v11.1.1 - Operaciones de sistema de archivos
- **glob**: v10.3.10 - Búsqueda de archivos con patrones

### Frontend

- **HTML5**: Estructura semántica
- **CSS3**: Estilos con variables CSS y flexbox
- **JavaScript ES6+**: Lógica del cliente
- **Fetch API**: Comunicación con backend
- **SimpleBar**: Scrollbars personalizadas

### Herramientas de Desarrollo

- **nodemon**: v2.0.22 - Recarga automática en desarrollo
- **PM2**: Gestión de procesos en producción
- **NSSM**: Servicio Windows alternativo

## Arquitectura de Componentes

### 1. Servidor Principal

```javascript
// server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const winston = require("winston");
```

**Responsabilidades**:

- Configuración del servidor Express
- Middleware de logging y CORS
- Servir archivos estáticos
- Gestión de rutas principales

### 2. Sistema de Rutas

#### Routes/Services.js - Endpoints Principales

```javascript
// Endpoints principales para aplicaciones externas
POST / api / services / sendmessage; // JSON → String
POST / api / services / receivemessage; // String → JSON
GET / api / services; // Lista servicios
GET / api / services / versions; // Versiones disponibles
```

#### Routes/API.js - API Legacy

```javascript
// Endpoints legacy para compatibilidad
POST /api/process-excel
GET  /api/services/:serviceNumber
```

### 3. Utilidades de Procesamiento

#### utils/message-creator.js

```javascript
// Conversión JSON → String posiciones fijas
class MessageCreator {
  createMessage(jsonData, structure) {
    // Formateo por tipo de campo
    // Manejo de ocurrencias
    // Validación de longitudes
  }
}
```

#### utils/message-analyzer.js

```javascript
// Conversión String → JSON estructurado
class MessageAnalyzer {
  analyzeMessage(stringData, structure) {
    // Parsing por posiciones fijas
    // Validación de coherencia
    // Limpieza de datos vacíos
  }
}
```

#### utils/excel-parser.js

```javascript
// Procesamiento archivos Excel
class ExcelParser {
  parseExcel(filePath) {
    // Extracción de metadatos
    // Generación estructuras JSON
    // Validación de formato
  }
}
```

### 4. Sistema de Almacenamiento

#### JsonStorage/structures/

```json
// Metadatos de servicios
{
  "header_structure": {...},
  "service_structure": {
    "serviceNumber": "1379",
    "serviceName": "...",
    "request": {...},
    "response": {...}
  }
}
```

#### JsonStorage/settings/

```json
// Configuraciones por canal
{
  "header": {
    "CANAL": "SM",
    "SERVICIO": "1379"
  },
  "request": {...}
}
```

### 5. Sistema de Logging

#### utils/logger.js

```javascript
// Configuración Winston
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: "logs/app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
    }),
  ],
});
```

## Componentes Frontend

### 1. Interfaz Principal

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>MQ Importer API</title>
    <link rel="stylesheet" href="css/styles.css" />
  </head>
  <body>
    <div class="tabs-container">
      <div class="tab-buttons">
        <button class="tab-button active" data-tab="carga">CARGA</button>
        <button class="tab-button" data-tab="configuracion">
          CONFIGURACIÓN
        </button>
        <button class="tab-button" data-tab="servicios">SERVICIOS</button>
      </div>
    </div>
  </body>
</html>
```

### 2. Cliente API JavaScript

```javascript
// public/js/api_client/service-api-client.js
class ServiceApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async sendMessage(serviceData) {
    const response = await fetch(`${this.baseUrl}/api/services/sendmessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serviceData),
    });
    return await response.json();
  }

  async receiveMessage(messageData) {
    const response = await fetch(
      `${this.baseUrl}/api/services/receivemessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      }
    );
    return await response.json();
  }
}
```

### 3. Gestión de Servicios UI

```javascript
// public/js/services_ui/common/servicios-manager.js
class ServiciosManager {
  constructor() {
    this.apiClient = new ServiceApiClient("/");
  }

  async loadServices() {
    try {
      const services = await this.apiClient.getServices();
      this.renderServices(services);
    } catch (error) {
      console.error("Error loading services:", error);
    }
  }

  async showVersionsModal(serviceNumber) {
    const versions = await this.apiClient.getServiceVersions(serviceNumber);
    this.renderVersionsModal(versions);
  }
}
```

### 4. Sistema de Estilos CSS

#### public/css/styles.css

```css
/* Variables CSS */
:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --background-color: #f8f9fa;
  --border-color: #dee2e6;
  --text-color: #333;
}

/* Layout flexbox */
.tabs-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.tab-buttons {
  display: flex;
  background-color: var(--primary-color);
  border-bottom: 2px solid var(--border-color);
}

.tab-button {
  flex: 1;
  padding: 15px;
  background-color: transparent;
  border: none;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.tab-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.tab-button.active {
  background-color: var(--secondary-color);
}
```

## Middlewares y Configuración

### 1. Request Logger

```javascript
// middleware/request-logger.js
const morgan = require("morgan");
const winston = require("winston");

const stream = {
  write: (message) => {
    winston.info(message.trim());
  },
};

module.exports = morgan("combined", { stream });
```

### 2. CORS Configuration

```javascript
// server.js
const cors = require("cors");

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

### 3. File Upload Handler

```javascript
// server.js
const fileUpload = require("express-fileupload");

app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    abortOnLimit: true,
    createParentPath: true,
  })
);
```

## Gestión de Dependencias

### package.json

```json
{
  "name": "mq-importer-api",
  "version": "1.0.0",
  "description": "API para importación y procesamiento de mensajes MQ",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "engines": {
    "node": "16.x",
    "npm": "8.x"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "express-fileupload": "^1.4.0",
    "fs-extra": "^11.1.1",
    "winston": "^3.17.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```

## Configuración del Entorno

### Variables de Entorno

```bash
# .env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
JSON_STORAGE_PATH=./JsonStorage
UPLOAD_PATH=./JsonStorage/uploads
```

### Configuración PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "mq-importer-api",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      max_memory_restart: "1G",
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_file: "logs/pm2-combined.log",
      time: true,
    },
  ],
};
```

## Seguridad y Validación

### Input Validation

```javascript
// utils/validation.js
const validateServiceData = (data) => {
  if (!data.header || !data.header.serviceNumber) {
    throw new Error("ServiceNumber is required");
  }

  if (!data.parameters) {
    throw new Error("Parameters are required");
  }

  return true;
};
```

### Error Handling

```javascript
// middleware/error-handler.js
const errorHandler = (err, req, res, next) => {
  logger.error(err.message, err);

  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
  });
};
```

## Monitoreo y Debugging

### Health Check

```javascript
// routes/health.js
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
```

### Debug Configuration

```javascript
// En development
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
  });
}
```

Este stack tecnológico proporciona una base sólida para el procesamiento de mensajes MQ, con escalabilidad, mantenibilidad y facilidad de uso como principios fundamentales.
