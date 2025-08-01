# 📈 RECOMENDADO: Análisis de Escalabilidad y Limitaciones

## Resumen

El sistema actual funciona bien para cargas moderadas pero presenta limitaciones significativas para escalar. Este documento analiza los cuellos de botella y propone soluciones.

## Limitaciones Actuales de Escalabilidad

### 1. Almacenamiento Basado en Archivos

**Problema**:
```javascript
// Cada request requiere I/O de disco
async function findServiceByNumber(serviceNumber) {
  const files = await fs.readdir(STRUCTURES_DIR); // O(n)
  const file = files.find(f => f.includes(serviceNumber)); // O(n)
  return await fs.readJson(path.join(STRUCTURES_DIR, file)); // I/O
}
```

**Impacto**:
- Latencia aumenta con número de archivos
- Sin índices para búsquedas rápidas
- I/O bloqueante en disco

**Métricas Estimadas**:
- 100 servicios: ~50ms por búsqueda
- 1000 servicios: ~500ms por búsqueda
- 10000 servicios: ~5s por búsqueda (inaceptable)

### 2. Cache en Memoria Global

**Problema**:
```javascript
// Cache no compartido entre procesos
global.serviceCache = {
  services: null,
  structures: {}
};
```

**Limitaciones**:
- No funciona con PM2 cluster mode
- Memoria limitada por proceso Node.js
- Sin invalidación distribuida

### 3. Procesamiento Síncrono

**Problema**:
```javascript
// Bloquea el event loop
function createMessage(header, service, data) {
  let message = '';
  for (const field of service.fields) { // Puede ser miles de campos
    message += formatField(field, data[field.name]);
  }
  return message;
}
```

**Impacto**:
- Mensajes grandes bloquean otros requests
- Sin procesamiento en paralelo
- Timeout en mensajes muy grandes

## Análisis de Carga

### Escenario Actual
- Usuarios concurrentes: ~10-50
- Requests por segundo: ~5-20
- Tamaño promedio mensaje: 1-5 KB
- Servicios registrados: ~50

### Límites del Sistema Actual
- Max usuarios concurrentes: ~200
- Max RPS: ~100
- Max servicios eficientes: ~500
- Tamaño max mensaje práctico: ~1 MB

## Cuellos de Botella Identificados

### 1. I/O de Disco

```
Request → Read Directory → Filter Files → Read JSON → Parse → Response
  10ms      100ms           50ms          200ms      10ms     = 370ms
```

### 2. Parsing de Excel

```javascript
// Proceso bloqueante y pesado
const workbook = XLSX.readFile(filepath); // Puede tomar segundos
const sheets = workbook.SheetNames;
// Procesamiento síncrono de miles de celdas
```

### 3. Conversión de Mensajes

```javascript
// Sin optimización para mensajes grandes
for (const element of structure.elements) {
  if (element.type === 'occurrence') {
    // Procesamiento recursivo puede ser O(n²)
    processOccurrence(element, data);
  }
}
```

## Estrategias de Escalabilidad

### 1. Corto Plazo: Optimizaciones Rápidas

**a) Implementar Cache Redis**:
```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function getCachedStructure(serviceNumber) {
  const cached = await redis.get(`structure:${serviceNumber}`);
  if (cached) return JSON.parse(cached);
  
  const structure = await loadFromDisk(serviceNumber);
  await redis.setex(`structure:${serviceNumber}`, 3600, JSON.stringify(structure));
  return structure;
}
```

**b) Índice en Memoria**:
```javascript
// Construir al inicio
const serviceIndex = new Map();
for (const file of structureFiles) {
  const serviceNumber = extractServiceNumber(file);
  serviceIndex.set(serviceNumber, file);
}
```

**c) Worker Threads para Procesamiento**:
```javascript
const { Worker } = require('worker_threads');

function processMessageAsync(structure, data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./message-worker.js', {
      workerData: { structure, data }
    });
    
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
```

### 2. Mediano Plazo: Arquitectura Mejorada

**a) Microservicios**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   API       │────▶│  Message    │────▶│  Storage    │
│  Gateway    │     │  Processor  │     │  Service    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                         │
       └────────────── Redis Cache ─────────────┘
```

**b) Queue para Procesamiento Asíncrono**:
```javascript
// Bull Queue para trabajos pesados
const Queue = require('bull');
const messageQueue = new Queue('message processing');

messageQueue.process(async (job) => {
  const { serviceNumber, data } = job.data;
  return await processMessage(serviceNumber, data);
});

// En el endpoint
router.post('/sendmessage', async (req, res) => {
  const job = await messageQueue.add(req.body);
  res.json({ jobId: job.id, status: 'processing' });
});
```

### 3. Largo Plazo: Escalabilidad Completa

**a) Base de Datos Escalable**:
```sql
-- PostgreSQL con particionamiento
CREATE TABLE structures (
  id BIGSERIAL PRIMARY KEY,
  service_number VARCHAR(10),
  version INT,
  structure JSONB,
  created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_service_lookup ON structures(service_number, version);
```

**b) CDN para Archivos Estáticos**:
```javascript
// Servir Excel files desde CDN
const uploadToS3 = async (file) => {
  const params = {
    Bucket: 'mq-importer-files',
    Key: `uploads/${file.name}`,
    Body: file.data
  };
  
  const result = await s3.upload(params).promise();
  return result.Location;
};
```

**c) Kubernetes para Auto-scaling**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mq-importer-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: mq-importer:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mq-importer-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mq-importer-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Métricas de Monitoreo Recomendadas

### 1. Performance
- Response time percentiles (p50, p95, p99)
- Requests per second
- Error rate
- Cache hit ratio

### 2. Recursos
- CPU usage
- Memory usage
- Disk I/O
- Network I/O

### 3. Negocio
- Mensajes procesados por servicio
- Tamaño promedio de mensajes
- Servicios más utilizados
- Fallos por tipo

## Plan de Implementación

### Fase 1 (2 semanas)
- ✅ Implementar Redis cache
- ✅ Crear índices en memoria
- ✅ Agregar métricas básicas

### Fase 2 (1 mes)
- ✅ Worker threads para procesamiento
- ✅ Queue para trabajos pesados
- ✅ Optimizar algoritmos O(n²)

### Fase 3 (3 meses)
- ✅ Migrar a base de datos
- ✅ Implementar microservicios
- ✅ Configurar auto-scaling