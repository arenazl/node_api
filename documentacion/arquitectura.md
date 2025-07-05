# Arquitectura - MQ Importer API

## Descripción General

**MQ Importer API** es una aplicación Node.js que actúa como middleware entre sistemas modernos (JSON/REST) y sistemas mainframe (strings de posiciones fijas). Facilita la integración bidireccional con procesamiento de archivos Excel para definir estructuras de servicios MQ.

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                 FRONTEND (HTML/JS/CSS)                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │   CARGA     │ │    CONFIG   │ │   SERVICIOS │      │
│  │ Excel → JSON│ │ Por Canal   │ │  Gestión    │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                      │                                 │
│                      ▼                                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              API CLIENTE JS                         │ │
│  │           (ServiceApiClient)                        │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                              │
                    HTTP/AJAX REST API
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js)                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              RUTAS (Controllers)                    │ │
│  │  /api/services/sendmessage    (JSON → String)      │ │
│  │  /api/services/receivemessage (String → JSON)      │ │
│  │  /api/services/               (Gestión)            │ │
│  └─────────────────────────────────────────────────────┘ │
│                              │                           │
│                              ▼                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │            UTILS (Lógica de Negocio)               │ │
│  │  message-creator.js   (JSON → String fijo)         │ │
│  │  message-analyzer.js  (String fijo → JSON)         │ │
│  │  service-lookup.js    (Gestión servicios)          │ │
│  └─────────────────────────────────────────────────────┘ │
│                              │                           │
│                              ▼                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │               ALMACENAMIENTO                        │ │
│  │  JsonStorage/structures/  (Metadatos)              │ │
│  │  JsonStorage/settings/    (Configuraciones)        │ │
│  │  JsonStorage/uploads/     (Archivos Excel)         │ │
│  │  JsonStorage/headers/     (Headers ejemplo)        │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                              │
                    Interfaz Externa
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                 SISTEMA MAINFRAME                       │
│              (Strings posiciones fijas)                 │
└─────────────────────────────────────────────────────────┘
```

## Flujo de Trabajo

### 1. Configuración Inicial
```
Excel Upload → Parser → Estructura JSON → Configuración
     │             │            │               │
     ▼             ▼            ▼               ▼
┌─────────┐ ┌──────────┐ ┌─────────────┐ ┌─────────────┐
│ .xlsx   │ │ Metadata │ │ JSON Schema │ │ Settings    │
│ Upload  │ │ Extract  │ │ Generation  │ │ per Channel │
└─────────┘ └──────────┘ └─────────────┘ └─────────────┘
```

### 2. Operaciones Principales

#### IDA (JSON → String fijo)
```
JSON Request → ServiceApiClient → /api/services/sendmessage
                                        │
                                        ▼
                          message-creator.js
                                        │
                                        ▼
                              String posiciones fijas
```

#### VUELTA (String fijo → JSON)
```
String fijo → ServiceApiClient → /api/services/receivemessage
                                        │
                                        ▼
                          message-analyzer.js
                                        │
                                        ▼
                                 JSON estructurado
```

## Estructura de Directorios

```
node_api/
├── server.js                    # Punto de entrada
├── routes/                      # Controladores API
│   ├── services.js             # ⭐ Endpoints principales
│   ├── ida-routes.js           # Rutas IDA
│   ├── vuelta-routes.js        # Rutas VUELTA
│   └── api.js                  # API legacy
├── utils/                       # Lógica de negocio
│   ├── message-creator.js      # JSON → String
│   ├── message-analyzer.js     # String → JSON
│   ├── service-lookup.js       # Gestión servicios
│   └── excel-parser.js         # Procesamiento Excel
├── public/                      # Frontend
│   ├── index.html              # Interfaz principal
│   ├── css/                    # Estilos
│   └── js/                     # Scripts cliente
│       ├── api_client/         # Cliente API
│       └── services_ui/        # UI servicios
├── JsonStorage/                 # Almacenamiento
│   ├── structures/             # Metadatos servicios
│   ├── settings/               # Configuraciones
│   ├── uploads/                # Archivos Excel
│   └── headers/                # Headers ejemplo
└── logs/                        # Logs aplicación
```

## Componentes Principales

### 1. Services Router
- **Archivo**: `routes/services.js`
- **Responsabilidad**: Endpoints públicos para aplicaciones externas
- **Funciones clave**:
  - `POST /api/services/sendmessage` - Conversión JSON → String
  - `POST /api/services/receivemessage` - Conversión String → JSON
  - `GET /api/services` - Lista servicios disponibles

### 2. Message Creator
- **Archivo**: `utils/message-creator.js`
- **Responsabilidad**: Conversión JSON → String posiciones fijas
- **Características**:
  - Formateo por tipo de campo
  - Manejo de ocurrencias (arrays)
  - Validación de longitudes

### 3. Message Analyzer
- **Archivo**: `utils/message-analyzer.js`
- **Responsabilidad**: Conversión String → JSON estructurado
- **Características**:
  - Parsing por posiciones fijas
  - Validación de coherencia
  - Limpieza de datos vacíos

### 4. Service Lookup
- **Archivo**: `utils/service-lookup.js`
- **Responsabilidad**: Gestión y búsqueda de servicios
- **Características**:
  - Cache de servicios
  - Búsqueda por número de servicio
  - Carga desde Excel o JSON

### 5. Excel Parser
- **Archivo**: `utils/excel-parser.js`
- **Responsabilidad**: Procesamiento de archivos Excel
- **Características**:
  - Extracción de metadatos
  - Generación de estructuras JSON
  - Validación de formato

## Gestión de Datos

### Estructura de Servicios
```json
{
  "header_structure": {
    "totalLength": 102,
    "fields": [
      {
        "name": "CANAL",
        "length": 3,
        "type": "alfanumerico",
        "required": "OBLIGATORIO"
      }
    ]
  },
  "service_structure": {
    "serviceNumber": "1379",
    "serviceName": "Consulta Destinos Financiación",
    "request": {
      "totalLength": 7,
      "elements": [...]
    },
    "response": {
      "totalLength": 31506,
      "elements": [...]
    }
  }
}
```

### Configuración por Canal
```json
{
  "header": {
    "CANAL": "SM",
    "SERVICIO": "1379",
    "USUARIO": "SISTEMA"
  },
  "request": {
    "campo_default": "valor"
  }
}
```

## Servicios Implementados

- **SVO1004**: Consulta Cliente por NIP
- **SVO1033**: Consulta Posición Préstamo por NIC
- **SVO1041**: Consulta Territorio
- **SVO1083**: Consulta de Impuestos
- **SVO1379**: Consulta Destinos de Financiación
- **SVO3088**: Imputador Genérico
- **SVO3147**: BM Contratos Relacionados

## Patrones de Arquitectura

### 1. Facade Pattern
- **Ubicación**: `routes/services.js`
- **Propósito**: Interfaz simple para operaciones complejas
- **Beneficio**: Abstrae complejidad interna

### 2. Strategy Pattern
- **Ubicación**: `utils/message-creator.js`
- **Propósito**: Diferentes estrategias de formateo
- **Beneficio**: Flexibilidad para diferentes tipos de datos

### 3. Repository Pattern
- **Ubicación**: `utils/service-lookup.js`
- **Propósito**: Abstracción de acceso a datos
- **Beneficio**: Separación de lógica de negocio y persistencia

### 4. Middleware Pattern
- **Ubicación**: `middleware/request-logger.js`
- **Propósito**: Funcionalidad transversal
- **Beneficio**: Reutilización y separación de responsabilidades

## Escalabilidad y Mantenibilidad

### Ventajas de la Arquitectura
- **Modularidad**: Componentes independientes
- **Separación de responsabilidades**: Cada módulo tiene una función específica
- **Facilidad de testing**: Componentes aislados
- **Configurabilidad**: Servicios configurables por canal
- **Extensibilidad**: Fácil agregar nuevos servicios

### Consideraciones de Performance
- **Cache de servicios**: Evita lecturas repetitivas
- **Almacenamiento JSON**: Acceso rápido a metadatos
- **Logs estructurados**: Facilita debugging y monitoreo
- **Validación por capas**: Detección temprana de errores

### Puntos de Mejora Identificados
1. **Manejo de errores**: Estandarizar respuestas
2. **Validación**: Implementar validación consistente
3. **Tests**: Agregar suite de pruebas
4. **Documentación**: Completar documentación técnica
5. **Monitoring**: Implementar métricas y alertas 