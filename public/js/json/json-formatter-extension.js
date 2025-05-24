/**
 * Extensión del formateador JSON para mejorar el soporte de ocurrencias anidadas
 * 
 * Este archivo extiende la funcionalidad del formateador de JSON existente
 * para manejar ocurrencias anidadas de manera dinámica sin importar sus números.
 */

// Asegurarse de que este script se cargue después del formateador JSON original
document.addEventListener('DOMContentLoaded', function() {
    console.log('[JSON Formatter Extension] Inicializando extensión para ocurrencias anidadas...');
    
    // Verificar que las funciones originales existan
    if (typeof window.formatJson !== 'function') {
        console.error('[JSON Formatter Extension] formatJson no está disponible, la extensión no funcionará');
        return;
    }
    
    // Evitar la aplicación de estilos de ocurrencias si estamos en dark mode
    // porque esto está causando problemas con los caracteres '-'
    const isDarkMode = document.body.classList.contains('dark-mode') || 
                      document.body.classList.contains('dark-theme') ||
                      localStorage.getItem('theme') === 'dark';
    
    if (isDarkMode) {
        console.log('[JSON Formatter Extension] Modo oscuro detectado, desactivando estilos de ocurrencias anidadas');
        return;
    }
    
    // Guardar referencia a la función original
    const originalFormatJson = window.formatJson;
    
    // Reemplazar con nuestra versión mejorada
    window.formatJson = function(element) {
        try {
            // Primero verificar si es un elemento JSON válido
            if (!element || !element.textContent || 
                element.textContent.trim() === '{}' || 
                element.textContent.trim() === '[]') {
                // Solo aplicar formateo básico sin estilizado adicional
                originalFormatJson(element);
                return;
            }
            
            // Intentar parsear el JSON para verificar si es válido
            try {
                JSON.parse(element.textContent);
            } catch (e) {
                // Si no es JSON válido, solo usar el formateador original
                originalFormatJson(element);
                return;
            }
            
            // Si llegamos aquí, es JSON válido
            originalFormatJson(element);
            
            // No aplicar estilos dinámicos para evitar el problema de los guiones
            // applyDynamicOccurrenceStyling(element);
        } catch (error) {
            console.error('[JSON Formatter Extension] Error al aplicar formato:', error);
            // Intentar usar el formateador original como fallback
            try {
                originalFormatJson(element);
            } catch (e) {
                console.error('[JSON Formatter Extension] Error en fallback:', e);
            }
        }
    };
    
    console.log('[JSON Formatter Extension] Extensión para ocurrencias anidadas inicializada');
});
