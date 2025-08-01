/**
 * Rutas para el manejo de archivos Excel
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const XLSX = require('xlsx');
const router = express.Router();
const deepEqual = require('../utils/deep-equal');

// Importar módulos de la API

const excelParser = require('../utils/excel-parser');

// Directorios para almacenar archivos
const uploadsDir = path.join(__dirname, '..', 'JsonStorage', 'uploads');
const structuresDir = path.join(__dirname, '..', 'JsonStorage', 'structures');

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

    // Crear un directorio temporal para procesar el archivo antes de confirmar la subida
    const tempDir = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Guardar archivo en directorio temporal primero
    const tempFilePath = path.join(tempDir, excelFile.name);
    await excelFile.mv(tempFilePath);

    try {
      // Extraer estructura del archivo temporal para verificar duplicados
      console.log("Extrayendo estructura del archivo para verificar duplicados...");
      const tempHeaderStructure = excelParser.parseHeaderStructure(tempFilePath);
      const tempServiceStructure = excelParser.parseServiceStructure(tempFilePath);

      // Verificar si ya existe una estructura idéntica
      if (tempServiceStructure && tempServiceStructure.serviceNumber) {
        // Buscar estructuras existentes para este servicio
        const structureFiles = fs.readdirSync(structuresDir)
          .filter(file => file.endsWith('_structure.json') && file.includes(`_${tempServiceStructure.serviceNumber}_`));

        // Ordenar por fecha (los más recientes primero)
        structureFiles.sort((a, b) => b.localeCompare(a));

        // Verificar cada estructura existente
        for (const structureFile of structureFiles) {
          const structurePath = path.join(structuresDir, structureFile);
          const existingStructure = fs.readJsonSync(structurePath);

          // Comparar estructuras para detectar duplicados
          const areStructuresEqual = (struct1, struct2) => {
            // Función recursiva para comparación profunda
            const deepCompare = (obj1, obj2) => {
              // Si ambos son null/undefined, son iguales
              if (obj1 == null && obj2 == null) return true;
              // Si uno es null/undefined y el otro no, son diferentes
              if (obj1 == null || obj2 == null) return false;
              
              // Si son arrays
              if (Array.isArray(obj1) && Array.isArray(obj2)) {
                if (obj1.length !== obj2.length) return false;
                for (let i = 0; i < obj1.length; i++) {
                  if (!deepCompare(obj1[i], obj2[i])) return false;
                }
                return true;
              }
              
              // Si solo uno es array, son diferentes
              if (Array.isArray(obj1) || Array.isArray(obj2)) return false;
              
              // Si son objetos
              if (typeof obj1 === 'object' && typeof obj2 === 'object') {
                const keys1 = Object.keys(obj1);
                const keys2 = Object.keys(obj2);
                
                // Filtrar solo las propiedades relevantes para comparación
                const relevantKeys1 = keys1.filter(key => 
                  !['index', 'timestamp', 'sourceFile', 'id'].includes(key)
                );
                const relevantKeys2 = keys2.filter(key => 
                  !['index', 'timestamp', 'sourceFile', 'id'].includes(key)
                );
                
                if (relevantKeys1.length !== relevantKeys2.length) return false;
                
                for (const key of relevantKeys1) {
                  if (!relevantKeys2.includes(key)) return false;
                  if (!deepCompare(obj1[key], obj2[key])) return false;
                }
                return true;
              }
              
              // Para valores primitivos
              return obj1 === obj2;
            };
            
            return deepCompare(struct1, struct2);
          };

          // Verificar si la estructura ya existe
          if (areStructuresEqual(tempServiceStructure, existingStructure.service_structure)) {
            console.log("Se detectó una estructura idéntica ya existente");

            // Eliminar archivo temporal
            fs.unlinkSync(tempFilePath);

            return res.status(409).json({
              error: "La versión que está intentando subir es idéntica a una ya existente",
              duplicateFile: structureFile.replace('_structure.json', ''),
              message: "La estructura del servicio es exactamente igual a una versión anterior"
            });
          }
        }
      }

      // Si llegamos aquí, no se encontró duplicado, continuar con la validación

      // VALIDAR ERRORES CRÍTICOS ANTES DE MOVER EL ARCHIVO
      console.log('[CRITICAL_VALIDATION] Validando errores críticos antes de guardar archivo...');
      const tempServiceStructureForValidation = excelParser.parseServiceStructure(tempFilePath);
      const criticalErrors = validateCriticalErrors(tempServiceStructureForValidation);
      
      if (criticalErrors.length > 0) {
        console.log('[CRITICAL_VALIDATION] ¡ERRORES CRÍTICOS DETECTADOS! NO se guardará el archivo.');
        
        // Eliminar archivo temporal
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        return res.status(422).json({
          error: "El archivo Excel contiene errores críticos que impiden su procesamiento",
          critical_errors: criticalErrors,
          message: "No se guardó el archivo debido a errores críticos. Corrija los problemas y vuelva a intentarlo."
        });
      }
      
      console.log('[CRITICAL_VALIDATION] ✓ No se detectaron errores críticos, procediendo a guardar archivo...');

      // Obtener número de servicio para generar nombre correlativo
      const serviceNumber = tempServiceStructureForValidation.serviceNumber || 'unknown';
      
      // Buscar archivos existentes para este servicio en uploads
      const existingFiles = fs.readdirSync(uploadsDir)
        .filter(file => file.includes(`_${serviceNumber}_v`) && file.match(/\.(xlsx|xls)$/i));
      
      // Calcular próximo número de versión
      const versionNumber = existingFiles.length + 1;
      
      // Generar nombre de archivo único con versión correlativa
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 14);
      const fileExtension = path.extname(excelFile.name);
      const filename = `${timestamp}_${serviceNumber}_v${versionNumber}${fileExtension}`;
      const filePath = path.join(uploadsDir, filename);

      // Crear directorio si no existe
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Mover archivo de la carpeta temporal a uploads
      fs.renameSync(tempFilePath, filePath);

      // Procesar archivo Excel y guardar las estructuras (ya sabemos que no hay errores críticos)
      const { headerStructure, serviceStructure, warnings, structureFile } = await processExcelFile(filePath);

      // Crear un mensaje de evento que incluya el número de servicio para notificar a la UI
      // Esta es la parte crucial que asegura que los componentes se actualicen automáticamente
      const eventPayload = {
        filename: path.basename(filePath),
        structure_file: structureFile,
        service_number: serviceStructure.serviceNumber || null,
        timestamp: new Date().toISOString()
      };

      // IMPORTANTE: Forzar actualización del caché ANTES de emitir eventos
      // Esto asegura que cuando el frontend solicite la lista de servicios, el backend ya tenga el caché actualizado
      console.log('[EXCEL] Limpiando caché de servicios antes de emitir eventos...');
      if (global.serviceCache) {
        global.serviceCache.services = null;
        global.serviceCache.lastUpdate = null;
        // También limpiar el caché de estructuras para este servicio específico
        if (serviceStructure.serviceNumber && global.serviceCache.structures) {
          delete global.serviceCache.structures[serviceStructure.serviceNumber];
        }
      }
      console.log('[EXCEL] Caché limpiado exitosamente');

      // Los eventos se manejan via EventBus local en el frontend
      // El frontend detecta automáticamente los cambios cuando actualiza la lista
      console.log('[EXCEL] Archivo procesado exitosamente. El frontend detectará los cambios automáticamente.');

      // Devolver respuesta
      res.json({
        filename: path.basename(filePath),
        structure_file: structureFile,
        service_number: serviceStructure.serviceNumber || null,
        service_name: serviceStructure.serviceName || '',
        message: "Archivo Excel procesado correctamente",
        warnings: warnings || {} // Incluir advertencias en la respuesta
      });
    } catch (processingError) {
      // En caso de error, eliminar el archivo temporal
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.error("Error al limpiar archivo temporal:", cleanupError);
      }

      // Manejar específicamente errores críticos AQUÍ
      console.log('[CRITICAL_VALIDATION] Procesando error capturado:', processingError.message);
      
      if (processingError.message && processingError.message.includes('CRITICAL_ERRORS:')) {
        console.log('[CRITICAL_VALIDATION] ¡Detectado error crítico!');
        
        // Extraer el JSON de errores críticos del mensaje, manejando múltiples wrappers
        let criticalErrorsJson = processingError.message;
        
        // Buscar y extraer la parte que contiene CRITICAL_ERRORS:
        const criticalErrorsIndex = criticalErrorsJson.indexOf('CRITICAL_ERRORS:');
        if (criticalErrorsIndex !== -1) {
          criticalErrorsJson = criticalErrorsJson.substring(criticalErrorsIndex + 'CRITICAL_ERRORS:'.length);
        }
        
        let criticalErrors;
        
        try {
          criticalErrors = JSON.parse(criticalErrorsJson);
          console.log('[CRITICAL_VALIDATION] Errores críticos parseados exitosamente:', criticalErrors);
        } catch (parseError) {
          console.log('[CRITICAL_VALIDATION] Error al parsear JSON de errores críticos:', parseError);
          criticalErrors = [{ 
            type: 'parsing_error', 
            message: 'Error al procesar los errores críticos del archivo',
            details: processingError.message 
          }];
        }

        console.log('[CRITICAL_VALIDATION] Retornando response 422 con errores críticos...');
        return res.status(422).json({
          error: "El archivo Excel contiene errores críticos que impiden su procesamiento",
          critical_errors: criticalErrors,
          message: "No se guardó el archivo debido a errores críticos. Corrija los problemas y vuelva a intentarlo."
        });
      }

      throw processingError;
    }

  } catch (error) {
    // Para otros errores, usar el comportamiento normal
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
 * @route GET /excel/download/:filename
 * @description Descarga un archivo Excel desde la carpeta uploads
 */
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;

    // Validar el nombre del archivo para evitar path traversal
    if (!filename || filename.includes('..') || !filename.match(/\.(xlsx|xls)$/i)) {
      return res.status(400).json({
        error: "Nombre de archivo inválido o no permitido"
      });
    }

    const filePath = path.join(uploadsDir, filename);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "Archivo no encontrado"
      });
    }

    // Enviar el archivo para descarga
    res.download(filePath);

  } catch (error) {
    console.error(`Error al descargar archivo:`, error);
    res.status(500).json({
      error: `Error al descargar el archivo: ${error.message}`
    });
  }
});

/**
 * @route GET /excel/structures
 * @description Obtiene la lista de todos los archivos de estructura disponibles
 */
router.get('/structures', async (req, res) => {
  try {
    // Inicializar un arreglo vacío para las estructuras
    const structures = [];

    // Verificar si el directorio de estructuras existe
    if (!fs.existsSync(structuresDir)) {
      // Devolver un arreglo vacío en lugar de un error
      return res.json({ structures });
    }

    // Leer todos los archivos de estructura si existen
    const structureFiles = fs.readdirSync(structuresDir)
      .filter(file => file.endsWith('_structure.json') && !file.includes('placeholder_'));

    // Si no hay estructuras, devolver arreglo vacío en lugar de error
    if (structureFiles.length === 0) {
      return res.json({ structures });
    }

    // Ordenar por fecha (los nombres tienen formato: 20250425T163957_3088_structure.json)
    structureFiles.sort((a, b) => b.localeCompare(a)); // Orden descendente

    res.json({ structures: structureFiles });
  } catch (error) {
    console.error(`Error al obtener estructuras:`, error);
    // Incluso en caso de error, devolver un arreglo vacío para evitar errores en el cliente
    res.json({ structures: [], error: error.message });
  }
});

/**
 * @route GET /excel/header-sample/:serviceNumber
 * @description Obtiene el ejemplo de cabecera para un número de servicio
 */
router.get('/header-sample/:serviceNumber', async (req, res) => {
  try {
    const { serviceNumber } = req.params;

    if (!serviceNumber) {
      return res.status(400).json({
        error: "Se requiere el número de servicio"
      });
    }

    // Ruta del archivo de header sample
    const headersDir = path.join(__dirname, '..', 'JsonStorage', 'headers');
    const headerSampleFile = path.join(headersDir, `${serviceNumber}_header_sample.json`);

    // Verificar si el archivo existe
    if (!fs.existsSync(headerSampleFile)) {
      return res.status(404).json({
        error: `No se encontró header sample para el servicio ${serviceNumber}`
      });
    }

    // Cargar el header sample
    const headerSample = await fs.readJson(headerSampleFile);

    // Devolver el resultado
    res.json(headerSample);

  } catch (error) {
    console.error(`Error al obtener header sample:`, error);
    res.status(500).json({
      error: `Error al obtener header sample: ${error.message}`
    });
  }
});

/**
 * @route GET /excel/structure/:filename
 * @description Obtiene una estructura específica por nombre de archivo
 */
router.get('/structure/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({
        error: "Se requiere el nombre del archivo"
      });
    }

    console.log(`Cargando estructura específica: ${filename}`);

    // Cargar la estructura específica
    const structure = await getStructure(filename);

    res.json(structure);

  } catch (error) {
    console.error(`Error al cargar estructura ${req.params.filename}:`, error);
    res.status(error.statusCode || 500).json({
      error: error.message
    });
  }
});

/**
 * @route GET /excel/structure-by-service
 * @description Obtiene la estructura más reciente para un número de servicio
 */
router.get('/structure-by-service', async (req, res) => {
  try {
    const { service_number } = req.query;

    if (!service_number) {
      return res.status(400).json({
        error: "Se requiere el parámetro service_number"
      });
    }

    // Buscar todos los archivos de estructura en la carpeta structures
    const structureFiles = fs.readdirSync(structuresDir)
      .filter(file => file.endsWith('_structure.json') && file.includes(`_${service_number}_`));

    if (structureFiles.length === 0) {
      return res.status(404).json({
        error: `No se encontraron archivos de estructura para el servicio ${service_number}`
      });
    }

    // Ordenar por fecha (los nombres tienen formato: 20250425T163957_3088_structure.json)
    structureFiles.sort((a, b) => b.localeCompare(a)); // Orden descendente

    // Usar el más reciente
    const latestStructureFile = structureFiles[0];
    console.log(`Estructura más reciente encontrada para servicio ${service_number}: ${latestStructureFile}`);

    // Cargar la estructura
    const structure = await getStructure(latestStructureFile);

    // Verificar y loggear la estructura para debugging
    console.log(`Estructura cargada: ${JSON.stringify({
      hasHeader: !!structure.header_structure,
      hasHeaderFields: structure.header_structure ? structure.header_structure.fields.length : 0,
      hasServiceStructure: !!structure.service_structure,
      hasRequest: structure.service_structure ? !!structure.service_structure.request : false,
      hasElements: structure.service_structure && structure.service_structure.request ?
        (structure.service_structure.request.elements ? structure.service_structure.request.elements.length : 0) : 0
    })}`);

    res.json(structure);

  } catch (error) {
    console.error(`Error al buscar estructura por servicio:`, error);
    res.status(error.statusCode || 500).json({
      error: error.message
    });
  }
});

/**
 * @route GET /excel/events/last
 * @description Obtiene el último evento registrado para sincronización
 */
router.get('/events/last', (req, res) => {
  try {
    const eventFile = path.join(__dirname, '..', 'tmp', 'last_event.json');
    
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
    console.error('[EXCEL] Error al obtener último evento:', error);
    res.json({
      hasEvent: false,
      event: null,
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

  // Calcular versión correlativa basándose en archivos existentes
  let versionNumber = 1;
  try {
    if (fs.existsSync(structuresDir)) {
      const existingFiles = fs.readdirSync(structuresDir)
        .filter(file => file.endsWith('_structure.json') && file.includes(`_${serviceNumber}_`))
        .sort();
      
      console.log(`[ESTRUCTURA] Archivos existentes para servicio ${serviceNumber}:`, existingFiles);
      
      // Buscar la versión más alta existente
      let maxVersion = 0;
      for (const file of existingFiles) {
        const versionMatch = file.match(/_v(\d+)_structure\.json$/);
        if (versionMatch) {
          const version = parseInt(versionMatch[1]);
          if (version > maxVersion) {
            maxVersion = version;
          }
        }
      }
      
      versionNumber = maxVersion + 1;
      console.log(`[ESTRUCTURA] Versión calculada para nuevo archivo: v${versionNumber}`);
    }
  } catch (error) {
    console.warn(`[ESTRUCTURA] Error calculando versión, usando v1: ${error.message}`);
    versionNumber = 1;
  }

  // Generar nombre de archivo con timestamp y versión
  const structureFileName = `${timestamp}_${serviceNumber}_v${versionNumber}_structure.json`;

  // Ruta completa
  const structureFilePath = path.join(structuresDir, structureFileName);

  // Crear directorio si no existe
  if (!fs.existsSync(structuresDir)) {
    fs.mkdirSync(structuresDir, { recursive: true });
  }

  // IMPORTANTE: Procesamiento en DOS ETAPAS
  // 1. Primero aplicamos el fixer de ocurrencias para corregir índices y relaciones parentId
  // 2. Luego aplicamos el sanitizador de ocurrencias para preservar la estructura exacta
  console.log("[ESTRUCTURA] Aplicando procesamiento de ocurrencias en dos etapas");

  try {
    // ETAPA 1: Corrección de índices y relaciones parentId
    console.log("[ESTRUCTURA] ETAPA 1: Aplicando fix directo para índices y relaciones parentId");
    const occurrenceFixer = require('../utils/occurrence-fixer');

    // Aplicar la corrección directamente a toda la estructura
    const structureFixed = occurrenceFixer.fixOccurrenceIndices(serviceStructure);

    // Reemplazar la estructura con la versión corregida
    serviceStructure = structureFixed;

    console.log("[ESTRUCTURA] Índices y relaciones parentId corregidas exitosamente");

    // ETAPA 2: Sanitización de ocurrencias para preservar la estructura exacta
    console.log("[ESTRUCTURA] ETAPA 2: Aplicando sanitizador de ocurrencias");
    const occurrenceSanitizer = require('../utils/occurrence-sanitizer');

    // Aplicar sanitización a las secciones request y response por separado
    if (serviceStructure.request) {
      serviceStructure.request = occurrenceSanitizer.sanitizeOccurrences(serviceStructure.request);
      console.log("[ESTRUCTURA] Request sanitizado correctamente");
    }

    if (serviceStructure.response) {
      serviceStructure.response = occurrenceSanitizer.sanitizeOccurrences(serviceStructure.response);
      console.log("[ESTRUCTURA] Response sanitizado correctamente");
    }

    console.log("[ESTRUCTURA] Procesamiento de ocurrencias completado exitosamente");
  } catch (error) {
    console.warn(`[ADVERTENCIA] Error en el procesamiento de ocurrencias: ${error.message}`);
    console.warn("Se continuará con el procesamiento normal");
  }

  // Crear estructura combinada sin duplicar propiedades
  const combinedStructure = {
    header_structure: headerStructure,
    service_structure: serviceStructure
  };

  // Guardar el archivo con formato indentado para mejor legibilidad
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
        // Buscar archivo de estructura con versión que coincida con el timestamp
        const possibleFiles = fs.readdirSync(structuresDir)
          .filter(file => file.startsWith(`${timestampMatch[1]}_${serviceNumber}_`) && file.endsWith('_structure.json'))
          .sort();
        
        if (possibleFiles.length > 0) {
          structureFile = possibleFiles[0]; // Usar el primer archivo encontrado
        } else {
          // Fallback: buscar archivo sin versión (compatibilidad con archivos antiguos)
          const oldFormatFile = `${timestampMatch[1]}_${serviceNumber}_structure.json`;
          if (fs.existsSync(path.join(structuresDir, oldFormatFile))) {
            structureFile = oldFormatFile;
          }
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
    } catch (err) {
      const error = new Error(`Error al cargar archivo de estructura: ${err.message}`);
      error.statusCode = 500;
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
      // Extraer estructuras usando el parser universal
      const headerStructure = excelParser.parseHeaderStructure(filePath);
      const serviceStructure = excelParser.parseServiceStructure(filePath);

      // VALIDAR ERRORES CRÍTICOS ANTES DE GUARDAR
      console.log('[CRITICAL_VALIDATION] Iniciando validación de errores críticos...');
      console.log('[CRITICAL_VALIDATION] serviceStructure:', {
        serviceNumber: serviceStructure.serviceNumber,
        serviceName: serviceStructure.serviceName,
        hasRequest: !!serviceStructure.request,
        requestElements: serviceStructure.request?.elements?.length || 0,
        hasResponse: !!serviceStructure.response,
        responseElements: serviceStructure.response?.elements?.length || 0
      });
      
      const criticalErrors = validateCriticalErrors(serviceStructure);
      console.log('[CRITICAL_VALIDATION] Errores críticos encontrados:', criticalErrors.length);
      console.log('[CRITICAL_VALIDATION] Detalles de errores:', criticalErrors);
      
      if (criticalErrors.length > 0) {
        console.log('[CRITICAL_VALIDATION] ¡ERRORES CRÍTICOS DETECTADOS! Bloqueando guardado...');
        throw new Error(`CRITICAL_ERRORS:${JSON.stringify(criticalErrors)}`);
      }
      
      console.log('[CRITICAL_VALIDATION] ✓ No se detectaron errores críticos, continuando...');

      // Guardar la estructura combinada
      const structureInfo = saveStructures(headerStructure, serviceStructure, filePath);

    // Inicializar objetos con valores por defecto para evitar errores
    const warnings = {
      missingHeaderTab: false,
      headerTabAvailable: 0,
      headerSampleError: null,
      parserErrors: []
    };

    // Extraer y guardar el header sample si hay un número de servicio válido
    // Pero no fallar si no es posible obtener el header sample
    let headerSampleInfo = {
      success: true,
      headerSample: { value: "", missingTab: false }
    };

    if (serviceStructure && serviceStructure.serviceNumber) {
      try {
        // Crear directorio de headers si no existe
        const headersDir = path.join(__dirname, '..', 'JsonStorage', 'headers');
        if (!fs.existsSync(headersDir)) {
          fs.mkdirSync(headersDir, { recursive: true });
        }

        // Extraer y guardar el header sample
        headerSampleInfo = excelParser.saveHeaderSample(filePath, serviceStructure.serviceNumber, headersDir); // Comentado porque la función no existe
        console.log(`Header sample extraído y guardado: ${JSON.stringify(headerSampleInfo)}`);

        // Verificar si falta la tercera pestaña (no es un error fatal)
        if (headerSampleInfo && headerSampleInfo.headerSample) {
          if (headerSampleInfo.headerSample.missingTab) {
            console.warn(`El archivo Excel no tiene pestaña de cabecera (${headerSampleInfo.headerSample.availableTabs} pestañas disponibles), pero el proceso continuará normalmente`);
            warnings.missingHeaderTab = true;
            warnings.headerTabAvailable = headerSampleInfo.headerSample.availableTabs;
          }

          if (headerSampleInfo.headerSample.error) {
            warnings.headerSampleError = headerSampleInfo.headerSample.error;
          }
        }
      } catch (headerSampleError) {
        console.error(`Error al extraer header sample: ${headerSampleError.message}`);
        // Registrar el error como advertencia
        warnings.headerSampleError = headerSampleError.message;
        // IMPORTANTE: No fallamos en el proceso por error en el header sample
        console.warn("Continuando el proceso a pesar del error en el header sample");
      }
    } else {
      console.warn(`No se pudo extraer header sample: No se encontró número de servicio válido. Continuando el proceso...`);
      warnings.noServiceNumber = true;
    }

    // Verificar si hay problemas con el headerStructure o serviceStructure, pero tratarlos como warnings
    if (!headerStructure || !headerStructure.fields || headerStructure.fields.length === 0) {
      warnings.emptyHeaderStructure = true;
      console.warn("Estructura de cabecera vacía o incompleta, pero continuando el proceso");
    }

    if (!serviceStructure ||
        (!serviceStructure.request || !serviceStructure.request.elements || !serviceStructure.request.elements.length) &&
        (!serviceStructure.response || !serviceStructure.response.elements || !serviceStructure.response.elements.length)) {
      warnings.emptyServiceStructure = true;
      console.warn("Estructura de servicio vacía o incompleta, pero continuando el proceso");
    }

    return {
      headerStructure,
      serviceStructure,
      structureFile: structureInfo.structure_file,
      headerSampleInfo,
      warnings  // Incluir las advertencias en la respuesta
    };
  } catch (error) {
    throw new Error(`Error al procesar el archivo Excel: ${error.message}`);
  }
}

/**
 * Valida errores críticos que impiden el guardado del archivo
 * @param {Object} serviceStructure - Estructura del servicio procesada
 * @returns {Array} Array de errores críticos encontrados
 */
function validateCriticalErrors(serviceStructure) {
  const criticalErrors = [];

  // 1. Validar identificación del servicio
  if (!serviceStructure.serviceNumber || serviceStructure.serviceNumber === 'error' || serviceStructure.serviceNumber === 'unknown') {
    criticalErrors.push({
      type: 'service_identification',
      message: 'No se pudo detectar el número de servicio en el archivo Excel',
      details: 'El nombre de la hoja debe contener el número del servicio (ej: SVO1004)'
    });
  }

  if (!serviceStructure.serviceName || serviceStructure.serviceName.includes('Error al parsear')) {
    criticalErrors.push({
      type: 'service_name',
      message: 'No se encontró el nombre del servicio válido',
      details: 'Debe existir una celda que comience con "SERVICIO" en las primeras filas del Excel'
    });
  }

  // 2. Validar estructura de request
  if (!serviceStructure.request || !serviceStructure.request.elements || serviceStructure.request.elements.length === 0) {
    criticalErrors.push({
      type: 'empty_request',
      message: 'La sección de REQUERIMIENTO está vacía o no se pudo interpretar',
      details: 'No se encontraron elementos procesables en la sección de requerimiento'
    });
  }

  // 3. Validar estructura de response  
  if (!serviceStructure.response || !serviceStructure.response.elements || serviceStructure.response.elements.length === 0) {
    criticalErrors.push({
      type: 'empty_response',
      message: 'La sección de RESPUESTA está vacía o no se pudo interpretar',
      details: 'No se encontraron elementos procesables en la sección de respuesta'
    });
  }

  // 4. Validar errores críticos marcados explícitamente en el parser
  if (serviceStructure.parse_errors_request) {
    const criticalRequestErrors = serviceStructure.parse_errors_request.filter(err => err.critical === true);
    criticalRequestErrors.forEach(err => {
      criticalErrors.push({
        type: 'request_parsing_error',
        message: err.message || 'Error crítico en el procesamiento del requerimiento',
        details: `Fila ${err.row || '?'}, Columna ${err.column || '?'} en hoja "${err.sheet || 'Desconocida'}"`
      });
    });
  }

  if (serviceStructure.parse_errors_response) {
    const criticalResponseErrors = serviceStructure.parse_errors_response.filter(err => err.critical === true);
    criticalResponseErrors.forEach(err => {
      criticalErrors.push({
        type: 'response_parsing_error',
        message: err.message || 'Error crítico en el procesamiento de la respuesta',
        details: `Fila ${err.row || '?'}, Columna ${err.column || '?'} en hoja "${err.sheet || 'Desconocida'}"`
      });
    });
  }

  // 5. Validar errores generales críticos
  if (serviceStructure.parse_errors) {
    const criticalGeneralErrors = serviceStructure.parse_errors.filter(err => err.critical === true);
    criticalGeneralErrors.forEach(err => {
      criticalErrors.push({
        type: 'general_parsing_error',
        message: err.message || 'Error crítico general en el procesamiento',
        details: err.details || 'Error en el análisis general del archivo'
      });
    });
  }

  return criticalErrors;
}

module.exports = router;
