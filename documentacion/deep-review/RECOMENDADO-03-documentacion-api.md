# 📚 RECOMENDADO: Documentación de API y Developer Experience

## Resumen

Aunque el código está bien comentado, la falta de documentación formal de API dificulta la integración para desarrolladores externos y aumenta la curva de aprendizaje.

## Estado Actual de Documentación

### Fortalezas ✅
- Comentarios JSDoc en funciones clave
- Archivo CLAUDE.md con overview del proyecto
- Estructura de carpetas intuitiva
- Nombres de variables descriptivos

### Debilidades ❌
- Sin especificación OpenAPI/Swagger
- Sin ejemplos de integración completos
- Sin documentación de errores posibles
- Sin guía de migración entre versiones

## Documentación API Propuesta

### 1. OpenAPI Specification

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: MQ Importer API
  version: 1.0.0
  description: API para conversión entre JSON y formatos fixed-position para mainframe
  contact:
    email: support@mqimporter.com
  license:
    name: MIT

servers:
  - url: http://localhost:3000
    description: Development server
  - url: https://api.mqimporter.com
    description: Production server

paths:
  /api/services/sendmessage:
    post:
      summary: Convierte JSON a fixed-position string (IDA)
      tags:
        - Message Conversion
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SendMessageRequest'
            examples:
              basic:
                $ref: '#/components/examples/SendMessageBasic'
              withOptionalFields:
                $ref: '#/components/examples/SendMessageComplete'
      responses:
        '200':
          description: Conversión exitosa
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SendMessageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/ServiceNotFound'
        '500':
          $ref: '#/components/responses/InternalError'

  /api/services/receivemessage:
    post:
      summary: Convierte fixed-position string a JSON (VUELTA)
      tags:
        - Message Conversion
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReceiveMessageRequest'
      responses:
        '200':
          description: Parsing exitoso
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReceiveMessageResponse'

  /api/services:
    get:
      summary: Lista servicios disponibles
      tags:
        - Service Management
      parameters:
        - name: refresh
          in: query
          description: Forzar actualización de caché
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: Lista de servicios
          content:
            application/json:
              schema:
                type: object
                properties:
                  services:
                    type: array
                    items:
                      $ref: '#/components/schemas/Service'

components:
  schemas:
    SendMessageRequest:
      type: object
      required:
        - header
      properties:
        header:
          type: object
          required:
            - serviceNumber
            - canal
          properties:
            serviceNumber:
              type: string
              pattern: '^[0-9]{4}$'
              example: "1004"
            canal:
              type: string
              maxLength: 10
              example: "SM"
        parameters:
          type: object
          additionalProperties: true
          example:
            campo1: "valor1"
            campo2: 12345

    SendMessageResponse:
      type: object
      properties:
        request:
          $ref: '#/components/schemas/SendMessageRequest'
        response:
          type: string
          description: Mensaje en formato fixed-position
          example: "SM  1004    SISTEMA   valor1      00012345..."
        estructura:
          type: object
          description: Estructura detallada del mensaje generado

  responses:
    BadRequest:
      description: Request inválido
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: "header.serviceNumber and header.canal are required"
```

### 2. Documentación Interactiva con Swagger UI

```javascript
// swagger-setup.js
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./openapi.yaml');

// Personalización de UI
const options = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "MQ Importer API Docs",
  customfavIcon: "/favicon.ico"
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
```

### 3. Guía de Inicio Rápido

```markdown
# 🚀 Guía de Inicio Rápido

## Instalación

```bash
npm install mq-importer-client
```

## Ejemplo Básico

```javascript
const MQImporter = require('mq-importer-client');

const client = new MQImporter({
  baseURL: 'http://localhost:3000',
  timeout: 30000
});

// Convertir JSON a Fixed String (IDA)
async function sendMessage() {
  try {
    const result = await client.sendMessage({
      header: {
        serviceNumber: '1004',
        canal: 'SM'
      },
      parameters: {
        nombreCliente: 'Juan Pérez',
        monto: 1500.00
      }
    });
    
    console.log('Fixed String:', result.response);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Convertir Fixed String a JSON (VUELTA)
async function receiveMessage() {
  const fixedString = "SM  1004    SISTEMA   ..."; // String del mainframe
  
  const result = await client.receiveMessage({
    header: {
      serviceNumber: '1004'
    },
    parameters: {
      returnMsg: fixedString
    }
  });
  
  console.log('Parsed JSON:', result.response);
}
```

## Manejo de Errores

```javascript
client.on('error', (error) => {
  if (error.code === 'SERVICE_NOT_FOUND') {
    console.error('El servicio no existe. Verificar número.');
  } else if (error.code === 'INVALID_FORMAT') {
    console.error('Formato de mensaje inválido.');
  }
});
```
```

### 4. Documentación de Errores

```markdown
# 🚨 Códigos de Error

## Errores de Cliente (4xx)

### 400 - Bad Request
```json
{
  "error": "header.serviceNumber and header.canal are required",
  "code": "MISSING_REQUIRED_FIELDS",
  "fields": ["header.serviceNumber", "header.canal"]
}
```

### 404 - Not Found
```json
{
  "error": "Structure not found for service 1004",
  "code": "SERVICE_NOT_FOUND",
  "serviceNumber": "1004"
}
```

## Errores de Servidor (5xx)

### 500 - Internal Server Error
```json
{
  "error": "Error during message processing",
  "code": "PROCESSING_ERROR",
  "timestamp": "2024-01-20T10:30:00Z"
}
```

## Códigos de Error Personalizados

| Código | Descripción | Acción Recomendada |
|--------|-------------|-------------------|
| SERVICE_NOT_FOUND | El servicio no está registrado | Verificar número o cargar estructura |
| INVALID_MESSAGE_FORMAT | Formato de mensaje incorrecto | Revisar longitud y caracteres |
| MISSING_REQUIRED_FIELDS | Campos obligatorios faltantes | Incluir todos los campos requeridos |
| STRUCTURE_PARSE_ERROR | Error al parsear estructura | Verificar archivo Excel |
| MESSAGE_TOO_LONG | Mensaje excede longitud máxima | Reducir contenido o verificar estructura |
```

### 5. SDK Client Library

```javascript
// sdk/mq-importer-client.js
class MQImporterClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'http://localhost:3000';
    this.timeout = config.timeout || 30000;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };
  }

  async sendMessage(data) {
    return this._request('POST', '/api/services/sendmessage', data);
  }

  async receiveMessage(data) {
    return this._request('POST', '/api/services/receivemessage', data);
  }

  async listServices(refresh = false) {
    return this._request('GET', `/api/services?refresh=${refresh}`);
  }

  async _request(method, path, data = null) {
    try {
      const response = await fetch(`${this.baseURL}${path}`, {
        method,
        headers: this.headers,
        body: data ? JSON.stringify(data) : null,
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new MQImporterError(error.error, error.code, response.status);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof MQImporterError) throw error;
      throw new MQImporterError('Network error', 'NETWORK_ERROR', 0);
    }
  }
}

class MQImporterError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

module.exports = MQImporterClient;
```

### 6. Postman Collection

```json
{
  "info": {
    "name": "MQ Importer API",
    "description": "Collection for testing MQ Importer endpoints",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Message Conversion",
      "item": [
        {
          "name": "Send Message (IDA)",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"header\": {\n    \"serviceNumber\": \"1004\",\n    \"canal\": \"SM\"\n  },\n  \"parameters\": {\n    \"campo1\": \"test\"\n  }\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/api/services/sendmessage",
              "host": ["{{baseUrl}}"],
              "path": ["api", "services", "sendmessage"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "type": "string"
    }
  ]
}
```

## Herramientas de Documentación

### 1. Generador de Docs Automático

```javascript
// scripts/generate-docs.js
const jsdoc2md = require('jsdoc-to-markdown');
const fs = require('fs-extra');

async function generateDocs() {
  // Generar docs de utils
  const utilsDocs = await jsdoc2md.render({
    files: 'utils/*.js',
    template: fs.readFileSync('docs/templates/utils.hbs', 'utf8')
  });
  
  await fs.writeFile('docs/api/utils.md', utilsDocs);
  
  // Generar docs de routes
  const routesDocs = await jsdoc2md.render({
    files: 'routes/*.js',
    template: fs.readFileSync('docs/templates/routes.hbs', 'utf8')
  });
  
  await fs.writeFile('docs/api/routes.md', routesDocs);
}

generateDocs();
```

### 2. Validación de Ejemplos

```javascript
// scripts/validate-examples.js
const examples = require('./docs/examples');
const client = require('./sdk/mq-importer-client');

async function validateExamples() {
  for (const example of examples) {
    try {
      await client[example.method](example.data);
      console.log(`✅ ${example.name} - OK`);
    } catch (error) {
      console.error(`❌ ${example.name} - Failed: ${error.message}`);
    }
  }
}
```

## Mejoras de Developer Experience

### 1. CLI Tool

```javascript
#!/usr/bin/env node
// cli/mq-importer.js

const { program } = require('commander');
const client = require('../sdk/mq-importer-client');

program
  .version('1.0.0')
  .description('MQ Importer CLI');

program
  .command('send <service> <canal>')
  .description('Send a message')
  .option('-d, --data <json>', 'Message data as JSON')
  .action(async (service, canal, options) => {
    const data = JSON.parse(options.data || '{}');
    const result = await client.sendMessage({
      header: { serviceNumber: service, canal },
      parameters: data
    });
    console.log(result.response);
  });

program.parse(process.argv);
```

### 2. VS Code Extension

```json
// .vscode/mq-importer.code-snippets
{
  "Send Message": {
    "prefix": "mqsend",
    "body": [
      "await client.sendMessage({",
      "  header: {",
      "    serviceNumber: '$1',",
      "    canal: '$2'",
      "  },",
      "  parameters: {",
      "    $3",
      "  }",
      "});"
    ],
    "description": "Send message to MQ Importer"
  }
}
```

## Plan de Implementación

### Fase 1 (1 semana)
- Crear especificación OpenAPI básica
- Configurar Swagger UI
- Documentar endpoints principales

### Fase 2 (2 semanas)
- Desarrollar SDK JavaScript
- Crear colección Postman
- Escribir guía de inicio rápido

### Fase 3 (1 mes)
- Documentar todos los códigos de error
- Crear ejemplos para cada caso de uso
- Implementar generación automática de docs

### Fase 4 (Continuo)
- Mantener docs actualizados con cambios
- Recopilar feedback de desarrolladores
- Mejorar basado en uso real