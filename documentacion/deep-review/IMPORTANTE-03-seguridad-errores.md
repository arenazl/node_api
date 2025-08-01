# 🔒 IMPORTANTE: Manejo de Errores y Consideraciones de Seguridad

## Resumen

El sistema maneja información crítica para la comunicación con mainframes. Un manejo inadecuado de errores o brechas de seguridad pueden exponer datos sensibles o causar fallas en sistemas críticos.

## Manejo de Errores Actual

### 1. Captura Global de Excepciones

```javascript
// server.js
process.on('uncaughtException', (error) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logsDir, `error-${timestamp}.log`);
  
  const errorDetails = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  };
  
  fs.writeFileSync(logFile, JSON.stringify(errorDetails, null, 2));
});
```

**Fortalezas**:
- ✅ Registra todos los errores no capturados
- ✅ Incluye stack trace completo
- ✅ Timestamps para debugging

**Debilidades**:
- ❌ No notifica a administradores
- ❌ Sin límite de archivos de log
- ❌ Puede exponer información sensible en logs

### 2. Middleware de Errores Express

```javascript
app.use((err, req, res, next) => {
  console.error('Error en middleware:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: "Error interno del servidor",
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

**Buenas Prácticas**:
- ✅ No expone detalles en producción
- ✅ Maneja headers ya enviados

**Mejoras Necesarias**:
- Agregar códigos de error específicos
- Logging estructurado
- Rate limiting para prevenir DoS

### 3. Validación de Entrada

```javascript
// routes/services.js
function validateSendMessageRequest(body) {
  const { header } = body;
  if (!header || !header.serviceNumber || !header.canal) {
    return "header.serviceNumber and header.canal are required";
  }
  return null;
}
```

**Problemas Detectados**:
- ❌ Sin validación de tipos
- ❌ Sin sanitización de entrada
- ❌ Sin límites de longitud

## Vulnerabilidades de Seguridad Identificadas

### 1. 🔴 CRÍTICO: Sin Autenticación/Autorización

```javascript
// Todos los endpoints son públicos
router.post('/sendmessage', async (req, res) => {
  // Sin verificación de identidad
  // Sin control de acceso
});
```

**Impacto**: Cualquiera puede enviar mensajes al mainframe

**Mitigación Urgente**:
```javascript
// Implementar middleware de autenticación
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

router.post('/sendmessage', authenticate, async (req, res) => {
  // Endpoint protegido
});
```

### 2. 🟡 Path Traversal en Carga de Archivos

```javascript
// Vulnerable a path traversal
const filename = `${timestamp}_${serviceName}.xlsx`;
const filepath = path.join(uploadsDir, filename);
```

**Mitigación**:
```javascript
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '');
};

const safeFilename = sanitizeFilename(serviceName);
const filepath = path.join(uploadsDir, `${timestamp}_${safeFilename}.xlsx`);
```

### 3. 🟡 Inyección en Nombres de Servicio

```javascript
// Sin validación del formato
const serviceNumber = req.body.serviceNumber;
const files = files.filter(f => f.includes(`_${serviceNumber}_`));
```

**Mitigación**:
```javascript
const validateServiceNumber = (serviceNumber) => {
  const pattern = /^[0-9]{4}$/;
  if (!pattern.test(serviceNumber)) {
    throw new Error('Número de servicio inválido');
  }
  return serviceNumber;
};
```

### 4. 🟡 Exposición de Información Sensible

```javascript
// El endpoint /health expone demasiada información
res.json({
  environment: {
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform,
    nodeVersion: process.version
  },
  directories: dirStatus,
  cache: cacheInfo
});
```

**Mitigación**:
```javascript
// Limitar información en producción
if (process.env.NODE_ENV === 'production') {
  res.json({ status: 'ok' });
} else {
  res.json(detailedInfo);
}
```

## Mejoras de Seguridad Recomendadas

### 1. Implementar Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de requests
  message: 'Demasiadas solicitudes desde esta IP'
});

app.use('/api', limiter);
```

### 2. Agregar Validación de Esquemas

```javascript
const Joi = require('joi');

const sendMessageSchema = Joi.object({
  header: Joi.object({
    serviceNumber: Joi.string().pattern(/^[0-9]{4}$/).required(),
    canal: Joi.string().alphanum().max(10).required()
  }).required(),
  parameters: Joi.object().required()
});

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};
```

### 3. Implementar Logging de Auditoría

```javascript
const auditLog = (action, user, details) => {
  const log = {
    timestamp: new Date().toISOString(),
    action,
    user: user.id,
    ip: user.ip,
    details
  };
  
  // Guardar en archivo separado o BD
  fs.appendFile('audit.log', JSON.stringify(log) + '\n');
};
```

### 4. Sanitización de Datos de Salida

```javascript
const sanitizeOutput = (data) => {
  // Eliminar campos sensibles
  delete data.internalId;
  delete data.password;
  
  // Truncar campos largos
  if (data.description?.length > 1000) {
    data.description = data.description.substring(0, 1000) + '...';
  }
  
  return data;
};
```

## Plan de Acción de Seguridad

### Inmediato (1-2 semanas)
1. ✅ Implementar autenticación básica
2. ✅ Agregar rate limiting
3. ✅ Sanitizar nombres de archivo
4. ✅ Limitar información en /health

### Corto Plazo (1 mes)
1. ✅ Validación completa de esquemas
2. ✅ Logging de auditoría
3. ✅ Cifrado de datos sensibles
4. ✅ Tests de seguridad

### Mediano Plazo (3 meses)
1. ✅ Implementar RBAC (Control de acceso basado en roles)
2. ✅ Auditoría de seguridad completa
3. ✅ Certificados SSL/TLS
4. ✅ WAF (Web Application Firewall)