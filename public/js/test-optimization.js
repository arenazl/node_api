/**
 * Test de Optimización
 * 
 * Script para verificar que las optimizaciones implementadas funcionan correctamente
 */

const OptimizationTest = {
    /**
     * Ejecuta todas las pruebas
     */
    async runAllTests() {
        console.group('🧪 PRUEBAS DE OPTIMIZACIÓN');
        
        try {
            await this.testServicesCache();
            await this.testEventManager();
            await this.testApiClient();
            await this.testEventBus();
            
            console.log('✅ Todas las pruebas pasaron correctamente');
        } catch (error) {
            console.error('❌ Error en las pruebas:', error);
        }
        
        console.groupEnd();
    },

    /**
     * Prueba el caché de servicios
     */
    async testServicesCache() {
        console.log('📋 Probando ServicesCache...');
        
        if (typeof ServicesCache === 'undefined') {
            throw new Error('ServicesCache no está disponible');
        }
        
        // Verificar estado inicial
        const initialInfo = ServicesCache.getCacheInfo();
        console.log('Estado inicial del caché:', initialInfo);
        
        // Cargar servicios
        const services = await ServicesCache.getServices();
        console.log(`Servicios cargados: ${services.length}`);
        
        // Verificar que se cacheó
        const cachedInfo = ServicesCache.getCacheInfo();
        console.log('Estado después de cargar:', cachedInfo);
        
        if (!cachedInfo.hasData) {
            throw new Error('El caché no se actualizó correctamente');
        }
        
        // Cargar de nuevo (debería usar caché)
        const services2 = await ServicesCache.getServices();
        console.log(`Segunda carga (caché): ${services2.length}`);
        
        console.log('✅ ServicesCache funciona correctamente');
    },

    /**
     * Prueba el EventManager
     */
    async testEventManager() {
        console.log('📡 Probando EventManager...');
        
        if (typeof EventManager === 'undefined') {
            throw new Error('EventManager no está disponible');
        }
        
        // Verificar estado
        const status = EventManager.getStatus();
        console.log('Estado del EventManager:', status);
        
        if (!status.isInitialized) {
            throw new Error('EventManager no está inicializado');
        }
        
        // Probar emisión de evento
        let eventReceived = false;
        EventManager.on('test:event', (data) => {
            console.log('Evento recibido:', data);
            eventReceived = true;
        });
        
        EventManager.emit('test:event', { message: 'Test event' });
        
        // Esperar un poco para que el evento se procese
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!eventReceived) {
            throw new Error('El evento no se recibió correctamente');
        }
        
        console.log('✅ EventManager funciona correctamente');
    },

    /**
     * Prueba el ServiceApiClient
     */
    async testApiClient() {
        console.log('🔌 Probando ServiceApiClient...');
        
        if (typeof ServiceApiClient === 'undefined') {
            throw new Error('ServiceApiClient no está disponible');
        }
        
        // Probar obtención de servicios
        const services = await ServiceApiClient.getServices();
        console.log(`Servicios obtenidos via API Client: ${services.length}`);
        
        if (!Array.isArray(services)) {
            throw new Error('ServiceApiClient no devolvió un array de servicios');
        }
        
        console.log('✅ ServiceApiClient funciona correctamente');
    },

    /**
     * Prueba el EventBus
     */
    async testEventBus() {
        console.log('🚌 Probando EventBus...');
        
        if (typeof EventBus === 'undefined') {
            throw new Error('EventBus no está disponible');
        }
        
        // Probar suscripción y publicación
        let eventReceived = false;
        const subscription = EventBus.subscribe('test:eventbus', (data) => {
            console.log('EventBus recibió evento:', data);
            eventReceived = true;
        });
        
        EventBus.publish('test:eventbus', { message: 'Test EventBus' });
        
        // Esperar un poco para que el evento se procese
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!eventReceived) {
            throw new Error('EventBus no recibió el evento correctamente');
        }
        
        // Limpiar suscripción
        subscription.unsubscribe();
        
        console.log('✅ EventBus funciona correctamente');
    },

    /**
     * Muestra estadísticas de rendimiento
     */
    showPerformanceStats() {
        console.group('📊 ESTADÍSTICAS DE RENDIMIENTO');
        
        // Información del caché
        if (typeof ServicesCache !== 'undefined') {
            const cacheInfo = ServicesCache.getCacheInfo();
            console.log('Caché de Servicios:', cacheInfo);
        }
        
        // Información del EventManager
        if (typeof EventManager !== 'undefined') {
            const eventStatus = EventManager.getStatus();
            console.log('EventManager:', eventStatus);
        }
        
        // Verificar que Socket.IO no está presente
        if (typeof io !== 'undefined') {
            console.warn('⚠️ Socket.IO aún está presente (debería haberse removido)');
        } else {
            console.log('✅ Socket.IO removido correctamente');
        }
        
        console.groupEnd();
    }
};

// Función global para ejecutar las pruebas
window.runOptimizationTests = function() {
    OptimizationTest.runAllTests().then(() => {
        OptimizationTest.showPerformanceStats();
    });
};

// Ejecutar pruebas automáticamente después de un delay
setTimeout(() => {
    if (typeof ServicesCache !== 'undefined' && typeof EventManager !== 'undefined') {
        console.log('🚀 Ejecutando pruebas de optimización automáticamente...');
        OptimizationTest.runAllTests().then(() => {
            OptimizationTest.showPerformanceStats();
        });
    }
}, 2000);

console.log('🧪 Script de pruebas de optimización cargado. Ejecuta runOptimizationTests() para pruebas manuales.'); 