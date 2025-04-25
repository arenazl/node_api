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
 * @route POST /api/services/process
 * @description Procesa un servicio por número y stream (Servicio de Vuelta)
 */
router.post('/process', async (req, res) => {
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
      const parsedData = messageAnalyzer.parseMessage(stream, headerStructure, serviceStructure);
      
      // Devolver solamente el mensaje procesado como string
      res.set('Content-Type', 'text/plain');
      return res.send(stream);
    } catch (error) {
      throw new Error(`Error al procesar el stream: ${error.message}`);
    }
    
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      error: error.message 
    });
  }
});

/**
 * @route POST /api/services/:serviceNumber/process
 * @description Procesa un servicio con JSON (Servicio de Ida)
 */
router.post('/:serviceNumber/process', async (req, res) => {
  try {
    const serviceNumber = req.params.serviceNumber;
    const jsonData = req.body;
    
    if (!serviceNumber) {
      return res.status(400).json({
        error: "Se requiere un número de servicio"
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
 * @returns {Promise<Array>} Lista de servicios
 */
async function getAvailableServices() {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    // Verificar que el directorio de uploads existe
    if (!fs.existsSync(uploadsDir)) {
      return [];
    }
    
    // Leer todos los archivos Excel del directorio
    const excelFiles = fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.xls') || file.endsWith('.xlsx'));
    
    console.log(`Encontrados ${excelFiles.length} archivos Excel en uploads`);
    
    // Array para almacenar todos los servicios
    const services = [];
    
    // Para cada archivo Excel, extraer el número de servicio y nombre
    for (const excelFile of excelFiles) {
      try {
        const excelPath = path.join(uploadsDir, excelFile);
        
        // Extraer número de servicio del nombre del archivo
        let serviceNumber = null;
        const svoMatch = excelFile.match(/SVO(\d+)/i);
        if (svoMatch && svoMatch[1]) {
          serviceNumber = svoMatch[1];
        }
        
        if (!serviceNumber) continue; // Saltar si no se pudo extraer un número de servicio
        
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
              
              uploadDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
            }
          } catch (error) {
            // Si hay error en parsear la fecha, usar la fecha actual
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
        const structureExists = fs.existsSync(path.join(structuresDir, structureFile));
        
        // Añadir a la lista de servicios
        services.push({
          service_number: serviceNumber,
          service_name: serviceName,
          display_name: serviceName,
          structure_file: structureExists ? structureFile : null,
          excel_file: excelFile,
          timestamp: uploadDate.toISOString()
        });
        
        console.log(`Añadido servicio: ${serviceNumber} - ${serviceName}`);
      } catch (error) {
        console.error(`Error al procesar el archivo Excel ${excelFile}:`, error);
      }
    }
    
    // Ordenar servicios por fecha (más recientes primero)
    services.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return services;
  } catch (error) {
    console.error("Error al obtener servicios:", error);
    return [];
  }
}

/**
 * Busca un servicio por número
 * @param {string} serviceNumber - Número de servicio
 * @returns {Promise<Object>} Estructuras de cabecera y servicio
 */
async function findServiceByNumber(serviceNumber) {
  try {
    // Obtener la lista de servicios
    const services = await getAvailableServices();
    
    // Buscar el servicio por número
    const service = services.find(s => s.service_number === serviceNumber);
    if (!service) {
      throw new Error(`Servicio no encontrado: ${serviceNumber}`);
    }
    
    // Si tenemos un archivo de estructura, usarlo
    if (service.structure_file) {
      const structureFile = path.join(structuresDir, service.structure_file);
      
      if (fs.existsSync(structureFile)) {
        const structure = await fs.readJson(structureFile);
        
        return { 
          headerStructure: structure.header_structure,
          serviceStructure: structure.service_structure
        };
      }
    }
    
    // Si no hay archivo de estructura o no existe, parsear directamente el Excel
    if (service.excel_file) {
      const excelPath = path.join(__dirname, '..', 'uploads', service.excel_file);
      
      if (fs.existsSync(excelPath)) {
        // Parsear cabecera y estructura directamente del Excel
        const headerStructure = excelParser.parseHeaderStructure(excelPath);
        const serviceStructure = excelParser.parseServiceStructure(excelPath);
        
        return {
          headerStructure: headerStructure,
          serviceStructure: serviceStructure
        };
      }
    }
    
    throw new Error(`No se pudo cargar el servicio ${serviceNumber}: archivos de estructura o Excel no encontrados`);
    
  } catch (error) {
    console.error(`Error al cargar servicio ${serviceNumber}:`, error);
    error.statusCode = 500;
    error.message = `Error al cargar estructura: ${error.message}`;
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
