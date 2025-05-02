
/**
 * Servidor principal para la API de MQ Importer
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');

// Cargar variables de entorno desde .env si existe
try {
  if (fs.existsSync(path.join(__dirname, '.env'))) {
    require('dotenv').config();
    console.log('Variables de entorno cargadas desde .env');
  }
} catch (err) {
  console.warn('No se pudo cargar el archivo .env:', err.message);
}

// Cache para mejorar el rendimiento
global.serviceCache = {
  services: null,
  lastUpdate: null,
  structures: {} // Caché de estructuras por serviceNumber
};

// Importar rutas
const apiRoutes = require('./routes/api');
const excelRoutes = require('./routes/excel');
const serviceRoutes = require('./routes/services');
const serviceConfigRoutes = require('./routes/service-config');

// Crear directorios necesarios si no existen
const uploadsDir = path.join(__dirname, 'uploads');
const structuresDir = path.join(__dirname, 'structures');
const logsDir = path.join(__dirname, 'logs');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(structuresDir);
fs.ensureDirSync(logsDir);

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración específica para Heroku
const isHeroku = process.env.NODE_ENV === 'production';

// Crear directorios adicionales para Heroku
const tmpDir = path.join(__dirname, 'tmp');
fs.ensureDirSync(tmpDir);

// Advertencia sobre sistema de archivos efímero en Heroku
if (isHeroku) {
  console.warn('AVISO DE HEROKU: El sistema de archivos es efímero. Los archivos subidos y estructuras se perderán cuando la dyno se reinicie.');
  console.warn('Considere implementar almacenamiento persistente (AWS S3, etc.) para entornos de producción.');
}

// Configurar manejo de errores
process.on('uncaughtException', (error) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logsDir, `error-${timestamp}.log`);
    
    // Guardar detalles del error
    const errorDetails = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    };
    
    // Escribir en archivo
    fs.writeFileSync(logFile, JSON.stringify(errorDetails, null, 2));
    console.error(`Error no capturado: ${error.message}`);
    console.error(`Detalles guardados en: ${logFile}`);
  } catch (logError) {
    console.error('Error al registrar excepción:', logError);
  }
});

// Obtener variables de entorno con valores por defecto
const FILE_UPLOAD_SIZE_LIMIT = parseInt(process.env.FILE_UPLOAD_SIZE_LIMIT || '50', 10); // En MB
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '120000', 10); // En ms

// CORS Configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24 hours in seconds
};

// Middleware
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests
app.options('*', cors(corsOptions));
app.use(express.json({ limit: `${FILE_UPLOAD_SIZE_LIMIT}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${FILE_UPLOAD_SIZE_LIMIT}mb` }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: FILE_UPLOAD_SIZE_LIMIT * 1024 * 1024 }, // Tamaño límite en bytes
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'tmp')
}));

// Middleware para loggear solicitudes
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Middleware para manejar errores
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

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para prevenir consultas con el parámetro structure_file=null
app.use('/excel/structure', (req, res, next) => {
  if (req.query.structure_file === 'null' || req.query.structure_file === null) {
    return res.status(400).json({ error: 'No se puede cargar una estructura sin especificar un archivo válido' });
  }
  next();
});

// Rutas
app.use('/api', apiRoutes);
app.use('/excel', excelRoutes);
app.use('/api/services', serviceRoutes);
app.use('/service-config', serviceConfigRoutes);

// Ruta principal - Servir la interfaz web
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para estado de salud del sistema
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  // Verificar directorios
  const dirStatus = {
    uploads: fs.existsSync(uploadsDir),
    structures: fs.existsSync(structuresDir),
    logs: fs.existsSync(logsDir),
    tmp: fs.existsSync(tmpDir)
  };
  
  // Preparar información del entorno
  const environment = {
    nodeEnv: process.env.NODE_ENV || 'development',
    isHeroku: isHeroku,
    port: PORT,
    platform: process.platform,
    nodeVersion: process.version
  };
  
  res.json({
    status: 'ok',
    environment: environment,
    uptime: uptime,
    memory: {
      rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
    },
    directories: dirStatus,
    cache: {
      services: global.serviceCache.services ? global.serviceCache.services.length : 0,
      structures: Object.keys(global.serviceCache.structures).length,
      lastUpdate: global.serviceCache.lastUpdate
    }
  });
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  console.log(`Documentación API: http://localhost:${PORT}/api`);
  console.log(`Monitoreo de salud: http://localhost:${PORT}/health`);
});

// Configurar timeout para solicitudes utilizando la variable de entorno
server.timeout = REQUEST_TIMEOUT; // Valor por defecto: 2 minutos
