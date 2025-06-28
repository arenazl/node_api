/**
 * Theme Enforcer
 * 
 * Sistema de eventos global para la aplicación que permite que diferentes componentes 
 * se comuniquen entre sí sin acoplamiento directo.
 * 
 * Este sistema es útil para situaciones como la carga de archivos Excel, donde
 * múltiples componentes necesitan actualizarse (selectores, tablas, etc.)
 */

// Sistema de eventos global que usa EventManager local
const EventBus = {
    // Almacena los eventos y sus suscriptores
    events: {},
    
    // Inicializar sistema de eventos
    init: function() {
        try {
            console.log('Inicializando sistema de eventos locales...');
            
            // Verificar si EventManager está disponible
            if (typeof EventManager !== 'undefined') {
                console.log('EventManager disponible, configurando eventos...');
                
                // Suscribirse a eventos del servidor usando EventManager
                EventManager.on('file:uploaded', (data) => {
                    console.log('Evento file:uploaded recibido:', data);
                    this.publish(AppEvents.FILE_UPLOADED, data.data);
                });
                
                EventManager.on('services:refreshed', (data) => {
                    console.log('Evento services:refreshed recibido:', data);
                    this.publish(AppEvents.SERVICES_REFRESHED, data.data);
                });
                
                EventManager.on('config:saved', (data) => {
                    console.log('Evento config:saved recibido:', data);
                    this.publish(AppEvents.CONFIG_SAVED, data.data);
                });
                
                // Iniciar polling para eventos del servidor
                this.startServerEventPolling();
                
            } else {
                console.warn('EventManager no disponible, usando solo eventos locales');
            }
            
        } catch (error) {
            console.error('Error al inicializar sistema de eventos:', error);
            console.warn('Operando sin sistema de eventos - las actualizaciones automáticas podrían no funcionar correctamente');
        }
    },
    
    /**
     * Inicia el polling para eventos del servidor
     */
    startServerEventPolling: function() {
        // Polling para eventos de Excel
        setInterval(async () => {
            try {
                const response = await fetch('/excel/events/last');
                const data = await response.json();
                
                if (data.hasEvent && data.event) {
                    console.log('Evento del servidor recibido:', data.event);
                    
                    // Emitir evento local
                    if (typeof EventManager !== 'undefined') {
                        EventManager.emit(data.event.type, data.event.payload);
                    }
                }
            } catch (error) {
                // Silenciar errores de polling
            }
        }, 10000); // Cada 10 segundos
        
        // Polling para eventos de configuración
        setInterval(async () => {
            try {
                const response = await fetch('/service-config/events/last');
                const data = await response.json();
                
                if (data.hasEvent && data.event) {
                    console.log('Evento de configuración del servidor recibido:', data.event);
                    
                    // Emitir evento local
                    if (typeof EventManager !== 'undefined') {
                        EventManager.emit(data.event.type, data.event.payload);
                    }
                }
            } catch (error) {
                // Silenciar errores de polling
            }
        }, 10000); // Cada 10 segundos
    },
    
    /**
     * Suscribe una función a un evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a ejecutar cuando ocurra el evento
     * @returns {Object} - Objeto con método para cancelar la suscripción
     */
    subscribe: function(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        
        // Añadir callback a la lista de suscriptores
        this.events[eventName].push(callback);
        
        // Devolver un objeto con método para cancelar la suscripción
        return {
            unsubscribe: () => {
                this.events[eventName] = this.events[eventName].filter(
                    eventCallback => callback !== eventCallback
                );
            }
        };
    },
    
    /**
     * Publica un evento para todos los suscriptores
     * @param {string} eventName - Nombre del evento
     * @param {any} data - Datos a pasar a los suscriptores
     */
    publish: function(eventName, data) {
        if (!this.events[eventName]) {
            return;
        }
        
        console.log(`Publicando evento: ${eventName}`, data);
        
        // Notificar a todos los suscriptores
        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error en suscriptor del evento ${eventName}:`, error);
            }
        });
        
        // También emitir usando EventManager si está disponible
        if (typeof EventManager !== 'undefined') {
            EventManager.emit(eventName, data);
        }
    }
};

// Definición de los eventos de la aplicación
const AppEvents = {
    // Eventos de carga de archivos
    FILE_UPLOADED: 'file:uploaded',           // Cuando se carga un nuevo archivo Excel
    STRUCTURE_LOADED: 'structure:loaded',     // Cuando se carga una estructura
    
    // Eventos de servicios
    SERVICES_REFRESHED: 'services:refreshed', // Cuando se actualiza la lista de servicios
    SERVICE_SELECTED: 'service:selected',     // Cuando se selecciona un servicio
    
    // Eventos de configuración
    CONFIG_SAVED: 'config:saved',             // Cuando se guarda una configuración
    CONFIG_LOADED: 'config:loaded'            // Cuando se carga una configuración
};

// Exportar las variables
window.EventBus = EventBus;
window.AppEvents = AppEvents;

// Inicializar EventBus cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el sistema de eventos
    EventBus.init();
});
