/**
 * Script de inicialización para la documentación de API
 * 
 * Este script se asegura de que todos los componentes de la documentación
 * se inicialicen correctamente y en el orden adecuado
 */

// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando sistema de documentación de API...');
    
    // Verificar si el objeto ApiDocumentation existe
    if (typeof ApiDocumentation === 'undefined') {
        console.error('ERROR: El objeto ApiDocumentation no está definido. Verifique que api-documentation.js se cargue correctamente.');
        
        // Crear un objeto ApiDocumentation de respaldo para evitar errores
        window.ApiDocumentation = {
            init: function() {
                console.warn('Usando inicialización de respaldo para ApiDocumentation.');
                
                // Mostrar mensaje de error en el contenedor de documentación
                const apiContainer = document.getElementById('apiDocumentation');
                if (apiContainer) {
                    apiContainer.innerHTML = `
                        <div class="error-message" style="color: #ef4444; padding: 20px; text-align: center;">
                            <h3>Error al cargar la documentación de API</h3>
                            <p>No se pudo cargar correctamente el componente principal de documentación.</p>
                            <p>Verifique la consola del navegador para más detalles.</p>
                        </div>
                    `;
                }
            },
            apiData: null,
            renderApiDocumentation: function() {
                console.warn('Método renderApiDocumentation de respaldo llamado.');
            }
        };
    }
    
    // Inicializar la documentación de API
    if (typeof ApiDocumentation.init === 'function') {
        // Esperar un poco para asegurar que todos los scripts estén cargados
        setTimeout(function() {
            try {
                ApiDocumentation.init();
                console.log('Documentación de API inicializada correctamente');
            } catch (error) {
                console.error('Error al inicializar la documentación de API:', error);
            }
        }, 500);
    } else {
        console.error('ERROR: El método init de ApiDocumentation no está disponible.');
    }
});
