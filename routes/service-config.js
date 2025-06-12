/**
 * Rutas para manejar configuraciones de servicios
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const configFormatUpdater = require('../utils/config-format-updater');
const router = express.Router();

// Directorio para almacenar configuraciones
const configDir = path.join(__dirname, '..', 'JsonStorage', 'settings');

/**
 * @route POST /service-config/save
 * @description Guarda la configuración de un servicio
 */
router.post('/save', async (req, res) => {
  try {
    console.log('[ServiceConfig] POST /save - Received request body:', req.body);
    const { serviceNumber, serviceName, canal, version, header, request } = req.body;
    console.log('[ServiceConfig] POST /save - Extracted variables:', { serviceNumber, serviceName, canal, version });
    
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
    console.log('[ServiceConfig] POST /save - Sanitized values:', { safeCanal, safeVersion });
    
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
    console.log('[ServiceConfig] POST /save - Configuration object to save:', JSON.stringify(config, null, 2));

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
 * @query refresh - Opcional, forzar recarga de caché (true o false)
 */
router.get('/list', async (req, res) => {
  try {
    const { service_number, refresh } = req.query;
    const forceRefresh = refresh === 'true';
    console.log(`[CONFIG] Listando configuraciones${service_number ? ` para servicio ${service_number}` : ' (todas)'}${forceRefresh ? ' (forzando recarga)' : ''}`);
    
    // IMPORTANTE: Forzar actualización de la caché de servicios cuando se solicita específicamente
    // o cuando se carga la configuración por primera vez
    /* // Se comenta esta sección para evitar la doble recarga de la caché de servicios.
       // La actualización de la caché de servicios debe manejarse explícitamente
       // a través del endpoint /api/services?refresh=true o /api/services/refresh.
    if (forceRefresh) {
      try {
        console.log("[CONFIG] Forzando recarga de caché de servicios para actualizar la lista (AHORA COMENTADO)...");
        // const serviceRouter = require('./services');
        // await serviceRouter.getAvailableServices(true);
        // console.log("[CONFIG] Caché de servicios actualizada exitosamente (AHORA COMENTADO)");
      } catch (cacheError) {
        console.error("[CONFIG] Error al recargar caché de servicios (AHORA COMENTADO):", cacheError);
      }
    }
    */
    
    // Verificar si el directorio existe
    if (!fs.existsSync(configDir)) {
      console.log(`[CONFIG] Directorio de configuraciones no existe: ${configDir}`);
      return res.json({ configs: [] });
    }
    
    // Leer todos los archivos de configuración
    const files = fs.readdirSync(configDir)
      .filter(file => file.endsWith('.json'));
    
    // Obtener información de cada configuración
    const configs = [];
    const processedConfigs = new Set(); // Para evitar configs duplicadas
    
    for (const file of files) {
      try {
        // Leer el contenido del archivo JSON directamente
        const filePath = path.join(configDir, file);
        const config = await fs.readJson(filePath);
        
        // Extraer la información necesaria del contenido del archivo
        const serviceNumber = config.serviceNumber || "";
        
        // Filtrar por número de servicio si se especificó
        if (service_number && serviceNumber !== service_number) {
          continue;
        }
        
        // Crear una clave única para esta configuración para evitar duplicados
        const configKey = `${serviceNumber}-${config.canal}-${config.version}`;
        
        // Si ya hemos procesado una configuración idéntica, saltarla
        if (processedConfigs.has(configKey)) continue;
        processedConfigs.add(configKey);
        
        configs.push({
          id: file.replace('.json', ''),
          serviceNumber,
          serviceName: config.serviceName || `Servicio ${serviceNumber}`,
          canal: config.canal || "",
          version: config.version || "v1",
          filename: file,
          timestamp: config.timestamp || new Date().toISOString()
        });
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
