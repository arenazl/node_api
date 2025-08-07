/**
 * Rutas actualizadas para configuración de servicios
 * INTEGRADO con Mora.Sim-api usando stored procedures corregidos
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

// Importar cliente de Mora.Sim-api
const moraSimApiClient = require('../../external-integrations/sim-integration/mora-sim-api-client');

// Directorios locales (para fallback)
const configDir = path.join(__dirname, '../../..', 'JsonStorage', 'settings');

/**
 * @route POST /service-config/save
 * @description Guarda configuración de servicio via Mora.Sim-api usando SPs corregidos
 */
router.post('/save', async (req, res) => {
  try {
    const { 
      serviceNumber, 
      serviceName, 
      canal = 'SM', 
      version = '1.0',
      suffix, 
      header, 
      request,
      excelId  // ID del Excel asociado (requerido por SP)
    } = req.body;

    // Validaciones básicas
    if (!serviceNumber) {
      return res.status(400).json({ error: 'serviceNumber es requerido' });
    }
    if (!excelId) {
      return res.status(400).json({ error: 'excelId es requerido - debe asociarse a un Excel existente' });
    }
    if (!canal) {
      return res.status(400).json({ error: 'canal es requerido' });
    }

    console.log(`🔧 [SERVICE-CONFIG] Guardando configuración para servicio ${serviceNumber}, canal ${canal}`);

    // Construir objeto de configuración
    const configurationData = {
      header: header || {},
      request: request || {},
      metadata: {
        serviceNumber: serviceNumber,
        serviceName: serviceName,
        canal: canal,
        suffix: suffix,
        createdAt: new Date().toISOString(),
        source: 'node_api_config'
      }
    };

    // **INTEGRACIÓN CON MORA.SIM-API - USANDO sp_RegisterSetting CORREGIDO**
    console.log("🔧 [SERVICE-CONFIG] Integrando con Mora.Sim-api...");

    const settingsData = {
      ExcelId: parseInt(excelId),
      Version: version,
      SettingName: `Config_${serviceNumber}_${canal}_${version}`,
      SettingJson: JSON.stringify(configurationData)
    };

    // Llamar a Mora.Sim-api
    const moraResult = await moraSimApiClient.post('/StoreSettingsWithValues', settingsData);

    if (moraResult.success) {
      console.log("✅ [SERVICE-CONFIG] Configuración guardada en Mora.Sim-api exitosamente");

      // También guardar localmente para compatibilidad (opcional)
      try {
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        const safeCanal = canal.replace(/[^a-zA-Z0-9]/g, '');
        const configFileName = `${serviceNumber}_${safeCanal}_${version}.json`;
        const configFilePath = path.join(configDir, configFileName);
        
        fs.writeJsonSync(configFilePath, configurationData, { spaces: 2 });
        console.log(`💾 [SERVICE-CONFIG] Backup local guardado: ${configFileName}`);
      } catch (localError) {
        console.warn("⚠️ [SERVICE-CONFIG] Error al guardar backup local:", localError.message);
      }

      // Respuesta exitosa
      res.json({
        success: true,
        message: "Configuración guardada exitosamente",
        data: {
          serviceNumber: serviceNumber,
          canal: canal,
          version: version,
          settingId: moraResult.data.SettingId,
          constantsCount: moraResult.data.ConstantsCount || 0,
          variablesCount: moraResult.data.VariablesCount || 0,
          integration: "✅ sp_RegisterSetting ejecutado correctamente"
        }
      });

    } else {
      // Error en Mora.Sim-api
      console.error("❌ [SERVICE-CONFIG] Error en Mora.Sim-api:", moraResult.error);
      
      res.status(500).json({
        error: "Error al guardar configuración en Mora.Sim-api",
        details: moraResult.error
      });
    }

  } catch (error) {
    console.error("❌ [SERVICE-CONFIG] Error general:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

/**
 * @route GET /service-config/list
 * @description Lista configuraciones desde Mora.Sim-api (no archivos locales)
 */
router.get('/list', async (req, res) => {
  try {
    console.log("📋 [SERVICE-CONFIG] Listando configuraciones...");

    // TODO: Implementar endpoint en Mora.Sim-api para consultar configuraciones
    // Por ahora, fallback a archivos locales
    
    const localConfigs = [];
    
    if (fs.existsSync(configDir)) {
      const configFiles = fs.readdirSync(configDir)
        .filter(file => file.endsWith('.json'));

      configFiles.forEach(file => {
        try {
          const filePath = path.join(configDir, file);
          const config = fs.readJsonSync(filePath);
          const stats = fs.statSync(filePath);
          
          localConfigs.push({
            id: file.replace('.json', ''),
            fileName: file,
            serviceNumber: config.metadata?.serviceNumber || 'unknown',
            canal: config.metadata?.canal || 'unknown',
            createdAt: stats.mtime,
            source: 'local_fallback'
          });
        } catch (err) {
          console.warn(`⚠️ Error al leer configuración ${file}:`, err.message);
        }
      });
    }

    res.json({
      success: true,
      configurations: localConfigs,
      note: "Datos desde archivos locales - TODO: implementar consulta desde BD via Mora.Sim-api"
    });

  } catch (error) {
    console.error("❌ [SERVICE-CONFIG] Error al listar:", error);
    res.status(500).json({
      error: "Error al listar configuraciones",
      details: error.message
    });
  }
});

/**
 * @route GET /service-config/get/:serviceNumber/:canal/:version
 * @description Obtener configuración específica (prioridad: BD > archivos locales)
 */
router.get('/get/:serviceNumber/:canal/:version?', async (req, res) => {
  try {
    const { serviceNumber, canal, version = '1.0' } = req.params;

    console.log(`🔍 [SERVICE-CONFIG] Buscando configuración: ${serviceNumber}/${canal}/${version}`);

    // TODO: Consultar primero desde Mora.Sim-api
    // Por ahora usar archivos locales como fallback

    const safeCanal = canal.replace(/[^a-zA-Z0-9]/g, '');
    const configFileName = `${serviceNumber}_${safeCanal}_${version}.json`;
    const configFilePath = path.join(configDir, configFileName);

    if (fs.existsSync(configFilePath)) {
      const config = fs.readJsonSync(configFilePath);
      
      res.json({
        success: true,
        configuration: config,
        source: 'local_file',
        note: "TODO: Implementar consulta desde BD"
      });
    } else {
      res.status(404).json({
        error: "Configuración no encontrada",
        searchPath: configFileName
      });
    }

  } catch (error) {
    console.error("❌ [SERVICE-CONFIG] Error al obtener configuración:", error);
    res.status(500).json({
      error: "Error al obtener configuración",
      details: error.message
    });
  }
});

/**
 * @route DELETE /service-config/delete/:serviceNumber/:canal/:version
 * @description Eliminar configuración (BD + archivo local)
 */
router.delete('/delete/:serviceNumber/:canal/:version?', async (req, res) => {
  try {
    const { serviceNumber, canal, version = '1.0' } = req.params;

    console.log(`🗑️ [SERVICE-CONFIG] Eliminando configuración: ${serviceNumber}/${canal}/${version}`);

    // TODO: Implementar eliminación en Mora.Sim-api
    // Por ahora solo eliminar archivo local

    const safeCanal = canal.replace(/[^a-zA-Z0-9]/g, '');
    const configFileName = `${serviceNumber}_${safeCanal}_${version}.json`;
    const configFilePath = path.join(configDir, configFileName);

    if (fs.existsSync(configFilePath)) {
      fs.unlinkSync(configFilePath);
      
      res.json({
        success: true,
        message: "Configuración eliminada exitosamente",
        deletedFile: configFileName,
        note: "TODO: Implementar eliminación en BD via Mora.Sim-api"
      });
    } else {
      res.status(404).json({
        error: "Configuración no encontrada para eliminar",
        searchPath: configFileName
      });
    }

  } catch (error) {
    console.error("❌ [SERVICE-CONFIG] Error al eliminar:", error);
    res.status(500).json({
      error: "Error al eliminar configuración",
      details: error.message
    });
  }
});

/**
 * @route POST /service-config/bulk-save
 * @description Guardar múltiples configuraciones en lote
 */
router.post('/bulk-save', async (req, res) => {
  try {
    const { configurations } = req.body;

    if (!Array.isArray(configurations) || configurations.length === 0) {
      return res.status(400).json({
        error: "Se requiere un array de configuraciones"
      });
    }

    console.log(`🔧 [SERVICE-CONFIG] Guardando ${configurations.length} configuraciones en lote...`);

    const results = [];
    const errors = [];

    for (const config of configurations) {
      try {
        const settingsData = {
          ExcelId: parseInt(config.excelId),
          Version: config.version || '1.0',
          SettingName: config.settingName || `Config_${config.serviceNumber}_${config.canal}`,
          SettingJson: JSON.stringify(config.data || {})
        };

        const moraResult = await moraSimApiClient.post('/StoreSettingsWithValues', settingsData);

        if (moraResult.success) {
          results.push({
            serviceNumber: config.serviceNumber,
            canal: config.canal,
            status: 'success',
            settingId: moraResult.data.SettingId
          });
        } else {
          errors.push({
            serviceNumber: config.serviceNumber,
            canal: config.canal,
            error: moraResult.error
          });
        }
      } catch (configError) {
        errors.push({
          serviceNumber: config.serviceNumber || 'unknown',
          canal: config.canal || 'unknown',
          error: configError.message
        });
      }
    }

    console.log(`✅ [SERVICE-CONFIG] Lote completado: ${results.length} exitosos, ${errors.length} errores`);

    res.json({
      success: errors.length === 0,
      message: `Procesadas ${configurations.length} configuraciones`,
      results: results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("❌ [SERVICE-CONFIG] Error en guardado masivo:", error);
    res.status(500).json({
      error: "Error en guardado masivo",
      details: error.message
    });
  }
});

module.exports = router;