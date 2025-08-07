/**
 * Middleware de manejo global de errores para la API de Node.js
 * Captura todos los errores no manejados y devuelve respuestas JSON estructuradas
 */

const fs = require('fs-extra');
const path = require('path');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '..', 'logs');
fs.ensureDirSync(logsDir);

// Contador de requests para generar IDs únicos
let requestCounter = 0;

/**
 * Middleware de manejo de errores global
 * Debe ser el ÚLTIMO middleware registrado en Express
 */
function errorHandler(err, req, res, next) {
  // Si la respuesta ya fue enviada, delegar al handler por defecto de Express
  if (res.headersSent) {
    return next(err);
  }

  // Generar ID único para este error
  const errorId = `${Date.now()}-${++requestCounter}`;
  const timestamp = new Date().toISOString();
  
  // Determinar el código de estado HTTP
  const statusCode = err.statusCode || err.status || 500;
  
  // Información del request
  const requestInfo = {
    method: req.method,
    url: req.originalUrl || req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    params: req.params,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  };

  // Crear objeto de error estructurado
  const errorResponse = {
    error: true,
    errorId: errorId,
    timestamp: timestamp,
    message: err.message || 'Error interno del servidor',
    statusCode: statusCode,
    path: req.originalUrl || req.url,
    method: req.method
  };

  // En desarrollo, incluir más detalles
  if (process.env.NODE_ENV === 'development' || process.env.VERBOSE_LOGS === 'true') {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      name: err.name,
      code: err.code,
      syscall: err.syscall,
      hostname: err.hostname,
      port: err.port,
      path: err.path
    };
    errorResponse.request = {
      query: req.query,
      body: req.body,
      params: req.params
    };
  }

  // Determinar el tipo de error para logging
  let errorType = 'GENERAL_ERROR';
  let logLevel = 'error';
  
  if (err.code === 'ENOENT') {
    errorType = 'FILE_NOT_FOUND';
    errorResponse.message = 'Archivo o recurso no encontrado';
  } else if (err.code === 'EACCES') {
    errorType = 'PERMISSION_DENIED';
    errorResponse.message = 'Permiso denegado para acceder al recurso';
  } else if (err.code === 'ECONNREFUSED') {
    errorType = 'CONNECTION_REFUSED';
    errorResponse.message = 'No se pudo conectar con el servicio externo';
  } else if (err.name === 'ValidationError') {
    errorType = 'VALIDATION_ERROR';
    logLevel = 'warn';
    errorResponse.message = 'Datos de entrada inválidos';
  } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    errorType = 'JSON_PARSE_ERROR';
    logLevel = 'warn';
    errorResponse.message = 'El JSON proporcionado no es válido';
  } else if (err.message && err.message.includes('Excel')) {
    errorType = 'EXCEL_PROCESSING_ERROR';
    errorResponse.message = 'Error procesando archivo Excel';
  } else if (err.message && err.message.includes('timeout')) {
    errorType = 'TIMEOUT_ERROR';
    errorResponse.message = 'La operación excedió el tiempo límite';
  } else if (statusCode === 404) {
    errorType = 'NOT_FOUND';
    logLevel = 'warn';
    errorResponse.message = 'Recurso no encontrado';
  } else if (statusCode === 400) {
    errorType = 'BAD_REQUEST';
    logLevel = 'warn';
  } else if (statusCode === 401) {
    errorType = 'UNAUTHORIZED';
    logLevel = 'warn';
    errorResponse.message = 'No autorizado';
  } else if (statusCode === 403) {
    errorType = 'FORBIDDEN';
    logLevel = 'warn';
    errorResponse.message = 'Acceso prohibido';
  }

  errorResponse.errorType = errorType;

  // Log del error
  const logEntry = {
    errorId,
    timestamp,
    errorType,
    statusCode,
    message: err.message,
    stack: err.stack,
    request: requestInfo,
    user: req.user || 'anonymous'
  };

  // Escribir en archivo de log
  try {
    const logFileName = `errors-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(logsDir, logFileName);
    
    // Agregar entrada al log (append)
    fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n');
    
    // También guardar errores críticos en un archivo separado
    if (statusCode >= 500) {
      const criticalLogPath = path.join(logsDir, `critical-errors-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(criticalLogPath, JSON.stringify(logEntry) + '\n');
    }
  } catch (logError) {
    console.error('Error escribiendo en archivo de log:', logError);
  }

  // Log en consola
  if (process.env.VERBOSE_LOGS === 'true' || statusCode >= 500) {
    console.error(`[${timestamp}] ${errorType} (${errorId}):`, err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack:', err.stack);
      console.error('Request:', requestInfo);
    }
  } else {
    // Log compacto para producción
    console.error(`❌ [${errorId}] ${errorType}: ${err.message} (${req.method} ${req.url})`);
  }

  // Enviar respuesta al cliente
  res.status(statusCode).json(errorResponse);
}

/**
 * Middleware para capturar errores asíncronos
 * Envuelve las funciones async para capturar rechazos de promesas
 */
function asyncErrorWrapper(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware para timeout de requests
 */
function timeoutMiddleware(timeoutMs = 120000) {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      const err = new Error(`Request timeout after ${timeoutMs}ms`);
      err.statusCode = 408;
      err.code = 'ETIMEDOUT';
      next(err);
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

/**
 * Middleware para validar JSON en el body
 */
function jsonValidationMiddleware(req, res, next) {
  if (req.is('application/json') && req.body) {
    try {
      // Intentar stringify y parse para validar
      JSON.stringify(req.body);
      next();
    } catch (err) {
      err.statusCode = 400;
      err.message = 'Invalid JSON in request body';
      next(err);
    }
  } else {
    next();
  }
}

module.exports = {
  errorHandler,
  asyncErrorWrapper,
  timeoutMiddleware,
  jsonValidationMiddleware
};