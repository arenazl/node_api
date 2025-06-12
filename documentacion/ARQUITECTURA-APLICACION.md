# Arquitectura de la Aplicación MQ Importer API

## 📋 Descripción General

La **MQ Importer API** es una aplicación Node.js que actúa como procesador de mensajes Excel para archivos SVO (Servicios de Valor Añadido). Su propósito principal es facilitar la integración con sistemas mainframe que manejan strings de posiciones fijas, proporcionando una interfaz web moderna y APIs REST para la conversión bidireccional entre JSON y strings de longitud fija.

## 🏗️ Arquitectura del Sistema

### Frontend (Interfaz Web)
```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (HTML/JS)                   │
├─────────────────────────────────────────────────────────┤
│  Tab 1: CARGA     │  Tab 2: CONFIGURACIÓN             │
│  - Subida Excel   │  - Setup por servicio/canal       │
│  - Estructura     │  - Parámetros cabecera/request    │
│                   │                                    │
│  Tab 3: API       │  Tab 4: SERVICIOS                 │
│  - IDA (JSON→STR) │  - Gestión de servicios           │
│  - VUELTA (STR→JSON) │  - Versiones disponibles       │
└─────────────────────────────────────────────────────────┘
                              │
                    HTTP/AJAX (ServiceApiClient)
                              │
                              ▼
```

### Backend (Node.js API)
```
┌─────────────────────────────────────────────────────────┐
│                  BACKEND REST API                       │
├─────────────────────────────────────────────────────────┤
│  🔗 INTERFAZ PÚBLICA (REST Endpoints)                  │
│  ├─ POST /api/services/sendmessage     ← JSON → String │
│  ├─ POST /api/services/receivemessage  ← String → JSON │
│  └─ [Otros endpoints de gestión]                       │
├─────────────────────────────────────────────────────────┤
│  ROUTES (Controllers)                                   │
│  ├─ /routes/services.js     ← ⭐ ENDPOINTS PRINCIPALES │
│  ├─ /routes/ida-routes.js   ← Rutas de conversión IDA  │
│  ├─ /routes/vuelta-routes.js ← Rutas de conversión VUELTA │
│  └─ /routes/api.js          ← API legacy               │
├─────────────────────────────────────────────────────────┤
│  UTILS (Business Logic)                                 │
│  ├─ message-creator.js      ← Lógica JSON→String       │
│  ├─ message-analyzer.js     ← Lógica String→JSON       │
│  ├─ service-lookup.js       ← Gestión de servicios     │
│  └─ [Otros utilitarios]                                │
├─────────────────────────────────────────────────────────┤
│  STORAGE                                                │
│  ├─ JsonStorage/structures/  ← Metadatos de servicios  │
│  ├─ JsonStorage/settings/    ← Configuraciones         │
│  ├─ JsonStorage/uploads/     ← Archivos Excel          │
│  └─ JsonStorage/headers/     ← Headers de ejemplo      │
└─────────────────────────────────────────────────────────┘
                              │
                    API Externa (Mainframe)
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  SISTEMA EXTERNO                        │
│            (Solo maneja strings fijos)                  │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Trabajo Principal

### 1. Fase de Configuración Inicial
```
Excel Upload → Parser → Estructura JSON → Configuración por Canal
     │             │            │               │
     ▼             ▼            ▼               ▼
┌─────────┐ ┌──────────┐ ┌─────────────┐ ┌─────────────┐
│ .xls/   │ │ Metadata │ │ JSON Schema │ │ Settings    │
│ .xlsx   │ │ Parsing  │ │ Generation  │ │ per Service │
└─────────┘ └──────────┘ └─────────────┘ └─────────────┘
```

### 2. Operaciones Principales

#### **IDA (JSON → String fijo)**
```
Frontend JSON → ServiceApiClient → /api/services/sendmessage
                                        │
                                        ▼
                          message-creator.js (utils)
                                        │
                                        ▼
                              String de posiciones fijas
```

#### **VUELTA (String fijo → JSON)**
```
String fijo → ServiceApiClient → /api/services/receivemessage
                                        │
                                        ▼
                          message-analyzer.js (utils)
                                        │
                                        ▼
                                 JSON estructurado
```

## 📁 Estructura de Directorios

```
node_api/
├── routes/                       # 🎯 CONTROLLERS & API ENDPOINTS
│   ├── services.js              # ⭐ ENDPOINTS PRINCIPALES
│   │                            #   - POST /api/services/sendmessage
│   │                            #   - POST /api/services/receivemessage
│   ├── ida-routes.js            # Rutas específicas de IDA
│   ├── vuelta-routes.js         # Rutas específicas de VUELTA
│   └── [otros routes]
├── utils/                        # 🔧 LÓGICA DE NEGOCIO
│   ├── message-creator.js       # ✅ JSON → String de posiciones fijas
│   ├── message-analyzer.js      # ✅ String de posiciones fijas → JSON
│   ├── service-lookup.js        # Gestión de servicios
│   └── [otros utils]
├── public/                       # 🌐 FRONTEND
│   ├── index.html               # Interfaz principal
│   ├── js/api_client/           # ServiceApiClient (ejemplo de consumo)
│   └── [assets]
└── JsonStorage/                  # 💾 ALMACENAMIENTO
    ├── structures/              # Metadatos de servicios
    ├── settings/                # Configuraciones por canal
    ├── uploads/                 # Archivos Excel originales
    └── headers/                 # Headers de ejemplo
```

## 🔧 Componentes Clave

### 1. **Services Router (Endpoints Principales)**
- **Ubicación**: `/routes/services.js`
- **Propósito**: Contiene los endpoints públicos principales para aplicaciones externas
- **Endpoints principales**:
  - `POST /api/services/sendmessage` - Convierte JSON a string fijo (IDA)
  - `POST /api/services/receivemessage` - Convierte string fijo a JSON (VUELTA)
  - `GET /api/services` - Obtiene lista de servicios disponibles

### 2. **Message Creator**
- **Ubicación**: `/utils/message-creator.js` (✅ movido desde `/api/`)
- **Responsabilidad**: Conversión JSON → String de posiciones fijas
- **Funciones clave**:
  - Formateo por tipo de campo (numérico/alfanumérico)
  - Manejo de ocurrencias (arrays)
  - Validación de longitudes

### 3. **Message Analyzer**
- **Ubicación**: `/utils/message-analyzer.js` (✅ movido desde `/api/`)
- **Responsabilidad**: Conversión String → JSON estructurado
- **Funciones clave**:
  - Parsing por posiciones fijas
  - Validación de coherencia de ocurrencias
  - Limpieza de datos vacíos

### 4. **ServiceApiClient (Ejemplo de Cliente)**
- **Ubicación**: `/public/js/api_client/service-api-client.js`
- **Propósito**: Ejemplo de cliente HTTP para mostrar cómo consumir la API
- **Métodos**:
  - `sendMessage()` - Llama a `/api/services/sendmessage`
  - `receiveMessage()` - Llama a `/api/services/receivemessage`
  - `getServices()` - Obtiene lista de servicios

### 5. **Service Lookup**
- **Ubicación**: `/utils/service-lookup.js`
- **Propósito**: Gestión y búsqueda de servicios disponibles
- **Funciones clave**:
  - Cache de servicios para performance
  - Búsqueda por número de servicio
  - Carga de estructuras desde Excel o JSON

## 🛠️ Endpoints Principales

### **Conversión IDA (JSON → String)**
```http
POST /api/services/sendmessage
Content-Type: application/json

{
  "header": {
    "serviceNumber": "1216",
    "canal": "SM"
  },
  "parameters": {
    "campo1": "valor1",
    "campo2": "valor2"
  }
}
```

### **Conversión VUELTA (String → JSON)**
```http
POST /api/services/receivemessage
Content-Type: application/json

{
  "header": {
    "serviceNumber": "1216"
  },
  "parameters": {
    "returnMsg": "string_de_posiciones_fijas_aqui..."
  }
}
```

## 📊 Gestión de Datos

### **Archivo de Estructura**
Cada servicio tiene un archivo JSON con la metadata:
```json
{
  "header_structure": {
    "fields": [
      { "name": "CANAL", "length": 3, "fieldType": "alfanumerico" },
      { "name": "SERVICIO", "length": 4, "fieldType": "numerico" }
    ],
    "totalLength": 102
  },
  "service_structure": {
    "request": { "elements": [...] },
    "response": { "elements": [...] }
  }
}
```

### **Archivo de Configuración**
Por cada servicio/canal se pueden tener configuraciones específicas:
```json
{
  "header": {
    "CANAL": "SM",
    "SERVICIO": "1216",
    "USUARIO": "SISTEMA"
  },
  "request": {
    "campo_personalizado": "valor_default"
  }
}
```

## 🔗 Integración con Sistemas Externos

La aplicación actúa como **middleware** entre:

1. **Frontend moderno** (JSON, REST APIs)
2. **Sistemas mainframe** (strings de posiciones fijas)

```
Aplicación Web ↔ MQ Importer API ↔ Sistema Mainframe
     (JSON)           (Conversión)        (String fijo)
```

## ✅ Beneficios de la Arquitectura

### **Separación de Responsabilidades**
- **Frontend**: Solo UI/UX
- **API Layer**: Interfaz pública limpia (Facade)
- **Business Logic**: Conversiones y validaciones
- **Storage**: Persistencia de configuraciones

### **Mantenibilidad**
- Código modular y reutilizable
- Referencias centralizadas fáciles de actualizar
- Facade pattern para estabilidad de API

### **Escalabilidad**
- Fácil agregar nuevos servicios
- Configuraciones por canal independientes
- Cache de estructuras para rendimiento

### **Testing y Debug**
- Componentes independientes fáciles de testear
- Logs detallados por capa
- Validaciones en múltiples niveles

## 🎯 Mejoras Recientes (Gestión de Versiones)

### **Popup de Versiones Mejorado**
Se implementaron mejoras significativas en el tab de "SERVICIOS" para la gestión de versiones:

#### **Endpoint de Versiones**
- **Ubicación**: `/routes/services.js → GET /api/services/versions`
- **Funcionalidad**: 
  - Combina información de archivos Excel (`uploads/`) con configuraciones (`settings/`)
  - Genera timestamps válidos desde nombres de archivos
  - Evita duplicación de entradas

#### **Frontend - Popup de Versiones**
- **Ubicación**: `/public/js/services_ui/common/servicios-manager.js`
- **Mejoras implementadas**:
  - ✅ **Fechas corregidas**: Parsing robusto elimina "Invalid Date"
  - ✅ **Nombres de configuración**: Muestra `1004-LO-v3.json` con canal visible
  - ✅ **Sin duplicados**: Lógica de filtrado para evitar entradas repetidas
  - ✅ **Tooltips informativos**: Detalles adicionales al pasar el mouse

#### **Flujo de Gestión de Versiones**
```
Click "Versiones" → showVersionsModal() → fetchServiceVersions()
                                              │
                                              ▼
                                    GET /api/services/versions
                                              │
                                              ▼
                          Backend combina Excel + Settings info
                                              │
                                              ▼
                            updateVersionsTable() con datos limpios
```

#### **Beneficios para el Usuario**
- **Identificación clara**: Canal visible en nombre de archivo (ej: `1004-LO-v3.json`)
- **Fechas legibles**: Formato `12/06/2025, 05:25:00` en lugar de "Invalid Date"
- **Lista limpia**: Sin versiones duplicadas
- **Información completa**: Tooltips con detalles del archivo Excel original

### **Estructura de Datos de Versiones**
```json
{
  "serviceNumber": "1004",
  "versions": [
    {
      "filename": "20250612T052445_SVO1004-Consulta Cliente.xlsx",
      "settings_file": "1004-LO-v3.json",
      "timestamp": "2025-06-12T05:24:45.000Z",
      "service_number": "1004",
      "service_name": "CONSULTA DE UN CLIENTE POR NUMERO..."
    }
  ]
}
```

## 🚀 Flujo de Desarrollo Típico

1. **Cargar nuevo servicio**: Subir Excel → Parser genera estructura
2. **Configurar por canal**: Setup parámetros específicos
3. **Gestionar versiones**: Popup muestra historial con fechas y canales claros
4. **Usar en aplicación**: Frontend consume via ServiceApiClient
5. **Integrar con mainframe**: API maneja conversión automática

Esta arquitectura proporciona una base sólida para la integración de sistemas legacy con tecnologías modernas, manteniendo la flexibilidad y facilidad de uso.
