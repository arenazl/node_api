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
    const { serviceNumber, serviceName, canal, header, request } = req.body;
    console.log('[ServiceConfig] POST /save - Extracted variables:', { serviceNumber, serviceName, canal });
    
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
    // Sanitizar canal
    const safeCanal = canal.replace(/[^a-zA-Z0-9]/g, '');
    // Buscar archivos existentes para este servicio y canal
    const files = fs.readdirSync(configDir)
      .filter(file => file.endsWith('.json') && file.startsWith(`${serviceNumber}-${safeCanal}-v`));
    // Calcular el próximo número de versión correlativo
    const versionNumber = files.length + 1;
    const safeVersion = `v${versionNumber}`;
    // Crear nombre de archivo: serviceNumber-canal-vN.json
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
    // Emitir evento de configuración guardada
    if (global.io) {
      console.log(`[WebSocket] Emitiendo evento config:saved para servicio ${serviceNumber}`);
      global.io.emit('config:saved', { 
        serviceNumber,
        canal: safeCanal,
        version: safeVersion,
        filename,
        timestamp: config.timestamp
      });
    } else {
      // Sin Socket.IO, guardar evento para consulta
      console.log(`[ServiceConfig] Socket.IO no disponible, guardando evento para consulta`);
      try {
        const eventFile = path.join(__dirname, '..', 'tmp', 'config_event.json');
        fs.writeFileSync(eventFile, JSON.stringify({
          type: 'config:saved',
          payload: {
            serviceNumber,
            canal: safeCanal,
            version: safeVersion,
            filename,
            timestamp: config.timestamp
          },
          timestamp: new Date().toISOString()
        }, null, 2));
      } catch (eventError) {
        console.warn('[ServiceConfig] No se pudo guardar evento:', eventError);
      }
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
    
    if (!fs.existsSync(configDir)) {
      console.log(`[CONFIG] Directorio de configuraciones no existe: ${configDir}`);
      return res.json({ configs: [] });
    }
    
    // Leer todos los archivos de configuración
    const files = fs.readdirSync(configDir)
      .filter(file => file.endsWith('.json'));
    
    // Obtener información de cada configuración
    const configs = [];
    for (const file of files) {
      try {
        const filePath = path.join(configDir, file);
        const config = await fs.readJson(filePath);
        const serviceNumber = config.serviceNumber || "";
        if (service_number && serviceNumber !== service_number) continue;
        
        // Extraer versión del nombre del archivo
        let version = 'v1';
        const versionMatch = file.match(/-v(\d+)\.json$/);
        if (versionMatch) {
          version = `v${versionMatch[1]}`;
        }
        
        configs.push({
          id: file.replace('.json', ''),
          serviceNumber,
          serviceName: config.serviceName || `Servicio ${serviceNumber}`,
          canal: config.canal || "",
          version: version,
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

/**
 * @route DELETE /service-config/delete/:id
 * @description Elimina una configuración específica por ID o nombre de archivo
 */
router.delete('/delete/:id', async (req, res) => {
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
    
    // Leer la configuración antes de eliminarla para obtener info
    const config = await fs.readJson(filePath);
    
    // Eliminar el archivo
    await fs.remove(filePath);
    
    console.log(`[CONFIG] Configuración eliminada: ${id}`);
    
    // Emitir evento de configuración eliminada
    if (global.io) {
      console.log(`[WebSocket] Emitiendo evento config:deleted para servicio ${config.serviceNumber}`);
      global.io.emit('config:deleted', { 
        serviceNumber: config.serviceNumber,
        canal: config.canal,
        version: config.version,
        filename: id,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: `Configuración eliminada exitosamente`,
      filename: id
    });
    
  } catch (error) {
    console.error('Error al eliminar configuración:', error);
    res.status(500).json({ 
      error: `Error al eliminar configuración: ${error.message}` 
    });
  }
});

/**
 * @route GET /service-config/events/last
 * @description Obtiene el último evento de configuración registrado
 */
router.get('/events/last', (req, res) => {
  try {
    const eventFile = path.join(__dirname, '..', 'tmp', 'config_event.json');
    
    if (!fs.existsSync(eventFile)) {
      return res.json({
        hasEvent: false,
        event: null
      });
    }

    const eventData = JSON.parse(fs.readFileSync(eventFile, 'utf-8'));
    
    // Verificar si el evento es reciente (menos de 5 minutos)
    const eventAge = Date.now() - new Date(eventData.timestamp).getTime();
    const isRecent = eventAge < 5 * 60 * 1000; // 5 minutos

    res.json({
      hasEvent: isRecent,
      event: isRecent ? eventData : null,
      eventAge: eventAge
    });

  } catch (error) {
    console.error('[ServiceConfig] Error al obtener último evento:', error);
    res.json({
      hasEvent: false,
      event: null,
      error: error.message
    });
  }
});

module.exports = router;
