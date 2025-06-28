/**
 * Event Manager
 * 
 * Sistema de eventos locales para reemplazar Socket.IO
 * Usa CustomEvent para comunicación local y localStorage events para sincronización entre pestañas
 */

const EventManager = {
    // Configuración
    config: {
        localStorageKey: 'mq_importer_events',
        pollingInterval: 30000, // 30 segundos
        maxEventAge: 60000 // 1 minuto
    },

    // Estado interno
    state: {
        isInitialized: false,
        lastEventId: 0,
        listeners: new Map(),
        pollingTimer: null
    },

    /**
     * Inicializa el sistema de eventos
     */
    init() {
        if (this.state.isInitialized) {
            console.log('[EventManager] Ya inicializado');
            return;
        }

        console.log('[EventManager] Inicializando sistema de eventos locales');
        
        // Configurar listener para eventos de localStorage
        window.addEventListener('storage', this.handleStorageEvent.bind(this));
        
        // Iniciar polling para sincronización entre pestañas
        this.startPolling();
        
        this.state.isInitialized = true;
        console.log('[EventManager] Sistema de eventos inicializado');
    },

    /**
     * Emite un evento local
     * @param {string} eventName - Nombre del evento
     * @param {any} data - Datos del evento
     */
    emit(eventName, data = {}) {
        console.log(`[EventManager] Emitiendo evento local: ${eventName}`, data);
        
        // Crear y despachar CustomEvent
        const event = new CustomEvent(eventName, {
            detail: {
                id: ++this.state.lastEventId,
                timestamp: Date.now(),
                data: data
            }
        });
        
        window.dispatchEvent(event);
        
        // También guardar en localStorage para sincronización entre pestañas
        this.saveToLocalStorage(eventName, data);
    },

    /**
     * Escucha un evento local
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a ejecutar cuando ocurra el evento
     */
    on(eventName, callback) {
        if (!this.state.listeners.has(eventName)) {
            this.state.listeners.set(eventName, []);
        }
        
        this.state.listeners.get(eventName).push(callback);
        
        // Configurar listener del DOM
        window.addEventListener(eventName, (event) => {
            callback(event.detail);
        });
        
        console.log(`[EventManager] Listener registrado para: ${eventName}`);
    },

    /**
     * Remueve un listener de evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a remover
     */
    off(eventName, callback) {
        if (this.state.listeners.has(eventName)) {
            const listeners = this.state.listeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
                window.removeEventListener(eventName, callback);
                console.log(`[EventManager] Listener removido para: ${eventName}`);
            }
        }
    },

    /**
     * Guarda un evento en localStorage para sincronización entre pestañas
     * @param {string} eventName - Nombre del evento
     * @param {any} data - Datos del evento
     */
    saveToLocalStorage(eventName, data) {
        try {
            const eventData = {
                id: ++this.state.lastEventId,
                name: eventName,
                data: data,
                timestamp: Date.now(),
                tabId: this.getTabId()
            };
            
            localStorage.setItem(this.config.localStorageKey, JSON.stringify(eventData));
            
            // Trigger storage event para otras pestañas
            window.dispatchEvent(new StorageEvent('storage', {
                key: this.config.localStorageKey,
                newValue: JSON.stringify(eventData)
            }));
            
        } catch (error) {
            console.error('[EventManager] Error al guardar en localStorage:', error);
        }
    },

    /**
     * Maneja eventos de localStorage para sincronización entre pestañas
     * @param {StorageEvent} event - Evento de storage
     */
    handleStorageEvent(event) {
        if (event.key !== this.config.localStorageKey || !event.newValue) {
            return;
        }
        
        try {
            const eventData = JSON.parse(event.newValue);
            
            // Ignorar eventos muy antiguos
            if (Date.now() - eventData.timestamp > this.config.maxEventAge) {
                return;
            }
            
            // Ignorar eventos de la misma pestaña
            if (eventData.tabId === this.getTabId()) {
                return;
            }
            
            console.log(`[EventManager] Evento recibido de otra pestaña: ${eventData.name}`, eventData.data);
            
            // Emitir evento local
            const customEvent = new CustomEvent(eventData.name, {
                detail: {
                    id: eventData.id,
                    timestamp: eventData.timestamp,
                    data: eventData.data,
                    fromOtherTab: true
                }
            });
            
            window.dispatchEvent(customEvent);
            
        } catch (error) {
            console.error('[EventManager] Error al procesar evento de localStorage:', error);
        }
    },

    /**
     * Inicia el polling para sincronización
     */
    startPolling() {
        if (this.state.pollingTimer) {
            clearInterval(this.state.pollingTimer);
        }
        
        this.state.pollingTimer = setInterval(() => {
            this.checkForUpdates();
        }, this.config.pollingInterval);
        
        console.log(`[EventManager] Polling iniciado cada ${this.config.pollingInterval}ms`);
    },

    /**
     * Detiene el polling
     */
    stopPolling() {
        if (this.state.pollingTimer) {
            clearInterval(this.state.pollingTimer);
            this.state.pollingTimer = null;
            console.log('[EventManager] Polling detenido');
        }
    },

    /**
     * Verifica actualizaciones desde localStorage
     */
    checkForUpdates() {
        try {
            const stored = localStorage.getItem(this.config.localStorageKey);
            if (stored) {
                const eventData = JSON.parse(stored);
                
                // Solo procesar si es reciente y de otra pestaña
                if (Date.now() - eventData.timestamp < this.config.maxEventAge && 
                    eventData.tabId !== this.getTabId()) {
                    this.handleStorageEvent({
                        key: this.config.localStorageKey,
                        newValue: stored
                    });
                }
            }
        } catch (error) {
            console.error('[EventManager] Error en polling:', error);
        }
    },

    /**
     * Genera un ID único para la pestaña actual
     * @returns {string}
     */
    getTabId() {
        if (!this.state.tabId) {
            this.state.tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        return this.state.tabId;
    },

    /**
     * Limpia eventos antiguos del localStorage
     */
    cleanupOldEvents() {
        try {
            const stored = localStorage.getItem(this.config.localStorageKey);
            if (stored) {
                const eventData = JSON.parse(stored);
                if (Date.now() - eventData.timestamp > this.config.maxEventAge) {
                    localStorage.removeItem(this.config.localStorageKey);
                    console.log('[EventManager] Eventos antiguos limpiados');
                }
            }
        } catch (error) {
            console.error('[EventManager] Error al limpiar eventos:', error);
        }
    },

    /**
     * Obtiene información del estado del sistema de eventos
     * @returns {Object}
     */
    getStatus() {
        return {
            isInitialized: this.state.isInitialized,
            listenersCount: this.state.listeners.size,
            pollingActive: !!this.state.pollingTimer,
            tabId: this.getTabId()
        };
    }
};

// Inicializar automáticamente cuando se carga el script
document.addEventListener('DOMContentLoaded', () => {
    EventManager.init();
});

// Limpiar al cerrar la pestaña
window.addEventListener('beforeunload', () => {
    EventManager.stopPolling();
});

// Exportar para uso global
window.EventManager = EventManager; 