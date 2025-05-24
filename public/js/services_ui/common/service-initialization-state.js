/**
 * Service Initialization State
 * 
 * Este módulo mantiene el estado de inicialización compartido entre diferentes
 * componentes para evitar inicializaciones duplicadas de manejadores de servicios.
 */

// Objeto global para rastrear el estado de inicialización
window.ServiceInitializationState = {
    idaHandlersInitialized: false,
    vueltaHandlersInitialized: false,
    
    // Métodos para gestionar el estado
    setIdaInitialized: function() {
        this.idaHandlersInitialized = true;
        console.log('[ServiceInitialization] Manejadores IDA marcados como inicializados');
    },
    
    setVueltaInitialized: function() {
        this.vueltaHandlersInitialized = true;
        console.log('[ServiceInitialization] Manejadores VUELTA marcados como inicializados');
    },
    
    isIdaInitialized: function() {
        return this.idaHandlersInitialized;
    },
    
    isVueltaInitialized: function() {
        return this.vueltaHandlersInitialized;
    }
};

console.log('[ServiceInitialization] Estado de inicialización de servicios configurado');
