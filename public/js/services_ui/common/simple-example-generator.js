/**
 * Simple Example Generator
 * 
 * Este módulo proporciona funcionalidades para generar ejemplos simples
 * de servicios MQ para pruebas y demostración.
 */

// Función para generar un ejemplo simple basado en el número de servicio
window.generateSimpleExample = async function(serviceNumber) {
    try {
        console.log('[Simple Example Generator] Generando ejemplo para servicio:', serviceNumber);
        
        if (!serviceNumber) {
            throw new Error('Se requiere un número de servicio');
        }
        
        // Construir la URL para el endpoint de generación de ejemplos
        const url = `/api/services/examples/generate-example-response`;
        
        // Enviar la solicitud
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ serviceNumber })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }
        
        // Procesar la respuesta
        const data = await response.json();
        
        if (!data || !data.exampleResponseString) {
            throw new Error('El servidor no devolvió un ejemplo válido');
        }
        
        console.log('[Simple Example Generator] Ejemplo generado correctamente');
        return data.exampleResponseString;
        
    } catch (error) {
        console.error('[Simple Example Generator] Error:', error);
        
        // Mostrar notificación de error si está disponible la utilidad
        if (window.ConfigUtils && window.ConfigUtils.showNotification) {
            window.ConfigUtils.showNotification(`Error al generar ejemplo: ${error.message}`, 'error');
        }
        
        throw error;
    }
};

// Exportar la función en Node.js (si se usa en un entorno Node)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateSimpleExample: window.generateSimpleExample
    };
}
