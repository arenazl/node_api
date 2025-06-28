/**
 * Services Cache Manager
 * 
 * Módulo centralizado para gestionar el caché de servicios y evitar
 * múltiples llamadas innecesarias a la API
 */

const ServicesCache = {
    // Estado del caché
    cache: {
        services: null,
        lastUpdate: null,
        isLoading: false,
        listeners: []
    },

    // Configuración
    config: {
        cacheTimeout: 5 * 60 * 1000, // 5 minutos
        maxRetries: 3,
        retryDelay: 1000 // 1 segundo
    },

    /**
     * Obtiene los servicios del caché o de la API si es necesario
     * @param {boolean} forceRefresh - Si es true, fuerza una actualización
     * @returns {Promise<Array>} Lista de servicios
     */
    async getServices(forceRefresh = false) {
        // Si ya se está cargando, esperar
        if (this.cache.isLoading && !forceRefresh) {
            return new Promise((resolve, reject) => {
                this.cache.listeners.push({ resolve, reject });
            });
        }

        // Verificar si el caché es válido
        if (!forceRefresh && this.isCacheValid()) {
            console.log('[ServicesCache] Usando caché existente:', this.cache.services.length, 'servicios');
            return this.cache.services;
        }

        // Cargar desde la API
        return this.loadFromAPI(forceRefresh);
    },

    /**
     * Verifica si el caché es válido
     * @returns {boolean}
     */
    isCacheValid() {
        return this.cache.services && 
               this.cache.lastUpdate && 
               (Date.now() - new Date(this.cache.lastUpdate).getTime()) < this.config.cacheTimeout;
    },

    /**
     * Carga los servicios desde la API
     * @param {boolean} forceRefresh - Si es true, fuerza recarga del servidor
     * @returns {Promise<Array>}
     */
    async loadFromAPI(forceRefresh = false) {
        this.cache.isLoading = true;
        console.log(`[ServicesCache] Cargando servicios desde API${forceRefresh ? ' (forzando recarga)' : ''}`);

        try {
            const endpoint = forceRefresh ? '/api/services/refresh' : '/api/services';
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status} al obtener servicios`);
            }

            const data = await response.json();
            const services = data.services || [];

            // Actualizar caché
            this.cache.services = services;
            this.cache.lastUpdate = new Date().toISOString();
            this.cache.isLoading = false;

            console.log(`[ServicesCache] ${services.length} servicios cargados y cacheados`);

            // Notificar a los listeners pendientes
            this.notifyListeners(services);

            // Si se forzó la recarga, obtener la lista actualizada
            if (forceRefresh) {
                return this.getServices(false);
            }

            return services;

        } catch (error) {
            this.cache.isLoading = false;
            console.error('[ServicesCache] Error al cargar servicios:', error);
            
            // Notificar error a los listeners
            this.notifyListeners(null, error);
            
            throw error;
        }
    },

    /**
     * Notifica a todos los listeners pendientes
     * @param {Array} services - Servicios cargados
     * @param {Error} error - Error si ocurrió alguno
     */
    notifyListeners(services, error = null) {
        while (this.cache.listeners.length > 0) {
            const listener = this.cache.listeners.shift();
            if (error) {
                listener.reject(error);
            } else {
                listener.resolve(services);
            }
        }
    },

    /**
     * Limpia el caché
     */
    clearCache() {
        this.cache.services = null;
        this.cache.lastUpdate = null;
        this.cache.isLoading = false;
        console.log('[ServicesCache] Caché limpiado');
    },

    /**
     * Obtiene información del estado del caché
     * @returns {Object}
     */
    getCacheInfo() {
        return {
            hasData: !!this.cache.services,
            lastUpdate: this.cache.lastUpdate,
            isLoading: this.cache.isLoading,
            cacheAge: this.cache.lastUpdate ? 
                Date.now() - new Date(this.cache.lastUpdate).getTime() : null,
            isValid: this.isCacheValid()
        };
    }
};

// Exportar para uso global
window.ServicesCache = ServicesCache; 