# 🏗️ CRÍTICO: Arquitectura Actual del Sistema

## Resumen Ejecutivo

MQ Importer API es un servicio middleware que actúa como puente entre aplicaciones modernas basadas en JSON y sistemas mainframe legacy que requieren formatos de string de posición fija.

## Arquitectura General

### Capas del Sistema

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│         (public/index.html)             │
│         4 tabs: CARGA, CONFIG,          │
│         API, SERVICIOS                  │
└────────────────┬────────────────────────┘
                 │
┌────────────────┴────────────────────────┐
│           API Layer                     │
│      (Express.js REST endpoints)        │
│   /api/services/sendmessage (IDA)       │
│   /api/services/receivemessage (VUELTA) │
└────────────────┬────────────────────────┘
                 │
┌────────────────┴────────────────────────┐
│      Business Logic Layer               │
│          (utils/*.js)                   │
│   message-creator.js, message-analyzer.js│
└────────────────┬────────────────────────┘
                 │
┌────────────────┴────────────────────────┐
│         Data Layer                      │
│    (File-based: JsonStorage/)           │
│  structures/, settings/, uploads/       │
└─────────────────────────────────────────┘
```

### Componentes Principales

1. **server.js**: Punto de entrada principal
   - Puerto: 3000 (configurable)
   - Middlewares: CORS, file upload, JSON parsing
   - Health check endpoint: `/health`

2. **Routes** (routes/):
   - `services.js`: Endpoints principales de conversión
   - `excel.js`: Carga y procesamiento de archivos Excel
   - `service-config.js`: Configuración de servicios
   - `api.js`: Endpoints legacy

3. **Utils** (utils/):
   - `message-creator.js`: Convierte JSON → Fixed String
   - `message-analyzer.js`: Convierte Fixed String → JSON
   - `excel-parser.js`: Procesa archivos Excel
   - `service-lookup.js`: Sistema de búsqueda con caché

## Decisiones Arquitecturales Clave

### ✅ Fortalezas

1. **Separación de Responsabilidades**: Cada módulo tiene un propósito claro
2. **Cache Global**: `global.serviceCache` mejora significativamente el rendimiento
3. **Modularidad**: Fácil agregar nuevas rutas o utilidades
4. **Sin Dependencias de BD**: Simplifica el despliegue

### ⚠️ Puntos Críticos

1. **Almacenamiento basado en archivos**: 
   - Limitación de escalabilidad
   - Posibles problemas de concurrencia
   - Dificulta consultas complejas

2. **Estado Global**:
   - `global.serviceCache` puede causar problemas en entornos cluster
   - Dificulta las pruebas unitarias

3. **Falta de Tipos**:
   - JavaScript puro sin TypeScript
   - Mayor probabilidad de errores en runtime

## Flujo de Datos Principal

### IDA (JSON → Fixed String)
```
Cliente → POST /api/services/sendmessage
         → validateSendMessageRequest()
         → loadServiceData()
         → message-creator.js
         → Fixed String Response
```

### VUELTA (Fixed String → JSON)
```
Cliente → POST /api/services/receivemessage
         → validateReceiveMessageRequest()
         → loadServiceData()
         → message-analyzer.js
         → json-cleaner.js
         → JSON Response
```

## Impacto y Riesgos

- **Alto Impacto**: El sistema es crítico para la integración mainframe
- **Riesgo de Corrupción de Datos**: Sin transacciones atómicas en archivos
- **Punto Único de Fallo**: No hay redundancia en el almacenamiento

## Acciones Inmediatas Requeridas

1. Implementar bloqueo de archivos para evitar corrupción
2. Agregar validación de tipos en puntos de entrada
3. Documentar el formato exacto de los mensajes
4. Crear respaldos automáticos de JsonStorage/