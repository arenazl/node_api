/**
 * Módulo para analizar mensajes MQ
 */

/**
 * Analiza un mensaje MQ según las estructuras proporcionadas
 * @param {string} message - Mensaje a analizar
 * @param {Object} headerStructure - Estructura de la cabecera
 * @param {Object} serviceStructure - Estructura del servicio
 * @returns {Object} Mensaje analizado
 */
function parseMessage(message, headerStructure, serviceStructure) {
  // Validar parámetros
  if (!message || !headerStructure || !serviceStructure) {
    throw new Error('Se requieren todos los parámetros: message, headerStructure, serviceStructure');
  }
  
  // Analizar cabecera
  const headerLength = calculateHeaderLength(headerStructure);
  const headerMessage = message.substring(0, headerLength);
  const headerData = parseHeaderMessage(headerMessage, headerStructure);
  
  // Determinar sección (request o response) basado en el servicio
  const section = determineSection(headerData, serviceStructure);
  
  // Analizar datos
  const dataMessage = message.substring(headerLength);
  const dataStructure = serviceStructure[section];
  const dataData = parseDataMessage(dataMessage, dataStructure);
  
  // Combinar resultados
  return {
    header: headerData,
    data: dataData,
    section: section
  };
}

/**
 * Calcula la longitud total de la cabecera
 * @param {Object} headerStructure - Estructura de la cabecera
 * @returns {number} Longitud total
 */
function calculateHeaderLength(headerStructure) {
  if (headerStructure.totalLength > 0) {
    return headerStructure.totalLength;
  }
  
  // Calcular longitud sumando longitudes de campos
  return headerStructure.fields.reduce((total, field) => total + field.length, 0);
}

/**
 * Analiza la parte de cabecera del mensaje
 * @param {string} headerMessage - Mensaje de cabecera
 * @param {Object} headerStructure - Estructura de la cabecera
 * @returns {Object} Datos de cabecera analizados
 */
function parseHeaderMessage(headerMessage, headerStructure) {
  const headerData = {};
  let position = 0;
  
  // Procesar cada campo de la cabecera
  for (const field of headerStructure.fields) {
    const fieldName = field.name;
    const fieldLength = field.length;
    
    // Extraer valor del mensaje
    const fieldValue = headerMessage.substring(position, position + fieldLength).trim();
    
    // Agregar al objeto de datos
    headerData[fieldName] = fieldValue;
    
    // Avanzar posición
    position += fieldLength;
  }
  
  return headerData;
}

/**
 * Determina la sección del mensaje (request o response)
 * @param {Object} headerData - Datos de cabecera
 * @param {Object} serviceStructure - Estructura del servicio
 * @returns {string} Sección ('request' o 'response')
 */
function determineSection(headerData, serviceStructure) {
  // Intentar determinar por el código de respuesta
  if (headerData['CODIGO-RETORNO'] && headerData['CODIGO-RETORNO'] !== '00') {
    return 'response';
  }
  
  // Intentar determinar por el tipo de mensaje
  if (headerData['TIPO-MENSAJE'] === 'RESP') {
    return 'response';
  }
  
  // Por defecto, asumir request
  return 'request';
}

/**
 * Analiza la parte de datos del mensaje
 * @param {string} dataMessage - Mensaje de datos
 * @param {Object} dataStructure - Estructura de datos
 * @returns {Object} Datos analizados
 */
function parseDataMessage(dataMessage, dataStructure) {
  const data = {};
  let position = 0;
  
  // Procesar elementos de la sección
  for (const element of dataStructure.elements) {
    if (element.type === 'field') {
      // Procesar campo
      const fieldName = element.name;
      const fieldLength = element.length;
      
      // Extraer valor del mensaje
      const fieldValue = dataMessage.substring(position, position + fieldLength).trim();
      
      // Agregar al objeto de datos
      data[fieldName] = fieldValue;
      
      // Avanzar posición
      position += fieldLength;
    } else if (element.type === 'occurrence') {
      // Procesar ocurrencia
      const occurrenceId = element.id;
      const occurrenceCount = element.count;
      
      // Extraer datos de ocurrencia
      const { occurrenceData, newPosition } = parseOccurrence(
        dataMessage, position, element, occurrenceCount
      );
      
      // Agregar al objeto de datos
      data[`occurrence_${element.index}`] = occurrenceData;
      
      // Actualizar posición
      position = newPosition;
    }
  }
  
  return data;
}

/**
 * Analiza una ocurrencia en el mensaje
 * @param {string} message - Mensaje completo
 * @param {number} startPosition - Posición inicial
 * @param {Object} occurrenceElement - Elemento de ocurrencia
 * @param {number} count - Cantidad de ocurrencias
 * @returns {Object} Datos de ocurrencia y nueva posición
 */
function parseOccurrence(message, startPosition, occurrenceElement, count) {
  const occurrenceData = [];
  let position = startPosition;
  
  // Obtener campos de la ocurrencia
  const fields = occurrenceElement.fields || [];
  
  // Calcular longitud de una ocurrencia
  const occurrenceLength = calculateOccurrenceLength(fields);
  
  // Procesar cada ocurrencia
  for (let i = 0; i < count; i++) {
    const occurrenceItem = {};
    let itemPosition = position;
    
    // Procesar campos de la ocurrencia
    for (const field of fields) {
      if (field.type === 'field') {
        // Procesar campo
        const fieldName = field.name;
        const fieldLength = field.length;
        
        // Extraer valor del mensaje
        const fieldValue = message.substring(itemPosition, itemPosition + fieldLength).trim();
        
        // Agregar al objeto de datos
        occurrenceItem[fieldName] = fieldValue;
        
        // Avanzar posición
        itemPosition += fieldLength;
      } else if (field.type === 'occurrence') {
        // Procesar ocurrencia anidada
        const nestedOccurrenceCount = field.count;
        
        // Extraer datos de ocurrencia anidada
        const { occurrenceData: nestedData, newPosition } = parseOccurrence(
          message, itemPosition, field, nestedOccurrenceCount
        );
        
        // Agregar al objeto de datos
        occurrenceItem[`occurrence_${field.index}`] = nestedData;
        
        // Actualizar posición
        itemPosition = newPosition;
      }
    }
    
    // Agregar item a la lista de ocurrencias
    occurrenceData.push(occurrenceItem);
    
    // Avanzar posición para la siguiente ocurrencia
    position += occurrenceLength;
  }
  
  return { occurrenceData, newPosition: position };
}

/**
 * Calcula la longitud total de una ocurrencia
 * @param {Array} fields - Campos de la ocurrencia
 * @returns {number} Longitud total
 */
function calculateOccurrenceLength(fields) {
  let totalLength = 0;
  
  for (const field of fields) {
    if (field.type === 'field') {
      totalLength += field.length;
    } else if (field.type === 'occurrence') {
      // Para ocurrencias anidadas, multiplicar longitud por cantidad
      const nestedLength = calculateOccurrenceLength(field.fields || []);
      totalLength += nestedLength * field.count;
    }
  }
  
  return totalLength;
}

// Exportar módulo con todas las funciones necesarias
module.exports = {
  parseMessage,
  parseHeaderMessage,  // Añadimos esta función para uso externo
  parseDataMessage     // También esta para completitud
};
