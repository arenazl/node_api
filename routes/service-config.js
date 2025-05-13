/**
 * Rutas para manejar configuraciones de servicios
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const configFormatUpdater = require('../utils/config-format-updater');
const router = express.Router();

// Directorio para almacenar configuraciones
const configDir = path.join(__dirname, '..', 'settings');

/**
 * @route POST /service-config/save
 * @description Guarda la configuración de un servicio
 */
router.post('/save', async (req, res) => {
  try {
    const { serviceNumber, serviceName, canal, version, header, request } = req.body;
    
    // Validar datos requeridos
    if (!serviceNumber) {
      return res.status(400).json({ error: 'Número de servicio es requerido' });
    }
    
    if (!canal) {
      return res.status(400).json({ error: 'Canal es requerido' });
    }
    
    // Crear directorio si no existe
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Sanitizar valores para el nombre de archivo
    const safeCanal = canal.replace(/[^a-zA-Z0-9]/g, '');
    const safeVersion = (version || 'v1').replace(/[^a-zA-Z0-9]/g, '');
    
    // Crear nombre de archivo: serviceNumber-canal-version.json
    const filename = `${serviceNumber}-${safeCanal}-${safeVersion}.json`;
    const filePath = path.join(configDir, filename);
    
    // Crear objeto de configuración
    const config = {
      serviceNumber,
      serviceName: serviceName || `Servicio ${serviceNumber}`,
      canal: safeCanal,
      version: safeVersion,
      timestamp: new Date().toISOString(),
      header: header || {},
      request: request || {}
    };
    
    // Guardar configuración en archivo JSON
    await fs.writeJson(filePath, config, { spaces: 2 });
    
    // Emitir evento de configuración guardada a través de Socket.IO
    if (global.io) {
      console.log(`[WebSocket] Emitiendo evento config:saved para servicio ${serviceNumber}`);
      global.io.emit('config:saved', { 
        serviceNumber,
        canal: safeCanal,
        version: safeVersion,
        filename,
        timestamp: config.timestamp
      });
    }
    
    // Devolver respuesta exitosa
    res.json({
      success: true,
      message: `Configuración guardada exitosamente`,
      filename: filename
    });
    
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ 
      error: `Error al guardar configuración: ${error.message}` 
    });
  }
});

/**
 * @route GET /service-config/list
 * @description Obtiene la lista de configuraciones guardadas
 * @query service_number - Opcional, filtrar por número de servicio
 */
router.get('/list', async (req, res) => {
  try {
    const { service_number } = req.query;
    
    // IMPORTANTE: Forzar actualización de la caché de servicios cuando se carga la configuración
    // Esto garantiza que los nuevos servicios cargados aparezcan inmediatamente
    try {
      console.log("[CONFIG] Forzando recarga de caché de servicios para actualizar la lista...");
      // Importar el módulo de servicios para forzar recarga
      const serviceRouter = require('./services');
      
      // Forzar recarga con forceRefresh = true
      await serviceRouter.getAvailableServices(true);
      console.log("[CONFIG] Caché de servicios actualizada exitosamente");
    } catch (cacheError) {
      console.error("[CONFIG] Error al recargar caché de servicios:", cacheError);
      // Continuamos a pesar del error para no bloquear la funcionalidad principal
    }
    
    // Verificar si el directorio existe
    if (!fs.existsSync(configDir)) {
      return res.json({ configs: [] });
    }
    
    // Leer todos los archivos de configuración
    const files = fs.readdirSync(configDir)
      .filter(file => file.endsWith('.json'));
    
    // Obtener información de cada configuración
    const configs = [];
    
    for (const file of files) {
      try {
        // Extraer serviceNumber, canal y version del nombre del archivo
        // Comprobar primero el formato nuevo, después el antiguo
        let match = file.match(/^(\d+)-([^-]+)-([^-\.]+)\.json$/);
        
        if (!match) {
          // Intentar con formato antiguo
          match = file.match(/^(\d+)_([^_]+)_([^_\.]+)\.json$/);
        }
        
        if (match) {
          const [_, serviceNumber, canal, version] = match;
          
          // Si se especificó un número de servicio y no coincide, saltar
          if (service_number && serviceNumber !== service_number) {
            continue;
          }
          
          // Leer el archivo para obtener más información
          const filePath = path.join(configDir, file);
          const config = await fs.readJson(filePath);
          
          configs.push({
            id: file.replace('.json', ''),
            serviceNumber,
            serviceName: config.serviceName || `Servicio ${serviceNumber}`,
            canal,
            version,
            filename: file,
            timestamp: config.timestamp || new Date().toISOString()
          });
        }
      } catch (fileError) {
        console.error(`Error al procesar archivo ${file}:`, fileError);
      }
    }
    
    // Ordenar por fecha (más recientes primero)
    configs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ configs });
    
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    res.status(500).json({ 
      error: `Error al obtener configuraciones: ${error.message}` 
    });
  }
});

/**
 * @route GET /service-config/get/:id
 * @description Obtiene una configuración específica por ID o nombre de archivo
 */
router.get('/get/:id', async (req, res) => {
  try {
    let { id } = req.params;
    
    // Validar ID para evitar path traversal
    if (!id || id.includes('..')) {
      return res.status(400).json({ error: 'Identificador de configuración inválido' });
    }
    
    // Usar la utilidad para buscar el archivo con formato nuevo o antiguo
    const filePath = configFormatUpdater.getConfigFilePath(configDir, id);
    
    // Verificar si se encontró el archivo
    if (!filePath) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    
    // Leer contenido del archivo
    const config = await fs.readJson(filePath);
    
    res.json(config);
    
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ 
      error: `Error al obtener configuración: ${error.message}` 
    });
  }
});

module.exports = router;
