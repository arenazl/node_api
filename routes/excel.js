/**
 * Rutas para el manejo de archivos Excel
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const XLSX = require('xlsx');
const router = express.Router();

// Importar módulos de la API
const excelParser = require('../utils/excel-parser');

// Directorios para almacenar archivos
const uploadsDir = path.join(__dirname, '..', 'uploads');
const structuresDir = path.join(__dirname, '..', 'structures');

/**
 * @route POST /excel/check-service-exists
 * @description Verifica si un servicio ya existe para evitar duplicados
 */
router.post('/check-service-exists', async (req, res) => {
  try {
    const { serviceNumber } = req.body;
    
    if (!serviceNumber) {
      return res.status(400).json({ 
        error: "Se requiere el número de servicio" 
      });
    }
    
    // Obtener la lista de servicios existentes
    const serviceRoutes = require('./services');
    const services = await serviceRoutes.getAvailableServices();
    
    // Verificar si el servicio ya existe
    const existingServices = services.filter(s => s.service_number === serviceNumber);
    
    // Si existe, devolver los datos existentes
    if (existingServices.length > 0) {
      return res.json({
        exists: true,
        services: existingServices,
        message: `Ya existen ${existingServices.length} estructura(s) para el servicio ${serviceNumber}`
      });
    }
    
    return res.json({
      exists: false
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: `Error al verificar servicio: ${error.message}` 
    });
  }
});

/**
 * @route POST /excel/upload
 * @description Sube y procesa un archivo Excel
 */
router.post('/upload', async (req, res) => {
  try {
    // Verificar si se proporcionó un archivo
    if (!req.files || !req.files.file) {
      return res.status(400).json({ 
        error: "No se proporcionó ningún archivo" 
      });
    }
    
    const excelFile = req.files.file;
    
    // Verificar que sea un archivo Excel
    if (!excelFile.name.match(/\.(xlsx|xls)$/i)) {
      return res.status(400).json({ 
        error: "Solo se permiten archivos Excel (.xlsx, .xls)" 
      });
    }
    
    // Generar nombre de archivo único con timestamp
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 14);
    const filename = `${timestamp}_${excelFile.name}`;
    const filePath = path.join(uploadsDir, filename);
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Guardar archivo
    await excelFile.mv(filePath);
    
    // Procesar archivo Excel
    const { headerStructure, serviceStructure } = await processExcelFile(filePath);
    
    // Guardar las estructuras en un solo archivo
    const structureInfo = saveStructures(headerStructure, serviceStructure);
    
    // Devolver respuesta
    res.json({
      filename: path.basename(filePath),
      structure_file: structureInfo.structure_file,
      message: "Archivo Excel procesado correctamente"
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: `Error al procesar el archivo Excel: ${error.message}` 
    });
  }
});

/**
 * @route GET /excel/files
 * @description Obtiene la lista de archivos Excel procesados
 */
router.get('/files', async (req, res) => {
  try {
    // Obtener archivos y luego actualizar la lista con los nombres más recientes
    let files = await getExcelFiles();
    
    // Obtener lista actual de servicios para completar con los nombres más recientes
    const serviceRoutes = require('./services');
    const services = await serviceRoutes.getAvailableServices();
    
    // Actualizar nombres de servicios con los datos más recientes
    files = files.map(file => {
      if (file.service_number) {
        // Buscar si este servicio tiene un nombre actualizado
        const serviceInfo = services.find(s => s.service_number === file.service_number);
        if (serviceInfo && serviceInfo.display_name) {
          file.service_name = serviceInfo.display_name;
        }
      }
      return file;
    });
    
    res.json({ files });
  } catch (error) {
    res.status(500).json({ 
      error: `Error al obtener la lista de archivos: ${error.message}` 
    });
  }
});

/**
 * @route GET /excel/structure
 * @description Obtiene la estructura de un archivo procesado
 */
router.get('/structure', async (req, res) => {
  try {
    const { structure_file } = req.query;
    
    if (!structure_file) {
      return res.status(400).json({ 
        error: "Se requiere el parámetro structure_file" 
      });
    }
    
    const structure = await getStructure(structure_file);
    res.json(structure);
    
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      error: error.message 
    });
  }
});


/**
 * Guarda la estructura JSON completa en un único archivo
 * @param {Object} headerStructure - Estructura de la cabecera
 * @param {Object} serviceStructure - Estructura del servicio
 * @returns {Object} Objeto con el nombre del archivo guardado
 */
function saveStructures(headerStructure, serviceStructure, excelFilePath) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const serviceNumber = serviceStructure.serviceNumber || 'unknown';
  
  // Obtener el nombre del archivo Excel original para usarlo como nombre del servicio
  const excelFileName = path.basename(excelFilePath || '', path.extname(excelFilePath || ''));
  // Extraer el nombre sin timestamp si tiene un formato estándar
  let originalFileName = excelFileName;
  if (excelFileName && excelFileName.match(/^\d{8}T\d{4,6}_/)) {
    originalFileName = excelFileName.replace(/^\d{8}T\d{4,6}_/, '');
  }
  
  // Generar nombre de archivo con timestamp
  const structureFileName = `${timestamp}_${serviceNumber}_structure.json`;
  
  // Ruta completa
  const structureFilePath = path.join(structuresDir, structureFileName);
  
  // Crear directorio si no existe
  if (!fs.existsSync(structuresDir)) {
    fs.mkdirSync(structuresDir, { recursive: true });
  }
  
  // Crear estructura combinada sin duplicar propiedades
  const combinedStructure = {
    header_structure: headerStructure,
    service_structure: serviceStructure
  };
  
  // Guardar el archivo
  fs.writeFileSync(structureFilePath, JSON.stringify(combinedStructure, null, 2));
  
  return {
    structure_file: structureFileName
  };
}

/**
 * Obtiene la lista de archivos Excel procesados
 * @returns {Promise<Array>} Lista de archivos
 */
async function getExcelFiles() {
  const files = [];
  
  // Verificar si el directorio de uploads existe
  if (!fs.existsSync(uploadsDir)) {
    return files;
  }
  
  // Obtener todos los archivos Excel directamente del directorio uploads
  const excelFiles = fs.readdirSync(uploadsDir)
    .filter(file => file.endsWith('.xls') || file.endsWith('.xlsx'));
    
  // Mapa para mantener un registro de los servicios ya procesados (para evitar duplicados)
  const processedServices = new Set();
  
  // Procesar cada archivo
  for (const excelFile of excelFiles) {
    try {
      // Extraer timestamp y nombre del archivo
      const timestampMatch = excelFile.match(/^(\d+T\d+)_(.+)\.xls(x)?$/);
      let uploadDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
      let serviceName = excelFile;
      let serviceNumber = null;
      
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
        serviceNumber = serviceMatch[1];
      }
      
      // Crear nombre de archivo de estructura correspondiente
      let structureFile = null;
      if (timestampMatch && timestampMatch[1] && serviceNumber) {
        structureFile = `${timestampMatch[1]}_${serviceNumber}_structure.json`;
        
        // Verificar si existe el archivo de estructura
        if (!fs.existsSync(path.join(structuresDir, structureFile))) {
          structureFile = null;
        }
      }
      
      // Agregar archivo a la lista
      files.push({
        filename: excelFile,
        service_name: serviceName,
        upload_date: uploadDate,
        structure_file: structureFile,
        service_number: serviceNumber
      });
    } catch (error) {
      console.error(`Error al procesar archivo ${excelFile}:`, error);
    }
  }
  
  // Ordenar archivos por fecha de subida (más recientes primero)
  files.sort((a, b) => b.upload_date.localeCompare(a.upload_date));
  
  return files;
}

/**
 * Obtiene la estructura de un archivo procesado
 * @param {string} structureFile - Nombre del archivo de estructura
 * @returns {Promise<Object>} Estructura del archivo
 */
async function getStructure(structureFile) {
  // Verificar si el archivo existe
  const structurePath = path.join(structuresDir, structureFile);
  
  if (!fs.existsSync(structurePath)) {
    const error = new Error(`Archivo de estructura no encontrado: ${structureFile}`);
    error.statusCode = 404;
    throw error;
  }
  
  // Cargar estructura
  try {
    const structure = await fs.readJson(structurePath);
    return structure;
  } catch (error) {
    error.statusCode = 500;
    error.message = `Error al cargar archivo de estructura: ${error.message}`;
    throw error;
  }
}

/**
 * Procesa un archivo Excel y extrae las estructuras
 * @param {string} filePath - Ruta del archivo Excel
 * @returns {Promise<Object>} Estructuras extraídas y nombre del archivo guardado
 */
async function processExcelFile(filePath) {
  try {
    // Extraer estructuras
    const headerStructure = excelParser.parseHeaderStructure(filePath);
    const serviceStructure = excelParser.parseServiceStructure(filePath);
    
    // Guardar la estructura combinada
    const structureInfo = saveStructures(headerStructure, serviceStructure, filePath);
    
    return { 
      headerStructure, 
      serviceStructure,
      structureFile: structureInfo.structure_file 
    };
  } catch (error) {
    throw new Error(`Error al procesar el archivo Excel: ${error.message}`);
  }
}

module.exports = router;
