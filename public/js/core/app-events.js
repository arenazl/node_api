/**
 * Sistema centralizado de eventos para la aplicación
 * Permite la comunicación entre componentes sin acoplarlos directamente
 */

// Crear el objeto EventBus si no existe
window.EventBus = window.EventBus || {
    events: {},
    
    // Suscribirse a un evento
    subscribe: function(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        return { unsubscribe: () => this.unsubscribe(event, callback) };
    },
    
    // Cancelar suscripción
    unsubscribe: function(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    },
    
    // Publicar un evento
    publish: function(event, data) {
        console.log(`[EventBus] Evento publicado: ${event}`, data);
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error en manejador de ${event}:`, error);
                }
            });
        }
    }
};

// Definir los tipos de eventos disponibles
window.AppEvents = {
    // Eventos existentes
    FILE_UPLOADED: 'file:uploaded',
    SERVICES_REFRESHED: 'services:refreshed',
    
    // Nuevos eventos para la sincronización entre pestañas
    CONFIG_SAVED: 'config:saved',           // Nueva configuración guardada
    CONFIG_UPDATED: 'config:updated',       // Configuración actualizada
    CONFIG_DELETED: 'config:deleted',       // Configuración eliminada
    CONFIG_LIST_CHANGED: 'config:list_changed' // Lista de configuraciones modificada
};
