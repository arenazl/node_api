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
 * @param {boolean} validateOccurrences - Si es true, valida la coherencia de ocurrencias
 * @returns {Object} Datos analizados
 */
function parseDataMessage(dataMessage, dataStructure, validateOccurrences = false) {
  if (!dataStructure || !dataStructure.elements) {
    throw new Error('Estructura de datos inválida o no proporcionada');
  }
  
  const data = {};
  let position = 0;
  
  // Variables para validación de ocurrencias
  let occurrenceCountField = null;
  let occurrenceCountValue = null;
  let firstOccurrenceElement = null;
  
  // Primera pasada: identificar campos importantes y procesar campos previos a ocurrencias
  for (const element of dataStructure.elements) {
    if (element.type === 'field') {
      // Procesar campo
      const fieldName = element.name;
      const fieldLength = parseInt(element.length) || 0;
      
      if (fieldLength <= 0) continue;
      
      // Extraer valor del mensaje
      const fieldValue = dataMessage.substring(position, position + fieldLength).trim();
      
      // Agregar al objeto de datos
      data[fieldName] = fieldValue;
      
      // Identificar campo de cantidad de registros si existe
      if (validateOccurrences && 
          fieldName.toLowerCase().includes('cant') && 
          fieldName.toLowerCase().includes('reg')) {
        occurrenceCountField = element;
        occurrenceCountValue = parseInt(fieldValue) || 0;
        console.log(`Campo contador de ocurrencias encontrado: ${fieldName} = ${occurrenceCountValue}`);
      }
      
      // Avanzar posición
      position += fieldLength;
    } else if (element.type === 'occurrence') {
      // Marcar la primera ocurrencia pero no procesarla aún
      firstOccurrenceElement = element;
      break;
    }
  }
  
    // Si estamos validando ocurrencias y encontramos un campo de contador y una definición de ocurrencia
    if (validateOccurrences && occurrenceCountValue !== null && firstOccurrenceElement) {
        // Calcular longitud esperada de ocurrencias
        const occurrenceLength = calculateOccurrenceLength(firstOccurrenceElement.fields || firstOccurrenceElement.elements || []);
        const expectedTotalLength = occurrenceLength * occurrenceCountValue;
        
        // Longitud restante del mensaje
        const remainingLength = dataMessage.length - position;
        
        console.log(`Validando ocurrencias: ${occurrenceCountValue} ocurrencias de ${occurrenceLength} caracteres cada una (total: ${expectedTotalLength})`);
        console.log(`Longitud restante en el mensaje: ${remainingLength} caracteres`);
        
        // Verificación estricta: si cantidad de registros es 0, no debería haber datos de ocurrencias
        if (occurrenceCountValue === 0 && remainingLength > 10) { // Permitimos un pequeño margen para espacios de relleno
            throw new Error(`Error de validación: El campo "cantidad de registros" es 0 pero hay ${remainingLength} caracteres de datos de ocurrencias. Si hay ocurrencias, este campo debe ser mayor a 0.`);
        }
        // Verificación normal para casos donde cantidad de registros > 0
        else if (occurrenceCountValue > 0) {
            // Verificar si coincide
            if (remainingLength < expectedTotalLength) {
                throw new Error(`Error de validación: La longitud de las ocurrencias (${remainingLength}) es menor que la esperada (${expectedTotalLength}) según la cantidad declarada (${occurrenceCountValue})`);
            } else if (remainingLength > expectedTotalLength && remainingLength - expectedTotalLength > 10) {
                // Permitimos una pequeña diferencia para casos de relleno
                throw new Error(`Error de validación: La longitud de las ocurrencias (${remainingLength}) es mayor que la esperada (${expectedTotalLength}) según la cantidad declarada (${occurrenceCountValue})`);
            }
        }
    }
  
  // Reiniciar posición para segunda pasada si no se procesaron las ocurrencias
  if (firstOccurrenceElement) {
    // Segunda pasada: procesar las ocurrencias
    // Extraer datos de ocurrencia usando la cantidad declarada en el campo
    const occurrenceCount = occurrenceCountValue !== null ? occurrenceCountValue : firstOccurrenceElement.count;
    
    const { occurrenceData, newPosition } = parseOccurrence(
      dataMessage, position, firstOccurrenceElement, occurrenceCount
    );
    
    // Agregar al objeto de datos
    data[firstOccurrenceElement.id || `occurrence_${firstOccurrenceElement.index}`] = occurrenceData;
    
    // Actualizar posición
    position = newPosition;
    
    // Procesar elementos restantes después de ocurrencias (si hay)
    const occurrenceIndex = dataStructure.elements.indexOf(firstOccurrenceElement);
    if (occurrenceIndex >= 0 && occurrenceIndex < dataStructure.elements.length - 1) {
      // Hay elementos después de la ocurrencia
      const remainingElements = dataStructure.elements.slice(occurrenceIndex + 1);
      
      for (const element of remainingElements) {
        if (element.type === 'field') {
          // Procesar campo
          const fieldName = element.name;
          const fieldLength = parseInt(element.length) || 0;
          
          if (fieldLength <= 0) continue;
          
          // Extraer valor del mensaje
          const fieldValue = dataMessage.substring(position, position + fieldLength).trim();
          
          // Agregar al objeto de datos
          data[fieldName] = fieldValue;
          
          // Avanzar posición
          position += fieldLength;
        }
        // No procesamos más ocurrencias por ahora (podría extenderse si es necesario)
      }
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
