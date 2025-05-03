/**
 * Theme Enforcer
 * 
 * Sistema de eventos global para la aplicación que permite que diferentes componentes 
 * se comuniquen entre sí sin acoplamiento directo.
 * 
 * Este sistema es útil para situaciones como la carga de archivos Excel, donde
 * múltiples componentes necesitan actualizarse (selectores, tablas, etc.)
 */

// Sistema de eventos global que combina WebSockets con eventos locales
const EventBus = {
    // Almacena los eventos y sus suscriptores
    events: {},
    socket: null,
    
    // Inicializar conexión Socket.IO
    init: function() {
        try {
            // Si ya tenemos un socket, no crear otro
            if (this.socket) return;
            
            console.log('Inicializando conexión Socket.IO para eventos en tiempo real...');
            
            // Conectar al servidor Socket.IO
            this.socket = io();
            
            // Configurar eventos de Socket.IO
            this.socket.on('connect', () => {
                console.log(`Conexión WebSocket establecida. ID: ${this.socket.id}`);
                
                // Suscribirse a eventos del servidor
                this.socket.on('file:uploaded', (data) => {
                    console.log('Evento file:uploaded recibido desde el servidor:', data);
                    this.publish(AppEvents.FILE_UPLOADED, data);
                });
                
                this.socket.on('services:refreshed', (data) => {
                    console.log('Evento services:refreshed recibido desde el servidor:', data);
                    this.publish(AppEvents.SERVICES_REFRESHED, data);
                });
            });
            
            this.socket.on('connect_error', (error) => {
                console.warn('Error de conexión Socket.IO:', error);
                console.warn('Las actualizaciones automáticas podrían no funcionar correctamente');
            });
            
            this.socket.on('disconnect', (reason) => {
                console.warn(`Desconexión Socket.IO: ${reason}`);
            });
            
        } catch (error) {
            console.error('Error al inicializar Socket.IO:', error);
            console.warn('Operando sin Socket.IO - las actualizaciones automáticas podrían no funcionar correctamente');
        }
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
        
        // Notificar a todos los suscriptores
        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error en suscriptor del evento ${eventName}:`, error);
            }
        });
        
        // Si estamos solicitando refresh de servicios, enviarlo también por socket
        if (eventName === AppEvents.SERVICES_REFRESHED && this.socket && this.socket.connected) {
            console.log('Enviando solicitud de actualización al servidor vía Socket.IO');
            this.socket.emit('refresh:services', { timestamp: new Date().toISOString() });
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
    // Inicializar la conexión Socket.IO
    EventBus.init();
});
