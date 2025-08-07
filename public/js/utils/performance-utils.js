/**
 * Performance Utilities
 * Funciones para optimizar el rendimiento y evitar llamadas duplicadas
 */

window.PerformanceUtils = {
    /**
     * Crea una función debounced que retrasa la ejecución hasta que pase el tiempo especificado
     * sin nuevas llamadas
     * @param {Function} func - Función a ejecutar
     * @param {number} wait - Tiempo de espera en milisegundos
     * @returns {Function} Función debounced
     */
    debounce: function(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Crea una función throttled que limita las llamadas a una vez por periodo
     * @param {Function} func - Función a ejecutar
     * @param {number} limit - Tiempo límite en milisegundos
     * @returns {Function} Función throttled
     */
    throttle: function(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Cache de resultados para evitar llamadas duplicadas
     */
    resultCache: new Map(),
    
    /**
     * Ejecuta una función con cache, evitando llamadas duplicadas
     * @param {string} key - Clave única para el cache
     * @param {Function} func - Función a ejecutar
     * @param {number} ttl - Tiempo de vida del cache en milisegundos (default: 5 minutos)
     * @returns {Promise} Resultado cacheado o nuevo
     */
    cachedExecute: async function(key, func, ttl = 300000) {
        const cached = this.resultCache.get(key);
        
        if (cached && Date.now() - cached.timestamp < ttl) {
            console.log(`[PerformanceUtils] Usando cache para: ${key}`);
            return cached.data;
        }
        
        console.log(`[PerformanceUtils] Ejecutando y cacheando: ${key}`);
        const result = await func();
        
        this.resultCache.set(key, {
            data: result,
            timestamp: Date.now()
        });
        
        return result;
    },

    /**
     * Limpia el cache completo o una clave específica
     * @param {string} key - Clave a limpiar (opcional)
     */
    clearCache: function(key) {
        if (key) {
            this.resultCache.delete(key);
        } else {
            this.resultCache.clear();
        }
    },

    /**
     * Previene múltiples llamadas simultáneas a la misma función
     */
    pendingRequests: new Map(),
    
    /**
     * Ejecuta una función evitando llamadas simultáneas duplicadas
     * @param {string} key - Clave única para la operación
     * @param {Function} func - Función a ejecutar (debe retornar una promesa)
     * @returns {Promise} Resultado de la función
     */
    singleFlight: async function(key, func) {
        // Si ya hay una petición en curso para esta clave, devolver esa promesa
        if (this.pendingRequests.has(key)) {
            console.log(`[PerformanceUtils] Reutilizando petición en curso para: ${key}`);
            return this.pendingRequests.get(key);
        }
        
        // Crear nueva promesa y almacenarla
        const promise = func().finally(() => {
            // Limpiar la promesa cuando termine
            this.pendingRequests.delete(key);
        });
        
        this.pendingRequests.set(key, promise);
        return promise;
    },

    /**
     * Agrupa múltiples llamadas en una sola operación batch
     */
    batchQueues: new Map(),
    
    /**
     * Ejecuta operaciones en batch después de un delay
     * @param {string} key - Clave del batch
     * @param {any} item - Item a agregar al batch
     * @param {Function} batchProcessor - Función que procesa el batch completo
     * @param {number} delay - Delay antes de procesar (ms)
     * @returns {Promise} Promesa que se resuelve cuando el batch se procesa
     */
    batch: function(key, item, batchProcessor, delay = 100) {
        if (!this.batchQueues.has(key)) {
            this.batchQueues.set(key, {
                items: [],
                promises: [],
                timeout: null
            });
        }
        
        const queue = this.batchQueues.get(key);
        queue.items.push(item);
        
        return new Promise((resolve, reject) => {
            queue.promises.push({ resolve, reject });
            
            // Cancelar timeout anterior si existe
            if (queue.timeout) {
                clearTimeout(queue.timeout);
            }
            
            // Programar procesamiento del batch
            queue.timeout = setTimeout(async () => {
                const items = [...queue.items];
                const promises = [...queue.promises];
                
                // Limpiar la cola
                queue.items = [];
                queue.promises = [];
                queue.timeout = null;
                
                try {
                    console.log(`[PerformanceUtils] Procesando batch de ${items.length} items para: ${key}`);
                    const results = await batchProcessor(items);
                    
                    // Resolver todas las promesas
                    promises.forEach((p, i) => p.resolve(results[i] || results));
                } catch (error) {
                    // Rechazar todas las promesas
                    promises.forEach(p => p.reject(error));
                }
            }, delay);
        });
    }
};

// Hacer las funciones disponibles globalmente
window.debounce = window.PerformanceUtils.debounce;
window.throttle = window.PerformanceUtils.throttle;

console.log('[PerformanceUtils] Utilidades de rendimiento cargadas');