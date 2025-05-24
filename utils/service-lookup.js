/**
 * service-lookup.js
 * Utilities for finding and retrieving service information and structures.
 */
const path = require('path');
const fs = require('fs-extra');
const excelParser = require('./excel-parser'); // For parsing Excel if structure JSON not found

const structuresDir = path.join(__dirname, '..', 'structures');
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Initialize cache
if (!global.serviceCache) {
  global.serviceCache = {
    services: null,
    lastUpdate: null,
    structures: {} // Cache for { headerStructure, serviceStructure } by serviceNumber
  };
}

/**
 * Obtiene la lista de servicios disponibles
 * @param {boolean} forceRefresh - Si es true, ignorar caché y recargar desde archivos
 * @returns {Promise<Array>} Lista de servicios
 */
async function getAvailableServices(forceRefresh = false) {
  try {
    if (forceRefresh) {
      console.log("[ServiceLookup] Forzando recarga de caché de servicios.");
      global.serviceCache.services = null;
      global.serviceCache.lastUpdate = null;
    } else if (global.serviceCache.services && global.serviceCache.lastUpdate) {
      const cacheAge = Date.now() - new Date(global.serviceCache.lastUpdate).getTime();
      if (cacheAge < 5 * 60 * 1000) { // 5 minutos
        console.log(`[ServiceLookup] Usando caché de servicios (edad: ${Math.round(cacheAge/1000)}s)`);
        return global.serviceCache.services;
      } else {
        console.log(`[ServiceLookup] Caché de servicios expirada (edad: ${Math.round(cacheAge/1000)}s), recargando...`);
      }
    }

    if (!fs.existsSync(uploadsDir)) {
      console.log("[ServiceLookup] El directorio de uploads no existe.");
      return [];
    }

    const allFiles = fs.readdirSync(uploadsDir);
    const excelFiles = allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.xls' || ext === '.xlsx';
    });

    const services = [];
    for (const excelFile of excelFiles) {
      try {
        const excelPath = path.join(uploadsDir, excelFile);
        if (!fs.existsSync(excelPath)) continue;

        let serviceNumber = null;
        const servicePatterns = [
          { regex: /SVO(\d+)(?:-|\s|$)/i }, { regex: /SVO(\d+)/i },
          { regex: /SVC(\d+)(?:-|\s|$)/i }, { regex: /SVC(\d+)/i },
          { regex: /[_-](\d{4})[_-]/i }, { regex: /(\d{4})_structure/i }
        ];

        for (const pattern of servicePatterns) {
          const match = excelFile.match(pattern.regex);
          if (match && match[1] && /^\d{4}$/.test(match[1])) {
            serviceNumber = match[1];
            break;
          }
        }
        if (!serviceNumber) continue;

        let serviceName = excelFile.replace(/^\d+T\d+_/, '').replace(/\.xls[x]?$/i, '');
        try {
          const tempStructure = excelParser.parseServiceStructure(excelPath);
          if (tempStructure && tempStructure.serviceName) {
            serviceName = tempStructure.serviceName;
          }
        } catch (parseError) {
          console.warn(`[ServiceLookup] Error al parsear ${excelFile} para nombre: ${parseError.message}`);
        }

        const timestampMatch = excelFile.match(/^(\d+T\d+)/);
        let uploadDate = new Date();
        if (timestampMatch && timestampMatch[1]) {
          const ts = timestampMatch[1];
          if (ts.length >= 14) {
            try {
              const parsedDate = new Date(`${ts.substring(0,4)}-${ts.substring(4,6)}-${ts.substring(6,8)}T${ts.substring(8,10)}:${ts.substring(10,12)}:${ts.substring(12,14)}`);
              if (!isNaN(parsedDate.getTime())) uploadDate = parsedDate;
            } catch (e) { /* ignore date parse error, use current */ }
          }
        }
        
        let structureFile = timestampMatch ? `${timestampMatch[1]}_${serviceNumber}_structure.json` : `${serviceNumber}_structure.json`;
        const structureExists = fs.existsSync(path.join(structuresDir, structureFile));

        services.push({
          service_number: serviceNumber,
          service_name: serviceName,
          display_name: serviceName,
          structure_file: structureExists ? structureFile : null,
          excel_file: excelFile,
          timestamp: uploadDate.toISOString()
        });
      } catch (error) {
        console.error(`[ServiceLookup] Error procesando archivo ${excelFile}: ${error.message}`);
      }
    }

    services.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    global.serviceCache.services = services;
    global.serviceCache.lastUpdate = new Date().toISOString();
    console.log(`[ServiceLookup] Caché de servicios actualizada con ${services.length} servicios.`);
    return services;
  } catch (error) {
    console.error("[ServiceLookup] Error general en getAvailableServices:", error);
    return [];
  }
}

/**
 * Busca un servicio por número y retorna sus estructuras.
 * @param {string} serviceNumber - Número de servicio.
 * @param {boolean} forceRefreshCache - Si es true, ignora la caché de estructuras para este servicio.
 * @returns {Promise<Object>} { headerStructure, serviceStructure }.
 */
async function findServiceByNumber(serviceNumber, forceRefreshCache = false) {
  if (!serviceNumber) {
    const error = new Error('Número de servicio no proporcionado');
    error.statusCode = 400;
    throw error;
  }

  if (!forceRefreshCache && global.serviceCache.structures[serviceNumber]) {
    console.log(`[ServiceLookup] Usando caché de estructura para servicio ${serviceNumber}`);
    return global.serviceCache.structures[serviceNumber];
  }

  console.log(`[ServiceLookup] Buscando servicio ${serviceNumber} (forceRefreshCache: ${forceRefreshCache})`);
  const services = await getAvailableServices(); // Uses its own caching for service list
  const service = services.find(s => s.service_number === serviceNumber);

  if (!service) {
    const error = new Error(`Servicio no encontrado: ${serviceNumber}`);
    error.statusCode = 404;
    throw error;
  }

  let result = null;
  if (service.structure_file) {
    const structureFilePath = path.join(structuresDir, service.structure_file);
    try {
      if (fs.existsSync(structureFilePath)) {
        console.log(`[ServiceLookup] Usando archivo de estructura: ${structureFilePath}`);
        const structure = await fs.readJson(structureFilePath);
        result = { 
          headerStructure: structure.header_structure || {},
          serviceStructure: structure.service_structure || {}
        };
      } else {
        console.warn(`[ServiceLookup] Archivo de estructura ${structureFilePath} no encontrado.`);
      }
    } catch (e) {
      console.error(`[ServiceLookup] Error leyendo ${structureFilePath}: ${e.message}`);
    }
  }

  if (!result && service.excel_file) {
    const excelPath = path.join(uploadsDir, service.excel_file);
    try {
      if (fs.existsSync(excelPath)) {
        console.log(`[ServiceLookup] Parseando Excel directamente: ${excelPath}`);
        const headerStructure = excelParser.parseHeaderStructure(excelPath);
        const serviceStructure = excelParser.parseServiceStructure(excelPath);
        result = { headerStructure, serviceStructure };
      } else {
         throw new Error(`Archivo Excel ${service.excel_file} no encontrado.`);
      }
    } catch (e) {
      console.error(`[ServiceLookup] Error procesando Excel ${service.excel_file}: ${e.message}`);
      throw new Error(`Error procesando Excel para servicio ${serviceNumber}: ${e.message}`);
    }
  }

  if (!result) {
    throw new Error(`No se pudo cargar estructura para servicio ${serviceNumber}.`);
  }

  global.serviceCache.structures[serviceNumber] = result;
  return result;
}

module.exports = {
  getAvailableServices,
  findServiceByNumber
};
