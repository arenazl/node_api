/**
 * Response Data Formatter
 *
 * Este módulo se encarga de dar formato a los datos de respuesta (vuelta)
 * para su mejor visualización en la interfaz de usuario.
 */

/**
 * Inicializa los formateadores de datos de respuesta
 */
function initializeResponseDataFormatter() {
    console.log('[Services UI - VUELTA] Inicializando formateadores de datos de respuesta...');

    // Escuchar eventos de formateado
    document.addEventListener('vuelta-data-processed', function(event) {
        const { result, container } = event.detail || {};
        if (result && container) {
            formatVueltaData(result, container);
        }
    });
}

/**
 * Formatea datos de respuesta de vuelta para visualización mejorada
 * @param {Object} result - Datos de respuesta procesados
 * @param {string|HTMLElement} container - Selector o elemento contenedor donde mostrar el resultado
 */
function formatVueltaData(result, container) {
    // Obtener el elemento contenedor
    const containerElement = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!containerElement) return;

    // Obtener los datos reales (pueden venir en result.response, result.dataVuelta o directamente en result)
    const data = result.response || result.dataVuelta || result;

    // Si no hay datos válidos, mostrar un mensaje
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0 && data.constructor === Object) || (Array.isArray(data) && data.length === 0 && !Object.keys(data).length) ) {
        containerElement.innerHTML = '<p class="empty-result">No hay datos de respuesta disponibles</p>';
        return;
    }

    // Si la respuesta es un string, mostrarlo directamente
    if (typeof data === 'string') {
        containerElement.textContent = data;
        return;
    }

    try {
        // Pre-procesar los datos para mejorar la visualización de ocurrencias anidadas
        const enhancedData = enhanceNestedOccurrences(data);
        
        // Convertir a string JSON para que el formateador lo procese
        containerElement.textContent = JSON.stringify(enhancedData, null, 2);
        
        // Aplicar el formateador JSON existente
        if (typeof window.formatJson === 'function') {
            window.formatJson(containerElement);
            
            // Aplicar resaltados adicionales para las ocurrencias de manera dinámica
            applyDynamicOccurrenceHighlighting(containerElement);
        } else {
            console.warn('[Services UI - VUELTA] formatJson no está disponible, usando formato básico');
        }
    } catch (error) {
        console.error('[Services UI - VUELTA] Error al formatear datos:', error);
        containerElement.textContent = JSON.stringify(data, null, 2);
    }
}

/**
 * Mejora los datos con ocurrencias para su mejor visualización
 * @param {Object} data - Datos a mejorar
 * @returns {Object} - Datos mejorados
 */
function enhanceNestedOccurrences(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }
    
    // Si es un array, procesar cada elemento
    if (Array.isArray(data)) {
        return data.map(item => enhanceNestedOccurrences(item));
    }
    
    // Clonar para no modificar el original
    const result = {...data};
    
    // Procesar cada propiedad
    Object.keys(result).forEach(key => {
        // Identificar ocurrencias anidadas por su nombre (occurrence_X o occ_X)
        if (key.startsWith('occurrence_') || key.match(/^occ_\d+$/)) {
            // Extraer el número de ocurrencia
            let occNumber = '';
            if (key.startsWith('occurrence_')) {
                occNumber = key.replace('occurrence_', '');
            } else {
                const occMatch = key.match(/^occ_(\d+)$/);
                if (occMatch) occNumber = occMatch[1];
            }
            
            // Agregar atributo especial para ser detectado por el formateador
            result._hasNestedOccurrences = true;
            
            // Marcar esta propiedad para estilizado
            if (!result._occurrenceNumbers) {
                result._occurrenceNumbers = [];
            }
            result._occurrenceNumbers.push(occNumber);
            
            // Si el valor es un array
            if (Array.isArray(result[key])) {
                // Si está vacío, marcarlo para visualización mejorada
                if (result[key].length === 0) {
                    result[key] = {
                        _emptyOccurrenceArray: true,
                        _occurrenceNumber: occNumber,
                        _displayText: '[]'  // Para una representación string si es necesario
                    };
                } else {
                    // Procesar cada item de la ocurrencia
                    result[key] = result[key].map((item, index) => {
                        if (typeof item !== 'object' || item === null) {
                            return item;
                        }
                        // Marcar con metadatos para identificar el tipo de ocurrencia
                        return {
                            ...enhanceNestedOccurrences(item),
                            _occurrenceParent: occNumber,
                            _occurrenceIndex: index
                        };
                    });
                }
            } else if (result[key] === null || result[key] === undefined) {
                // Si la ocurrencia es null o undefined, reemplazarla con un marcador
                result[key] = {
                    _emptyOccurrenceArray: true,
                    _occurrenceNumber: occNumber,
                    _displayText: 'null'
                };
            }
        } else if (result[key] && typeof result[key] === 'object') {
            // Procesar recursivamente los objetos anidados
            result[key] = enhanceNestedOccurrences(result[key]);
        }
    });
    
    return result;
}

/**
 * Aplica resaltados y estilos específicos para ocurrencias de manera dinámica
 * @param {HTMLElement} container - El contenedor con JSON formateado
 */
function applyDynamicOccurrenceHighlighting(container) {
    // Buscar todas las claves de ocurrencias
    const occurrenceKeys = container.querySelectorAll('.json-key');
    
    occurrenceKeys.forEach(keyElement => {
        const keyText = keyElement.textContent;
        
        // Extraer número de ocurrencia si es un patrón de ocurrencia
        let occNumber = null;
        if (keyText.startsWith('occurrence_')) {
            occNumber = keyText.replace('occurrence_', '');
        } else if (keyText.match(/^occ_\d+$/)) {
            const match = keyText.match(/^occ_(\d+)$/);
            if (match) occNumber = match[1];
        }
        
        // Si es una ocurrencia, aplicar estilos dinámicos
        if (occNumber !== null) {
            // Convertir a número para cálculos
            const occNum = parseInt(occNumber, 10);
            
            // Calcular módulo para ciclo de colores (5 colores diferentes)
            const modValue = occNum % 5;
            
            // Aplicar clases y atributos de datos para los estilos CSS
            keyElement.classList.add('json-occurrence-key');
            keyElement.setAttribute('data-occurrence', occNumber);
            keyElement.setAttribute('data-occurrence-mod', modValue);
            
            // También estilizar el contenedor asociado
            const parentItem = keyElement.closest('.json-item');
            if (parentItem) {
                parentItem.classList.add('json-occurrence-container');
                parentItem.setAttribute('data-occurrence', occNumber);
                parentItem.setAttribute('data-occurrence-mod', modValue);
            }
            
            // Estilizar los brackets si existen
            const parentElement = keyElement.parentElement;
            if (parentElement) {
                const brackets = parentElement.querySelectorAll('.json-brackets');
                brackets.forEach(bracket => {
                    bracket.classList.add('json-occurrence');
                    bracket.setAttribute('data-mod', modValue);
                });
            }
        }
    });
    
    // Mejorar la apariencia de arrays vacíos en ocurrencias
    const emptyArrays = container.querySelectorAll('.json-brackets');
    emptyArrays.forEach(bracket => {
        if (bracket.textContent.trim() === '[]') {
            // Buscar elementos cercanos para determinar si pertenece a ocurrencias
            const keyElement = bracket.parentElement.querySelector('.json-key');
            if (keyElement && keyElement.hasAttribute('data-occurrence')) {
                // Es un array vacío de ocurrencia, mejoramos su visualización
                const occNumber = keyElement.getAttribute('data-occurrence');
                const modValue = parseInt(occNumber, 10) % 5;
                
                bracket.classList.add('json-empty-array');
                bracket.classList.add('json-empty-occurrence');
                bracket.setAttribute('data-empty-occurrence', occNumber);
                bracket.setAttribute('data-mod', modValue);
                
                // Reemplazar el contenido para hacerlo más estético
                bracket.innerHTML = `<span class="json-empty-marker" data-mod="${modValue}">[ ]</span>`;
            }
        }
    });
}

/**
 * Función para expandir/colapsar secciones grandes de JSON
 * @param {HTMLElement} element - Elemento expansor que se hizo clic
 */
function toggleJsonExpand(element) {
    const propertiesContainer = element.nextElementSibling;
    if (!propertiesContainer) return; // Guarda por si acaso

    const isCollapsed = propertiesContainer.classList.contains('json-collapsed');

    if (isCollapsed) {
        propertiesContainer.classList.remove('json-collapsed');
        element.textContent = '-';
    } else {
        propertiesContainer.classList.add('json-collapsed');
        element.textContent = '+';
    }
}

// Asignar funciones al objeto global para uso en eventos
window.formatVueltaData = formatVueltaData;
window.toggleJsonExpand = toggleJsonExpand;

// Inicializar cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', initializeResponseDataFormatter);
