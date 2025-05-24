/**
 * Formateador de JSON compartido para servicios de ida y vuelta
 * 
 * Este módulo centraliza la lógica de formato para JSON en toda la aplicación,
 * garantizando una presentación consistente y mejorada de ocurrencias y ocurrencias anidadas.
 */

/**
 * Inicializa el formateador compartido
 */
function initializeSharedFormatter() {
    console.log('[Shared Formatter] Inicializando formateador JSON compartido...');
    
    // Escuchar eventos para el servicio de ida
    document.addEventListener('ida-data-processed', function(event) {
        const { result, container } = event.detail || {};
        if (result && container) {
            formatSharedJSON(result, container);
        }
    });
    
    // Escuchar eventos para el servicio de vuelta
    document.addEventListener('vuelta-data-processed', function(event) {
        const { result, container } = event.detail || {};
        if (result && container) {
            formatSharedJSON(result, container);
        }
    });
}

/**
 * Formatea datos JSON para visualización mejorada
 * @param {Object} data - Datos a formatear (ida o vuelta)
 * @param {string|HTMLElement} container - Selector o elemento contenedor donde mostrar el resultado
 */
function formatSharedJSON(data, container) {
    // Obtener el elemento contenedor
    const containerElement = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!containerElement) return;

    // Si no hay datos válidos, mostrar un mensaje
    if (!data || 
        (typeof data === 'object' && Object.keys(data).length === 0) || 
        (Array.isArray(data) && data.length === 0)) {
        containerElement.innerHTML = '<p class="empty-result">No hay datos disponibles</p>';
        return;
    }

    // Si la respuesta es un string, mostrarlo directamente
    if (typeof data === 'string') {
        containerElement.textContent = data;
        return;
    }

    try {
        // Pre-procesar los datos para mejorar la visualización de ocurrencias anidadas
        const enhancedData = enhanceOccurrencesForDisplay(data);
        
        // Convertir a string JSON para que el formateador lo procese
        containerElement.textContent = JSON.stringify(enhancedData, null, 2);
        
        // Aplicar el formateador JSON existente que ya maneja ocurrencias anidadas
        if (typeof window.formatJsonElement === 'function') {
            window.formatJsonElement(containerElement);
            
            // Aplicar resaltados adicionales para las ocurrencias
            applyOccurrenceHighlighting(containerElement);
        } else if (typeof window.formatJson === 'function') {
            window.formatJson(containerElement);
            
            // Aplicar resaltados adicionales para las ocurrencias
            applyOccurrenceHighlighting(containerElement);
        } else {
            console.warn('[Shared Formatter] formatJson no está disponible, usando formato básico');
        }
    } catch (error) {
        console.error('[Shared Formatter] Error al formatear datos:', error);
        containerElement.textContent = JSON.stringify(data, null, 2);
    }
}

/**
 * Mejora los datos con ocurrencias para su mejor visualización
 * @param {Object} data - Datos a mejorar
 * @returns {Object} - Datos mejorados
 */
function enhanceOccurrencesForDisplay(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }
    
    // Si es un array, procesar cada elemento
    if (Array.isArray(data)) {
        return data.map(item => enhanceOccurrencesForDisplay(item));
    }
    
    // Clonar para no modificar el original
    const result = {...data};
    
    // Procesar cada propiedad
    Object.keys(result).forEach(key => {
        // Identificar ocurrencias anidadas por su nombre
        if (key.startsWith('occurrence_')) {
            const occNumber = key.replace('occurrence_', '');
            
            // Si esta ocurrencia anidada es importante (14, 18, 21), marcarlo para estilizado especial
            if (['14', '18', '21'].includes(occNumber)) {
                // Agregar atributo especial para ser detectado por el formateador
                result[`_occ_special`] = true;
                result[`_occ_${occNumber}_special`] = true;
                
                // Marcar esta propiedad para estilizado
                if (!result._specialOccurrences) {
                    result._specialOccurrences = {};
                }
                result._specialOccurrences[occNumber] = key;
                
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
                        result[key] = result[key].map(item => {
                            if (typeof item !== 'object' || item === null) {
                                return item;
                            }
                            // Marcar con metadatos para identificar el tipo de ocurrencia
                            return {
                                ...enhanceOccurrencesForDisplay(item),
                                _occurrenceParent: occNumber
                            };
                        });
                    }
                }
            }
        } 
        // Procesar ocurrencias con otro formato de nombre (occ_X)
        else if (key.match(/^occ_\d+$/)) {
            const occNumber = key.match(/^occ_(\d+)$/)[1];
            
            // Realizar proceso similar al anterior
            result[`_occ_${occNumber}_present`] = true;
        } 
        // Procesar recursivamente objetos y arrays anidados
        else if (result[key] && typeof result[key] === 'object') {
            result[key] = enhanceOccurrencesForDisplay(result[key]);
        }
    });
    
    return result;
}

/**
 * Aplica resaltados y estilos específicos para ocurrencias
 * @param {HTMLElement} container - El contenedor con JSON formateado
 */
function applyOccurrenceHighlighting(container) {
    // Buscar todas las claves de ocurrencias especiales
    const occurrenceKeys = container.querySelectorAll('.json-key');
    
    occurrenceKeys.forEach(keyElement => {
        const keyText = keyElement.textContent;
        
        // Detectar ocurrencias por su nombre
        if (keyText.startsWith('occurrence_')) {
            const occNumber = keyText.replace('occurrence_', '');
            
            // Si es una ocurrencia especial, aplicar estilo específico
            if (['14', '18', '21'].includes(occNumber)) {
                keyElement.classList.add('json-occurrence-key');
                keyElement.classList.add(`json-occurrence-${occNumber}-key`);
                keyElement.setAttribute('data-occurrence', occNumber);
                
                // También estilizar el contenedor asociado
                const parentItem = keyElement.closest('.json-item');
                if (parentItem) {
                    parentItem.classList.add(`json-occurrence-${occNumber}-container`);
                }
            }
        }
        // También detectar ocurrencias con formato occ_X
        else if (keyText.match(/^occ_\d+$/)) {
            const occMatch = keyText.match(/^occ_(\d+)$/);
            if (occMatch) {
                const occNumber = occMatch[1];
                keyElement.classList.add('json-occurrence-key');
                keyElement.setAttribute('data-occurrence', occNumber);
            }
        }
    });
    
    // Mejorar la apariencia de arrays vacíos en ocurrencias
    const emptyArrays = container.querySelectorAll('.json-brackets');
    emptyArrays.forEach(bracket => {
        if (bracket.textContent.trim() === '[]') {
            // Buscar elementos cercanos para determinar si pertenece a ocurrencias
            const keyElement = bracket.parentElement.querySelector('.json-key');
            if (keyElement && (
                keyElement.textContent.startsWith('occurrence_') || 
                keyElement.textContent.match(/^occ_\d+$/))
            ) {
                // Es un array vacío de ocurrencia, mejoramos su visualización
                let occNumber = '';
                if (keyElement.textContent.startsWith('occurrence_')) {
                    occNumber = keyElement.textContent.replace('occurrence_', '');
                } else {
                    const match = keyElement.textContent.match(/^occ_(\d+)$/);
                    if (match) occNumber = match[1];
                }
                
                bracket.classList.add('json-empty-array');
                bracket.classList.add(`json-empty-occurrence-${occNumber}`);
            }
        }
    });
}

// Exportar funciones para uso global
window.formatSharedJSON = formatSharedJSON;
window.enhanceOccurrencesForDisplay = enhanceOccurrencesForDisplay;

// Inicializar cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', initializeSharedFormatter);
