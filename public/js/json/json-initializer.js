/**
 * JSON Initializer
 * 
 * Este módulo asegura que todos los elementos JSON de la aplicación
 * utilicen el mismo formateador y tengan el mismo aspecto visual.
 * Se encarga de inicializar automáticamente los formateadores 
 * cuando se carga la página o cuando se insertan nuevos elementos JSON.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializa todos los elementos JSON cuando la página carga
    initializeAllJsonElements();
    
    // Observa cambios en el DOM para aplicar el formateo a nuevos elementos JSON
    observeDOMChanges();
});

/**
 * Inicializa todos los elementos JSON en la página
 */
function initializeAllJsonElements() {
    console.log('Inicializando elementos JSON...');
    
    // Formatear los contenedores JSON predefinidos
    formatAllJsonContainers();
    
    // Inicializar los elementos pre con classe json-editor
    document.querySelectorAll('pre.json-editor').forEach(element => {
        if (typeof formatJson === 'function' && element.textContent.trim()) {
            console.log('Formateando editor JSON:', element.id || 'elemento sin ID');
            // Solo intentar formatear si es JSON válido o si está vacío (para editores)
            try {
                // Verificar si el contenido parece ser un mensaje de ayuda/placeholder
                const content = element.textContent.trim();
                if (content.startsWith('{') || content.startsWith('[') || content === '{}' || content === '[]') {
                    formatJson(element);
                } else if (
                    content.includes("Seleccione") || 
                    content.includes("La respuesta") || 
                    content.includes("se mostrará aquí")
                ) {
                    // Es texto de ayuda, no intentar formatear como JSON
                    console.log('Ignorando texto de ayuda en:', element.id || 'elemento sin ID');
                } else {
                    // Intentar parsear para ver si es JSON válido
                    JSON.parse(content);
                    formatJson(element);
                }
            } catch (e) {
                console.log('Contenido no es JSON válido en:', element.id || 'elemento sin ID');
                // No hacer nada, dejarlo como texto plano
            }
        }
    });
    
    // Formatear cualquier otro elemento que pueda contener JSON
    document.querySelectorAll('.result-container pre, #jsonContent, #vueltaResult, #idaResult').forEach(element => {
        if (typeof formatJson === 'function' && element.textContent.trim() && !element.querySelector('.json-key')) {
            try {
                // Verificar primero si el contenido parece ser un mensaje de ayuda/placeholder
                const content = element.textContent.trim();
                if (
                    content.includes("Seleccione") || 
                    content.includes("La respuesta") || 
                    content.includes("se mostrará aquí")
                ) {
                    // Es texto de ayuda, no intentar formatear como JSON
                    console.log('Ignorando texto de ayuda en:', element.id || 'elemento sin ID');
                } else if (content.startsWith('{') || content.startsWith('[')) {
                    // Solo intentar parsear si parece JSON (comienza con { o [)
                    JSON.parse(content);
                    console.log('Formateando resultado JSON:', element.id || 'elemento sin ID');
                    formatJson(element);
                }
            } catch (e) {
                // No es JSON válido, ignorar
                console.log('Contenido no es JSON válido en:', element.id || 'elemento sin ID', e.message);
            }
        }
    });
}

/**
 * Formatea todos los contenedores JSON estándar
 */
function formatAllJsonContainers() {
    const jsonContainers = document.querySelectorAll('.json-container');
    jsonContainers.forEach(container => {
        const preElement = container.querySelector('pre');
        if (preElement && typeof formatJson === 'function' && preElement.textContent.trim()) {
            try {
                // Verificar primero si el contenido parece ser un mensaje de ayuda/placeholder
                const content = preElement.textContent.trim();
                if (
                    content.includes("Seleccione") || 
                    content.includes("La respuesta") || 
                    content.includes("se mostrará aquí")
                ) {
                    // Es texto de ayuda, no intentar formatear como JSON
                    console.log('Ignorando texto de ayuda en contenedor:', container.id || 'contenedor sin ID');
                } else if (content.startsWith('{') || content.startsWith('[') || content === '{}' || content === '[]') {
                    // Solo intentar parsear si parece JSON (comienza con { o [)
                    console.log('Formateando contenedor JSON:', container.id || 'contenedor sin ID');
                    formatJson(preElement);
                } else {
                    // Verificar si es JSON válido aunque no comience con { o [
                    JSON.parse(content);
                    console.log('Formateando contenedor JSON (formato no estándar):', container.id || 'contenedor sin ID');
                    formatJson(preElement);
                }
            } catch (e) {
                // No es JSON válido, ignorar
                console.log('Contenido no es JSON válido en contenedor:', container.id || 'contenedor sin ID');
            }
        }
    });
}

/**
 * Observa cambios en el DOM para aplicar formato a nuevos elementos JSON
 */
function observeDOMChanges() {
    // Crear un observador que detecte cambios en el DOM
    const observer = new MutationObserver(function(mutations) {
        let shouldFormatJson = false;
        
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Revisar si alguno de los nodos añadidos podría contener JSON
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && 
                            (node.classList.contains('json-container') || 
                             node.classList.contains('json-editor') ||
                             node.classList.contains('result-container') ||
                             node.id === 'jsonContent' ||
                             node.id === 'vueltaResult' ||
                             node.id === 'idaResult')) {
                            shouldFormatJson = true;
                        }
                        
                        // También revisar hijos
                        if (node.querySelectorAll) {
                            const jsonElements = node.querySelectorAll('.json-container, .json-editor, .result-container, #jsonContent, #vueltaResult, #idaResult');
                            if (jsonElements.length > 0) {
                                shouldFormatJson = true;
                            }
                        }
                    }
                });
            }
        });
        
        // Si se detectan cambios relevantes, reinicializar elementos JSON
        if (shouldFormatJson) {
            console.log('Cambios detectados en el DOM, reinicializando elementos JSON...');
            setTimeout(initializeAllJsonElements, 50); // Pequeño retraso para asegurar que el DOM esté actualizado
        }
    });
    
    // Configuración del observador: observar todo el árbol DOM, todos los tipos de cambios
    const config = { 
        childList: true, 
        subtree: true
    };
    
    // Comenzar a observar el body
    observer.observe(document.body, config);
    console.log('Observador de cambios en el DOM iniciado para elementos JSON');
}

/**
 * Actualiza un elemento específico con formato JSON
 * Esta función puede ser llamada manualmente para formatear un elemento específico
 * @param {string|HTMLElement} elementOrId - ID del elemento o el elemento mismo
 * @returns {boolean} - true si se formateó correctamente, false en caso contrario
 */
function updateJsonElement(elementOrId) {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    
    if (!element || !element.textContent.trim()) {
        console.warn('Elemento no encontrado o vacío:', elementOrId);
        return false;
    }
    
    try {
        // Verificar si el contenido es JSON válido
        JSON.parse(element.textContent);
        
        // Aplicar formato
        if (typeof formatJson === 'function') {
            formatJson(element);
            console.log('Elemento JSON actualizado:', element.id || 'elemento sin ID');
            return true;
        }
    } catch (e) {
        console.warn('Error al formatear JSON:', e);
    }
    
    return false;
}

// Exportar funciones para uso global
window.jsonInitializer = {
    initializeAll: initializeAllJsonElements,
    updateElement: updateJsonElement
};
