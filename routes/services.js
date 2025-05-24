/**
 * Rutas para el manejo de servicios
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const router = express.Router();

// Importar módulos de la API
const messageCreator = require('../api/message-creator');
const messageAnalyzer = require('../api/message-analyzer');

// Directorio de estructuras
const structuresDir = path.join(__dirname, '..', 'structures');

// Importar el fixer de índices para ocurrencias (ahora used by jsonCleaner)
// const occurrenceFixer = require('../utils/occurrence-fixer'); // No longer directly needed here
const jsonCleaner = require('../utils/json-cleaner'); // New
const { generarEstructuraDetallada, procesarElementos } = require('../utils/ida-message-utils');
const { getAvailableServices, findServiceByNumber } = require('../utils/service-lookup'); // Moved up

/**
 * @route GET /api/services
 * @description Obtiene la lista de servicios disponibles
 */
router.get('/', async (req, res) => {
  try {
    // Forzar recarga de la caché siempre que se solicite la lista de servicios
    // Esto es crucial para asegurar que los nuevos servicios aparezcan inmediatamente
    console.log("[SERVICIOS] Forzando recarga de caché para obtener lista actualizada...");
    const services = await getAvailableServices(true); // forceRefresh = true
    console.log("[SERVICIOS] Se encontraron", services.length, "servicios disponibles");
    res.json({ services });
  } catch (error) {
    console.error("[SERVICIOS] Error al obtener servicios:", error);
    res.status(500).json({ 
      error: `Error al obtener la lista de servicios: ${error.message}` 
    });
  }
});

// Importar el generador de ejemplos para servidor (OLD - no longer needed as new-generate-endpoint and generate-legacy use backendResponseGenerator)
// const serverExampleGenerator = require('../utils/server-example-generator'); 
// Importar nuevo manejador del endpoint /generate
const handleGenerateRequest = require('./new-generate-endpoint');

/**
 * @route POST /api/services/generate
 * @description Endpoint genérico que procesa un servicio con parámetros personalizados
 * usando estructura y configuración existentes y procesa el resultado de vuelta a JSON
 */
router.post('/generate', async (req, res) => {
  // Delegar al nuevo manejador
  return handleGenerateRequest(req, res, findServiceByNumber);
});

/**
 * @route POST /api/services/create-header
 * @description Crea un mensaje de cabecera usando la función del backend
 */
router.post('/create-header', async (req, res) => {
  try {
    const { headerStructure, headerData } = req.body;
    
    if (!headerStructure || !headerData) {
      return res.status(400).json({ error: "Se requieren headerStructure y headerData" });
    }
    
    // Crear mensaje de cabecera
    const headerMessage = messageCreator.createHeaderMessage(headerStructure, headerData);
    
    // Devolver el resultado
    res.json({ headerMessage });
  } catch (error) {
    console.error(`[CREATE-HEADER] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Mount the IDA routes
const idaRoutes = require('./ida-routes'); // No longer a function call
router.use('/', idaRoutes); // Mount IDA routes (e.g., /sendmessage-detailed, /ida)

// Mount the Vuelta routes
const vueltaRoutes = require('./vuelta-routes'); // No longer a function call
router.use('/', vueltaRoutes); // Mount Vuelta routes (e.g., /vuelta)

// Mount the Example Generation routes
const exampleGenerationRoutes = require('./example-generation-routes'); // Assuming this also exports router directly
router.use('/examples', exampleGenerationRoutes); // Mounted at /api/services/examples

/**
/**
 * @route POST /api/services/process
 * @description Procesa un servicio por número y stream (general)
 */
router.post('/process', async (req, res) => {
  try {
    const { service_number, stream } = req.body;
    
    if (!service_number) {
      return res.status(400).json({ error: "Se requiere el número de servicio" });
    }
    
    // Buscar estructuras del servicio
    const { headerStructure, serviceStructure } = await findServiceByNumber(service_number);
    
    // Procesar el servicio
    let result = {};
    
    // Si hay stream, analizarlo como respuesta
    if (stream) {
      try {
        // Extraer cabecera
        const headerLength = headerStructure.totalLength || 102;
        const headerMessage = stream.substring(0, headerLength);
        const headerData = messageAnalyzer.parseHeaderMessage(headerMessage, headerStructure);
        
        // Extraer cuerpo de la respuesta
        const bodyMessage = stream.substring(headerLength);
        const responseStructure = serviceStructure.response;
        
        // Procesar el cuerpo de la respuesta
        let responseData = {};
        if (responseStructure && responseStructure.elements) {
          responseData = messageAnalyzer.parseDataMessage(bodyMessage, responseStructure);
        }
        
        // Filtrar ocurrencias vacías antes de devolver resultado
        // const cleanResponseData = removeEmptyOccurrences(responseData); // Replaced by jsonCleaner
        const cleanResponseData = jsonCleaner.cleanVueltaJson(responseData, 'aggressive'); // Assuming aggressive for /process
        
        // Construir resultado
        result = {
          header: headerData,
          response: cleanResponseData
        };
      } catch (error) {
        console.error("Error al procesar stream:", error);
        result = { error: error.message };
      }
    } else {
      // Si no hay stream, generar un ejemplo de solicitud
      const messageData = {
        header: {
          CANAL: "API",
          SERVICIO: service_number,
          USUARIO: "SISTEMA"
        },
        data: {},
        section: "request"
      };
      
      // Crear mensaje de ejemplo
      const message = messageCreator.createMessage(headerStructure, serviceStructure, messageData, "request");
      result = {
        message: message,
        info: "Ejemplo de solicitud generado"
      };
    }
    
    res.json({ result });
  } catch (error) {
    console.error(`Error al procesar servicio:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
/**
 * @route GET /api/services/refresh
 * @description Fuerza una actualización de la caché de servicios
 */
router.get('/refresh', async (req, res) => {
  try {
    // Limpiar caché
    if (global.serviceCache) {
      global.serviceCache.services = null;
      global.serviceCache.lastUpdate = null;
      global.serviceCache.structures = {};
    }
    
    // Obtener servicios con forceRefresh en true para recargar desde archivos
    const services = await getAvailableServices(true);
    
    res.json({
      message: "Caché actualizada correctamente",
      services_count: services.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error al actualizar caché:", error);
    res.status(500).json({ 
      error: `Error al actualizar caché: ${error.message}` 
    });
  }
});

/**
 * @route GET /api/services/files
 * @description Obtiene los archivos Excel relacionados con un servicio específico
 */
router.get('/files', async (req, res) => {
  try {
    const serviceNumber = req.query.service_number;
    
    if (!serviceNumber) {
      return res.status(400).json({
        error: "Se requiere un número de servicio"
      });
    }
    
    // Obtener la lista de archivos Excel
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const files = [];
    
    // Verificar que el directorio de uploads existe
    if (!fs.existsSync(uploadsDir)) {
      console.log("El directorio de uploads no existe");
      return res.json({ files: [] });
    }
    
    // Leer todos los archivos Excel
    const excelFiles = fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.xls') || file.endsWith('.xlsx'));
    
    // Procesar cada archivo para ver si está relacionado con el servicio
    for (const excelFile of excelFiles) {
      try {
        // Extraer timestamp y nombre del archivo
        const timestampMatch = excelFile.match(/^(\d+T\d+)_(.+)\.xls(x)?$/);
        let uploadDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
        let serviceName = excelFile;
        let fileServiceNumber = null;
        
        // Extraer la fecha del timestamp
        if (timestampMatch && timestampMatch[1]) {
          const timestamp = timestampMatch[1];
          try {
            // Intentar formatear la fecha
            if (timestamp.length >= 14) {
              const year = timestamp.substring(0, 4);
              const month = timestamp.substring(4, 6);
              const day = timestamp.substring(6, 8);
              const hour = timestamp.substring(8, 10);
              const minute = timestamp.substring(10, 12);
              const second = timestamp.substring(12, 14) || '00';
              
              const dt = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
              uploadDate = dt.toISOString().replace('T', ' ').substring(0, 19);
            }
          } catch (error) {
            // Usar fecha actual si hay error al parsear
          }
          
          // Extraer el nombre real del servicio
          if (timestampMatch[2]) {
            serviceName = timestampMatch[2];
          }
        }
        
        // Extraer número de servicio del nombre
        const serviceMatch = serviceName.match(/SVO(\d+)/i);
        if (serviceMatch && serviceMatch[1]) {
          fileServiceNumber = serviceMatch[1];
        } else {
          // Buscar número de 4 dígitos
          const numMatch = serviceName.match(/(\d{4})/);
          if (numMatch && numMatch[1]) {
            fileServiceNumber = numMatch[1];
          }
        }
        
        // Si el archivo tiene el número de servicio que buscamos, añadirlo a la lista
        if (fileServiceNumber === serviceNumber) {
          files.push({
            filename: excelFile,
            service_name: serviceName,
            upload_date: uploadDate,
            service_number: fileServiceNumber
          });
        }
      } catch (error) {
        console.error(`Error al procesar archivo ${excelFile}:`, error);
      }
    }
    
    // Ordenar archivos por fecha de subida (más recientes primero)
    files.sort((a, b) => b.upload_date.localeCompare(a.upload_date));
    
    res.json({ files });
  } catch (error) {
    console.error("Error al obtener archivos:", error);
    res.status(500).json({ 
      error: `Error al obtener archivos: ${error.message}` 
    });
  }
});

/**
 * @route GET /api/services/versions
 * @description Obtiene las versiones disponibles de un servicio
 */
router.get('/versions', async (req, res) => {
  try {
    const serviceNumber = req.query.serviceNumber;
    
    if (!serviceNumber) {
      return res.status(400).json({
        error: "Se requiere un número de servicio"
      });
    }
    
    // Obtener todos los servicios disponibles
    const allServices = await getAvailableServices();
    
    // Filtrar las versiones del servicio solicitado
    const serviceVersions = allServices.filter(s => s.service_number === serviceNumber);
    
    // Ordenar por timestamp (más reciente primero)
    serviceVersions.sort((a, b) => {
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });
    
    res.json({
      serviceNumber,
      versions: serviceVersions
    });
    
  } catch (error) {
    console.error("Error al obtener versiones:", error);
    res.status(500).json({ 
      error: `Error al obtener versiones del servicio: ${error.message}` 
    });
  }
});

/**
 * @route GET /api/services/:serviceNumber
 * @description Obtiene un servicio por número y stream opcional
 */
router.get('/:serviceNumber', async (req, res) => {
  try {
    const serviceNumber = req.params.serviceNumber;
    const stream = req.query.stream;
    
    // Procesar servicio
    const result = await processServiceRequest(serviceNumber, stream);
    res.json(result);
    
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      error: error.message 
    });
  }
});

// Importar el parseador de Excel (ya no es necesario aquí si service-lookup lo maneja)
// const excelParser = require('../utils/excel-parser'); 
// const { getAvailableServices, findServiceByNumber } = require('../utils/service-lookup'); // Moved up

// Helper functions generarEstructuraDetallada and procesarElementos are now imported from ../utils/ida-message-utils

/**
 * Procesa una solicitud de servicio
 * @param {string} serviceNumber - Número de servicio
 * @param {string} stream - Stream de datos opcional
 * @returns {Promise<Object>} Respuesta del servicio
 */
async function processServiceRequest(serviceNumber, stream) {
  // Buscar estructuras del servicio
  const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber);
  
  // Si se proporciona stream, analizarlo
  let parsedData = null;
  if (stream) {
    try {
      parsedData = messageAnalyzer.parseMessage(stream, headerStructure, serviceStructure);
    } catch (error) {
      error.statusCode = 400;
      error.message = `Error al parsear stream: ${error.message}`;
      throw error;
    }
  }
  
  // Generar un mensaje de ejemplo si no se proporciona stream
  let message = "";
  if (!stream) {
    // Crear un mensaje de ejemplo basado en la estructura del servicio
    const messageData = {
      header: {
        CANAL: "OT",
        SERVICIO: serviceNumber,
        USUARIO: "SISTEMA"
      },
      data: {},
      section: "request"
    };
    
    // Crear mensaje
    message = messageCreator.createMessage(headerStructure, serviceStructure, messageData, "request");
  } else {
    message = stream;
  }
  
  // Devolver respuesta
  return {
    service_number: serviceNumber,
    service_name: serviceStructure.serviceName || "",
    message: message,
    parsed_data: parsedData,
    status: "success"
  };
}

/**
 * Función para garantizar que se mantengan los índices y las relaciones parentId exactas
 */
// function removeEmptyOccurrences(responseData) { ... } // This function is now replaced by jsonCleaner.cleanVueltaJson

/**
 * @route POST /api/services/sendmessage
 * @description Genera un string de IDA a partir de parámetros personalizados
 */
router.post('/sendmessage', async (req, res) => {
  try {
    const { header, parameters } = req.body;
    if (!header || !header.serviceNumber || !header.canal) {
      return res.status(400).json({ error: "header.serviceNumber and header.canal are required" });
    }
    const { serviceNumber, canal } = header;
    console.log(`[SERVICES/sendmessage] Processing service: ${serviceNumber}, canal: ${canal}`);

    const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber, false);
    if (!headerStructure || !serviceStructure) {
      return res.status(404).json({ error: `[SERVICES/sendmessage] Structure not found for service ${serviceNumber}` });
    }

    const configDir = path.join(__dirname, '..', 'settings');
      let configData = null;
      try {
        const configFiles = fs.readdirSync(configDir)
          .filter(file => file.endsWith('.json') && (file.startsWith(`${serviceNumber}-${canal}`) || file.startsWith(`${serviceNumber}_${canal}`) || file.includes(`${serviceNumber}-${canal}`) || file.includes(`${serviceNumber}_${canal}`)));
        if (configFiles.length > 0) {
          configData = await fs.readJson(path.join(configDir, configFiles[0]));
        }
      } catch (e) { console.error(`[SERVICES/sendmessage] Error reading config: ${e.message}`); }

      // Crear datos de solicitud con configuración base o valores por defecto
      let requestData = {
        header: configData && configData.header ? { ...configData.header } : { CANAL: canal, SERVICIO: serviceNumber, USUARIO: "SISTEMA" },
        data: configData && configData.request ? { ...configData.request } : {}
      };
      
      // Aplicar parámetros recibidos a los datos de solicitud
      if (parameters && typeof parameters === 'object') {
        Object.assign(requestData.data, parameters);
      }

      const message = messageCreator.createMessage(headerStructure, serviceStructure, requestData, "request");
      const estructura = generarEstructuraDetallada(headerStructure, serviceStructure, requestData); // Uses helper function defined above

      // Filtrar los campos duplicados del header antes de enviar la respuesta
      const headerCopy = JSON.parse(JSON.stringify(header));
      delete headerCopy.serviceNumber;
      delete headerCopy.canal;

      // Construir la respuesta JSON sin los campos duplicados
      res.json({
        request: { 
          header: {
            serviceNumber: header.serviceNumber,
            canal: header.canal,
            ...headerCopy
          }, 
          parameters 
        },
        response: message,
        estructura,
        estructuraCompleta: { requestStructure: serviceStructure.request }
      });
    } catch (error) {
      console.error(`[SERVICES/sendmessage] Error: ${error.message}`, error.stack);
      res.status(error.statusCode || 500).json({ error: error.message || 'Error processing sendmessage' });
    }
  });

// Importar el generador de respuestas de backend para simulación
const backendResponseGenerator = require('../utils/backend-response-generator');

/**
 * @route POST /api/services/receivemessage
 * @description Procesa un string de VUELTA y lo convierte a JSON
 * @param {boolean} parameters.simulate - Si es true, genera una respuesta simulada en lugar de procesar el stream
 */
router.post('/receivemessage', async (req, res) => {
    const DEBUG_LOG = false; 
    try {
      const { header, parameters } = req.body;
      if (!header || !header.serviceNumber) {
        return res.status(400).json({ error: "Se requiere header.serviceNumber" });
      }

      const serviceNumber = header.serviceNumber;
      // Verificar si se debe simular la respuesta
      const simulate = parameters && parameters.simulate === true;
      
      if (DEBUG_LOG) console.log(`[SERVICES/receivemessage] Processing service: ${serviceNumber}, simulate: ${simulate}`);
      
      // Si no es simulación, verificar que se proporcionó el stream
      if (!simulate && (!parameters || !parameters.returnMsg)) {
        return res.status(400).json({ error: "Se requiere parameters.returnMsg con el stream de vuelta" });
      }

      const stream = simulate ? null : parameters.returnMsg;
      const filterEmptyFields = header.filterEmptyFields !== false;
      
      if (!simulate && DEBUG_LOG) console.log(`[SERVICES/receivemessage] Processing stream: ${stream.length} chars`);

      const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber, false); 
      if (!headerStructure || !serviceStructure) {
        return res.status(404).json({ error: `[SERVICES/receivemessage] Structure not found for service ${serviceNumber}` });
      }

      let responseData = {};
      let cleanedData = {};
      const randomNumber = Math.floor(Math.random() * 10) + 1;

      if (simulate) {
        console.log("[SERVICES/receivemessage] Generando datos simulados para el servicio", serviceNumber);

        try {
          // Generar datos simulados usando el nuevo generador con modo simulación = true
          responseData = backendResponseGenerator.generateRandomDataForStructure(
            serviceStructure.response,
            null,
            true // simulateMode = true -> usa valores significativos y al menos 5 ocurrencias
          );

          // Los datos ya vienen "limpios" del generador, pero aplicamos jsonCleaner por consistencia
          cleanedData = responseData;

          console.log("[SERVICES/receivemessage] Datos simulados generados con éxito");
        } catch (simError) {
          console.error("[SERVICES/receivemessage] Error al generar datos simulados:", simError);
          return res.status(500).json({
            error: "Error al generar datos simulados: " + simError.message
          });
        }
      } else {
        // Procesamiento normal del stream
        const parsedMessage = messageAnalyzer.parseMessage(stream, headerStructure, serviceStructure);
        responseData = parsedMessage.data || {};
        
        try {
          // Aplicar limpieza para eliminar ocurrencias vacías
          const filterMode = 'aggressive'; // Siempre usar modo agresivo para eliminar ocurrencias vacías

          // Para debugging
          console.log("[SERVICES/receivemessage] Headers parseados:", JSON.stringify(parsedMessage.header, null, 2));
          console.log("[SERVICES/receivemessage] Response antes de limpiar:", JSON.stringify(responseData, null, 2));
          
          // Limpiar los datos
          try {
            cleanedData = jsonCleaner.cleanVueltaJson(responseData, filterMode);
            console.log("[SERVICES/receivemessage] Response limpia:", JSON.stringify(cleanedData, null, 2));
          } catch (cleanError) {
            console.error("[SERVICES/receivemessage] Error al limpiar datos:", cleanError);
            cleanedData = responseData; // Usar datos sin limpiar si hay error
          }
        } catch (innerError) {
          console.error("[SERVICES/receivemessage] Error interno:", innerError);
          return res.status(500).json({
            error: "Error procesando la respuesta: " + innerError.message
          });
        }
      }

      // Devolver respuesta
      res.json({
        request: { 
          header, 
          parameters: simulate ? 
            { simulate: true } : 
            { returnMsg: `[string de longitud ${stream ? stream.length : 0}]` } 
        },
        response: {
          ...cleanedData,
          randomNumber: randomNumber
        }
      });

    } catch (error) {
      console.error(`[SERVICES/receivemessage] Error: ${error.message}`, error.stack);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Error processing receivemessage'
      });
    }
  });

module.exports = router;
module.exports.getAvailableServices = getAvailableServices;

// Importar el nuevo generador de respuestas de backend (already imported for generate-legacy, now moved)
// const backendResponseGenerator = require('../utils/backend-response-generator'); // This line can be removed if not used elsewhere in this file

// generate-example-response was moved to example-generation-routes.js
