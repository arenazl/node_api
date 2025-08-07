/**
 * API ORCHESTRATOR
 * Responsabilidad: Coordinar llamadas entre sistemas internos y externos
 * 1. INTERNO: Llama a upload (graba en file system)
 * 2. EXTERNO: Llama a Mora.Sim-api (graba en BD)
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Importar cliente para Mora.Sim-api
const MoraSimApiClient = require('../external-integrations/sim-integration/mora-sim-api-client');
const moraSimApiClient = new MoraSimApiClient();

/**
 * @route POST /api-orchestrator/step1-upload
 * @description PASO 1: Solo grabado en file system - VISIBLE en Network
 */
router.post('/step1-upload', (req, res) => {
  console.log('📁 [API-ORCHESTRATOR] PASO 1: Delegando a upload existente...');

  // Simplemente importar y usar el router de Excel directamente
  const excelRouter = require('../core-processing/routes-backend/excel');

  // Buscar el handler de POST /upload
  let uploadHandler = null;
  for (const layer of excelRouter.stack) {
    if (layer.route && layer.route.path === '/upload' && layer.route.methods.post) {
      uploadHandler = layer.route.stack[0];
      break;
    }
  }

  if (!uploadHandler) {
    console.error('❌ [API-ORCHESTRATOR] Upload handler no encontrado');
    return res.status(500).json({
      error: 'Upload handler no encontrado'
    });
  }

  // Ejecutar el handler directamente
  uploadHandler.handle(req, res, (error) => {
    if (error) {
      console.error('❌ [API-ORCHESTRATOR] Error en upload handler:', error);
      
      // Determinar el código de estado y mensaje apropiados
      const statusCode = error.statusCode || error.status || 500;
      const errorType = error.errorType || 'UPLOAD_ERROR';
      
      // Si el error viene del middleware de validación, usar su mensaje directamente
      let errorMessage = error.message;
      if (error.message.includes('Formato de archivo no válido')) {
        errorMessage = error.message; // Usar el mensaje completo del validador
      } else if (error.message.includes('Excel')) {
        errorMessage = `Error procesando archivo Excel: ${error.message}`;
      } else {
        errorMessage = `Error en paso 1 (carga de archivo): ${error.message}`;
      }
      
      res.status(statusCode).json({
        error: true,
        errorType: errorType,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    // Si no hay error, el handler ya envió la respuesta
  });
});

/*
 * @route POST /api-orchestrator/step2-mora-sim-api  
 * @description PASO 2: Llamada a Mora.Sim-api - VISIBLE en Network
 */
router.post('/step2-mora-sim-api', async (req, res) => {
  try {
    console.log('🔗 [API-ORCHESTRATOR] PASO 2: Llamando a Mora.Sim-api...');
    console.log('🔧 [DEBUG] req.body recibido:', JSON.stringify(req.body, null, 2));

    // Parse uploadResult if it comes as a JSON string
    let uploadResult = {};
    if (req.body.uploadResult) {
      try {
        uploadResult = typeof req.body.uploadResult === 'string'
          ? JSON.parse(req.body.uploadResult)
          : req.body.uploadResult;
      } catch (e) {
        console.log('⚠️ [DEBUG] Error parsing uploadResult:', e.message);
      }
    }
    console.log('🔧 [DEBUG] uploadResult parseado:', JSON.stringify(uploadResult, null, 2));

    // Verificar que los directorios existen
    const fs = require('fs-extra');
    const uploadsDir = require('path').join(__dirname, '../..', 'JsonStorage', 'uploads');
    const structuresDir = require('path').join(__dirname, '../..', 'JsonStorage', 'structures');

    console.log('🔧 [DEBUG] uploadsDir:', uploadsDir);
    console.log('🔧 [DEBUG] structuresDir:', structuresDir);
    console.log('🔧 [DEBUG] uploadsDir exists:', fs.existsSync(uploadsDir));
    console.log('🔧 [DEBUG] structuresDir exists:', fs.existsSync(structuresDir));

    // Extraer datos del resultado del upload (paso 1)
    const serviceNumber = uploadResult.service_number || req.body.serviceNumber || '1083';
    const serviceName = uploadResult.service_name || req.body.serviceName || `Servicio ${serviceNumber}`;
    const fileName = uploadResult.filename || req.body.fileName || 'unknown.xlsx';
    const structureFile = uploadResult.structure_file || `${serviceNumber}_structure.json`;

    // Construir filePath usando el nombre real del archivo subido
    const filePath = require('path').join(uploadsDir, fileName);

    console.log('🔧 [DEBUG] serviceNumber:', serviceNumber);
    console.log('🔧 [DEBUG] fileName:', fileName);
    console.log('🔧 [DEBUG] structureFile:', structureFile);
    console.log('🔧 [DEBUG] filePath:', filePath);

    // Cargar la estructura real del archivo JSON generado con reintentos
    let structureJson = {};
    const structurePath = require('path').join(structuresDir, structureFile);

    console.log('🔧 [DEBUG] Buscando estructura en:', structurePath);

    // Intentar cargar el archivo con reintentos (por si aún se está escribiendo)
    let attempts = 0;
    const maxAttempts = 5;
    const delay = 500; // 500ms between attempts (aumentado para dar más tiempo)

    while (attempts < maxAttempts) {
      try {
        if (fs.existsSync(structurePath)) {
          const rawStructure = fs.readJsonSync(structurePath);

          // Convertir de snake_case a camelCase para Mora.Sim-api
          structureJson = {
            headerStructure: rawStructure.header_structure || rawStructure.headerStructure,
            serviceStructure: rawStructure.service_structure || rawStructure.serviceStructure
          };

          console.log('✅ [DEBUG] Estructura cargada desde:', structureFile);
          console.log('✅ [DEBUG] Tamaño de estructura:', JSON.stringify(structureJson).length, 'caracteres');
          break;
        } else {
          console.log(`⚠️ [DEBUG] Intento ${attempts + 1}/${maxAttempts}: Archivo de estructura no encontrado:`, structurePath);
          if (attempts < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (structureError) {
        console.log(`⚠️ [DEBUG] Intento ${attempts + 1}/${maxAttempts}: Error cargando estructura:`, structureError.message);
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      attempts++;
    }

    if (Object.keys(structureJson).length === 0) {
      console.log('⚠️ [DEBUG] No se pudo cargar la estructura después de', maxAttempts, 'intentos');
    }

    // Obtener fileSize real del archivo
    let fileSize = 0;
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }
    } catch (error) {
      console.log('⚠️ [DEBUG] Error obteniendo fileSize:', error.message);
    }

    // Preparar datos para Mora.Sim-api (formato camelCase como espera MoraSimApiClient)
    const dataForMoraSimApi = {
      canalCode: req.body.canalCode || 'SM',
      serviceNumber: serviceNumber,
      serviceName: serviceName,
      version: req.body.version || '1.0',
      fileName: fileName,
      filePath: filePath,
      fileSize: fileSize,
      createdBy: 'api_orchestrator',
      structureFileName: structureFile,
      structureJson: structureJson // Ya es un objeto JSON, no hacer stringify aquí
    };

    console.log('🔧 [DEBUG] dataForMoraSimApi preparado:', JSON.stringify(dataForMoraSimApi, null, 2));

    const moraResult = await moraSimApiClient.storeExcelWithStructure(dataForMoraSimApi);

    if (!moraResult.success) {
      return res.status(500).json({
        error: 'Error en paso 2: llamada a Mora.Sim-api',
        details: moraResult.error
      });
    }

    console.log('✅ [API-ORCHESTRATOR] PASO 2 completado');
    const generatedExcelId = moraResult.data?.ExcelId || moraResult.data?.data?.ExcelId;
    console.log('📝 [API-ORCHESTRATOR] ExcelId generado:', generatedExcelId);

    // NUEVO: Guardar mapeo de serviceNumber -> ExcelId para futuras sesiones
    if (generatedExcelId && serviceNumber) {
      try {
        const mappingDir = require('path').join(__dirname, '../..', 'JsonStorage', 'excel-mappings');
        if (!fs.existsSync(mappingDir)) {
          fs.mkdirSync(mappingDir, { recursive: true });
        }

        const mappingFile = require('path').join(mappingDir, `${serviceNumber}.json`);
        const mappingData = {
          serviceNumber: serviceNumber,
          excelId: generatedExcelId,
          fileName: fileName,
          serviceName: serviceName,
          timestamp: new Date().toISOString()
        };

        fs.writeJsonSync(mappingFile, mappingData);
        console.log(`📝 [API-ORCHESTRATOR] Mapeo guardado: ${serviceNumber} -> ExcelId ${generatedExcelId}`);
      } catch (error) {
        console.error('⚠️ [API-ORCHESTRATOR] Error guardando mapeo:', error.message);
      }
    }

    // Retornar respuesta que incluya información del upload para que el frontend pueda refrescar
    res.json({
      success: true,
      step: 2,
      message: 'Datos guardados en Mora.Sim-api exitosamente',
      data: moraResult.data,
      // IMPORTANTE: Incluir ExcelId para usar en SaveSettingsWithValues
      excelId: moraResult.data?.ExcelId || moraResult.data?.data?.ExcelId || null,
      // Incluir información de la estructura para el frontend
      structure_file: structureFile,
      service_number: serviceNumber,
      service_name: serviceName,
      filename: fileName
    });

  } catch (error) {
    console.error('❌ [API-ORCHESTRATOR] Error en paso 2:', error);
    res.status(500).json({
      error: 'Error en paso 2',
      details: error.message
    });
  }
});

/**
 * @route POST /api-orchestrator/step3-save-settings
 * @description PASO 3: Guardar configuraciones (settings, variables, constantes) - VISIBLE en Network
 */
router.post('/step3-save-settings', async (req, res) => {
  try {
    console.log('⚙️ [API-ORCHESTRATOR] PASO 3: Guardando configuración en Mora.Sim-api...');
    console.log('🔧 [DEBUG] req.body recibido:', JSON.stringify(req.body, null, 2));

    // Extraer datos de la configuración
    const {
      excelId,
      version,
      settingName,
      settingJson,        // JSON completo con valores (solapa 1)
      dynamicJson,        // JSON con campos vacíos (solapa 2)
      completeSettingJson, // Alternativa si viene con este nombre
      dynamicSettingJson,  // Alternativa si viene con este nombre
      serviceNumber,
      canalCode,
      suffix              // Suffix explícito para el nombre del archivo
    } = req.body;

    // Validar datos requeridos
    if (!excelId) {
      return res.status(400).json({
        error: 'ExcelId es requerido para guardar la configuración'
      });
    }

    // Usar los nombres correctos de los campos
    const completeJson = completeSettingJson || settingJson;
    const dynamicJsonData = dynamicSettingJson || dynamicJson;

    if (!completeJson && !dynamicJsonData) {
      return res.status(400).json({
        error: 'Se requiere al menos uno de los JSONs (completo o dinámico)'
      });
    }
    
    console.log('📊 [API-ORCHESTRATOR] Tipo de JSONs recibidos:');
    console.log('   - completeJson:', typeof completeJson);
    console.log('   - dynamicJsonData:', typeof dynamicJsonData);
    if (completeJson) {
      console.log('   - completeJson keys:', Object.keys(typeof completeJson === 'object' ? completeJson : JSON.parse(completeJson)));
    }
    if (dynamicJsonData) {
      console.log('   - dynamicJson keys:', Object.keys(typeof dynamicJsonData === 'object' ? dynamicJsonData : JSON.parse(dynamicJsonData)));
    }

    // Preparar datos para Mora.Sim-api - enviar ambos JSONs
    const settingsData = {
      excelId: excelId,
      version: version || '1.0',
      settingName: settingName || `Config_${serviceNumber || 'Unknown'}_${canalCode || 'SM'}`,
      completeSettingJson: typeof completeJson === 'string' ? completeJson : JSON.stringify(completeJson),
      dynamicSettingJson: dynamicJsonData ? (typeof dynamicJsonData === 'string' ? dynamicJsonData : JSON.stringify(dynamicJsonData)) : null,
      isActive: true,
      priority: 100,
      modifiedBy: 'api_orchestrator'
    };

    console.log('🔧 [DEBUG] settingsData preparado:', JSON.stringify(settingsData, null, 2));

    // Llamar a Mora.Sim-api para guardar la configuración en BD
    const moraResult = await moraSimApiClient.storeSettingsWithValues(settingsData);

    if (!moraResult.success) {
      return res.status(500).json({
        error: 'Error en paso 3: llamada a Mora.Sim-api para settings',
        details: moraResult.error
      });
    }

    // IMPORTANTE: Llamar al endpoint legacy para guardar el archivo físico
    let savedFileName = null;
    try {
      const axios = require('axios');

      // Parsear el JSON completo si es string
      let parsedCompleteJson = completeJson;
      if (typeof completeJson === 'string') {
        try {
          parsedCompleteJson = JSON.parse(completeJson);
        } catch (e) {
          console.error('⚠️ [API-ORCHESTRATOR] Error parseando completeJson:', e.message);
          parsedCompleteJson = {};
        }
      }

      // Usar el suffix que viene explícitamente del request o extraerlo del settingName
      let finalSuffix = suffix || 'default';
      if (!suffix && settingName) {
        // Si no viene suffix explícito, intentar extraerlo del settingName
        const parts = settingName.split('_');
        if (parts.length > 3) {
          // Tomar todo después del tercer underscore como suffix
          finalSuffix = parts.slice(3).join('_');
        }
      }
      
      // Preparar datos para el endpoint legacy
      const configData = {
        serviceNumber: serviceNumber,
        serviceName: `Servicio ${serviceNumber}`,
        canal: canalCode,
        suffix: finalSuffix,
        version: version,
        header: parsedCompleteJson.header || {},
        request: parsedCompleteJson.request || {},
        timestamp: new Date().toISOString()
      };
      
      console.log('📁 [API-ORCHESTRATOR] Datos para archivo físico:', {
        serviceNumber,
        canal: canalCode,
        suffix: finalSuffix,
        version
      });

      console.log('📁 [API-ORCHESTRATOR] Llamando a /service-config/save para guardar archivo físico...');

      // Hacer llamada HTTP al endpoint legacy (usar el mismo puerto que el servidor actual)
      const port = process.env.PORT || 3000;
      const saveResponse = await axios.post(`http://localhost:${port}/service-config/save`, configData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (saveResponse.data && saveResponse.data.filename) {
        savedFileName = saveResponse.data.filename;
        console.log(`📁 [API-ORCHESTRATOR] Archivo guardado exitosamente: ${savedFileName}`);
      }

    } catch (fileError) {
      console.error('⚠️ [API-ORCHESTRATOR] Error guardando archivo físico:', fileError.message);
      if (fileError.response) {
        console.error('⚠️ [API-ORCHESTRATOR] Response error:', fileError.response.data);
      }
      // No fallar si el archivo no se puede guardar, la BD ya tiene los datos
    }

    console.log('✅ [API-ORCHESTRATOR] PASO 3 completado');

    // Retornar respuesta exitosa con filename
    res.json({
      success: true,
      step: 3,
      message: 'Configuración guardada en Mora.Sim-api exitosamente',
      data: moraResult.data,
      settingName: settingsData.settingName,
      excelId: settingsData.excelId,
      filename: savedFileName // Incluir el nombre del archivo guardado
    });

  } catch (error) {
    console.error('❌ [API-ORCHESTRATOR] Error en paso 3:', error);
    res.status(500).json({
      error: 'Error en paso 3',
      details: error.message
    });
  }
});

/**
 * Extrae y prepara datos para Mora.Sim-api desde el resultado del upload
 */
function extractMoraSimApiData(uploadResult, originalRequest) {
  // Extraer parámetros de la request original
  const serviceNumber = originalRequest.body?.serviceNumber ||
    extractServiceNumberFromFilename(originalRequest.files?.file?.name) ||
    '1083';

  const version = originalRequest.body?.version || '1.0';
  const canalCode = originalRequest.body?.canalCode || 'SM';
  const serviceName = originalRequest.body?.serviceName || `Servicio ${serviceNumber}`;

  // Construir objeto para Mora.Sim-api
  return {
    CanalCode: canalCode,
    ServiceNumber: serviceNumber,
    ServiceName: serviceName,
    Version: version,
    FileName: originalRequest.files?.file?.name || 'unknown.xlsx',
    FilePath: uploadResult.data?.filePath || '',
    FileSize: originalRequest.files?.file?.size || 0,
    CreatedBy: 'api_orchestrator',
    StructureFileName: `${serviceNumber}_v${version}_structure.json`,
    StructureJson: JSON.stringify(uploadResult.data?.structure || {})
  };
}

/**
 * Extrae serviceNumber del nombre del archivo
 */
function extractServiceNumberFromFilename(filename) {
  if (!filename) return null;

  const match = filename.match(/(\d{4})/); // buscar 4 dígitos consecutivos
  return match ? match[1] : null;
}

module.exports = router;