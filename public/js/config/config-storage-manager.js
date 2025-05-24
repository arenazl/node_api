/**
 * Configuration Storage Manager - Compatibility Layer
 * 
 * Este archivo es una capa de compatibilidad que redirige todas las llamadas
 * a ConfigStorageManager hacia el módulo ConfigStorage.
 * Se añade para resolver problemas de referencia en el código existente.
 */

// Verificar si ConfigStorage ya está cargado
if (typeof ConfigStorage === 'undefined') {
    console.error('[Compatibility] ConfigStorage no está disponible - las funciones de ConfigStorageManager no funcionarán');
}

// Crear alias para compatibilidad
const ConfigStorageManager = typeof ConfigStorage !== 'undefined' ? ConfigStorage : {
    // Implementación de respaldo si ConfigStorage no existe
    loadSavedConfigurations: function(serviceNumber, onLoadCallback) {
        console.error('[Compatibility] ConfigStorage no está disponible para cargar configuraciones');
        if (typeof onLoadCallback === 'function') {
            onLoadCallback([]);
        }
    },
    
    loadSavedConfiguration: function(configId, onLoadCallback) {
        console.error('[Compatibility] ConfigStorage no está disponible para cargar configuración');
        if (typeof onLoadCallback === 'function') {
            onLoadCallback(null, 'ConfigStorage no está disponible');
        }
    },
    
    saveConfiguration: function(serviceNumber, serviceName, canal, version, header, request, onSuccess, onError) {
        console.error('[Compatibility] ConfigStorage no está disponible para guardar configuración');
        if (typeof onError === 'function') {
            onError('ConfigStorage no está disponible');
        }
    }
};

console.log('[Compatibility] ConfigStorageManager initialized as compatibility layer for ConfigStorage');
