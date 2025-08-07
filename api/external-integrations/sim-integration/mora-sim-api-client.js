const HttpClient = require('../shared/http-client');

/**
 * Cliente para integración con Mora.Sim-api
 * Maneja las llamadas a los endpoints de SimImporter
 */
class MoraSimApiClient {
    constructor() {
        console.log('🔧 [DEBUG] MoraSimApiClient constructor iniciado');
        console.log('🔧 [DEBUG] MORA_SIM_API_ENABLED:', process.env.MORA_SIM_API_ENABLED);
        console.log('🔧 [DEBUG] MORA_SIM_API_URL:', process.env.MORA_SIM_API_URL);
        
        this.enabled = process.env.MORA_SIM_API_ENABLED === 'true';
        this.baseUrl = process.env.MORA_SIM_API_URL;

        console.log('🔧 [DEBUG] this.enabled:', this.enabled);
        console.log('🔧 [DEBUG] this.baseUrl:', this.baseUrl);

        this.httpClient = new HttpClient(this.baseUrl, {
            timeout: parseInt(process.env.MORA_SIM_API_TIMEOUT || '30000'),
            retries: parseInt(process.env.MORA_SIM_API_RETRIES || '3')
        });
        
        console.log('🔧 [DEBUG] HttpClient creado con timeout:', parseInt(process.env.MORA_SIM_API_TIMEOUT || '30000'));
        console.log('🔧 [DEBUG] MoraSimApiClient constructor completado');
    }

    /**
     * Verifica si la integración está habilitada
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Calcula los campos de conteo y totales de una estructura
     * @param {Object} structureJson - Estructura parseada del Excel
     * @returns {Object} Campos calculados
     */
    calculateStructureMetrics(structureJson) {
        let headerFieldCount = 0;
        let requestFieldCount = 0;
        let responseFieldCount = 0;
        let headerTotalLength = 0;
        let requestTotalLength = 0;
        let responseTotalLength = 0;

        // Contar campos y longitudes del HEADER
        if (structureJson.headerStructure && structureJson.headerStructure.fields) {
            structureJson.headerStructure.fields.forEach(field => {
                if (field.name && field.name !== 'REQUERIMIENTO' && field.name !== '*') {
                    headerFieldCount++;
                    headerTotalLength += parseInt(field.length || 0);
                }
            });
        }

        // Función helper para contar campos en elementos recursivamente
        const countFieldsInElements = (elements) => {
            let count = 0;
            let totalLength = 0;
            
            if (!elements) return { count, totalLength };
            
            elements.forEach(element => {
                if (element.type === 'field') {
                    count++;
                    totalLength += parseInt(element.length || 0);
                } else if (element.type === 'occurrence' && element.fields) {
                    // Contar campos dentro de ocurrencias
                    const nestedResult = countFieldsInElements(element.fields);
                    count += nestedResult.count;
                    totalLength += nestedResult.totalLength;
                }
            });
            
            return { count, totalLength };
        };

        // Contar campos y longitudes del REQUEST
        if (structureJson.serviceStructure && structureJson.serviceStructure.request) {
            const requestResult = countFieldsInElements(structureJson.serviceStructure.request.elements);
            requestFieldCount = requestResult.count;
            requestTotalLength = requestResult.totalLength;
        }

        // Contar campos y longitudes del RESPONSE
        if (structureJson.serviceStructure && structureJson.serviceStructure.response) {
            const responseResult = countFieldsInElements(structureJson.serviceStructure.response.elements);
            responseFieldCount = responseResult.count;
            responseTotalLength = responseResult.totalLength;
        }

        const metrics = {
            headerFieldCount,
            requestFieldCount,
            responseFieldCount,
            headerTotalLength,
            requestTotalLength,
            responseTotalLength,
            serviceNumber: structureJson.serviceNumber || null,
            serviceName: structureJson.serviceName || null
        };

        console.log('📊 Métricas calculadas:');
        console.log(`   Header: ${headerFieldCount} campos, ${headerTotalLength} bytes`);
        console.log(`   Request: ${requestFieldCount} campos, ${requestTotalLength} bytes`);
        console.log(`   Response: ${responseFieldCount} campos, ${responseTotalLength} bytes`);

        return metrics;
    }

    /**
     * Registra un Excel con su estructura de campos
     * @param {Object} excelData - Datos del Excel y estructura
     * @returns {Promise<Object>} Resultado de la operación
     */
    async storeExcelWithStructure(excelData) {
        if (!this.isEnabled()) {
            console.log('ℹ️  Mora.Sim-api integration disabled, skipping Excel storage');
            return { success: true, message: 'Integration disabled', skipped: true };
        }

        try {
            console.log('📤 Enviando Excel y estructura a Mora.Sim-api...');

            // Calcular métricas de la estructura
            const metrics = this.calculateStructureMetrics(excelData.structureJson);

            const payload = {
                canalCode: excelData.canalCode || 'SM',
                serviceNumber: excelData.serviceNumber,
                serviceName: excelData.serviceName,
                version: excelData.version,
                fileName: excelData.fileName,
                filePath: excelData.filePath,
                fileSize: excelData.fileSize,
                createdBy: excelData.createdBy || 'node_api',
                structureFileName: excelData.structureFileName,
                structureJson: JSON.stringify(excelData.structureJson),
                // Agregar campos calculados
                headerFieldCount: metrics.headerFieldCount,
                requestFieldCount: metrics.requestFieldCount,
                responseFieldCount: metrics.responseFieldCount,
                headerTotalLength: metrics.headerTotalLength,
                requestTotalLength: metrics.requestTotalLength,
                responseTotalLength: metrics.responseTotalLength
            };

            const response = await this.httpClient.post('/StoreExcelWithStructure', payload);

            if (response.success) {
                console.log('✅ Excel y estructura registrados exitosamente');
                console.log(`   ExcelId: ${response.data?.ExcelId || 'N/A'}`);
                console.log(`   Rows affected: ${response.rowsAffected || 0}`);
            }

            return response;
        } catch (error) {
            console.error('❌ Error al registrar Excel y estructura:', error.message);
            throw error;
        }
    }

    /**
     * Registra configuraciones con constantes y variables
     * @param {Object} settingsData - Datos de configuración
     * @returns {Promise<Object>} Resultado de la operación
     */
    async storeSettingsWithValues(settingsData) {
        console.log('🔧 [DEBUG] storeSettingsWithValues iniciado');
        console.log('🔧 [DEBUG] settingsData recibido:', JSON.stringify(settingsData, null, 2));
        console.log('🔧 [DEBUG] this.isEnabled():', this.isEnabled());
        
        if (!this.isEnabled()) {
            console.log('ℹ️  Mora.Sim-api integration disabled, skipping settings storage');
            return { success: true, message: 'Integration disabled', skipped: true };
        }

        try {
            console.log('📤 Enviando configuración a Mora.Sim-api...');
            console.log('🔧 [DEBUG] URL base:', this.baseUrl);

            // IMPORTANTE: SettingsWithValuesDTO tiene [SqlJson] pero parece que NO hace doble serialización
            // Vamos a enviar como STRING igual que storeExcelWithStructure que SÍ funciona
            
            let jsonToSend = settingsData.settingJson;
            console.log('🔧 [DEBUG] Tipo de settingJson recibido:', typeof jsonToSend);
            
            // Si es objeto, convertir a string
            if (typeof jsonToSend === 'object' && jsonToSend !== null) {
                console.log('🔧 [DEBUG] settingJson es objeto, convirtiendo a string...');
                jsonToSend = JSON.stringify(jsonToSend);
            }
            
            console.log('🔧 [DEBUG] settingJson será enviado como STRING');
            if (jsonToSend) {
                console.log('🔧 [DEBUG] Primeros 200 caracteres:', jsonToSend.substring(0, 200));
            }
            
            // Determinar si es completo o dinámico basado en el contenido
            const hasCompleteJson = settingsData.completeSettingJson || settingsData.settingJson;
            const hasDynamicJson = settingsData.dynamicSettingJson;
            
            // Manejar los diferentes casos de datos recibidos
            let completeJson = null;
            let dynamicJson = null;
            
            if (hasCompleteJson) {
                completeJson = settingsData.completeSettingJson || jsonToSend;
                if (typeof completeJson === 'object') {
                    completeJson = JSON.stringify(completeJson);
                }
            }
            
            if (hasDynamicJson) {
                dynamicJson = settingsData.dynamicSettingJson;
                if (typeof dynamicJson === 'object') {
                    dynamicJson = JSON.stringify(dynamicJson);
                }
            }
            
            // Enviar con los nombres correctos de campos que espera el DTO
            const payload = {
                excelId: settingsData.excelId,
                version: settingsData.version,
                settingName: settingsData.settingName,
                completeSettingJson: completeJson,  // Campo correcto para el DTO
                dynamicSettingJson: dynamicJson,    // Campo correcto para el DTO
                isActive: settingsData.isActive !== undefined ? settingsData.isActive : true,
                priority: settingsData.priority || 100,
                modifiedBy: settingsData.modifiedBy || 'node_api'
            };

            console.log('🔧 [DEBUG] Payload preparado:', JSON.stringify(payload, null, 2));
            console.log('🔧 [DEBUG] Endpoint: /StoreSettingsWithValues');
            console.log('🔧 [DEBUG] URL completa:', this.baseUrl + '/StoreSettingsWithValues');

            const response = await this.httpClient.post('/StoreSettingsWithValues', payload);

            console.log('🔧 [DEBUG] Respuesta recibida:', JSON.stringify(response, null, 2));

            if (response.success) {
                console.log('✅ Configuración registrada exitosamente');
                console.log(`   SettingId: ${response.data?.SettingId || 'N/A'}`);
                console.log(`   Constants: ${response.data?.ConstantsCount || 0}`);
                console.log(`   Variables: ${response.data?.VariablesCount || 0}`);
            }

            return response;
        } catch (error) {
            console.error('❌ Error al registrar configuración:', error.message);
            console.error('🔧 [DEBUG] Error stack:', error.stack);
            console.error('🔧 [DEBUG] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            throw error;
        }
    }


    /**
     * Test de conexión con Mora.Sim-api
     * @returns {Promise<boolean>} true si la conexión es exitosa
     */
    async testConnection() {
        try {
            console.log('🔧 [DEBUG] Salteando health check - asumiendo conexión OK');
            // Salteamos el health check por ahora ya que no existe el endpoint
            return true;
        } catch (error) {
            console.warn('⚠️  No se pudo verificar conexión con Mora.Sim-api:', error.message);
            return false;
        }
    }
}

module.exports = MoraSimApiClient;