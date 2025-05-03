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

/**
 * Función para eliminar ocurrencias vacías de un objeto de respuesta
 * @param {Object} responseData - Datos de respuesta a filtrar
 * @returns {Object} - Datos de respuesta sin ocurrencias vacías
 */
function removeEmptyOccurrences(responseData) {
  if (!responseData || typeof responseData !== 'object') {
    return responseData;
  }
  
  // Crear una copia profunda del objeto para no modificar el original
  const result = JSON.parse(JSON.stringify(responseData));
  
  // Buscar campos que sean arrays (posibles ocurrencias)
  for (const key in result) {
    if (Array.isArray(result[key])) {
      console.log(`Procesando ocurrencia ${key} con ${result[key].length} elementos`);
      
      // Función auxiliar para verificar si un valor es realmente significativo
      // (no solo espacios, ceros o valores por defecto)
      const isSignificantValue = (value) => {
        if (value === null || value === undefined) return false;
        
        if (typeof value === 'string') {
          // Eliminar espacios
          const trimmedValue = value.trim();
          if (trimmedValue === '') return false;
          
          // Verificar si solo contiene ceros
          if (/^0+$/.test(trimmedValue)) return false;
          
          // Verificar si solo contiene espacios y ceros
          if (/^[0\s]+$/.test(value)) return false;
          
          // Si contiene algún caracter que no sea un cero, espacio o caracter por defecto, es significativo
          return /[^0\s]/.test(value);
        }
        
        if (Array.isArray(value)) {
          return value.length > 0 && value.some(item => 
            typeof item === 'object' && 
            Object.values(item).some(v => isSignificantValue(v))
          );
        }
        
        return false;
      };
      
      // Filtrar elementos: mantener solo los que tienen al menos un campo con valor significativo
      const filteredItems = result[key].filter(item => {
        // Si no es un objeto o es null, no hay nada que evaluar
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return false;
        }
        
        // Verificar si el objeto tiene al menos un campo con valor significativo
        return Object.values(item).some(fieldValue => isSignificantValue(fieldValue));
      });
      
      console.log(`Ocurrencia ${key} filtrada: ${filteredItems.length} elementos (eliminados ${result[key].length - filteredItems.length})`);
      
      // Actualizar el array con los elementos filtrados
      result[key] = filteredItems;
      
      // Si la ocurrencia queda vacía completamente, consideramos eliminarla
      if (result[key].length === 0) {
        console.log(`Eliminando completamente la ocurrencia vacía ${key}`);
        delete result[key];
      }
    }
  }
  
  return result;
}

/**
 * @route GET /api/services
 * @description Obtiene la lista de servicios disponibles
 */
router.get('/', async (req, res) => {
  try {
    // Obtener todos los archivos de estructura
    const services = await getAvailableServices();
    console.log("Servicios disponibles:", services);
    res.json({ services });
  } catch (error) {
    console.error("Error al obtener servicios:", error);
    res.status(500).json({ 
      error: `Error al obtener la lista de servicios: ${error.message}` 
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
    // Verificar si existe caché válida de servicios
    if (global.serviceCache && global.serviceCache.services && global.serviceCache.lastUpdate && !forceRefresh) {
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
      // Leer todos los archivos Excel del directorio
      excelFiles = fs.readdirSync(uploadsDir)
        .filter(file => file.endsWith('.xls') || file.endsWith('.xlsx'));
      
      console.log(`Encontrados ${excelFiles.length} archivos Excel en uploads`);
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
        const svoMatch = excelFile.match(/SVO(\d+)/i);
        if (svoMatch && svoMatch[1]) {
          serviceNumber = svoMatch[1];
        }
        
        if (!serviceNumber) {
          console.log(`Archivo ${excelFile} no contiene número de servicio, saltando...`);
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
        
        console.log(`Añadido servicio: ${serviceNumber} - ${serviceName}`);
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
    
    console.log(`Buscando servicio con número: ${serviceNumber}`);
    
    // Verificar caché de estructuras
    if (!forceRefresh && 
        global.serviceCache && 
        global.serviceCache.structures && 
        global.serviceCache.structures[serviceNumber]) {
      console.log(`Usando estructura en caché para servicio ${serviceNumber}`);
      return global.serviceCache.structures[serviceNumber];
    }
    
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

module.exports = router;
module.exports.getAvailableServices = getAvailableServices;
