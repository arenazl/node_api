/**
 * Rutas principales de la API
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

// Importar módulos de la API
const messageCreator = require('../api/message-creator');
const messageAnalyzer = require('../api/message-analyzer');

// Cargar estructura de cabecera
let headerStructure = {};
try {
  const headerPath = path.join(__dirname, '..', 'structures', 'header_structure.json');
  if (fs.existsSync(headerPath)) {
    headerStructure = fs.readJsonSync(headerPath);
  }
} catch (error) {
  console.error('Error al cargar la estructura de cabecera:', error);
}

/**
 * @route GET /api
 * @description Información general de la API
 */
router.get('/', async (req, res) => {
  // IMPORTANTE: Forzar actualización de la caché de servicios cuando se accede a la API
  // Esto garantiza que los nuevos servicios cargados aparezcan inmediatamente
  try {
    console.log("[API] Forzando recarga de caché de servicios para actualizar la lista...");
    // Importar el módulo de servicios para forzar recarga
    const serviceRouter = require('./services');
    
    // Forzar recarga con forceRefresh = true
    await serviceRouter.getAvailableServices(true);
    console.log("[API] Caché de servicios actualizada exitosamente");
  } catch (cacheError) {
    console.error("[API] Error al recargar caché de servicios:", cacheError);
    // Continuamos a pesar del error para no bloquear la funcionalidad principal
  }

  res.json({
    message: "API de procesamiento de mensajes MQ",
    endpoints: {
      "/api/process": "POST - Procesa un payload y devuelve un mensaje formateado",
      "/api/parse": "POST - Analiza un mensaje y devuelve su estructura",
      "/api/header": "GET - Devuelve la estructura de la cabecera",
      "/api/services": "GET - Obtiene la lista de servicios disponibles",
      "/api/services/:serviceNumber": "GET - Obtiene un servicio por número"
    }
  });
});

/**
 * @route GET /api/header
 * @description Devuelve la estructura de la cabecera
 */
router.get('/header', (req, res) => {
  res.json(headerStructure);
});

/**
 * @route POST /api/process
 * @description Procesa un payload y devuelve un mensaje formateado
 */
router.post('/process', async (req, res) => {
  try {
    const payload = req.body;
    
    if (!payload) {
      return res.status(400).json({ 
        error: "Se requiere un payload en el cuerpo de la solicitud" 
      });
    }
    
    // Verificar si se proporcionó una estructura de servicio
    let serviceStructure = payload.serviceStructure;
    
    if (!serviceStructure) {
      // Intentar cargar la estructura de servicio por defecto
      try {
        const servicePath = path.join(__dirname, '..', 'structures', 'service_structure.json');
        if (fs.existsSync(servicePath)) {
          serviceStructure = fs.readJsonSync(servicePath);
        } else {
          return res.status(400).json({ 
            error: "No se proporcionó una estructura de servicio y no se pudo cargar una por defecto" 
          });
        }
      } catch (error) {
        return res.status(400).json({ 
          error: "No se proporcionó una estructura de servicio y no se pudo cargar una por defecto" 
        });
      }
    }
    
    // Preparar datos del mensaje
    const messageData = {
      header: payload.header || {},
      data: payload.data || {},
      section: payload.section || "request"
    };
    
    // Crear mensaje
    const message = messageCreator.createMessage(headerStructure, serviceStructure, messageData, messageData.section);
    
    // Devolver resultado
    res.json({
      message: message,
      length: message.length,
      status: "success"
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: `Error al procesar el payload: ${error.message}` 
    });
  }
});

/**
 * @route POST /api/parse
 * @description Analiza un mensaje y devuelve su estructura
 */
router.post('/parse', async (req, res) => {
  try {
    const data = req.body;
    const message = data.message;
    const serviceStructure = data.serviceStructure;
    
    if (!message) {
      return res.status(400).json({ 
        error: "Se requiere un mensaje para analizar" 
      });
    }
    
    if (!serviceStructure) {
      return res.status(400).json({ 
        error: "Se requiere la estructura del servicio para analizar el mensaje" 
      });
    }
    
    // Analizar mensaje
    const parsedMessage = messageAnalyzer.parseMessage(message, headerStructure, serviceStructure);
    
    // Devolver resultado
    res.json({
      parsed: parsedMessage,
      status: "success"
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: `Error al analizar el mensaje: ${error.message}` 
    });
  }
});

module.exports = router;
