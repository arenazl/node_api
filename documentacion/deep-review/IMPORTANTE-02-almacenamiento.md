# 💾 IMPORTANTE: Sistema de Almacenamiento y Persistencia

## Resumen

El sistema utiliza almacenamiento basado en archivos, una decisión que simplifica el despliegue pero introduce limitaciones significativas para la escalabilidad y consistencia de datos.

## Estructura de Almacenamiento Actual

```
JsonStorage/
├── uploads/        # Archivos Excel originales
│   ├── 20250705T16021_1004_v1.xlsx
│   └── 20250705T16312_3088_v1.xls
├── structures/     # Definiciones JSON parseadas
│   ├── 20250705T160219_1004_v1_structure.json
│   └── 20250705T163129_3088_v1_structure.json
├── settings/       # Configuraciones por canal
│   ├── 1004-SM-v1.json
│   └── 3088-SM-v1.json
└── headers/        # Ejemplos de headers
    ├── 1004_header_sample.json
    └── 3088_header_sample.json
```

## Análisis del Sistema Actual

### Ventajas ✅

1. **Simplicidad de Despliegue**
   - No requiere base de datos
   - Backup simple (copiar carpeta)
   - Debugging directo en archivos

2. **Transparencia**
   - Fácil inspeccionar datos
   - Modificación manual posible
   - Versionado con Git posible

3. **Portabilidad**
   - Funciona en cualquier sistema
   - No hay dependencias externas

### Desventajas ❌

1. **Problemas de Concurrencia**
   ```javascript
   // Riesgo actual: Sin bloqueo de archivos
   async function saveStructure(structure) {
     // Dos procesos pueden escribir simultáneamente
     await fs.writeJson(filePath, structure);
   }
   ```

2. **Limitaciones de Consulta**
   - No hay índices
   - Búsqueda requiere leer todos los archivos
   - No hay consultas complejas

3. **Escalabilidad**
   - Performance degrada con más archivos
   - Sin caché distribuido
   - Límites del sistema de archivos

## Patrones de Acceso a Datos

### 1. Lectura con Cache

```javascript
// utils/service-lookup.js
async function findServiceByNumber(serviceNumber, useCache = true) {
  // Cache en memoria
  if (useCache && global.serviceCache.structures[serviceNumber]) {
    return global.serviceCache.structures[serviceNumber];
  }
  
  // Lectura de disco
  const files = await fs.readdir(STRUCTURES_DIR);
  const structureFile = files.find(f => f.includes(`_${serviceNumber}_`));
  
  if (structureFile) {
    const structure = await fs.readJson(path.join(STRUCTURES_DIR, structureFile));
    global.serviceCache.structures[serviceNumber] = structure;
    return structure;
  }
}
```

### 2. Escritura Directa

```javascript
// routes/excel.js
async function saveUploadedFile(file, serviceNumber) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '');
  const filename = `${timestamp}_${serviceNumber}_v1.xlsx`;
  const filepath = path.join(UPLOADS_DIR, filename);
  
  // Sin transacciones ni bloqueo
  await file.mv(filepath);
}
```

## Riesgos y Mitigaciones

### Riesgo 1: Corrupción de Datos

**Problema**: Escrituras concurrentes pueden corromper archivos

**Mitigación Propuesta**:
```javascript
const lockfile = require('proper-lockfile');

async function safeWriteJson(filepath, data) {
  const release = await lockfile.lock(filepath);
  try {
    await fs.writeJson(filepath, data);
  } finally {
    await release();
  }
}
```

### Riesgo 2: Pérdida de Datos

**Problema**: Sin respaldos automáticos

**Mitigación Propuesta**:
```javascript
async function writeWithBackup(filepath, data) {
  // Crear backup antes de escribir
  if (await fs.exists(filepath)) {
    const backupPath = `${filepath}.${Date.now()}.bak`;
    await fs.copy(filepath, backupPath);
  }
  
  // Escribir atómicamente
  const tempPath = `${filepath}.tmp`;
  await fs.writeJson(tempPath, data);
  await fs.rename(tempPath, filepath);
}
```

### Riesgo 3: Inconsistencia de Cache

**Problema**: Cache local no se invalida correctamente

**Mitigación Propuesta**:
```javascript
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutos
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
}
```

## Migración a Base de Datos (Futura)

### Opción 1: SQLite (Mínimo cambio)
```javascript
// Mantener estructura similar
const db = new Database('mq_importer.db');

db.prepare(`
  CREATE TABLE structures (
    id INTEGER PRIMARY KEY,
    service_number TEXT,
    version INTEGER,
    structure JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();
```

### Opción 2: PostgreSQL (Escalabilidad)
```sql
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  service_number VARCHAR(10) NOT NULL,
  version INTEGER NOT NULL,
  structure JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(service_number, version)
);

CREATE INDEX idx_service_number ON services(service_number);
```

## Recomendaciones Inmediatas

1. **Implementar bloqueo de archivos** para escrituras
2. **Agregar validación de integridad** (checksums)
3. **Crear sistema de backups automáticos**
4. **Implementar rotación de logs**
5. **Documentar límites del sistema** (max archivos, tamaño)

## Plan de Migración Gradual

1. **Fase 1**: Agregar capa de abstracción
   ```javascript
   class StorageAdapter {
     async save(key, data) { /* filesystem */ }
     async load(key) { /* filesystem */ }
   }
   ```

2. **Fase 2**: Implementar adapter de BD
3. **Fase 3**: Migración dual (escribir ambos)
4. **Fase 4**: Cambio completo a BD