/**
 * Rutas actualizadas para servicios
 * INTEGRADO con Mora.Sim-api consultando desde BD en lugar de archivos
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

// Importar módulos
const messageCreator = require('../../../utils/message-creator');
const messageAnalyzer = require('../../../utils/message-analyzer');
const moraSimApiClient = require('../../external-integrations/sim-integration/mora-sim-api-client');

// Directorios locales (fallback)
const structuresDir = path.join(__dirname, '../../..', 'JsonStorage', 'structures');
const settingsDir = path.join(__dirname, '../../..', 'JsonStorage', 'settings');

/**
 * @route POST /api/services/sendmessage
 * @description JSON → String (IDA) usando datos desde BD via Mora.Sim-api
 */
router.post('/sendmessage', async (req, res) => {
  try {
    const { serviceNumber, canal = 'SM', version = '1.0', data } = req.body;

    if (!serviceNumber || !data) {
      return res.status(400).json({
        error: "Se requieren serviceNumber y data"
      });
    }

    console.log(`🔧 [SENDMESSAGE] Procesando JSON → String para ${serviceNumber}/${canal}/${version}`);

    // TODO: Obtener estructura y configuración desde Mora.Sim-api
    // Por ahora usar método local como fallback
    
    const structure = await getServiceStructure(serviceNumber, version);
    const settings = await getServiceSettings(serviceNumber, canal, version);

    if (!structure) {
      return res.status(404).json({
        error: `Estructura no encontrada para servicio ${serviceNumber} versión ${version}`
      });
    }

    // Procesar usando message-creator
    const result = messageCreator.createMessage(data, structure, settings);

    if (result.success) {
      console.log("✅ [SENDMESSAGE] Conversión exitosa");
      res.json({
        success: true,
        message: "Mensaje creado exitosamente",
        data: {
          originalData: data,
          fixedLengthString: result.message,
          metadata: {
            serviceNumber: serviceNumber,
            canal: canal,
            version: version,
            messageLength: result.message.length,
            source: 'bd_integration' // TODO: cambiar cuando se implemente
          }
        }
      });
    } else {
      res.status(400).json({
        error: "Error al crear mensaje",
        details: result.errors
      });
    }

  } catch (error) {
    console.error("❌ [SENDMESSAGE] Error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

/**
 * @route POST /api/services/receivemessage
 * @description String → JSON (VUELTA) usando datos desde BD via Mora.Sim-api
 */
router.post('/receivemessage', async (req, res) => {
  try {
    const { serviceNumber, canal = 'SM', version = '1.0', message } = req.body;

    if (!serviceNumber || !message) {
      return res.status(400).json({
        error: "Se requieren serviceNumber y message"
      });
    }

    console.log(`🔧 [RECEIVEMESSAGE] Procesando String → JSON para ${serviceNumber}/${canal}/${version}`);

    // TODO: Obtener estructura desde Mora.Sim-api
    const structure = await getServiceStructure(serviceNumber, version);

    if (!structure) {
      return res.status(404).json({
        error: `Estructura no encontrada para servicio ${serviceNumber} versión ${version}`
      });
    }

    // Procesar usando message-analyzer
    const result = messageAnalyzer.parseMessage(message, structure);

    if (result.success) {
      console.log("✅ [RECEIVEMESSAGE] Parseo exitoso");
      res.json({
        success: true,
        message: "Mensaje parseado exitosamente",
        data: {
          originalMessage: message,
          parsedData: result.data,
          metadata: {
            serviceNumber: serviceNumber,
            canal: canal,
            version: version,
            messageLength: message.length,
            source: 'bd_integration' // TODO: cambiar cuando se implemente
          }
        }
      });
    } else {
      res.status(400).json({
        error: "Error al parsear mensaje",
        details: result.errors
      });
    }

  } catch (error) {
    console.error("❌ [RECEIVEMESSAGE] Error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

/**
 * @route GET /api/services
 * @description Lista servicios desde BD via Mora.Sim-api
 */
router.get('/', async (req, res) => {
  try {
    console.log("📋 [SERVICES] Listando servicios disponibles...");

    // TODO: Implementar consulta desde Mora.Sim-api
    // Por ahora, fallback a archivos locales
    
    const services = await getAvailableServicesFromFiles();

    res.json({
      success: true,
      services: services,
      count: services.length,
      note: "Datos desde archivos locales - TODO: consultar desde BD via Mora.Sim-api"
    });

  } catch (error) {
    console.error("❌ [SERVICES] Error al listar servicios:", error);
    res.status(500).json({
      error: "Error al obtener servicios",
      details: error.message
    });
  }
});

/**
 * @route GET /api/services/:serviceNumber
 * @description Obtener detalles de un servicio específico
 */
router.get('/:serviceNumber', async (req, res) => {
  try {
    const { serviceNumber } = req.params;
    const { canal = 'SM', version = '1.0' } = req.query;

    console.log(`🔍 [SERVICES] Obteniendo detalles de ${serviceNumber}/${canal}/${version}`);

    // TODO: Consultar desde Mora.Sim-api
    const structure = await getServiceStructure(serviceNumber, version);
    const settings = await getServiceSettings(serviceNumber, canal, version);

    if (!structure) {
      return res.status(404).json({
        error: `Servicio ${serviceNumber} no encontrado`
      });
    }

    res.json({
      success: true,
      service: {
        serviceNumber: serviceNumber,
        canal: canal,
        version: version,
        structure: structure,
        settings: settings,
        metadata: {
          hasStructure: !!structure,
          hasSettings: !!settings,
          source: 'local_fallback'
        }
      }
    });

  } catch (error) {
    console.error("❌ [SERVICES] Error al obtener servicio:", error);
    res.status(500).json({
      error: "Error al obtener detalles del servicio",
      details: error.message
    });
  }
});

/**
 * @route GET /api/services/versions/:serviceNumber
 * @description Obtener versiones disponibles de un servicio
 */
router.get('/versions/:serviceNumber', async (req, res) => {
  try {
    const { serviceNumber } = req.params;

    console.log(`📋 [SERVICES] Obteniendo versiones de ${serviceNumber}`);

    // TODO: Consultar versiones desde Mora.Sim-api
    const versions = await getServiceVersions(serviceNumber);

    res.json({
      success: true,
      serviceNumber: serviceNumber,
      versions: versions,
      count: versions.length,
      note: "TODO: Implementar consulta de versiones desde BD"
    });

  } catch (error) {
    console.error("❌ [SERVICES] Error al obtener versiones:", error);
    res.status(500).json({
      error: "Error al obtener versiones del servicio",
      details: error.message
    });
  }
});

/**
 * @route POST /api/services/validate-message
 * @description Validar formato de mensaje contra estructura
 */
router.post('/validate-message', async (req, res) => {
  try {
    const { serviceNumber, version = '1.0', message, type = 'string' } = req.body;

    if (!serviceNumber || !message) {
      return res.status(400).json({
        error: "Se requieren serviceNumber y message"
      });
    }

    console.log(`🔍 [SERVICES] Validando mensaje para ${serviceNumber}/${version}`);

    const structure = await getServiceStructure(serviceNumber, version);

    if (!structure) {
      return res.status(404).json({
        error: `Estructura no encontrada para servicio ${serviceNumber}`
      });
    }

    // Validar según tipo
    let validationResult;
    if (type === 'string') {
      validationResult = validateStringMessage(message, structure);
    } else {
      validationResult = validateJsonMessage(message, structure);
    }

    res.json({
      success: true,
      validation: validationResult,
      serviceNumber: serviceNumber,
      version: version
    });

  } catch (error) {
    console.error("❌ [SERVICES] Error en validación:", error);
    res.status(500).json({
      error: "Error al validar mensaje",
      details: error.message
    });
  }
});

// ==========================================
// FUNCIONES AUXILIARES (TODO: migrar a BD)
// ==========================================

/**
 * Obtener estructura de servicio (TODO: desde Mora.Sim-api)
 */
async function getServiceStructure(serviceNumber, version) {
  try {
    // TODO: Llamar a Mora.Sim-api para obtener estructura
    // Por ahora buscar en archivos locales
    
    const structureFiles = fs.readdirSync(structuresDir)
      .filter(file => file.includes(`${serviceNumber}_`) && file.includes('_structure.json'));

    if (structureFiles.length > 0) {
      const structurePath = path.join(structuresDir, structureFiles[0]);
      return fs.readJsonSync(structurePath);
    }

    return null;
  } catch (error) {
    console.error(`Error al obtener estructura de ${serviceNumber}:`, error);
    return null;
  }
}

/**
 * Obtener configuración de servicio (TODO: desde Mora.Sim-api)
 */
async function getServiceSettings(serviceNumber, canal, version) {
  try {
    // TODO: Llamar a Mora.Sim-api para obtener settings
    const safeCanal = canal.replace(/[^a-zA-Z0-9]/g, '');
    const settingsFile = `${serviceNumber}_${safeCanal}_${version}.json`;
    const settingsPath = path.join(settingsDir, settingsFile);

    if (fs.existsSync(settingsPath)) {
      return fs.readJsonSync(settingsPath);
    }

    return null;
  } catch (error) {
    console.error(`Error al obtener configuración de ${serviceNumber}:`, error);
    return null;
  }
}

/**
 * Obtener servicios disponibles desde archivos (TODO: desde BD)
 */
async function getAvailableServicesFromFiles() {
  try {
    const services = [];
    
    if (fs.existsSync(structuresDir)) {
      const structureFiles = fs.readdirSync(structuresDir)
        .filter(file => file.endsWith('_structure.json'));

      structureFiles.forEach(file => {
        const match = file.match(/(\d+)_.*_structure\.json/);
        if (match) {
          const serviceNumber = match[1];
          const filePath = path.join(structuresDir, file);
          const stats = fs.statSync(filePath);
          
          services.push({
            service_number: serviceNumber,
            file_name: file,
            last_modified: stats.mtime,
            source: 'local_file'
          });
        }
      });
    }

    return services;
  } catch (error) {
    console.error("Error al obtener servicios desde archivos:", error);
    return [];
  }
}

/**
 * Obtener versiones de un servicio (TODO: desde BD)
 */
async function getServiceVersions(serviceNumber) {
  try {
    const versions = [];
    
    if (fs.existsSync(structuresDir)) {
      const files = fs.readdirSync(structuresDir)
        .filter(file => file.includes(`${serviceNumber}_`) && file.endsWith('_structure.json'));

      files.forEach(file => {
        const versionMatch = file.match(/(\d+\.\d+)/);
        if (versionMatch) {
          versions.push({
            version: versionMatch[1],
            fileName: file,
            source: 'local_file'
          });
        }
      });
    }

    return versions;
  } catch (error) {
    console.error(`Error al obtener versiones de ${serviceNumber}:`, error);
    return [];
  }
}

/**
 * Validar mensaje string contra estructura
 */
function validateStringMessage(message, structure) {
  // TODO: Implementar validación completa
  return {
    isValid: true,
    length: message.length,
    expectedLength: structure.header_structure?.totalLength || 'unknown',
    issues: []
  };
}

/**
 * Validar mensaje JSON contra estructura
 */
function validateJsonMessage(jsonData, structure) {
  // TODO: Implementar validación completa
  return {
    isValid: true,
    fieldCount: Object.keys(jsonData).length,
    issues: []
  };
}

module.exports = router;