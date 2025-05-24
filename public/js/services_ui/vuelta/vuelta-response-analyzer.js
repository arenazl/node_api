/**
 * VUELTA Response Analyzer
 * 
 * Este módulo se encarga de analizar las respuestas de VUELTA para extraer
 * estadísticas, validar la integridad y proporcionar información adicional
 * sobre los datos recibidos.
 */

/**
 * Inicializa el analizador de respuestas
 */
function initializeResponseAnalyzer() {
    console.log('[Services UI - VUELTA] Inicializando analizador de respuestas...');
    
    // Registrar handlers para eventos de respuesta procesada
    document.addEventListener('vuelta-data-displayed', function(event) {
        const { result, container } = event.detail || {};
        if (result) {
            // Analizar la respuesta cuando se muestra
            analyzeResponse(result);
        }
    });
}

/**
 * Analiza una respuesta de VUELTA para extraer estadísticas
 * @param {Object} responseData - Datos de respuesta procesados
 */
function analyzeResponse(responseData) {
    try {
        // Extraer los datos reales (pueden venir en diferentes formatos)
        const data = responseData.response || responseData.dataVuelta || responseData;
        
        // Si no hay datos válidos, no hay nada que analizar
        if (!data || typeof data !== 'object') {
            console.log('[Services UI - VUELTA] No hay datos válidos para analizar');
            return;
        }
        
        // Extraer estadísticas básicas
        const stats = extractResponseStats(data);
        
        // Mostrar estadísticas en consola (para desarrollo)
        console.log('[Services UI - VUELTA] Estadísticas de respuesta:', stats);
        
        // Actualizar UI con las estadísticas si existe el elemento
        updateStatsDisplay(stats);
        
        // Validar la integridad de la respuesta
        validateResponseIntegrity(data);
        
    } catch (error) {
        console.error('[Services UI - VUELTA] Error al analizar respuesta:', error);
    }
}

/**
 * Extrae estadísticas de los datos de respuesta
 * @param {Object} data - Datos de respuesta
 * @returns {Object} - Estadísticas extraídas
 */
function extractResponseStats(data) {
    // Inicializar estadísticas
    const stats = {
        totalFields: 0,
        emptyFields: 0,
        occurrencesCount: 0,
        totalOccurrenceItems: 0,
        nullValues: 0,
        averageFieldLength: 0,
        dataTypes: {},
        allFieldLengths: []
    };
    
    // Función recursiva para extraer estadísticas
    function processObject(obj, isOccurrence = false) {
        if (!obj || typeof obj !== 'object') return;
        
        // Si es un arreglo, procesar cada elemento
        if (Array.isArray(obj)) {
            // Si parece ser un arreglo de ocurrencias
            if (obj.length > 0 && typeof obj[0] === 'object' && obj[0].index !== undefined) {
                stats.occurrencesCount++;
                stats.totalOccurrenceItems += obj.length;
            }
            
            obj.forEach(item => processObject(item, isOccurrence));
            return;
        }
        
        // Procesar campos del objeto
        Object.entries(obj).forEach(([key, value]) => {
            // No contar el campo 'index' como un campo regular en ocurrencias
            if (isOccurrence && key === 'index') return;
            
            // Si el valor es un objeto o array, procesarlo recursivamente
            if (value !== null && typeof value === 'object') {
                // Verificar si es una ocurrencia anidada
                const isNestedOccurrence = key.startsWith('occurrence_') || key.match(/^occ_\d+$/);
                processObject(value, isNestedOccurrence);
                return;
            }
            
            // Contar campo
            stats.totalFields++;
            
            // Contar campos vacíos
            if (value === '' || value === null || value === undefined) {
                stats.emptyFields++;
                if (value === null) stats.nullValues++;
                return;
            }
            
            // Registrar tipo de dato
            const type = typeof value;
            stats.dataTypes[type] = (stats.dataTypes[type] || 0) + 1;
            
            // Si es string, registrar longitud
            if (type === 'string') {
                stats.allFieldLengths.push(value.length);
            }
        });
    }
    
    // Procesar objeto raíz
    processObject(data);
    
    // Calcular promedio de longitud de campos
    if (stats.allFieldLengths.length > 0) {
        const totalLength = stats.allFieldLengths.reduce((sum, len) => sum + len, 0);
        stats.averageFieldLength = Math.round(totalLength / stats.allFieldLengths.length);
    }
    
    return stats;
}

/**
 * Actualiza la visualización de estadísticas en la UI
 * @param {Object} stats - Estadísticas a mostrar
 */
function updateStatsDisplay(stats) {
    // Buscar elemento de estadísticas en el DOM
    const statsContainer = document.getElementById('vueltaResponseStats');
    if (!statsContainer) return;
    
    // Generar HTML con las estadísticas
    let html = '<div class="stats-container">';
    
    // Estadísticas generales
    html += '<div class="stats-section">';
    html += '<h4>Estadísticas de Respuesta</h4>';
    html += `<div class="stat-item"><span>Campos Totales:</span> <strong>${stats.totalFields}</strong></div>`;
    html += `<div class="stat-item"><span>Campos Vacíos:</span> <strong>${stats.emptyFields}</strong> (${Math.round(stats.emptyFields / stats.totalFields * 100)}%)</div>`;
    html += `<div class="stat-item"><span>Valores Nulos:</span> <strong>${stats.nullValues}</strong></div>`;
    html += `<div class="stat-item"><span>Longitud Promedio:</span> <strong>${stats.averageFieldLength}</strong> caracteres</div>`;
    html += '</div>';
    
    // Estadísticas de ocurrencias
    html += '<div class="stats-section">';
    html += '<h4>Ocurrencias</h4>';
    html += `<div class="stat-item"><span>Grupos de Ocurrencias:</span> <strong>${stats.occurrencesCount}</strong></div>`;
    
    if (stats.occurrencesCount > 0) {
        const avgItemsPerOcc = Math.round(stats.totalOccurrenceItems / stats.occurrencesCount);
        html += `<div class="stat-item"><span>Total de Items:</span> <strong>${stats.totalOccurrenceItems}</strong></div>`;
        html += `<div class="stat-item"><span>Promedio por Grupo:</span> <strong>${avgItemsPerOcc}</strong> items</div>`;
    }
    
    html += '</div>';
    
    // Estadísticas de tipos de datos
    html += '<div class="stats-section">';
    html += '<h4>Tipos de Datos</h4>';
    
    for (const [type, count] of Object.entries(stats.dataTypes)) {
        const percentage = Math.round(count / (stats.totalFields - stats.emptyFields) * 100);
        html += `<div class="stat-item"><span>${capitalizeFirstLetter(type)}:</span> <strong>${count}</strong> (${percentage}%)</div>`;
    }
    
    html += '</div>';
    html += '</div>'; // Cierre del contenedor principal
    
    // Actualizar el contenido
    statsContainer.innerHTML = html;
    
    // Hacer visible la sección si estaba oculta
    statsContainer.style.display = 'block';
}

/**
 * Valida la integridad de una respuesta
 * @param {Object} data - Datos de respuesta
 */
function validateResponseIntegrity(data) {
    const warnings = [];
    
    // Buscar problemas comunes en las respuestas
    
    // 1. Verificar ocurrencias con índices inconsistentes
    if (Array.isArray(data)) {
        validateArrayOfOccurrences(data, warnings);
    } else if (typeof data === 'object' && data !== null) {
        // Buscar ocurrencias anidadas en objetos
        Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value) && value.length > 0 && 
                typeof value[0] === 'object' && value[0].index !== undefined) {
                validateArrayOfOccurrences(value, warnings, key);
            }
        });
    }
    
    // Mostrar advertencias si hay alguna
    if (warnings.length > 0) {
        console.warn('[Services UI - VUELTA] Advertencias de integridad:', warnings);
        
        // Mostrar notificación si está disponible la función
        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
            ConfigUtils.showNotification(
                `Se encontraron ${warnings.length} posibles problemas de integridad en la respuesta.`, 
                'warning'
            );
        }
    }
}

/**
 * Valida un array de ocurrencias
 * @param {Array} occurrences - Array de ocurrencias a validar
 * @param {Array} warnings - Array donde agregar advertencias
 * @param {string} occurrenceName - Nombre de la ocurrencia (si aplica)
 */
function validateArrayOfOccurrences(occurrences, warnings, occurrenceName = '') {
    if (!Array.isArray(occurrences) || occurrences.length === 0) return;
    
    // Verificar índices consecutivos
    const indices = occurrences
        .filter(occ => occ && typeof occ === 'object' && occ.index !== undefined)
        .map(occ => occ.index);
    
    // Si no hay índices, no hay nada que validar
    if (indices.length === 0) return;
    
    // Ordenar índices
    indices.sort((a, b) => a - b);
    
    // Verificar que los índices sean consecutivos
    for (let i = 0; i < indices.length - 1; i++) {
        if (indices[i+1] !== indices[i] + 1) {
            const warningMessage = `Índices no consecutivos en ${occurrenceName || 'ocurrencia'}: ${indices[i]} seguido de ${indices[i+1]}`;
            warnings.push(warningMessage);
            break; // Solo reportar una vez por ocurrencia
        }
    }
    
    // Verificar que el primer índice sea 1
    if (indices[0] !== 1) {
        const warningMessage = `El primer índice de ${occurrenceName || 'ocurrencia'} no es 1: ${indices[0]}`;
        warnings.push(warningMessage);
    }
}

/**
 * Capitaliza la primera letra de un string
 * @param {string} str - String a capitalizar
 * @returns {string} - String con la primera letra en mayúscula
 */
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Inicializar el analizador cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', initializeResponseAnalyzer);

// Exportar funciones para uso global
window.VueltaResponseAnalyzer = {
    analyzeResponse,
    extractResponseStats,
    validateResponseIntegrity
};
