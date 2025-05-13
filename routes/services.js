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

// Importar el fixer de índices para ocurrencias
const occurrenceFixer = require('../utils/occurrence-fixer');

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

// Importar el generador de ejemplos para servidor
const serverExampleGenerator = require('../utils/server-example-generator');
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
 * @route POST /api/services/sendmessage
 * @description Genera el string de IDA a partir de parámetros personalizados
 */
router.post('/sendmessage', async (req, res) => {
  try {

    const { header, parameters } = req.body;

    console.log("PARAMETERS");
    console.log(header);
    console.log(parameters);

    // Validar datos de entrada
    if (!header || !header.serviceNumber) {
      return res.status(400).json({ error: "Se requiere header.serviceNumber" });
    }

    if (!header.canal) {
      return res.status(400).json({ error: "Se requiere header.canal" });
    }

    const serviceNumber = header.serviceNumber;
    const canal = header.canal;
    console.log(`[SENDMESSAGE] Procesando servicio: ${serviceNumber}, canal: ${canal}`);

    // 1. Buscar estructura del servicio sin forzar recarga
    const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber, false);
    if (!headerStructure || !serviceStructure) {
      return res.status(404).json({ error: `[SENDMESSAGE] Estructura no encontrada para el servicio ${serviceNumber}` });
    }
    console.log(`[SENDMESSAGE] Estructura encontrada para servicio ${serviceNumber}`);

    // 2. Buscar configuración por canal
    const configDir = path.join(__dirname, '..', 'settings');

    // Buscar configuración por serviceNumber y canal
    let configFound = false;
    let configData = null;

    try {
      // Buscar archivos de configuración para este servicio
      // Patrones comunes: 1004-ME-v2.json, 1004_ME_v2.json, etc.
      const configFiles = fs.readdirSync(configDir)
        .filter(file => file.endsWith('.json') &&
                (file.startsWith(`${serviceNumber}-${canal}`) ||
                 file.startsWith(`${serviceNumber}_${canal}`) ||
                 file.includes(`${serviceNumber}-${canal}`) ||
                 file.includes(`${serviceNumber}_${canal}`)));

      if (configFiles.length > 0) {
        // Usar la primera configuración encontrada
        const configPath = path.join(configDir, configFiles[0]);
        configData = await fs.readJson(configPath);
        configFound = true;
        console.log(`[SENDMESSAGE] Configuración encontrada: ${configFiles[0]}`);
      } else {
        console.log(`[SENDMESSAGE] No se encontró configuración para servicio ${serviceNumber} y canal ${canal}`);
      }
    } catch (configError) {
      console.error(`[SENDMESSAGE] Error al buscar configuración:`, configError);
    }

    // 3. Combinar configuración con parámetros específicos
    let requestData = {};

    // Si encontramos configuración, usarla como base
    if (configFound && configData) {
      // Clonar objeto para no modificar el original
      requestData = {
        header: { ...configData.header || {} },
        data: { ...configData.request || {} }
      };
    } else {
      // Si no hay configuración, crear objeto básico
      requestData = {
        header: {
          CANAL: canal,
          SERVICIO: serviceNumber,
          USUARIO: "SISTEMA"
        },
        data: {}
      };
    }

    // Agregar parámetros específicos a los datos del request
    if (parameters && typeof parameters === 'object') {
      console.log(`[SENDMESSAGE] Parámetros recibidos:`, JSON.stringify(parameters, null, 2));
      // Reemplazar/agregar parámetros en data
      Object.assign(requestData.data, parameters);
      console.log(`[SENDMESSAGE] Parámetros combinados con configuración:`, JSON.stringify(requestData.data, null, 2));
    }

    // 4. Crear mensaje de IDA
    console.log(`[SENDMESSAGE] Creando mensaje de IDA con los siguientes datos:`, JSON.stringify(requestData, null, 2));
    const message = messageCreator.createMessage(headerStructure, serviceStructure, requestData, "request");
    console.log(`[SENDMESSAGE] String de IDA generado: ${message.length} caracteres`);
    console.log(`[SENDMESSAGE] Primeros 100 caracteres del mensaje: "${message.substring(0, 100)}..."`);

    // 5. Devolver resultado
    res.json({
      request: {
        header: header, // Include original header from request
        parameters: parameters // Include original parameters from request
      },
      response: message // The generated IDA string
    });

  } catch (error) {
    console.error(`[SENDMESSAGE] Error en procesamiento:`, error);
    res.status(error.statusCode || 500).json({
      error: error.message || '[SENDMESSAGE] Error desconocido en procesamiento'
    });
  }
});

/**
 * @route POST /api/services/receivemessage
 * @description Procesa un stream de vuelta y lo convierte a JSON
 */
router.post('/receivemessage', async (req, res) => {
  const DEBUG_LOG = false; // Flag para controlar el logging
  try {

    const { header, parameters } = req.body;

    if (DEBUG_LOG) {
      console.log(`[SENDMESSAGE] header ${header}`);
      console.log(`[SEND
        0MESSAGE] parameters ${parameters}`);
    }
    
    // Validar datos de entrada
    if (!header || !header.serviceNumber) {
      return res.status(400).json({ error: "Se requiere header.serviceNumber" });
    }

    if (!parameters || !parameters.returnMsg) {
       return res.status(400).json({ error: "Se requiere parameters.returnMsg con el stream de vuelta" });
    }

    const serviceNumber = header.serviceNumber;
    const stream = parameters.returnMsg;
    if (DEBUG_LOG) console.log(`[RECEIVEMESSAGE] Procesando servicio: ${serviceNumber}, stream de ${stream.length} caracteres`);

    // 1. Buscar estructuras del servicio
    const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber, false);
    if (!headerStructure || !serviceStructure) {
      return res.status(404).json({ error: `[RECEIVEMESSAGE] Estructura no encontrada para el servicio ${serviceNumber}` });
    }
    if (DEBUG_LOG) console.log(`[RECEIVEMESSAGE] Estructura encontrada para servicio ${serviceNumber}`);

    // 2. Procesar el stream de entrada
    let parsedResponseData = {};
    if (DEBUG_LOG) {
      console.log(`[RECEIVEMESSAGE] Iniciando procesamiento del stream de entrada`);
      console.log(`[RECEIVEMESSAGE] Primeros 100 caracteres del stream: "${stream.substring(0, 100)}..."`);
    }
    try {
      // Forzar la sección a "response" para el servicio de vuelta
      const section = "response";

      // Analizar mensaje explícitamente como una respuesta
      if (DEBUG_LOG) console.log(`[RECEIVEMESSAGE] Analizando stream como RESPUESTA`);

      // Extraer cabecera
      const headerLength = headerStructure.totalLength || 102;
      const headerMessage = stream.substring(0, headerLength);
      if (DEBUG_LOG) console.log(`[RECEIVEMESSAGE] Analizando cabecera (${headerLength} caracteres)`);
      const headerData = messageAnalyzer.parseHeaderMessage(headerMessage, headerStructure);
      if (DEBUG_LOG) console.log(`[RECEIVEMESSAGE] Cabecera parseada:`, JSON.stringify(headerData, null, 2));

      // Extraer cuerpo de la respuesta
      const bodyMessage = stream.substring(headerLength);
      if (DEBUG_LOG) {
        console.log(`[RECEIVEMESSAGE] Cuerpo del mensaje extraído (${bodyMessage.length} caracteres)`);
        console.log(`[RECEIVEMESSAGE] Primeros 100 caracteres del cuerpo: "${bodyMessage.substring(0, 100)}..."`);
      }
      const responseStructure = serviceStructure.response;

      // Procesar el cuerpo de la respuesta
      let responseData = {};
      if (responseStructure && responseStructure.elements) {
        try {
          // Usar el parseDataMessage para procesar la respuesta CON VALIDACIÓN DE OCURRENCIAS
          responseData = messageAnalyzer.parseDataMessage(
            bodyMessage,
            responseStructure,
            true // Activar validación de ocurrencias
          );

          if (DEBUG_LOG) console.log("[RECEIVEMESSAGE] Validación de ocurrencias exitosa");
        } catch (validationError) {
          // Capturar errores específicos de validación
          if (validationError.message.includes('Error de validación')) {
             // Log the validation error but don't return 400 immediately,
             // we still want to return the request data and potentially partial parsed data
             console.error(`[RECEIVEMESSAGE] Error de validación al parsear:`, validationError.message);
             // Optionally add validation error info to the response data
             responseData.validationError = validationError.message;
          } else {
             throw validationError; // Reenviar otros errores
          }
        }
      } else {
        console.warn("[RECEIVEMESSAGE] No se encontró estructura de respuesta para el servicio");
      }

      // Filtrar ocurrencias vacías después del primer parseo
      if (DEBUG_LOG) {
        console.log("[RECEIVEMESSAGE] Datos antes de filtrar ocurrencias vacías:", JSON.stringify(responseData, null, 2));
        const cleanResponseData = removeEmptyOccurrences(responseData);
        console.log("[RECEIVEMESSAGE] Response parseada y filtrada (primer paso):", JSON.stringify(cleanResponseData, null, 2));
        console.log("[RECEIVEMESSAGE] Campos eliminados:",
          Object.keys(responseData).filter(key => !cleanResponseData.hasOwnProperty(key)));
      }

      // --- Nuevo paso: Convertir JSON de vuelta a string de posiciones fijas ---
      if (DEBUG_LOG) {
        console.log("[RECEIVEMESSAGE] Convirtiendo JSON de vuelta a stream de posiciones fijas...");
        console.log(`[RECEIVEMESSAGE] Datos limpios a convertir:`, JSON.stringify(cleanResponseData, null, 2));
      }
      const intermediateStream = messageAnalyzer.formatDataMessage(cleanResponseData, responseStructure);
      console.log(`[RECEIVEMESSAGE] Stream intermedio generado (${intermediateStream.length} caracteres): "${intermediateStream.substring(0, 100)}..."`); // Log first 100 chars

      // --- Nuevo paso: Parsear el stream intermedio de vuelta a JSON ---
      if (DEBUG_LOG) console.log("[RECEIVEMESSAGE] Parseando stream intermedio de vuelta a JSON...");
      let finalParsedResponseData = {};
      try {
         // Parsear el stream intermedio. No necesitamos validar ocurrencias estrictamente aquí
         // porque el stream ya fue generado a partir de un JSON validado.
         if (DEBUG_LOG) console.log("[RECEIVEMESSAGE] Iniciando segundo parseo del stream intermedio");
         finalParsedResponseData = messageAnalyzer.parseDataMessage(
           intermediateStream,
           responseStructure,
           false // Desactivar validación estricta de ocurrencias en el segundo parseo
         );
         if (DEBUG_LOG) {
           console.log("[RECEIVEMESSAGE] Datos del segundo parseo:", JSON.stringify(finalParsedResponseData, null, 2));
           console.log("[RECEIVEMESSAGE] Segundo parseo exitoso.");
         }

      } catch (reparseError) {
         console.error(`[RECEIVEMESSAGE] Error al re-parsear el stream intermedio:`, reparseError);
         // Incluir error de re-parseo en los datos de respuesta
         finalParsedResponseData = { error: reparseError.message, errorType: 'REPARSING_ERROR' };
      }

      // Asignar el resultado final del parseo
      parsedResponseData = finalParsedResponseData;

      // Añadir logs para debuggear
      if (DEBUG_LOG) {
        console.log("[RECEIVEMESSAGE] Headers parseados:", JSON.stringify(headerData, null, 2));
        console.log("[RECEIVEMESSAGE] Response parseada y filtrada (resultado final):", JSON.stringify(parsedResponseData, null, 2));
      }

    } catch (parseError) {
      console.error(`[RECEIVEMESSAGE] Error al procesar el stream (primer parseo):`, parseError);
      // Include parse error in the response data
      parsedResponseData = { error: parseError.message, errorType: 'PROCESSING_ERROR' };
    }


    // 3. Devolver resultado
    res.json({
      request: {
        header: header, // Include original header from request
        parameters: parameters // Include original parameters from request
      },
      response: parsedResponseData // The final parsed JSON data after round-trip
    });

  } catch (error) {
    console.error(`[RECEIVEMESSAGE] Error en procesamiento general:`, error);
    res.status(error.statusCode || 500).json({
      error: error.message || '[RECEIVEMESSAGE] Error desconocido en procesamiento'
    });
  }
});


/**
 * @route POST /api/services/generate-legacy
 * @description Versión anterior del endpoint /generate (mantenida por compatibilidad)
 */
router.post('/generate-legacy', async (req, res) => {
  try {
    const { header, parameters } = req.body;

    // Validar datos de entrada
    if (!header || !header.serviceNumber) {
      return res.status(400).json({ error: "Se requiere header.serviceNumber" });
    }

    if (!header.canal) {
      return res.status(400).json({ error: "Se requiere header.canal" });
    }

    const serviceNumber = header.serviceNumber;
    const canal = header.canal;
    console.log(`Procesando servicio: ${serviceNumber}, canal: ${canal}`);

    // 1. Buscar estructura del servicio
    const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber);
    if (!headerStructure || !serviceStructure) {
      return res.status(404).json({ error: `Estructura no encontrada para el servicio ${serviceNumber}` });
    }
    console.log(`Estructura encontrada para servicio ${serviceNumber}`);

    // 2. Buscar configuración por canal
    const configDir = path.join(__dirname, '..', 'settings');
    const configFormatUpdater = require('../utils/config-format-updater');

    // Buscar configuración por serviceNumber y canal
    let configFound = false;
    let configData = null;

    try {
      // Buscar archivos de configuración para este servicio
      const configFiles = fs.readdirSync(configDir)
        .filter(file => file.endsWith('.json') &&
                (file.includes(`${serviceNumber}-${canal}`) ||
                 file.includes(`${serviceNumber}_${canal}`)));

      if (configFiles.length > 0) {
        // Usar la primera configuración encontrada
        const configPath = path.join(configDir, configFiles[0]);
        configData = await fs.readJson(configPath);
        configFound = true;
        console.log(`Configuración encontrada: ${configFiles[0]}`);
      } else {
        console.log(`No se encontró configuración para servicio ${serviceNumber} y canal ${canal}`);
      }
    } catch (configError) {
      console.error(`Error al buscar configuración:`, configError);
    }

    // 3. Combinar configuración con parámetros específicos
    let requestData = {};

    // Si encontramos configuración, usarla como base
    if (configFound && configData) {
      // Clonar objeto para no modificar el original
      requestData = {
        header: { ...configData.header || {} },
        data: { ...configData.request || {} }
      };
    } else {

      // Si no hay configuración, crear objeto básico
      requestData = {
        header: {
          CANAL: canal,
          SERVICIO: serviceNumber,
          USUARIO: "SISTEMA"
        },
        data: {}
      };
    }

    // Agregar parámetros específicos a los datos del request
    if (parameters && typeof parameters === 'object') {
      // Reemplazar/agregar parámetros en data
      Object.assign(requestData.data, parameters);
      console.log(`Parámetros combinados con configuración`);
    }

    // 4. Crear mensaje de IDA
    const message = messageCreator.createMessage(headerStructure, serviceStructure, requestData, "request");
    console.log(`String de IDA generado: ${message.length} caracteres`);

    // 5. Simular respuesta de VUELTA (similar al ejemplo-generador existente)
    // Usar el message-analyzer para crear una respuesta simulada
    // La longitud del header siempre es la misma

    const headerLength = headerStructure.totalLength || 102;
    const headerMsg = message.substring(0, headerLength);

    // Generar cuerpo de respuesta simulado basado en la estructura de respuesta
    let simulatedResponseBody = "";

    if (serviceStructure.response && serviceStructure.response.elements) {
      try {
        // Simular valores para cada campo de la respuesta
        const simulateValue = (element) => {
          if (element.type === 'field') {
            const length = parseInt(element.length) || 0;
            // Generar valor aleatorio según tipo
            let value = '';

            if (element.name && element.name.includes('NOMBRE')) {
              value = 'JUAN PEREZ';
            } else if (element.name && element.name.includes('FECHA')) {
              value = '20250101';
            } else if (element.name && element.name.includes('CODIGO')) {
              value = '0000';
            } else if (element.name && element.name.includes('IMPORTE') ||
                      element.name && element.name.includes('MONTO')) {
              value = '0000001000';
            } else {
              // Generar alfanumérico aleatorio si no hay patrón específico
              value = 'SIMULADO';
            }

            // Formatear valor según tipo y longitud
            const fieldType = (element.fieldType || element.type || '').toLowerCase();

            if (fieldType === 'numerico') {
              return value.replace(/\D/g, '0').padStart(length, '0').substring(0, length);
            } else {
              return value.padEnd(length, ' ').substring(0, length);
            }
          }
          return '';
        };

        // Función para procesar elementos recursivamente
        const processElements = (elements, occCount = 1) => {
          let result = '';

          // Si hay un contador de ocurrencias, agregarlo
          if (elements.some(e => e.type === 'occurrence')) {
            // El contador se formatea como número de 2 dígitos
            result += occCount.toString().padStart(2, '0');
          }

          // Procesar cada elemento
          for (const element of elements) {
            if (element.type === 'field') {
              result += simulateValue(element);
            } else if (element.type === 'occurrence') {
              // Para cada ocurrencia, generar un número aleatorio de instancias (1 a 5)
              const count = element.count ? parseInt(element.count) : 1;
              // Primero agregar el contador de instancias

              // Luego generar cada instancia
              for (let i = 0; i < count; i++) {
                if (element.fields) {
                  result += processElements(element.fields, 0); // Sin contador para ocurrencias anidadas
                }
              }
            }
          }
          return result;
        };

        // Generar el cuerpo simulado
        simulatedResponseBody = processElements(serviceStructure.response.elements);
      } catch (simError) {
        console.error(`Error al simular respuesta:`, simError);
        simulatedResponseBody = "ERROR_SIMULACION";
      }
    }

    // Código de retorno exitoso (0000) en la cabecera
    let headerWithReturnCode = headerMsg;
    // Posición del código de retorno (fija en todas las cabeceras)
    if (headerWithReturnCode.length >= 18) {
      headerWithReturnCode =
        headerWithReturnCode.substring(0, 14) +
        "0000" +
        headerWithReturnCode.substring(18);
    }

    // Combinar header y cuerpo para formar el mensaje simulado de vuelta
    const simulatedResponseMessage = headerWithReturnCode + simulatedResponseBody;
    console.log(`String de VUELTA simulado: ${simulatedResponseMessage.length} caracteres`);

    // 6. Procesar el mensaje simulado para convertirlo a JSON
    let parsedResponse = {};
    try {
      // Analizar mensaje completo
      const section = "response"; // Forzar sección respuesta

      // Extraer cabecera
      const headerLength = headerStructure.totalLength || 102;
      const headerMessage = simulatedResponseMessage.substring(0, headerLength);
      const headerData = messageAnalyzer.parseHeaderMessage(headerMessage, headerStructure);

      // Extraer cuerpo de la respuesta
      const bodyMessage = simulatedResponseMessage.substring(headerLength);
      const responseStructure = serviceStructure.response;

      // Procesar el cuerpo de la respuesta
      let responseData = {};
      if (responseStructure && responseStructure.elements) {
        try {
          // Usar el parseDataMessage para procesar la respuesta CON VALIDACIÓN DE OCURRENCIAS
          responseData = messageAnalyzer.parseDataMessage(
            bodyMessage,
            responseStructure,
            true // Activar validación de ocurrencias
          );

          console.log("Respuesta simulada procesada exitosamente");
        } catch (validationError) {
          console.error(`Error al validar respuesta simulada:`, validationError);
          responseData = { error: validationError.message };
        }
      } else {
        console.warn("No se encontró estructura de respuesta para el servicio");
      }

      // Filtrar ocurrencias vacías antes de retornar
      const cleanResponseData = removeEmptyOccurrences(responseData);

      // Construir resultado final
      parsedResponse = {
        header: headerData,
        response: cleanResponseData
      };
    } catch (parseError) {
      console.error(`Error al parsear respuesta simulada:`, parseError);
      parsedResponse = { error: parseError.message };
    }

    // 7. Devolver resultado completo
    res.json({
      serviceName: serviceStructure.serviceName || `Servicio ${serviceNumber}`,
      stringIda: message,
      stringVuelta: simulatedResponseMessage,
      dataVuelta: parsedResponse.response || {}
    });

  } catch (error) {
    console.error(`Error en procesamiento:`, error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Error desconocido en procesamiento'
    });
  }
});

/**
 * @route POST /api/services/vuelta
 * @description Procesa un servicio por número y stream (Servicio de Vuelta)
 */
router.post('/vuelta', async (req, res) => {
  try {
    const { service_number, stream } = req.body;
    
    if (!service_number) {
      return res.status(400).json({ 
        error: "Se requiere un número de servicio" 
      });
    }
    
    if (!stream) {
      return res.status(400).json({
        error: "Se requiere el stream de datos"
      });
    }
    
    // Buscar estructuras del servicio
    const { headerStructure, serviceStructure } = await findServiceByNumber(service_number);
    
      // Procesar el stream de entrada
      try {
        // Forzar la sección a "response" para el servicio de vuelta
        // Esto es importante porque por defecto puede intentar interpretar como request
        const section = "response";
        
        // Analizar mensaje explícitamente como una respuesta
        console.log(`Procesando stream de ${stream.length} caracteres como RESPUESTA`);
        
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
          try {
            // Usar el parseDataMessage para procesar la respuesta CON VALIDACIÓN DE OCURRENCIAS
            responseData = messageAnalyzer.parseDataMessage(
              bodyMessage, 
              responseStructure,
              true // Activar validación de ocurrencias
            );
            
            console.log("Validación de ocurrencias exitosa");
          } catch (validationError) {
            // Capturar errores específicos de validación
            if (validationError.message.includes('Error de validación')) {
              return res.status(400).json({ 
                error: validationError.message,
                validationFailed: true,
                errorType: 'VALIDATION_ERROR'
              });
            }
            throw validationError; // Reenviar otros errores
          }
        } else {
          console.warn("No se encontró estructura de respuesta para el servicio");
        }
        
        // Filtrar ocurrencias vacías antes de retornar
        const cleanResponseData = removeEmptyOccurrences(responseData);
        
        // Construir resultado final
        const parsedData = {
          header: headerData,
          response: cleanResponseData
        };
        
        // Añadir logs para debuggear
        console.log("Servicio de vuelta - headers:", JSON.stringify(headerData, null, 2));
        console.log("Servicio de vuelta - response filtrada:", JSON.stringify(cleanResponseData, null, 2));
        
        // Devolver los datos de respuesta filtrados, sin ocurrencias vacías
        return res.json(cleanResponseData);
      } catch (error) {
        console.error("Error al procesar el stream:", error);
        return res.status(500).json({ 
          error: `Error al procesar el stream: ${error.message}`,
          errorType: 'PROCESSING_ERROR' 
        });
      }
    
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      error: error.message 
    });
  }
});

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
        const cleanResponseData = removeEmptyOccurrences(responseData);
        
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
 * @route POST /api/services/ida
 * @description Procesa un servicio con JSON (Servicio de Ida)
 */
router.post('/ida', async (req, res) => {
  try {
    const jsonData = req.body;
    const serviceNumber = jsonData.service_number;
    
    if (!serviceNumber) {
      return res.status(400).json({
        error: "Se requiere un número de servicio en el campo service_number"
      });
    }
    
    // Buscar estructuras del servicio
    const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber);
    
    // Crear un mensaje basado en el JSON de entrada
    const messageData = {
      header: {
        CANAL: jsonData.CANAL || "API",
        SERVICIO: serviceNumber,
        USUARIO: jsonData.USUARIO || "SISTEMA"
      },
      data: jsonData.data || {},
      section: "request"
    };
    
    // Crear mensaje
    const message = messageCreator.createMessage(headerStructure, serviceStructure, messageData, "request");
    
    // Devolver el resultado como JSON
    res.json({
      service_number: serviceNumber,
      service_name: serviceStructure.serviceName || "",
      message: message,
      status: "success"
    });
    
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      error: error.message 
    });
  }
});

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

// Importar el parseador de Excel
const excelParser = require('../utils/excel-parser');

/**
 * Obtiene la lista de servicios disponibles
 * @param {boolean} forceRefresh - Si es true, ignorar caché y recargar desde archivos
 * @returns {Promise<Array>} Lista de servicios
 */
async function getAvailableServices(forceRefresh = false) {
  try {
    // SIEMPRE forzar recarga cuando se solicita explícitamente
    if (forceRefresh) {
      console.log("Forzando recarga de caché por solicitud explícita");
    }
    // Verificar si existe caché válida de servicios
    else if (global.serviceCache && global.serviceCache.services && global.serviceCache.lastUpdate) {
      // Verificar si la caché es reciente (menos de 5 minutos)
      const cacheAge = Date.now() - new Date(global.serviceCache.lastUpdate).getTime();
      if (cacheAge < 5 * 60 * 1000) { // 5 minutos en milisegundos
        console.log(`Usando caché de servicios (edad: ${Math.round(cacheAge/1000)}s)`);
        return global.serviceCache.services;
      } else {
        console.log(`Caché de servicios expirada (edad: ${Math.round(cacheAge/1000)}s), recargando...`);
      }
    }
    
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    // Verificar que el directorio de uploads existe
    if (!fs.existsSync(uploadsDir)) {
      console.log("El directorio de uploads no existe");
      return [];
    }
    
    let excelFiles = [];
    try {
      // Volver a usar fs.readdirSync pero con un mejor filtro para extensiones
      const allFiles = fs.readdirSync(uploadsDir);
      // Filtrar considerando mayúsculas y minúsculas
      excelFiles = allFiles.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.xls' || ext === '.xlsx';
      });
      
      // Log detallado de todos los archivos encontrados
      console.log(`Encontrados ${excelFiles.length} archivos Excel en uploads:`);
      excelFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      
      if (excelFiles.length === 0) {
        // Si no se encuentran archivos, mostrar todos los archivos en el directorio para debugging
        console.log("ALERTA: No se encontraron archivos Excel. Contenido del directorio:");
        allFiles.forEach((file, index) => {
          console.log(`  [${index + 1}] ${file} - Ext: ${path.extname(file)}`);
        });
      }
    } catch (readDirError) {
      console.error("Error al leer directorio de uploads:", readDirError);
      return []; // Retornar lista vacía si hay error al leer directorio
    }
    
    // Array para almacenar todos los servicios
    const services = [];
    
    // Para cada archivo Excel, extraer el número de servicio y nombre
    for (const excelFile of excelFiles) {
      try {
        const excelPath = path.join(uploadsDir, excelFile);
        
        // Verificar si el archivo existe antes de procesarlo
        if (!fs.existsSync(excelPath)) {
          console.warn(`El archivo ${excelFile} no existe, saltando...`);
          continue;
        }
        
        // Extraer número de servicio del nombre del archivo
        let serviceNumber = null;
        
        // Buscar diferentes patrones: SVO1234, SVC1234, SVO1234-, etc.
        const servicePatterns = [
          { regex: /SVO(\d+)(?:-|\s|$)/i, name: "SVO pattern with delimiter" }, // Captura SVO1010- o SVO1010 (seguido de espacio o fin)
          { regex: /SVO(\d+)/i, name: "SVO pattern" },
          { regex: /SVC(\d+)(?:-|\s|$)/i, name: "SVC pattern with delimiter" },
          { regex: /SVC(\d+)/i, name: "SVC pattern" },
          { regex: /[_-](\d{4})[_-]/i, name: "4-digit pattern" },
          { regex: /(\d{4})_structure/i, name: "Structure file pattern" }
        ];
        
        // Buscar primero con los patrones específicos SVO y SVC (son los más precisos)
        const specificPatterns = servicePatterns.filter(p => p.name.includes('SVO') || p.name.includes('SVC'));
        let foundMatch = false;
        
        // Primero intentar con patrones específicos
        for (const pattern of specificPatterns) {
          const match = excelFile.match(pattern.regex);
          if (match && match[1]) {
            serviceNumber = match[1];
            console.log(`Número de servicio ${serviceNumber} extraído usando patrón específico ${pattern.name} de ${excelFile}`);
            foundMatch = true;
            break;
          }
        }
        
        // Si no se encontró con patrones específicos, probar con los demás
        if (!foundMatch) {
          // Recopilamos todos los posibles números de servicios y sus posiciones
          const allMatches = [];
          
          // Buscar todos los patrones que no son específicos
          const otherPatterns = servicePatterns.filter(p => !p.name.includes('SVO') && !p.name.includes('SVC'));
          for (const pattern of otherPatterns) {
            const match = excelFile.match(pattern.regex);
            if (match && match[1]) {
              // Verificar que sea un número de servicio válido (4 dígitos)
              if (/^\d{4}$/.test(match[1])) {
                // Calcular la posición del match en el string
                const matchPosition = excelFile.indexOf(match[1]);
                allMatches.push({
                  number: match[1], 
                  position: matchPosition,
                  pattern: pattern.name
                });
              }
            }
          }
          
          // Si hay matches, ordenarlos primero: preferir los que no son años
          // Luego por posición (preferir los que están después de SVO o similar)
          if (allMatches.length > 0) {
            // Ordenar - primero los que no sean años (2000-2030)
            allMatches.sort((a, b) => {
              // Verificar si es un año (2000-2030)
              const aIsYear = a.number >= 2000 && a.number <= 2030;
              const bIsYear = b.number >= 2000 && b.number <= 2030;
              
              // Priorizar los que no son años
              if (aIsYear && !bIsYear) return 1;
              if (!aIsYear && bIsYear) return -1;
              
              // Si ambos son años o no años, ordenar por posición
              return a.position - b.position;
            });
            
            // Usar el mejor match
            serviceNumber = allMatches[0].number;
            console.log(`Número de servicio ${serviceNumber} extraído usando ${allMatches[0].pattern} (posición ${allMatches[0].position}) de ${excelFile}`);
          }
        }
        
        if (!serviceNumber) {
          console.log(`Archivo ${excelFile} no contiene número de servicio reconocible, saltando...`);
          continue; // Saltar si no se pudo extraer un número de servicio
        }
        
        // Extraer nombre del servicio de la segunda fila de la segunda hoja
        let serviceName = "";
        try {
          // Usar el parseServiceStructure para obtener el nombre del servicio de la fila 2
          const tempStructure = excelParser.parseServiceStructure(excelPath);
          if (tempStructure && tempStructure.serviceName) {
            serviceName = tempStructure.serviceName;
          }
        } catch (parseError) {
          // Usar el nombre del archivo como fallback
          console.error(`Error al parsear Excel ${excelFile} para nombre de servicio:`, parseError);
          serviceName = excelFile.replace(/^\d+T\d+_/, '').replace(/\.xls[x]?$/i, '');
        }
        
        // Extraer timestamp del nombre del archivo
        const timestampMatch = excelFile.match(/^(\d+T\d+)/);
        let timestampStr = '';
        let uploadDate = new Date();
        
        if (timestampMatch && timestampMatch[1]) {
          timestampStr = timestampMatch[1];
          try {
            // Intentar convertir el timestamp a una fecha
            if (timestampStr.length >= 14) {
              const year = timestampStr.substring(0, 4);
              const month = timestampStr.substring(4, 6);
              const day = timestampStr.substring(6, 8);
              const hour = timestampStr.substring(8, 10);
              const minute = timestampStr.substring(10, 12);
              const second = timestampStr.substring(12, 14) || '00';
              
              // Create a valid date format
              try {
                uploadDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
                // Verify if the date is valid before trying to convert to ISO string
                if (isNaN(uploadDate.getTime())) {
                  uploadDate = new Date(); // Fallback to current date if invalid
                }
              } catch (dateError) {
                uploadDate = new Date(); // Fallback to current date if there's an error
              }
            }
          } catch (error) {
            // Si hay error en parsear la fecha, usar la fecha actual
            console.error(`Error al parsear fecha para ${excelFile}:`, error);
          }
        }
        
        // Crear nombre de archivo de estructura correspondiente
        let structureFile = "";
        
        if (timestampMatch && timestampMatch[1]) {
          structureFile = `${timestampMatch[1]}_${serviceNumber}_structure.json`;
        } else {
          // Fallback si no hay timestamp en el nombre
          structureFile = `${serviceNumber}_structure.json`;
        }
        
        // Verificar si el archivo de estructura existe
        let structureExists = false;
        try {
          structureExists = fs.existsSync(path.join(structuresDir, structureFile));
        } catch (fsError) {
          console.error(`Error al verificar estructura para ${structureFile}:`, fsError);
        }
        
        // Preparar objeto de servicio con valores seguros
        const serviceObj = {
          service_number: serviceNumber,
          service_name: serviceName || `Servicio ${serviceNumber}`,
          display_name: serviceName || `Servicio ${serviceNumber}`,
          structure_file: structureExists ? structureFile : null,
          excel_file: excelFile,
          timestamp: null // Inicializamos con null
        };
        
        // Asegurar que la fecha sea válida antes de convertir a ISO string
        try {
          if (!isNaN(uploadDate.getTime())) {
            serviceObj.timestamp = uploadDate.toISOString();
          } else {
            serviceObj.timestamp = new Date().toISOString();
          }
        } catch (dateError) {
          serviceObj.timestamp = new Date().toISOString();
          console.error(`Error al convertir fecha para ${excelFile}:`, dateError);
        }
        
        // Añadir a la lista de servicios
        services.push(serviceObj);
        
        // Solo logear si se fuerza el refresco
        if (forceRefresh) {
          console.log(`Añadido servicio: ${serviceNumber} - ${serviceName}`);
        }
      } catch (error) {
        console.error(`Error al procesar el archivo Excel ${excelFile}:`, error);
        // Continuamos con el siguiente archivo
      }
    }
    
    // Ordenar servicios por fecha (más recientes primero)
    try {
      services.sort((a, b) => {
        try {
          // Manejar casos donde el timestamp podría ser null o inválido
          const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
          const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
          
          if (isNaN(dateA.getTime())) return 1; // Mover fechas inválidas al final
          if (isNaN(dateB.getTime())) return -1;
          
          return dateB - dateA;
        } catch (error) {
          console.error("Error al ordenar servicios:", error);
          return 0; // En caso de error, mantener el orden
        }
      });
    } catch (sortError) {
      console.error("Error al ordenar la lista de servicios:", sortError);
      // Aún retornamos la lista sin ordenar
    }
    
    // Actualizar caché global
    if (global.serviceCache) {
      global.serviceCache.services = services;
      global.serviceCache.lastUpdate = new Date().toISOString();
    }

    // Solo mostrar servicios si se fuerza el refresco
    if (forceRefresh) {
      console.log(services);
    }
    
    return services;
  } catch (error) {
    console.error("Error general al obtener servicios:", error);
    return []; // Siempre devolvemos un array, incluso en caso de error
  }
}

/**
 * Busca un servicio por número
 * @param {string} serviceNumber - Número de servicio
 * @param {boolean} forceRefresh - Si es true, ignorar caché y recargar estructura
 * @returns {Promise<Object>} Estructuras de cabecera y servicio
 */
async function findServiceByNumber(serviceNumber, forceRefresh = false) {
  try {
    if (!serviceNumber) {
      const error = new Error('Número de servicio no proporcionado');
      error.statusCode = 400;
      throw error;
    }
    
    // Verificar caché de estructuras silenciosamente
    if (!forceRefresh &&
        global.serviceCache &&
        global.serviceCache.structures &&
        global.serviceCache.structures[serviceNumber]) {
      return global.serviceCache.structures[serviceNumber];
    }

    // Solo logear si necesitamos buscar el servicio
    console.log(`Buscando servicio con número: ${serviceNumber}`);
    
    // Obtener la lista de servicios
    const services = await getAvailableServices();
    
    // Buscar el servicio por número
    const service = services.find(s => s.service_number === serviceNumber);
    if (!service) {
      const error = new Error(`Servicio no encontrado: ${serviceNumber}`);
      error.statusCode = 404;
      throw error;
    }
    
    console.log(`Servicio encontrado: ${service.service_name}, archivo: ${service.excel_file}`);
    
    // Resultado que se devolverá
    let result = null;
    
    // Si tenemos un archivo de estructura, usarlo
    if (service.structure_file) {
      const structureFile = path.join(structuresDir, service.structure_file);
      
      try {
        if (fs.existsSync(structureFile)) {
          console.log(`Usando archivo de estructura: ${structureFile}`);
          const structure = await fs.readJson(structureFile);
          
          // Verificar que la estructura tenga los componentes necesarios
          if (!structure.header_structure) {
            console.warn(`El archivo de estructura ${structureFile} no contiene header_structure`);
          }
          
          if (!structure.service_structure) {
            console.warn(`El archivo de estructura ${structureFile} no contiene service_structure`);
          }
          
          result = { 
            headerStructure: structure.header_structure || {},
            serviceStructure: structure.service_structure || {}
          };
        } else {
          console.warn(`Archivo de estructura ${structureFile} no encontrado, intentando parsear Excel directamente`);
        }
      } catch (structureError) {
        console.error(`Error al leer archivo de estructura ${structureFile}:`, structureError);
        // Continuamos al siguiente método
      }
    }
    
    // Si no se ha obtenido un resultado y hay un archivo Excel, parsearlo directamente
    if (!result && service.excel_file) {
      const excelPath = path.join(__dirname, '..', 'uploads', service.excel_file);
      
      try {
        if (fs.existsSync(excelPath)) {
          console.log(`Parseando Excel directamente: ${excelPath}`);
          
          // Parsear cabecera y estructura directamente del Excel
          let headerStructure = {};
          let serviceStructure = {};
          
          try {
            headerStructure = excelParser.parseHeaderStructure(excelPath);
            console.log('Estructura de cabecera parseada correctamente');
          } catch (headerError) {
            console.error(`Error al parsear cabecera desde Excel ${service.excel_file}:`, headerError);
            headerStructure = {}; // Estructura vacía en caso de error
          }
          
          try {
            serviceStructure = excelParser.parseServiceStructure(excelPath);
            console.log('Estructura de servicio parseada correctamente');
          } catch (serviceError) {
            console.error(`Error al parsear servicio desde Excel ${service.excel_file}:`, serviceError);
            serviceStructure = {}; // Estructura vacía en caso de error
          }
          
          result = {
            headerStructure: headerStructure,
            serviceStructure: serviceStructure
          };
        } else {
          console.error(`Archivo Excel ${excelPath} no encontrado`);
          throw new Error(`Archivo Excel ${service.excel_file} no encontrado para el servicio ${serviceNumber}`);
        }
      } catch (excelError) {
        console.error(`Error al procesar Excel ${service.excel_file}:`, excelError);
        throw new Error(`Error al procesar Excel para el servicio ${serviceNumber}: ${excelError.message}`);
      }
    }
    
    if (!result) {
      throw new Error(`No se pudo cargar el servicio ${serviceNumber}: archivos de estructura o Excel no encontrados`);
    }
    
    // Guardar en caché
    if (global.serviceCache && global.serviceCache.structures) {
      global.serviceCache.structures[serviceNumber] = result;
    }
    
    return result;
    
  } catch (error) {
    console.error(`Error al cargar servicio ${serviceNumber}:`, error);
    
    // Asegurar que todos los errores tienen un código de estado
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    
    // Crear mensaje de error más descriptivo
    if (error.message.includes('no encontrado')) {
      error.message = `Error al cargar estructura: ${error.message}`;
    } else {
      error.message = `Error al cargar estructura para servicio ${serviceNumber}: ${error.message}`;
    }
    
    throw error;
  }
}

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
 * @param {Object} responseData - Datos de respuesta
 * @returns {Object} - Datos de respuesta con índices y relaciones parentId corregidas
 */
function removeEmptyOccurrences(responseData) {
  console.log("[SERVICIO] Aplicando corrección simple para índices y relaciones parentId");
  
  // Usar directamente el response data como una estructura simple para corregir sus índices
  // Creamos una estructura temporal compatible con el fixer
  const tempStructure = {
    request: { elements: [] },
    response: { elements: [] }
  };
  
  // Si el objeto recibido es un array, lo tratamos como los elementos de request o response
  if (Array.isArray(responseData)) {
    tempStructure.response.elements = responseData;
  } else if (responseData && typeof responseData === 'object') {
    // Si es un objeto, lo fijamos directamente
    return occurrenceFixer.fixOccurrenceIndices({ response: responseData }).response;
  }
  
  // Aplicar fix y retornar los elementos corregidos
  const fixed = occurrenceFixer.fixOccurrenceIndices(tempStructure);
  return Array.isArray(responseData) ? fixed.response.elements : responseData;
}











/**
 * @route POST /api/services/sendmessage
 * @description Genera un string de IDA a partir de parámetros personalizados
 */
router.post('/sendmessage', async (req, res) => {
  try {
    const { header, parameters } = req.body;
    
    // Validar datos de entrada
    if (!header || !header.serviceNumber) {
      return res.status(400).json({ error: "Se requiere header.serviceNumber" });
    }
    
    if (!header.canal) {
      return res.status(400).json({ error: "Se requiere header.canal" });
    }
    
    const serviceNumber = header.serviceNumber;
    const canal = header.canal;
    console.log(`[SENDMESSAGE] Procesando servicio: ${serviceNumber}, canal: ${canal}`);
    
    // 1. Buscar estructura del servicio
    const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber);
    if (!headerStructure || !serviceStructure) {
      return res.status(404).json({ error: `Estructura no encontrada para el servicio ${serviceNumber}` });
    }
    console.log(`[SENDMESSAGE] Estructura encontrada para servicio ${serviceNumber}`);
    
    // 2. Buscar configuración por canal
    const configDir = path.join(__dirname, '..', 'settings');
    
    // Buscar configuración por serviceNumber y canal
    let configFound = false;
    let configData = null;
    
    try {
      // Buscar archivos de configuración para este servicio
      const configFiles = fs.readdirSync(configDir)
        .filter(file => file.endsWith('.json') &&
                (file.includes(`${serviceNumber}-${canal}`) ||
                 file.includes(`${serviceNumber}_${canal}`)));
      
      if (configFiles.length > 0) {
        // Usar la primera configuración encontrada
        const configPath = path.join(configDir, configFiles[0]);
        configData = await fs.readJson(configPath);
        configFound = true;
        console.log(`[SENDMESSAGE] Configuración encontrada: ${configFiles[0]}`);
      } else {
        console.log(`[SENDMESSAGE] No se encontró configuración para servicio ${serviceNumber} y canal ${canal}`);
      }
    } catch (configError) {
      console.error(`Error al buscar configuración:`, configError);
    }
    
    // 3. Combinar configuración con parámetros específicos
    let requestData = {};
    
    // Si encontramos configuración, usarla como base
    if (configFound && configData) {
      // Clonar objeto para no modificar el original
      requestData = {
        header: { ...configData.header || {} },
        data: { ...configData.request || {} }
      };
    } else {
      // Si no hay configuración, crear objeto básico
      requestData = {
        header: {
          CANAL: canal,
          SERVICIO: serviceNumber,
          USUARIO: "SISTEMA"
        },
        data: {}
      };
    }
    
    // Agregar parámetros específicos a los datos del request
    if (parameters && typeof parameters === 'object') {
      // Reemplazar/agregar parámetros en data
      Object.assign(requestData.data, parameters);
      console.log(`[SENDMESSAGE] Parámetros combinados con configuración`);
    }
    
    // 4. Crear mensaje de IDA
    const message = messageCreator.createMessage(headerStructure, serviceStructure, requestData, "request");
    console.log(`[SENDMESSAGE] String de IDA generado: ${message.length} caracteres`);
    
    // 5. Devolver resultado
    res.json({
      request: {
        header,
        parameters
      },
      response: message
    });
    
  } catch (error) {
    console.error(`Error en procesamiento:`, error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Error desconocido en procesamiento'
    });
  }
});

/**
 * @route POST /api/services/receivemessage
 * @description Procesa un string de VUELTA y lo convierte a JSON
 */
router.post('/receivemessage', async (req, res) => {
  try {
    const { header, parameters } = req.body;
    
    // Validar datos de entrada
    if (!header || !header.serviceNumber) {
      return res.status(400).json({ error: "Se requiere header.serviceNumber" });
    }
    
    if (!parameters || !parameters.returnMsg) {
      return res.status(400).json({ error: "Se requiere parameters.returnMsg" });
    }
    
    // Opciones de filtrado
    const filterEmptyFields = header.filterEmptyFields !== false; // Por defecto true
    const filterMode = header.filterMode || 'standard'; // 'standard', 'aggressive', 'none'
    
    const serviceNumber = header.serviceNumber;
    const stream = parameters.returnMsg;
    console.log(`[RECEIVEMESSAGE] Procesando servicio: ${serviceNumber}, stream de ${stream.length} caracteres`);
    
    // 1. Buscar estructura del servicio
    const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber);
    if (!headerStructure || !serviceStructure) {
      return res.status(404).json({ error: `Estructura no encontrada para el servicio ${serviceNumber}` });
    }
    console.log(`[RECEIVEMESSAGE] Estructura encontrada para servicio ${serviceNumber}`);
    
    // 2. Analizar el stream como una respuesta
    console.log(`[RECEIVEMESSAGE] Analizando stream como RESPUESTA`);
    
    // Extraer cabecera
    const headerLength = headerStructure.totalLength || 102;
    const headerMessage = stream.substring(0, headerLength);
    const headerData = messageAnalyzer.parseHeaderMessage(headerMessage, headerStructure);
    console.log(`[RECEIVEMESSAGE] Headers parseados:`, headerData);
    
    // Extraer cuerpo de la respuesta
    const bodyMessage = stream.substring(headerLength);
    const responseStructure = serviceStructure.response;
    
    // Procesar el cuerpo de la respuesta
    let responseData = {};
    if (responseStructure && responseStructure.elements) {
      try {
        // Usar el parseDataMessage para procesar la respuesta CON VALIDACIÓN DE OCURRENCIAS
        responseData = messageAnalyzer.parseDataMessage(
          bodyMessage,
          responseStructure,
          true // Activar validación de ocurrencias
        );
        
        console.log("[RECEIVEMESSAGE] Validación de ocurrencias exitosa");
      } catch (validationError) {
        // Capturar errores específicos de validación
        if (validationError.message.includes('Error de validación')) {
          return res.status(400).json({
            error: validationError.message,
            validationFailed: true,
            errorType: 'VALIDATION_ERROR'
          });
        }
        throw validationError; // Reenviar otros errores
      }
    } else {
      console.warn("No se encontró estructura de respuesta para el servicio");
    }
    
    // Filtrar ocurrencias vacías antes de retornar
    let cleanResponseData = occurrenceFixer.fixOccurrenceIndices({ response: responseData }).response;
    
    // Función para eliminar ocurrencias vacías y campos con valores por defecto
    const removeEmptyOccurrences = (data, shouldFilter = true) => {
      // Si no se debe filtrar, devolver los datos tal cual
      if (!shouldFilter) return data;
      
      if (!data || typeof data !== 'object') return data;
      
      const result = { ...data };
      
      // Buscar y eliminar ocurrencias vacías y campos con valores por defecto
      for (const [key, value] of Object.entries(result)) {
        // Procesar ocurrencias (arrays)
        if (key.startsWith('occ_') && Array.isArray(value)) {
          // Filtrar elementos vacíos del array
          result[key] = value.filter(item => {
            if (!item || typeof item !== 'object') return false;
            
            // Un elemento está "vacío" si todos sus valores (excluyendo index) están vacíos
            const hasNonEmptyValue = Object.entries(item).some(([propKey, propValue]) => {
              if (propKey === 'index') return false; // ignorar propiedad index
              
              // Considerar vacío: string vacío, null, undefined, o string de solo ceros
              if (propValue === "" || propValue === null || propValue === undefined) return false;
              if (typeof propValue === 'string' && /^0+$/.test(propValue)) return false;
              if (typeof propValue === 'string' && propValue.trim() === '') return false;
              
              return true; // Si llegamos aquí, el valor no está vacío
            });
            
            return hasNonEmptyValue;
          });
          
          // Si la ocurrencia está vacía después de filtrar, eliminarla
          if (result[key].length === 0) {
            delete result[key];
          }
        }
        // Procesar campos individuales
        else if (typeof value === 'string') {
          // Eliminar campos que son solo ceros o espacios
          if (/^0+$/.test(value) || value.trim() === '') {
            delete result[key];
          }
        }
        // Procesar números
        else if (typeof value === 'number' && value === 0) {
          delete result[key];
        }
        // Procesar objetos anidados
        else if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = removeEmptyOccurrences(value, shouldFilter);
          // Si el objeto está vacío después de procesar, eliminarlo
          if (Object.keys(result[key]).length === 0) {
            delete result[key];
          }
        }
      }
      
      return result;
    };
    // Aplicar limpieza de ocurrencias vacías si se solicita
    cleanResponseData = removeEmptyOccurrences(cleanResponseData, filterEmptyFields);
    console.log(`[RECEIVEMESSAGE] Response parseada y filtrada:`, cleanResponseData);
    
    // 3. Devolver resultado
    res.json({
      request: {
        header,
        parameters: { returnMsg: `[string de longitud ${stream.length}]` }
      },
      response: cleanResponseData
    });
    
  } catch (error) {
    console.error(`Error en procesamiento:`, error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Error desconocido en procesamiento'
    });
  }
});

module.exports = router;
module.exports.getAvailableServices = getAvailableServices;
