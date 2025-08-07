const MoraSimApiClient = require('./mora-sim-api-client');

/**
 * Database Helper para Mora.Sim-api
 * Wrapper sobre MoraSimApiClient para mantener consistencia en la interfaz
 */
class MoraSimDatabaseHelper {
    constructor() {
        this.apiClient = new MoraSimApiClient();
    }

    /**
     * Registra un Excel con su estructura
     * @param {Object} excelData - Datos del Excel y estructura
     * @returns {Promise<Object>} Resultado de la operación  
     */
    async storeExcelWithStructure(excelData) {
        // Si IGNORE_INTEGRATION está activado, funcionar como parser interno
        if (process.env.IGNORE_INTEGRATION === 'true') {
            console.log('ℹ️  IGNORE_INTEGRATION activado - funcionando como parser interno');
            return { success: true, message: 'Integration ignored - internal parser mode', skipped: true };
        }
        
        return await this.apiClient.storeExcelWithStructure(excelData);
    }

    /**
     * Registra configuración con constantes y variables
     * @param {Object} settingsData - Datos de configuración
     * @returns {Promise<Object>} Resultado de la operación
     */
    async storeSettingsWithValues(settingsData) {
        // Si IGNORE_INTEGRATION está activado, funcionar como parser interno
        if (process.env.IGNORE_INTEGRATION === 'true') {
            console.log('ℹ️  IGNORE_INTEGRATION activado - funcionando como parser interno');
            return { success: true, message: 'Integration ignored - internal parser mode', skipped: true };
        }
        
        return await this.apiClient.storeSettingsWithValues(settingsData);
    }

    /**
     * Verifica el estado de la conexión HTTP API
     * @returns {Promise<Object>} Estado de la conexión
     */
    async getConnectionStatus() {
        return {
            httpApi: {
                enabled: this.apiClient.isEnabled(),
                available: this.apiClient.isEnabled() ? await this.apiClient.testConnection() : false,
                url: this.apiClient.baseUrl
            }
        };
    }

    /**
     * Verifica si la integración está habilitada
     * @returns {boolean}
     */
    isEnabled() {
        // Si IGNORE_INTEGRATION está activado, la integración está "deshabilitada"
        if (process.env.IGNORE_INTEGRATION === 'true') {
            return false;
        }
        
        return this.apiClient.isEnabled();
    }

    /**
     * Test de conexión
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        return await this.apiClient.testConnection();
    }
}

module.exports = MoraSimDatabaseHelper;