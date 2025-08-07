const axios = require('axios');

/**
 * Cliente HTTP genérico para external integrations
 * Funcionalidades comunes para llamadas a APIs externas
 */
class HttpClient {
    constructor(baseUrl, options = {}) {
        this.baseUrl = baseUrl;
        this.timeout = options.timeout || 30000;
        this.retries = options.retries || 3;
        this.headers = options.headers || {
            'Content-Type': 'application/json',
            'User-Agent': 'node_api/1.0.0'
        };
    }

    /**
     * Realiza una petición HTTP con reintentos
     * @param {string} method - Método HTTP
     * @param {string} endpoint - Endpoint relativo
     * @param {Object} data - Datos a enviar
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Object>} Respuesta de la API
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        let lastError;

        console.log('🔧 [HTTP-DEBUG] Iniciando request');
        console.log('🔧 [HTTP-DEBUG] Method:', method);
        console.log('🔧 [HTTP-DEBUG] BaseURL:', this.baseUrl);
        console.log('🔧 [HTTP-DEBUG] Endpoint:', endpoint);
        console.log('🔧 [HTTP-DEBUG] URL completa:', url);
        console.log('🔧 [HTTP-DEBUG] Data:', JSON.stringify(data, null, 2));
        console.log('🔧 [HTTP-DEBUG] Timeout:', this.timeout);
        console.log('🔧 [HTTP-DEBUG] Retries:', this.retries);

        for (let attempt = 1; attempt <= this.retries; attempt++) {
            try {
                console.log(`🔧 [HTTP-DEBUG] Intento ${attempt}/${this.retries}`);
                
                const config = {
                    method,
                    url,
                    timeout: options.timeout || this.timeout,
                    headers: { ...this.headers, ...options.headers }
                };

                if (data && (method === 'POST' || method === 'PUT')) {
                    config.data = data;
                }

                console.log('🔧 [HTTP-DEBUG] Config axios:', JSON.stringify(config, null, 2));
                console.log('🔧 [HTTP-DEBUG] Ejecutando axios request...');

                const response = await axios(config);
                
                console.log('🔧 [HTTP-DEBUG] Response recibida!');
                console.log('🔧 [HTTP-DEBUG] Status:', response.status);
                console.log('🔧 [HTTP-DEBUG] Headers:', JSON.stringify(response.headers, null, 2));
                console.log('🔧 [HTTP-DEBUG] Data:', JSON.stringify(response.data, null, 2));
                
                return this.processResponse(response);

            } catch (error) {
                console.error(`🔧 [HTTP-DEBUG] Error en intento ${attempt}:`, error.message);
                console.error('🔧 [HTTP-DEBUG] Error code:', error.code);
                console.error('🔧 [HTTP-DEBUG] Error response:', error.response?.status, error.response?.data);
                
                lastError = error;
                
                if (attempt < this.retries && this.shouldRetry(error)) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    console.log(`⚠️  Intento ${attempt}/${this.retries} falló, reintentando en ${delay}ms...`);
                    await this.sleep(delay);
                } else {
                    console.error(`❌ Todos los intentos fallaron después de ${this.retries} intentos`);
                    break;
                }
            }
        }

        console.error('🔧 [HTTP-DEBUG] Procesando error final...');
        return this.processError(lastError);
    }

    /**
     * Procesa la respuesta exitosa
     * @param {Object} response - Respuesta de axios
     * @returns {Object} Respuesta procesada
     */
    processResponse(response) {
        return {
            success: true,
            statusCode: response.status,
            data: response.data,
            headers: response.headers
        };
    }

    /**
     * Procesa errores de la petición
     * @param {Error} error - Error capturado
     * @returns {Object} Error procesado
     */
    processError(error) {
        const errorInfo = this.extractErrorInfo(error);
        return {
            success: false,
            error: errorInfo.message,
            statusCode: errorInfo.statusCode,
            details: errorInfo.details
        };
    }

    /**
     * Extrae información útil del error
     * @param {Error} error - Error capturado
     * @returns {Object} Información del error
     */
    extractErrorInfo(error) {
        if (error.response) {
            // Error de respuesta HTTP
            return {
                message: error.response.data?.error || error.response.data?.message || 'Error en la API',
                statusCode: error.response.status,
                details: error.response.data
            };
        } else if (error.request) {
            // Error de conexión
            return {
                message: 'No se pudo conectar con la API externa',
                statusCode: 0,
                details: 'Timeout o conexión rechazada'
            };
        } else {
            // Error de configuración
            return {
                message: error.message || 'Error desconocido',
                statusCode: -1,
                details: error.toString()
            };
        }
    }

    /**
     * Determina si un error puede ser reintentado
     * @param {Error} error - Error a evaluar
     * @returns {boolean} true si se puede reintentar
     */
    shouldRetry(error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return true;
        }
        
        if (error.response) {
            const status = error.response.status;
            // Reintentar en errores de servidor temporales
            return status >= 500 || status === 429;
        }
        
        return false;
    }

    /**
     * Utilidad para pausar ejecución
     * @param {number} ms - Milisegundos a esperar
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Métodos de conveniencia para HTTP verbs
     */
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    /**
     * Test de conexión básico
     * @param {string} healthEndpoint - Endpoint de health check
     * @returns {Promise<boolean>} true si la conexión es exitosa
     */
    async testConnection(healthEndpoint = '/health') {
        try {
            const response = await this.get(healthEndpoint, { timeout: 5000 });
            return response.success && response.statusCode === 200;
        } catch (error) {
            return false;
        }
    }
}

module.exports = HttpClient;