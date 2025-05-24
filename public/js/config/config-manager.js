/**
 * Gestor de configuraciones
 * Maneja las operaciones de carga, guardado y manipulación de configuraciones
 */

// Clase para gestionar configuraciones
class ConfigManager {
    constructor() {
        this.configs = {};
        this.currentService = null;
        this.isLoading = false;
    }
    
    /**
     * Inicializa el gestor de configuraciones
     */
    init() {
        console.log('[ConfigManager] Inicializando gestor de configuraciones');
        // Escuchar eventos de actualización de servicios
        if (window.EventBus && window.AppEvents) {
            window.EventBus.subscribe(window.AppEvents.SERVICES_REFRESHED, this.handleServicesRefreshed.bind(this));
            console.log('[ConfigManager] Suscrito a eventos de actualización de servicios');
        }
    }
    
    /**
     * Maneja el evento de actualización de servicios
     * @param {Object} data - Datos del evento
     */
    handleServicesRefreshed(data) {
        console.log('[ConfigManager] Servicios actualizados:', data);
        // Si hay un servicio actual, intentar recargar su configuración
        if (this.currentService) {
            this.loadConfig(this.currentService);
        }
    }
    
    /**
     * Carga la configuración para un número de servicio
     * @param {string} serviceNumber - Número de servicio
     * @param {boolean} forceReload - Si es true, fuerza la recarga incluso si ya está cargada
     * @returns {Promise<Object>} - Promesa que resuelve con la configuración cargada
     */
    async loadConfig(serviceNumber, forceReload = false) {
        if (!serviceNumber) {
            console.warn('[ConfigManager] No se proporcionó número de servicio');
            return null;
        }
        
        // Si ya tenemos esta configuración y no se fuerza la recarga, devolverla
        if (!forceReload && this.configs[serviceNumber]) {
            console.log(`[ConfigManager] Usando configuración en caché para servicio ${serviceNumber}`);
            this.currentService = serviceNumber;
            return this.configs[serviceNumber];
        }
        
        try {
            this.isLoading = true;
            
            // Notificar inicio de carga
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Cargando configuración para servicio ${serviceNumber}...`, 'info');
            }
            
            // Realizar la petición a la API
            const response = await fetch(`/api/config/service/${serviceNumber}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status} al cargar configuración`);
            }
            
            // Procesar la respuesta
            const config = await response.json();
            
            // Almacenar en caché
            this.configs[serviceNumber] = config;
            this.currentService = serviceNumber;
            
            console.log(`[ConfigManager] Configuración cargada para servicio ${serviceNumber}:`, config);
            
            // Notificar éxito
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Configuración cargada para servicio ${serviceNumber}`, 'success');
            }
            
            // Publicar evento de configuración cargada
            if (window.EventBus && window.AppEvents) {
                window.EventBus.publish(window.AppEvents.CONFIG_LOADED, {
                    serviceNumber,
                    config,
                    timestamp: new Date().toISOString()
                });
            }
            
            return config;
        } catch (error) {
            console.error(`[ConfigManager] Error al cargar configuración para servicio ${serviceNumber}:`, error);
            
            // Notificar error
            if (typeof ConfigUtils !== 'undefined') {
                const errorMsg = error && error.message ? error.message : 'Error desconocido';
                ConfigUtils.showNotification(`Error al cargar configuración: ${errorMsg}`, 'error');
            }
            
            return null;
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Guarda la configuración para un servicio
     * @param {string} serviceNumber - Número de servicio
     * @param {Object} config - Configuración a guardar
     * @returns {Promise<boolean>} - Promesa que resuelve con true si se guardó correctamente
     */
    async saveConfig(serviceNumber, config) {
        if (!serviceNumber || !config) {
            console.warn('[ConfigManager] No se proporcionó número de servicio o configuración');
            return false;
        }
        
        try {
            // Notificar inicio de guardado
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Guardando configuración para servicio ${serviceNumber}...`, 'info');
            }
            
            // Realizar la petición a la API
            const response = await fetch(`/api/config/service/${serviceNumber}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status} al guardar configuración`);
            }
            
            // Procesar la respuesta
            const result = await response.json();
            
            // Actualizar la caché
            this.configs[serviceNumber] = config;
            
            console.log(`[ConfigManager] Configuración guardada para servicio ${serviceNumber}:`, result);
            
            // Notificar éxito
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Configuración guardada para servicio ${serviceNumber}`, 'success');
            }
            
            // Publicar evento de configuración guardada
            if (window.EventBus && window.AppEvents) {
                window.EventBus.publish(window.AppEvents.CONFIG_SAVED, {
                    serviceNumber,
                    config,
                    timestamp: new Date().toISOString()
                });
            }
            
            return true;
        } catch (error) {
            console.error(`[ConfigManager] Error al guardar configuración para servicio ${serviceNumber}:`, error);
            
            // Notificar error
            if (typeof ConfigUtils !== 'undefined') {
                const errorMsg = error && error.message ? error.message : 'Error desconocido';
                ConfigUtils.showNotification(`Error al guardar configuración: ${errorMsg}`, 'error');
            }
            
            return false;
        }
    }
    
    /**
     * Obtiene la configuración actual para el servicio especificado
     * @param {string} serviceNumber - Número de servicio (opcional, si no se especifica se usa el actual)
     * @returns {Object|null} - Configuración del servicio o null si no existe
     */
    getConfig(serviceNumber = null) {
        const svcNumber = serviceNumber || this.currentService;
        
        if (!svcNumber) {
            console.warn('[ConfigManager] No hay servicio actual seleccionado');
            return null;
        }
        
        return this.configs[svcNumber] || null;
    }
    
    /**
     * Comprueba si existe configuración para un servicio
     * @param {string} serviceNumber - Número de servicio
     * @returns {boolean} - true si existe configuración, false en caso contrario
     */
    hasConfig(serviceNumber) {
        return !!this.configs[serviceNumber];
    }
}

// Crear instancia global del gestor de configuraciones
const configManager = new ConfigManager();

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    configManager.init();
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.configManager = configManager;
    window.ConfigManager = ConfigManager; // Also export the class itself
    console.log('[ConfigManager] Exportado exitosamente al objeto window');
} else {
    console.warn('[ConfigManager] No se pudo exportar al objeto window (entorno sin ventana)');
}
