/**
 * Service API Client
 * 
 * Este módulo centraliza todas las llamadas a la API de servicios,
 * evitando la duplicación de código entre diferentes partes de la interfaz.
 */

/**
 * Cliente de API para interactuar con los servicios
 */
const ServiceApiClient = {
    /**
     * Envía un mensaje a la API utilizando el endpoint /api/services/sendmessage
     * @param {Object} header - Objeto con los datos de la cabecera (serviceNumber, canal, etc.)
     * @param {Object} parameters - Objeto con los parámetros del servicio
     * @returns {Promise<Object>} - Promesa que resuelve con la respuesta del servidor
     */
    sendMessage: async function(header, parameters) {
        console.log('[ServiceApiClient] Enviando mensaje con:', { header, parameters });
        
        try {
            // Validar datos esenciales
            if (!header || !header.serviceNumber) {
                throw new Error('Se requiere header.serviceNumber');
            }
            if (!header.canal) {
                throw new Error('Se requiere header.canal');
            }
            
            // Realizar la petición al endpoint sendmessage
            const response = await fetch('/api/services/sendmessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ header, parameters })
            });
            
            // Verificar respuesta
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status} al enviar mensaje`);
            }
            
            // Devolver la respuesta
            const result = await response.json();
            console.log('[ServiceApiClient] Mensaje enviado correctamente:', result);
            return result;
        } catch (error) {
            console.error('[ServiceApiClient] Error al enviar mensaje:', error);
            throw error;
        }
    },
    
    /**
     * Recibe y procesa un mensaje desde la API utilizando el endpoint /api/services/receivemessage
     * @param {Object} header - Objeto con los datos de la cabecera (serviceNumber, filterEmptyFields, etc.)
     * @param {Object} parameters - Objeto con el mensaje a procesar (returnMsg)
     * @returns {Promise<Object>} - Promesa que resuelve con la respuesta procesada
     */
    receiveMessage: async function(header, parameters) {
        console.log('[ServiceApiClient] Procesando mensaje con:', { 
            header, 
            parametersLength: parameters?.returnMsg?.length || 0
        });
        
        try {
            // Validar datos esenciales
            if (!header || !header.serviceNumber) {
                throw new Error('Se requiere header.serviceNumber');
            }
            if (!parameters || !parameters.returnMsg) {
                throw new Error('Se requiere parameters.returnMsg con el stream de datos');
            }
            
            // Realizar la petición al endpoint receivemessage
            const response = await fetch('/api/services/receivemessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ header, parameters })
            });
            
            // Verificar respuesta
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status} al procesar mensaje`);
            }
            
            // Devolver la respuesta procesada
            const result = await response.json();
            console.log('[ServiceApiClient] Mensaje procesado correctamente');
            return result;
        } catch (error) {
            console.error('[ServiceApiClient] Error al procesar mensaje:', error);
            throw error;
        }
    },
    
    /**
     * Obtiene un ejemplo de respuesta para un servicio específico
     * @param {string} serviceNumber - Número de servicio
     * @returns {Promise<string>} - Promesa que resuelve con el string de ejemplo generado
     */
    generateExampleResponse: async function(serviceNumber) {
        console.log(`[ServiceApiClient] Generando ejemplo para servicio ${serviceNumber}`);
        
        try {
            // Validar datos esenciales
            if (!serviceNumber) {
                throw new Error('Se requiere el número de servicio');
            }
            
            // Realizar la petición al endpoint generate-example-response
            const response = await fetch('/api/services/examples/generate-example-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ serviceNumber })
            });
            
            // Verificar respuesta
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status} al generar ejemplo`);
            }
            
            // Devolver el string de ejemplo
            const result = await response.json();
            console.log(`[ServiceApiClient] Ejemplo generado correctamente (${result.exampleResponseString?.length || 0} caracteres)`);
            return result.exampleResponseString;
        } catch (error) {
            console.error('[ServiceApiClient] Error al generar ejemplo:', error);
            throw error;
        }
    },
    
    /**
     * Obtiene la lista de servicios disponibles
     * @param {boolean} forceRefresh - Si es true, fuerza una actualización de la caché
     * @returns {Promise<Array>} - Promesa que resuelve con la lista de servicios
     */
    getServices: async function(forceRefresh = false) {
        console.log(`[ServiceApiClient] Obteniendo servicios${forceRefresh ? ' (forzando recarga)' : ''}`);
        
        try {
            // Determinar el endpoint según si se fuerza la recarga o no
            const endpoint = forceRefresh ? '/api/services/refresh' : '/api/services';
            
            // Realizar la petición
            const response = await fetch(endpoint);
            
            // Verificar respuesta
            if (!response.ok) {
                throw new Error(`Error ${response.status} al obtener servicios`);
            }
            
            // Obtener datos
            const data = await response.json();
            
            // Si se forzó la recarga, obtener la lista actualizada
            if (forceRefresh) {
                console.log(`[ServiceApiClient] Caché recargada, obteniendo lista actualizada`);
                return this.getServices(false);
            }
            
            console.log(`[ServiceApiClient] ${data.services?.length || 0} servicios obtenidos`);
            return data.services || [];
        } catch (error) {
            console.error('[ServiceApiClient] Error al obtener servicios:', error);
            throw error;
        }
    }
};

// Exportar para uso global
window.ServiceApiClient = ServiceApiClient;
