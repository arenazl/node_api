/**
 * Rutas para manejar configuraciones de servicios
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const configFormatUpdater = require('../../../utils/config-format-updater');
const router = express.Router();

// Directorio para almacenar configuraciones
const configDir = path.join(__dirname, '../../../JsonStorage', 'settings');

/**
 * @route POST /service-config/save
 * @description Guarda la configuración de un servicio
 */
router.post('/save', async (req, res) => {
  try {
      const { serviceNumber, serviceName, canal, suffix, header, request, dynamicParams } = req.body;
    
    // Validar datos requeridos
    if (!serviceNumber) {
      return res.status(400).json({ error: 'Número de servicio es requerido' });
    }
    if (!canal) {
      return res.status(400).json({ error: 'Canal es requerido' });
    }
    if (!suffix || suffix.trim() === '') {
      return res.status(400).json({ error: 'Sufijo es requerido' });
    }
    // Crear directorio si no existe
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    // Sanitizar canal
    const safeCanal = canal.replace(/[^a-zA-Z0-9]/g, '');
    
    // Sanitizar sufijo (ya validamos que no está vacío)
    const safeSuffix = suffix.replace(/[^a-zA-Z0-9_-]/g, '');
    
    console.log('[ServiceConfig] DEBUG - suffix original:', suffix);
    console.log('[ServiceConfig] DEBUG - safeSuffix:', safeSuffix);
    
    // Validación adicional después de sanitizar
    if (!safeSuffix || safeSuffix.trim() === '') {
      return res.status(400).json({ error: 'El sufijo contiene caracteres inválidos y resultó vacío después de sanitizar' });
    }
    
    // Buscar archivos existentes para este servicio y canal
    const files = fs.readdirSync(configDir)
      .filter(file => file.endsWith('.json') && file.startsWith(`${serviceNumber}-${safeCanal}-v`));
    // Calcular el próximo número de versión correlativo
    const versionNumber = files.length + 1;
    const safeVersion = `v${versionNumber}`;
    
    // Crear nombre de archivo: serviceNumber-canal-vN-suffix.json
    const filename = `${serviceNumber}-${safeCanal}-${safeVersion}-${safeSuffix}.json`;
    const filePath = path.join(configDir, filename);
    
    console.log('[ServiceConfig] DEBUG - filename generado:', filename);
    console.log('[ServiceConfig] DEBUG - filePath completo:', filePath);
    // Crear objeto de configuración
    const config = {
      serviceNumber,
      serviceName: serviceName || `Servicio ${serviceNumber}`,
      canal: safeCanal,
      version: safeVersion,
      suffix: safeSuffix,
      timestamp: new Date().toISOString(),
      header: header || {},
      request: request || {},
      dynamicParams: dynamicParams || {}
    };
    console.log('[ServiceConfig] POST /save - Configuration object to save:', JSON.stringify(config, null, 2));
    // Guardar configuración en archivo JSON
    await fs.writeJson(filePath, config, { spaces: 2 });
    
    // Integración con Mora.Sim-api - Enviar configuración
    console.log('🔌 [MORA-SIM-CONFIG] Iniciando integración con Mora.Sim-api para configuración...');
    try {
      console.log('🔌 [MORA-SIM-CONFIG] Cargando MoraSimDatabaseHelper...');
      const MoraSimDatabaseHelper = require('../../external-integrations/sim-integration/mora-sim-database-helper');
      console.log('🔌 [MORA-SIM-CONFIG] Helper cargado, creando instancia...');
      const moraHelper = new MoraSimDatabaseHelper();
      console.log('🔌 [MORA-SIM-CONFIG] Instancia creada exitosamente');
      
      // Buscar structure para obtener excelId si existe
      console.log('🔌 [MORA-SIM-CONFIG] Buscando estructura para servicio:', serviceNumber);
      const structurePath = path.join(__dirname, '../../../JsonStorage', 'structures');
      console.log('🔌 [MORA-SIM-CONFIG] Ruta de estructuras:', structurePath);
      let excelId = null;
      
      if (fs.existsSync(structurePath)) {
        const structureFiles = await fs.readdir(structurePath);
        console.log('🔌 [MORA-SIM-CONFIG] Archivos de estructura encontrados:', structureFiles.length);
        const structureFile = structureFiles.find(file => file.includes(serviceNumber));
        
        if (structureFile) {
          console.log(`🔌 [MORA-SIM-CONFIG] 📋 Encontrado archivo de estructura: ${structureFile} para servicio ${serviceNumber}`);
          // Por ahora usamos serviceNumber como excelId, luego se puede mejorar
          excelId = parseInt(serviceNumber) || serviceNumber;
          console.log('🔌 [MORA-SIM-CONFIG] ExcelId asignado:', excelId);
        } else {
          console.log('🔌 [MORA-SIM-CONFIG] ⚠️ No se encontró archivo de estructura para servicio:', serviceNumber);
        }
      } else {
        console.log('🔌 [MORA-SIM-CONFIG] ⚠️ Directorio de estructuras no existe:', structurePath);
      }
      
      // Preparar CompleteSettingJson con header y request
      const completeSettingJson = {
        header: header || {},
        request: request || {}
      };
      const completeSettingJsonStr = JSON.stringify(completeSettingJson);
      
      // Preparar DynamicSettingJson con los parámetros dinámicos del contenedor
      const dynamicSettingJson = dynamicParams ? {
        header: dynamicParams.header || {},
        parameters: dynamicParams.parameters || {}
      } : null;
      const dynamicSettingJsonStr = dynamicSettingJson ? JSON.stringify(dynamicSettingJson) : null;

      const settingsData = {
        excelId: excelId || serviceNumber,
        version: safeVersion,
        settingName: `${serviceName || 'Configuracion'} - ${safeCanal} - ${safeSuffix}`,
        completeSettingJson: completeSettingJsonStr,
        dynamicSettingJson: dynamicSettingJsonStr,
        isActive: true,
        priority: 100,
        modifiedBy: 'node_api' // Se puede cambiar para recibir el usuario real
      };
      
      console.log('🔌 [MORA-SIM-CONFIG] Preparando datos para envío:', {
        excelId: settingsData.excelId,
        version: settingsData.version,
        settingName: settingsData.settingName,
        hasCompleteSettingJson: settingsData.completeSettingJson?.length > 2,
        hasDynamicSettingJson: settingsData.dynamicSettingJson?.length > 2,
        isActive: settingsData.isActive,
        priority: settingsData.priority
      });
      
      console.log('🔌 [MORA-SIM-CONFIG] Enviando configuración a Mora.Sim-api...');
      const storeResult = await moraHelper.storeSettingsWithValues(settingsData);
      console.log('🔌 [MORA-SIM-CONFIG] Respuesta recibida:', storeResult);
      
      if (storeResult.success) {
        console.log('🔌 [MORA-SIM-CONFIG] ✅ Configuración registrada exitosamente en Mora.Sim-api');
        console.log('🔌 [MORA-SIM-CONFIG] ID generado:', storeResult.id);
      } else {
        console.error('🔌 [MORA-SIM-CONFIG] ❌ Error al registrar configuración en Mora.Sim-api:', storeResult.error);
      }
    } catch (moraError) {
      console.error('🔌 [MORA-SIM-CONFIG] ❌ Error conectando con Mora.Sim-api:', moraError.message);
      console.error('🔌 [MORA-SIM-CONFIG] Stack trace:', moraError.stack);
      // Continuamos con el procesamiento normal aunque falle la integración
    }
    
    // Los eventos se manejan via EventBus local en el frontend
    // Devolver respuesta exitosa
    console.log('[ServiceConfig] DEBUG - Enviando filename en respuesta:', filename);
    res.json({
      success: true,
      message: `Configuración guardada exitosamente`,
      filename: filename
    });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ 
      error: `Error al guardar configuración: ${error.message}` 
    });
  }
});

/**
 * @route GET /service-config/list
 * @description Obtiene la lista de configuraciones guardadas
 * @query service_number - Opcional, filtrar por número de servicio
 * @query refresh - Opcional, forzar recarga de caché (true o false)
 */
router.get('/list', async (req, res) => {
  try {
    const { service_number, refresh } = req.query;
    const forceRefresh = refresh === 'true';
    // Log eliminado para inicio limpio
    
    if (!fs.existsSync(configDir)) {
      console.log(`[CONFIG] Directorio de configuraciones no existe: ${configDir}`);
      return res.json({ configs: [] });
    }
    
    // Leer todos los archivos de configuración
    const files = fs.readdirSync(configDir)
      .filter(file => file.endsWith('.json'));
    
    // Obtener información de cada configuración
    const configs = [];
    for (const file of files) {
      try {
        const filePath = path.join(configDir, file);
        const config = await fs.readJson(filePath);
        const serviceNumber = config.serviceNumber || "";
        if (service_number && serviceNumber !== service_number) continue;
        
        // Usar el nombre de archivo tal como está (sin extension)
        const displayName = file.replace('.json', '');
        
        configs.push({
          id: displayName,
          serviceNumber,
          serviceName: config.serviceName || `Servicio ${serviceNumber}`,
          canal: config.canal || "",
          version: config.version || 'v1', // Usar versión del archivo JSON
          suffix: config.suffix || '', // Usar sufijo del archivo JSON
          filename: file,
          displayName: displayName, // Nombre completo para mostrar en el dropdown
          timestamp: config.timestamp || new Date().toISOString()
        });
      } catch (fileError) {
        console.error(`Error al procesar archivo ${file}:`, fileError);
      }
    }
    
    // Ordenar por fecha (más recientes primero)
    configs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ configs });
    
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    res.status(500).json({ 
      error: `Error al obtener configuraciones: ${error.message}` 
    });
  }
});

/**
 * @route GET /service-config/get/:id
 * @description Obtiene una configuración específica por ID o nombre de archivo
 */
router.get('/get/:id', async (req, res) => {
  try {
    let { id } = req.params;
    
    // Validar ID para evitar path traversal
    if (!id || id.includes('..')) {
      return res.status(400).json({ error: 'Identificador de configuración inválido' });
    }
    
    // Usar la utilidad para buscar el archivo con formato nuevo o antiguo
    const filePath = configFormatUpdater.getConfigFilePath(configDir, id);
    
    // Verificar si se encontró el archivo
    if (!filePath) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    
    // Leer contenido del archivo
    const config = await fs.readJson(filePath);
    
    res.json(config);
    
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ 
      error: `Error al obtener configuración: ${error.message}` 
    });
  }
});

/**
 * @route DELETE /service-config/delete/:id
 * @description Elimina una configuración específica por ID o nombre de archivo
 */
router.delete('/delete/:id', async (req, res) => {
  try {
    let { id } = req.params;
    
    // Validar ID para evitar path traversal
    if (!id || id.includes('..')) {
      return res.status(400).json({ error: 'Identificador de configuración inválido' });
    }
    
    // Usar la utilidad para buscar el archivo con formato nuevo o antiguo
    const filePath = configFormatUpdater.getConfigFilePath(configDir, id);
    
    // Verificar si se encontró el archivo
    if (!filePath) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    
    // Leer la configuración antes de eliminarla para obtener info
    const config = await fs.readJson(filePath);
    
    // Eliminar el archivo
    await fs.remove(filePath);
    
    console.log(`[CONFIG] Configuración eliminada: ${id}`);
    
    // Los eventos se manejan via EventBus local en el frontend
    
    res.json({
      success: true,
      message: `Configuración eliminada exitosamente`,
      filename: id
    });
    
  } catch (error) {
    console.error('Error al eliminar configuración:', error);
    res.status(500).json({ 
      error: `Error al eliminar configuración: ${error.message}` 
    });
  }
});

// Endpoint de eventos eliminado - se usa EventBus local en el frontend

module.exports = router;
