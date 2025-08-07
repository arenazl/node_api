/**
 * Rutas actualizadas para manejo de archivos Excel
 * INTEGRADO con Mora.Sim-api usando stored procedures corregidos
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

// Importar módulos
const excelParser = require('../../../utils/excel-parser');
const moraSimApiClient = require('../../external-integrations/sim-integration/mora-sim-api-client');

// Directorios
const uploadsDir = path.join(__dirname, '../../..', 'JsonStorage', 'uploads');
const structuresDir = path.join(__dirname, '../../..', 'JsonStorage', 'structures');

/**
 * @route POST /excel/upload
 * @description Subir archivo Excel e integrarlo con Mora.Sim-api usando SPs corregidos
 */
router.post('/upload', async (req, res) => {
  try {
    // Verificar archivo
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        error: "No se proporcionó ningún archivo"
      });
    }

    const excelFile = req.files.file;

    // Verificar extensión
    if (!excelFile.name.match(/\.(xlsx|xls)$/i)) {
      return res.status(400).json({
        error: "Solo se permiten archivos Excel (.xlsx, .xls)"
      });
    }

    // Obtener metadatos del request
    const { serviceNumber, version, canalCode = 'SM', serviceName } = req.body;

    if (!serviceNumber || !version) {
      return res.status(400).json({
        error: "Se requieren serviceNumber y version"
      });
    }

    // Crear directorio temporal
    const tempDir = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Guardar archivo temporal
    const tempFilePath = path.join(tempDir, excelFile.name);
    await excelFile.mv(tempFilePath);

    try {
      // Parsear Excel para obtener estructura
      console.log("🔧 [EXCEL-UPLOAD] Parseando archivo Excel...");
      const headerStructure = excelParser.parseHeaderStructure(tempFilePath);
      const serviceStructure = excelParser.parseServiceStructure(tempFilePath);

      if (!serviceStructure || !serviceStructure.serviceNumber) {
        fs.unlinkSync(tempFilePath);
        return res.status(400).json({
          error: "No se pudo extraer información del servicio del Excel"
        });
      }

      // Verificar que el serviceNumber coincida
      if (serviceStructure.serviceNumber !== serviceNumber) {
        fs.unlinkSync(tempFilePath);
        return res.status(400).json({
          error: `ServiceNumber en Excel (${serviceStructure.serviceNumber}) no coincide con el proporcionado (${serviceNumber})`
        });
      }

      // Crear estructura JSON completa
      const structureJson = {
        header_structure: headerStructure,
        request_structure: serviceStructure,
        metadata: {
          uploadedAt: new Date().toISOString(),
          fileName: excelFile.name,
          fileSize: excelFile.size
        }
      };

      // Guardar archivo en uploads (después de validación exitosa)
      const finalFilePath = path.join(uploadsDir, excelFile.name);
      fs.copyFileSync(tempFilePath, finalFilePath);

      // **INTEGRACIÓN CON MORA.SIM-API - USANDO SPs CORREGIDOS**
      console.log("🔧 [EXCEL-UPLOAD] Integrando con Mora.Sim-api...");
      
      // Preparar datos para Mora.Sim-api (usando ExcelWithStructureDTO)
      const excelWithStructureData = {
        CanalCode: canalCode,
        ServiceNumber: serviceNumber,
        ServiceName: serviceName || `Servicio ${serviceNumber}`,
        Version: version,
        FileName: excelFile.name,
        FilePath: finalFilePath,
        FileSize: excelFile.size,
        CreatedBy: req.ip || 'node_api_upload',
        StructureFileName: `${serviceNumber}_v${version}_structure.json`,
        StructureJson: JSON.stringify(structureJson)
      };

      // Llamar a Mora.Sim-api endpoint
      const moraResult = await moraSimApiClient.post('/StoreExcelWithStructure', excelWithStructureData);

      if (moraResult.success) {
        console.log("✅ [EXCEL-UPLOAD] Integración con Mora.Sim-api exitosa");
        
        // También guardar localmente para compatibilidad (opcional)
        const structureFileName = `${new Date().toISOString().split('T')[0]}_${serviceNumber}_${version}_structure.json`;
        const structureFilePath = path.join(structuresDir, structureFileName);
        fs.writeJsonSync(structureFilePath, structureJson, { spaces: 2 });

        // Limpiar archivo temporal
        fs.unlinkSync(tempFilePath);

        // Respuesta exitosa
        res.json({
          success: true,
          message: "Excel procesado e integrado exitosamente",
          data: {
            serviceNumber: serviceNumber,
            version: version,
            fileName: excelFile.name,
            structureFile: structureFileName,
            moraSimResult: moraResult.data,
            integration: "✅ Stored procedures ejecutados correctamente"
          }
        });

      } else {
        // Error en Mora.Sim-api
        console.error("❌ [EXCEL-UPLOAD] Error en Mora.Sim-api:", moraResult.error);
        
        // Limpiar archivos
        fs.unlinkSync(tempFilePath);
        if (fs.existsSync(finalFilePath)) {
          fs.unlinkSync(finalFilePath);
        }

        res.status(500).json({
          error: "Error al integrar con Mora.Sim-api",
          details: moraResult.error
        });
      }

    } catch (parseError) {
      // Error al parsear Excel
      console.error("❌ [EXCEL-UPLOAD] Error al procesar Excel:", parseError);
      
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      res.status(400).json({
        error: "Error al procesar el archivo Excel",
        details: parseError.message
      });
    }

  } catch (error) {
    console.error("❌ [EXCEL-UPLOAD] Error general:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

/**
 * @route POST /excel/upload-with-config
 * @description Subir Excel Y configuración en una sola operación
 */
router.post('/upload-with-config', async (req, res) => {
  try {
    const { 
      serviceNumber, 
      version, 
      canalCode = 'SM', 
      serviceName,
      settingName,
      configurationData 
    } = req.body;

    // Validaciones
    if (!req.files || !req.files.file || !serviceNumber || !version || !configurationData) {
      return res.status(400).json({
        error: "Se requieren: archivo, serviceNumber, version y configurationData"
      });
    }

    // Primero hacer upload del Excel (reutilizar lógica anterior)
    // ... (lógica similar al endpoint anterior)

    // Después de subir Excel exitosamente, agregar configuración
    const settingsData = {
      ExcelId: moraResult.data.ExcelId, // Obtenido del resultado anterior
      Version: version,
      SettingName: settingName || `Config_${serviceNumber}_${version}`,
      SettingJson: JSON.stringify(configurationData)
    };

    // Llamar a segundo endpoint de Mora.Sim-api
    const settingsResult = await moraSimApiClient.post('/StoreSettingsWithValues', settingsData);

    if (settingsResult.success) {
      res.json({
        success: true,
        message: "Excel y configuración procesados exitosamente",
        data: {
          excel: moraResult.data,
          settings: settingsResult.data
        }
      });
    } else {
      res.status(500).json({
        error: "Excel subido pero error al guardar configuración",
        details: settingsResult.error
      });
    }

  } catch (error) {
    console.error("❌ [EXCEL-CONFIG] Error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

/**
 * @route GET /excel/list
 * @description Listar archivos Excel desde Mora.Sim-api (en lugar de archivos locales)
 */
router.get('/list', async (req, res) => {
  try {
    // En lugar de leer archivos locales, consultar via Mora.Sim-api
    // Esto requeriría un nuevo endpoint en Mora.Sim-api para consultar la BD
    
    console.log("📋 [EXCEL-LIST] Consultando Excel desde Mora.Sim-api...");
    
    // Por ahora, fallback a método local hasta que se implemente endpoint de consulta
    const localFiles = fs.readdirSync(uploadsDir)
      .filter(file => file.match(/\.(xlsx|xls)$/i))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          fileName: file,
          size: stats.size,
          uploadDate: stats.mtime,
          source: 'local_fallback'
        };
      });

    res.json({
      success: true,
      files: localFiles,
      note: "Datos desde archivos locales - TODO: implementar consulta desde BD"
    });

  } catch (error) {
    console.error("❌ [EXCEL-LIST] Error:", error);
    res.status(500).json({
      error: "Error al listar archivos",
      details: error.message
    });
  }
});

module.exports = router;