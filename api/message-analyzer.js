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
        
        console.log(`[VALIDACIÓN] Servicio: ${dataStructure.serviceNumber || 'desconocido'}`);
        console.log(`[VALIDACIÓN] Validando ocurrencias: ${occurrenceCountValue} ocurrencias de ${occurrenceLength} caracteres cada una`);
        console.log(`[VALIDACIÓN] Total esperado: ${expectedTotalLength} caracteres (${occurrenceLength} x ${occurrenceCountValue})`);
        console.log(`[VALIDACIÓN] Longitud restante en el mensaje: ${remainingLength} caracteres`);
        console.log(`[VALIDACIÓN] Diferencia: ${remainingLength - expectedTotalLength} caracteres`);
        
        // Verificación estricta: si cantidad de registros es 0, no debería haber datos de ocurrencias
        if (occurrenceCountValue === 0 && remainingLength > 10) { // Permitimos un pequeño margen para espacios de relleno
            console.error(`[ERROR VALIDACIÓN] El campo "cantidad de registros" es 0 pero hay ${remainingLength} caracteres de datos`);
            throw new Error(`Error de validación: El campo "cantidad de registros" es 0 pero hay ${remainingLength} caracteres de datos de ocurrencias. Si hay ocurrencias, este campo debe ser mayor a 0.`);
        }
        // Verificación normal para casos donde cantidad de registros > 0
        else if (occurrenceCountValue > 0) {
            // Verificar si coincide
            if (remainingLength < expectedTotalLength) {
                console.error(`[ERROR VALIDACIÓN] Longitud insuficiente: ${remainingLength} < ${expectedTotalLength}`);
                throw new Error(`Error de validación: La longitud de las ocurrencias (${remainingLength}) es menor que la esperada (${expectedTotalLength}) según la cantidad declarada (${occurrenceCountValue})`);
            } else if (remainingLength > expectedTotalLength && remainingLength - expectedTotalLength > 10) {
                // Permitimos una pequeña diferencia para casos de relleno
                console.error(`[ERROR VALIDACIÓN] Longitud excesiva: ${remainingLength} > ${expectedTotalLength}`);
                throw new Error(`Error de validación: La longitud de las ocurrencias (${remainingLength}) es mayor que la esperada (${expectedTotalLength}) según la cantidad declarada (${occurrenceCountValue})`);
            } else {
                console.log(`[VALIDACIÓN EXITOSA] Longitud de ocurrencias correcta: ${remainingLength} ≈ ${expectedTotalLength}`);
            }
        }
    }
  
  // Reiniciar posición para segunda pasada si no se procesaron las ocurrencias
  if (firstOccurrenceElement) {
    // Segunda pasada: procesar las ocurrencias usando exactamente la cantidad declarada en el contador
    const occurrenceCount = occurrenceCountValue !== null ? occurrenceCountValue : firstOccurrenceElement.count;
    
    console.log(`[PROCESAMIENTO] Procesando EXACTAMENTE ${occurrenceCount} ocurrencias declaradas en el contador`);
    
  // Procesar ocurrencias - pasar el índice de inicio como referencia para preservar orden
  // Un parámetro adicional 'true' indica mantener los índices exactos para ocurrencias sanitizadas
  const { occurrenceData, newPosition } = parseOccurrence(
    dataMessage, position, firstOccurrenceElement, occurrenceCount, true
  );
    
    // Verificación adicional: asegurar que el número de ocurrencias en el JSON coincida exactamente con el contador
    if (occurrenceData.length !== occurrenceCount) {
      console.error(`[ERROR] Número incorrecto de ocurrencias procesadas: ${occurrenceData.length} (esperado: ${occurrenceCount})`);
      
      // Ajustar el array para que tenga exactamente el número correcto de ocurrencias
      if (occurrenceData.length < occurrenceCount) {
        // Faltan ocurrencias, agregar ocurrencias vacías
        const template = occurrenceData.length > 0 ? Object.keys(occurrenceData[0]).reduce((obj, key) => {
          obj[key] = '';
          return obj;
        }, {}) : {};
        
        while (occurrenceData.length < occurrenceCount) {
          console.log(`[CORRECCIÓN] Agregando ocurrencia vacía #${occurrenceData.length + 1}`);
          occurrenceData.push({...template});
        }
      } else if (occurrenceData.length > occurrenceCount) {
        // Sobran ocurrencias, eliminar las excedentes
        console.log(`[CORRECCIÓN] Eliminando ${occurrenceData.length - occurrenceCount} ocurrencias excedentes`);
        occurrenceData.length = occurrenceCount;
      }
      
      console.log(`[VERIFICACIÓN] Ahora hay exactamente ${occurrenceData.length} ocurrencias en el JSON`);
    }
    
    // Agregar al objeto de datos - Mantener la clave original exacta
    const occKey = firstOccurrenceElement.id || `occurrence_${firstOccurrenceElement.index}`;
    data[occKey] = occurrenceData;
    
    // Añadir una propiedad especial para ayudar a la UI con la visualización
    if (firstOccurrenceElement.children) {
      data._nestedOccurrenceMap = {};
      // Mapear las ocurrencias anidadas para que la UI pueda mostrarlas en su lugar correcto
      firstOccurrenceElement.children.forEach(child => {
        data._nestedOccurrenceMap[child.index] = child.id;
      });
      console.log(`[OCURRENCIAS] Agregado mapa de ocurrencias anidadas: ${JSON.stringify(data._nestedOccurrenceMap)}`);
    }
    
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
 * @param {boolean} preserveOrder - Si es true, preserva el índice original en la estructura para mantener el orden
 * @returns {Object} Datos de ocurrencia y nueva posición
 */
function parseOccurrence(message, startPosition, occurrenceElement, count, preserveOrder = false) {
  const occurrenceData = [];
  let position = startPosition;
  
  // Obtener campos de la ocurrencia
  const fields = occurrenceElement.fields || [];
  
  // Calcular longitud de una ocurrencia
  const occurrenceLength = calculateOccurrenceLength(fields);
  
  console.log(`[OCURRENCIAS] Procesando ${count} ocurrencias de ${occurrenceLength} caracteres cada una`);
  console.log(`[OCURRENCIAS] Posición inicial: ${startPosition}, mensaje restante: ${message.length - startPosition} caracteres`);
  
  // Procesar exactamente el número de ocurrencias declarado en el campo cantidad
  for (let i = 0; i < count; i++) {
    const occurrenceItem = {};
    let itemPosition = position;
    
    // Verificar si hay suficiente mensaje restante para esta ocurrencia
    if (position + occurrenceLength > message.length) {
      console.warn(`[OCURRENCIAS] Advertencia: No hay suficientes datos para la ocurrencia ${i+1}/${count}`);
      
      // Aún así creamos una ocurrencia con los datos que hay o vacía si no hay nada
      // Esto garantiza que el número de ocurrencias mostradas coincida con el contador declarado
      
      // Si no hay datos suficientes, generamos valores vacíos para los campos
      for (const field of fields) {
        if (field.type === 'field') {
          occurrenceItem[field.name] = '';
        } else if (field.type === 'occurrence') {
          occurrenceItem[`occurrence_${field.index}`] = [];
        }
      }
      
      // Agregar la ocurrencia vacía o parcial y saltamos al siguiente bucle
      occurrenceData.push(occurrenceItem);
      continue;
    }
    
    // Preservar el índice original si se solicita (para ocurrencias sanitizadas)
    if (preserveOrder) {
      // Agregar el índice original para mantener el orden en las ocurrencias sanitizadas
      // Extraer el índice original de la estructura para mantener los huecos
      if (occurrenceElement && occurrenceElement.index !== undefined) {
        // Usar el índice base de la definición + offset para mantener el orden exacto
        occurrenceItem.index = parseInt(occurrenceElement.index) + i;
        console.log(`[SANITIZADO] Agregado índice ${occurrenceItem.index} a ocurrencia para mantener orden original exacto (base: ${occurrenceElement.index}, offset: ${i})`);
      } else {
        // Fallback al índice de bucle
        occurrenceItem.index = i;
        console.log(`[SANITIZADO] Agregado índice ${i} a ocurrencia sin información de estructura`);
      }
    }
    
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
        
        // Extraer datos de ocurrencia anidada - pasar el flag preserveOrder
        const { occurrenceData: nestedData, newPosition } = parseOccurrence(
          message, itemPosition, field, nestedOccurrenceCount, preserveOrder
        );
        
        // Agregar al objeto de datos - mantener el índice original exacto
        // Esto es crítico para ocurrencias como índice 14, 18, 21 (donde hay huecos)
        const nestedOccKey = `occurrence_${field.index}`;
        occurrenceItem[nestedOccKey] = nestedData;
        console.log(`[SANITIZADO] Ocurrencia anidada agregada con key exacta: ${nestedOccKey}`);
        
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
