/**
 * Módulo para crear mensajes MQ
 */

/**
 * Crea un mensaje MQ a partir de los datos proporcionados
 * @param {Object} headerStructure - Estructura de la cabecera
 * @param {Object} serviceStructure - Estructura del servicio
 * @param {Object} messageData - Datos del mensaje
 * @param {string} section - Sección a procesar ('request' o 'response')
 * @returns {string} Mensaje formateado
 */
function createMessage(headerStructure, serviceStructure, messageData, section = 'request') {
  // Validar parámetros
  if (!headerStructure || !serviceStructure || !messageData) {
    throw new Error('Se requieren todos los parámetros: headerStructure, serviceStructure, messageData');
  }
  
  // Validar sección
  if (section !== 'request' && section !== 'response') {
    throw new Error('La sección debe ser "request" o "response"');
  }
  
  // Crear mensaje de cabecera
  const headerMessage = createHeaderMessage(headerStructure, messageData.header || {});
  
  // Crear mensaje de datos
  const dataMessage = createDataMessage(serviceStructure, messageData.data || {}, section);
  
  // Combinar mensajes
  return headerMessage + dataMessage;
}

/**
 * Crea la parte de cabecera del mensaje
 * @param {Object} headerStructure - Estructura de la cabecera
 * @param {Object} headerData - Datos de la cabecera
 * @returns {string} Mensaje de cabecera formateado
 */
function createHeaderMessage(headerStructure, headerData) {
  let message = '';
  let totalLength = 0;
  
  // Procesar cada campo de la cabecera
  for (const field of headerStructure.fields) {
    const fieldName = field.name;
    const fieldLength = field.length;
    const fieldValue = headerData[fieldName] || '';
    
    // Formatear valor según longitud
    const formattedValue = formatValue(fieldValue, fieldLength);
    
    // Agregar al mensaje
    message += formattedValue;
    totalLength += fieldLength;
  }
  
  // Validar longitud total
  if (headerStructure.totalLength > 0 && totalLength !== headerStructure.totalLength) {
    console.warn(`ADVERTENCIA: La longitud de la cabecera (${totalLength}) no coincide con la longitud declarada (${headerStructure.totalLength})`);
  }
  
  return message;
}

/**
 * Crea la parte de datos del mensaje
 * @param {Object} serviceStructure - Estructura del servicio
 * @param {Object} data - Datos del mensaje
 * @param {string} section - Sección a procesar ('request' o 'response')
 * @returns {string} Mensaje de datos formateado
 */
function createDataMessage(serviceStructure, data, section) {
  // Obtener estructura de la sección
  const sectionStructure = serviceStructure[section];
  if (!sectionStructure) {
    throw new Error(`Sección no encontrada en la estructura del servicio: ${section}`);
  }
  
  let message = '';
  
  // Procesar elementos de la sección
  for (const element of sectionStructure.elements) {
    if (element.type === 'field') {
      // Procesar campo
      const fieldName = element.name;
      const fieldLength = element.length;
      const fieldValue = data[fieldName] || '';
      
      // Formatear valor según longitud
      const formattedValue = formatValue(fieldValue, fieldLength);
      
      // Agregar al mensaje
      message += formattedValue;
    } else if (element.type === 'occurrence') {
      // Procesar ocurrencia
      const occurrenceId = element.id;
      const occurrenceCount = element.count;
      
      // Buscar datos de ocurrencia
      const occurrenceData = findOccurrenceData(data, occurrenceId);
      
      // Formatear ocurrencias
      message += formatOccurrences(element, occurrenceData, occurrenceCount);
    }
  }
  
  return message;
}

/**
 * Busca los datos de una ocurrencia en los datos del mensaje
 * @param {Object} data - Datos del mensaje
 * @param {string} occurrenceId - ID de la ocurrencia
 * @returns {Array} Datos de la ocurrencia
 */
function findOccurrenceData(data, occurrenceId) {
  // Buscar por ID de ocurrencia
  if (data[occurrenceId] && Array.isArray(data[occurrenceId])) {
    return data[occurrenceId];
  }
  
  // Buscar por índice de ocurrencia
  const occurrenceIndex = occurrenceId.replace('occ_', '');
  if (data[`occurrence_${occurrenceIndex}`] && Array.isArray(data[`occurrence_${occurrenceIndex}`])) {
    return data[`occurrence_${occurrenceIndex}`];
  }
  
  // Buscar por nombre de campo de cantidad
  for (const key in data) {
    if (key.includes('CANT-OCURR') || key.includes('CANT_OCURR')) {
      const occurrenceKey = `occurrence_${occurrenceIndex}`;
      if (data[occurrenceKey] && Array.isArray(data[occurrenceKey])) {
        return data[occurrenceKey];
      }
    }
  }
  
  // Si no se encuentra, devolver array vacío
  return [];
}

/**
 * Formatea las ocurrencias
 * @param {Object} occurrenceElement - Elemento de ocurrencia
 * @param {Array} occurrenceData - Datos de la ocurrencia
 * @param {number} maxCount - Cantidad máxima de ocurrencias
 * @returns {string} Mensaje de ocurrencias formateado
 */
function formatOccurrences(occurrenceElement, occurrenceData, maxCount) {
  let message = '';
  
  // Obtener campos de la ocurrencia
  const fields = occurrenceElement.fields || [];
  
  // Formatear cada ocurrencia
  for (let i = 0; i < maxCount; i++) {
    const occurrenceItem = occurrenceData[i] || {};
    
    // Procesar campos de la ocurrencia
    for (const field of fields) {
      if (field.type === 'field') {
        // Procesar campo
        const fieldName = field.name;
        const fieldLength = field.length;
        const fieldValue = occurrenceItem[fieldName] || '';
        
        // Formatear valor según longitud
        const formattedValue = formatValue(fieldValue, fieldLength);
        
        // Agregar al mensaje
        message += formattedValue;
      } else if (field.type === 'occurrence') {
        // Procesar ocurrencia anidada
        const nestedOccurrenceId = field.id;
        const nestedOccurrenceCount = field.count;
        
        // Buscar datos de ocurrencia anidada
        const nestedOccurrenceData = findNestedOccurrenceData(occurrenceItem, nestedOccurrenceId);
        
        // Formatear ocurrencias anidadas
        message += formatOccurrences(field, nestedOccurrenceData, nestedOccurrenceCount);
      }
    }
  }
  
  return message;
}

/**
 * Busca los datos de una ocurrencia anidada
 * @param {Object} occurrenceItem - Datos de la ocurrencia padre
 * @param {string} nestedOccurrenceId - ID de la ocurrencia anidada
 * @returns {Array} Datos de la ocurrencia anidada
 */
function findNestedOccurrenceData(occurrenceItem, nestedOccurrenceId) {
  // Extraer ID de ocurrencia padre e índice de ocurrencia anidada
  const parts = nestedOccurrenceId.split('_');
  const nestedIndex = parts[parts.length - 1];
  
  // Buscar por ID completo
  if (occurrenceItem[nestedOccurrenceId] && Array.isArray(occurrenceItem[nestedOccurrenceId])) {
    return occurrenceItem[nestedOccurrenceId];
  }
  
  // Buscar por índice
  if (occurrenceItem[`occurrence_${nestedIndex}`] && Array.isArray(occurrenceItem[`occurrence_${nestedIndex}`])) {
    return occurrenceItem[`occurrence_${nestedIndex}`];
  }
  
  // Si no se encuentra, devolver array vacío
  return [];
}

/**
 * Formatea un valor según la longitud especificada
 * @param {string|number} value - Valor a formatear
 * @param {number} length - Longitud del campo
 * @returns {string} Valor formateado
 */
function formatValue(value, length) {
  // Convertir a string
  let strValue = String(value || '');
  
  // Truncar si es más largo que la longitud
  if (strValue.length > length) {
    strValue = strValue.substring(0, length);
  }
  
  // Rellenar con espacios si es más corto que la longitud
  while (strValue.length < length) {
    strValue += ' ';
  }
  
  return strValue;
}

module.exports = {
  createMessage
};
