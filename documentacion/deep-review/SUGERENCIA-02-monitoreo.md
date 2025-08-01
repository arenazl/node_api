# 📊 SUGERENCIA: Mejoras en Monitoreo y Observabilidad

## Resumen

El sistema actual tiene logging básico pero carece de monitoreo comprehensivo. Implementar observabilidad completa permitiría detectar y resolver problemas proactivamente.

## Estado Actual de Monitoreo

### Logging Básico
```javascript
// Logs de errores en archivos
process.on('uncaughtException', (error) => {
  fs.writeFileSync(logFile, JSON.stringify(errorDetails, null, 2));
});

// Logs de requests
console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
```

### Limitaciones
- ❌ Sin agregación de logs
- ❌ Sin métricas de performance
- ❌ Sin alertas automáticas
- ❌ Sin dashboards
- ❌ Sin distributed tracing

## Stack de Observabilidad Propuesto

### 1. Logging Estructurado con Winston

```javascript
// config/logger.js
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'mq-importer-api',
    environment: process.env.NODE_ENV
  },
  transports: [
    // Consola para desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Archivo rotativo
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    
    // Elasticsearch para búsqueda
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: process.env.ELASTIC_URL },
      index: 'mq-importer-logs'
    })
  ]
});

// Middleware para logging de requests
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('http_request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      serviceNumber: req.body?.header?.serviceNumber,
      canal: req.body?.header?.canal
    });
  });
  
  next();
};
```

### 2. Métricas con Prometheus

```javascript
// metrics/prometheus.js
const client = require('prom-client');
const register = new client.Registry();

// Métricas predefinidas (CPU, memoria, etc.)
client.collectDefaultMetrics({ register });

// Métricas personalizadas
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const messageConversions = new client.Counter({
  name: 'message_conversions_total',
  help: 'Total number of message conversions',
  labelNames: ['type', 'service_number', 'canal', 'status']
});

const activeServices = new client.Gauge({
  name: 'active_services_count',
  help: 'Number of active services in cache',
  labelNames: ['cached']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(messageConversions);
register.registerMetric(activeServices);

// Middleware para métricas HTTP
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
};

// Endpoint para Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 3. Distributed Tracing con Jaeger

```javascript
// tracing/jaeger.js
const { initTracer } = require('jaeger-client');
const opentracing = require('opentracing');

const config = {
  serviceName: 'mq-importer-api',
  sampler: {
    type: 'probabilistic',
    param: 0.1 // Samplear 10% de requests
  },
  reporter: {
    logSpans: true,
    agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
    agentPort: process.env.JAEGER_AGENT_PORT || 6832
  }
};

const tracer = initTracer(config);
opentracing.initGlobalTracer(tracer);

// Middleware para tracing
const tracingMiddleware = (req, res, next) => {
  const wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers);
  const span = tracer.startSpan(req.path, {
    childOf: wireCtx,
    tags: {
      [opentracing.Tags.SPAN_KIND]: opentracing.Tags.SPAN_KIND_RPC_SERVER,
      [opentracing.Tags.HTTP_METHOD]: req.method,
      [opentracing.Tags.HTTP_URL]: req.url
    }
  });
  
  req.span = span;
  
  res.on('finish', () => {
    span.setTag(opentracing.Tags.HTTP_STATUS_CODE, res.statusCode);
    span.finish();
  });
  
  next();
};

// Instrumentar operaciones críticas
function traceOperation(operationName, fn) {
  return async function(...args) {
    const parentSpan = args[0]?.span;
    const span = tracer.startSpan(operationName, {
      childOf: parentSpan
    });
    
    try {
      const result = await fn.apply(this, args);
      span.setTag('result', 'success');
      return result;
    } catch (error) {
      span.setTag('error', true);
      span.log({ event: 'error', message: error.message });
      throw error;
    } finally {
      span.finish();
    }
  };
}

// Uso
const tracedMessageCreator = traceOperation('createMessage', messageCreator.createMessage);
```

### 4. APM con Elastic APM

```javascript
// apm.js
const apm = require('elastic-apm-node').start({
  serviceName: 'mq-importer-api',
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
  serverUrl: process.env.ELASTIC_APM_SERVER_URL,
  environment: process.env.NODE_ENV,
  
  // Capturar errores automáticamente
  captureExceptions: true,
  
  // Capturar body de requests para debugging
  captureBody: process.env.NODE_ENV !== 'production' ? 'all' : 'off',
  
  // Ignorar rutas de health check
  ignoreUrls: ['/health', '/metrics'],
  
  // Custom context
  globalLabels: {
    region: process.env.AWS_REGION || 'local',
    version: require('./package.json').version
  }
});

// Instrumentación manual para operaciones críticas
function measureMessageConversion(type, serviceNumber) {
  const span = apm.startSpan(`message.${type}`);
  
  return {
    end: (success = true) => {
      if (span) {
        span.setLabel('service_number', serviceNumber);
        span.setLabel('success', success);
        span.end();
      }
    }
  };
}

// Uso en endpoints
router.post('/sendmessage', async (req, res) => {
  const measurement = measureMessageConversion('ida', req.body.header.serviceNumber);
  
  try {
    // ... lógica del endpoint
    measurement.end(true);
  } catch (error) {
    measurement.end(false);
    apm.captureError(error);
    throw error;
  }
});
```

### 5. Health Checks Avanzados

```javascript
// health/checks.js
const { HealthCheckError, HealthIndicator } = require('@nestjs/terminus');

class FileSystemHealthIndicator extends HealthIndicator {
  async isHealthy(key) {
    const dirs = ['JsonStorage/uploads', 'JsonStorage/structures', 'logs'];
    const unhealthyDirs = [];
    
    for (const dir of dirs) {
      if (!await fs.exists(dir)) {
        unhealthyDirs.push(dir);
      }
    }
    
    if (unhealthyDirs.length > 0) {
      throw new HealthCheckError('FileSystem check failed', {
        directories: unhealthyDirs
      });
    }
    
    return this.getStatus(key, true, {
      directories: dirs.length,
      status: 'accessible'
    });
  }
}

// Endpoint mejorado
app.get('/health', async (req, res) => {
  const checks = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'ok',
    checks: {}
  };
  
  // Check filesystem
  try {
    checks.checks.filesystem = await fileSystemHealth.isHealthy('filesystem');
  } catch (error) {
    checks.status = 'degraded';
    checks.checks.filesystem = { status: 'down', error: error.message };
  }
  
  // Check cache
  checks.checks.cache = {
    status: 'up',
    services: global.serviceCache.services?.length || 0,
    lastUpdate: global.serviceCache.lastUpdate
  };
  
  // Check memory
  const memUsage = process.memoryUsage();
  const maxHeap = 1024 * 1024 * 1024; // 1GB
  checks.checks.memory = {
    status: memUsage.heapUsed < maxHeap * 0.9 ? 'up' : 'warning',
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
  };
  
  const httpStatus = checks.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(checks);
});
```

### 6. Dashboards con Grafana

```json
// grafana-dashboard.json
{
  "dashboard": {
    "title": "MQ Importer API Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(http_request_duration_seconds_count[5m])"
        }]
      },
      {
        "title": "Response Time (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
        }]
      },
      {
        "title": "Message Conversions by Service",
        "targets": [{
          "expr": "sum by (service_number) (rate(message_conversions_total[5m]))"
        }]
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "rate(message_conversions_total{status=\"error\"}[5m])"
        }]
      },
      {
        "title": "Memory Usage",
        "targets": [{
          "expr": "nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100"
        }]
      }
    ]
  }
}
```

### 7. Alertas con AlertManager

```yaml
# alerts.yml
groups:
  - name: mq_importer
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(message_conversions_total{status="error"}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in message conversions"
          description: "Error rate is {{ $value }} errors per second"
      
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }} seconds"
      
      - alert: MemoryPressure
        expr: nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Heap usage is {{ $value }}%"
```

## Stack Completo con Docker Compose

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
  
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
  
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
  
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "6832:6832/udp"
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411

volumes:
  prometheus_data:
  grafana_data:
  elasticsearch_data:
```

## Beneficios Esperados

### Operacionales
- Detección proactiva de problemas
- Reducción de MTTR (Mean Time To Recovery)
- Capacity planning basado en datos
- SLA monitoring automático

### Desarrollo
- Debugging más rápido con tracing
- Performance profiling en producción
- Identificación de bottlenecks
- A/B testing con métricas

### Negocio
- Visibilidad de uso por servicio
- Identificación de patrones de error
- Optimización basada en datos reales
- ROI medible de mejoras

## Plan de Implementación

### Fase 1: Logging (1 semana)
- Implementar Winston
- Configurar log rotation
- Estructurar logs existentes

### Fase 2: Métricas (2 semanas)
- Agregar Prometheus
- Implementar métricas custom
- Crear dashboards básicos

### Fase 3: Tracing (1 mes)
- Configurar Jaeger/APM
- Instrumentar operaciones críticas
- Correlacionar logs con traces

### Fase 4: Alerting (2 semanas)
- Definir SLIs/SLOs
- Configurar alertas
- Documentar runbooks

### Fase 5: Optimización (Continuo)
- Ajustar basado en datos
- Agregar métricas según necesidad
- Mejorar dashboards