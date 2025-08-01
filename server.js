/**
 * Servidor principal para la API de MQ Importer
 */

// Workaround para el error de strict mode en dependencias
global._babelPolyfill = global._babelPolyfill || false;

// Ignorar errores específicos de get-intrinsic
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('callee') && err.message.includes('strict mode')) {
    // Ignorar este error específico pero continuar la ejecución silenciosamente
    return;
  }
  // Para otros errores, usar el manejador existente
  throw err;
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
const { initializeDatabase, query } = require('./config/database');

// Cargar variables de entorno desde .env si existe
try {
  if (fs.existsSync(path.join(__dirname, '.env'))) {
    require('dotenv').config();
    // Solo mostrar si verbose está activado
    if (process.env.VERBOSE_LOGS === 'true') {
      console.log('Variables de entorno cargadas desde .env');
    }
  }
} catch (err) {
  if (process.env.VERBOSE_LOGS === 'true') {
    console.warn('No se pudo cargar el archivo .env:', err.message);
  }
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
const systemMaintenanceRoutes = require('./routes/system-maintenance');
const logsRoutes = require('./routes/logs');

// Crear directorios necesarios si no existen
const uploadsDir = path.join(__dirname, 'JsonStorage', 'uploads');
const structuresDir = path.join(__dirname, 'JsonStorage', 'structures');
const logsDir = path.join(__dirname, 'logs');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(structuresDir);
fs.ensureDirSync(logsDir);

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 4000;

// Crear directorio temporal
const tmpDir = path.join(__dirname, 'tmp');
fs.ensureDirSync(tmpDir);

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

// Importar middleware de logging
const { requestLoggerMiddleware } = require('./middleware/request-logger');
const { showStartupBanner, requestCounter, startPeriodicSummary } = require('./utils/startup-logger');

// Aplicar middleware de logging a todas las rutas
app.use(requestCounter); // Contador simple de requests
if (process.env.VERBOSE_LOGS === 'true') {
  app.use(requestLoggerMiddleware);
}

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
app.use('/system-maintenance', systemMaintenanceRoutes);
app.use('/logs', logsRoutes);

// Ruta principal - Servir la interfaz web
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para estado de salud del sistema
app.get('/health', async (req, res) => {
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
    port: PORT,
    platform: process.platform,
    nodeVersion: process.version
  };
  
  // Verificar conexión a base de datos
  let databaseStatus = {
    connected: false,
    host: null,
    database: null,
    error: null
  };
  
  try {
    const result = await query('SELECT 1 as test');
    if (result && result[0] && result[0].test === 1) {
      databaseStatus = {
        connected: true,
        host: 'mysql-aiven-arenazl.e.aivencloud.com',
        database: 'SimImporter',
        error: null
      };
    }
  } catch (error) {
    databaseStatus.error = error.message;
  }
  
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
    },
    database: databaseStatus
  });
});

// Función para mostrar resumen del sistema al inicio
const mostrarResumenSistema = () => {
  try {
    // Contar servicios disponibles
    const servicePath = path.join(__dirname, 'JsonStorage', 'uploads');
    const services = fs.existsSync(servicePath) ? 
      fs.readdirSync(servicePath).filter(file => file.endsWith('.xlsx') || file.endsWith('.xls')).length : 0;

    // Contar configuraciones guardadas
    const configPath = path.join(__dirname, 'JsonStorage', 'settings');
    const configurations = fs.existsSync(configPath) ? 
      fs.readdirSync(configPath).filter(file => file.endsWith('.json')).length : 0;

    // Contar estructuras/versiones
    const structuresPath = path.join(__dirname, 'JsonStorage', 'structures');
    const versions = fs.existsSync(structuresPath) ? 
      fs.readdirSync(structuresPath).filter(file => file.endsWith('.json')).length : 0;

    // Mostrar banner de inicio limpio
    showStartupBanner(PORT);
    
    // Iniciar resumen periódico
    startPeriodicSummary();
    
    // Log adicional solo si verbose está activado
    if (process.env.VERBOSE_LOGS === 'true') {
      console.log(`📊 Servicios: ${services} | ⚙️ Configs: ${configurations} | 📦 Versiones: ${versions}`);
    }
  } catch (error) {
    // En caso de error, mostrar banner simple
    showStartupBanner(PORT);
    startPeriodicSummary();
  }
};

// Inicializar la base de datos antes de iniciar el servidor
async function startServer() {
  try {
    await initializeDatabase();
    if (process.env.VERBOSE_LOGS === 'true') {
      console.log('✅ Base de datos inicializada correctamente');
    }
  } catch (error) {
    // Solo mostrar error resumido
    console.log('⚠️  DB: Sin conexión (continuando sin base de datos)');
    if (process.env.VERBOSE_LOGS === 'true') {
      console.error('Error detallado:', error.message);
    }
  }

  // Iniciar servidor
  const server = app.listen(PORT, '0.0.0.0', () => {
    mostrarResumenSistema();
  });

  // Configurar timeout para solicitudes utilizando la variable de entorno
  server.timeout = REQUEST_TIMEOUT; // Valor por defecto: 2 minutos
}

// Iniciar la aplicación
startServer();
