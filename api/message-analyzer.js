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
    
    // Determinar el tipo de campo (numérico o alfanumérico)
    const fieldType = field.type;
    
    // Formatear el valor según el tipo de campo
    let formattedValue = fieldValue;
    
    // Si el campo está vacío, mantenerlo vacío
    if (fieldValue === '') {
      formattedValue = '';
    }
    // Si es numérico y solo tiene ceros, mantenerlo como está
    else if (fieldType && fieldType.toLowerCase().includes('numerico') && /^0+$/.test(fieldValue)) {
      formattedValue = fieldValue;
    }
    
    // Agregar al objeto de datos
    headerData[fieldName] = formattedValue;
    
    // Agregar log para depuración
    if (fieldType) {
      console.log(`[DEBUG-HEADER] Campo: ${fieldName}, Valor: "${fieldValue}", Tipo: ${fieldType}, Formateado: "${formattedValue}"`);
    }
    
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
 * Formatea un valor según su tipo (numérico o alfanumérico)
 * @param {string} value - Valor a formatear
 * @param {number} length - Longitud requerida
 * @param {string} type - Tipo de campo (numérico o alfanumérico)
 * @returns {string} - Valor formateado
 */
function formatValue(value, length, type) {
  // Convertir valor a string, tratando null/undefined como string vacío
  const strValue = String(value ?? '');
  
  // Si el valor es vacío o solo espacios, generar un valor aleatorio
  if (strValue.trim() === '') {
    return generateRandomValue(parseInt(length || 0), type);
  }
  
  const numLength = parseInt(length || 0);
  if (numLength <= 0) return '';

  // Truncar si es más largo que la longitud requerida
  let processedValue = (strValue.length > numLength) ? strValue.substring(0, numLength) : strValue;

  // VERIFICACIÓN SIMPLIFICADA PARA LOS DOS ÚNICOS TIPOS POSIBLES
  
  // Verificación para los tipos específicos de la estructura
  if (type === 'alfanumerico') {
    // Si el valor es más corto que la longitud requerida, generar un valor aleatorio para el resto
      const randomSuffix = generateRandomValue(numLength - processedValue.length, type);
      return processedValue + randomSuffix;
    return processedValue;
  }
  
  if (type === 'numerico') {
    // Si el valor es más corto que la longitud requerida, generar un valor aleatorio para el resto
    if (processedValue.length < numLength) {
      const randomPrefix = generateRandomValue(numLength - processedValue.length, type);
      return randomPrefix + processedValue;
    }
    
  return processedValue;
}

/**
 * Genera un valor aleatorio según el tipo de campo
 * @param {number} length - Longitud del campo
 * @param {string} fieldType - Tipo de campo (numérico o alfanumérico)
 * @returns {string} - Valor aleatorio generado
 */
function generateRandomValue(length, fieldType) {
  const numLength = parseInt(length) || 0;
  if (numLength <= 0) return '';

  // Normalizar el tipo a minúsculas
  const type = (fieldType || '').toLowerCase();

  const isNumeric = (type == 'numerico')

  // Generar valor aleatorio según el tipo
  let value = '';

  if (isNumeric) {
    // Para campos numéricos, generar dígitos aleatorios
    for (let i = 0; i < numLength; i++) {
      // Para el primer dígito, permitir que sea 0 solo si la longitud es 1
      if (i === 0 && numLength > 1) {
        value += Math.floor(Math.random() * 9) + 1; // 1-9 para el primer dígito
      } else {
        value += Math.floor(Math.random() * 10); // 0-9 para el resto
      }
    }
  } else {
    // Para campos alfanuméricos, generar caracteres aleatorios
    // Caracteres permitidos para campos alfanuméricos
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
    for (let i = 0; i < numLength; i++) {
      value += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return value;
}

  // Comportamiento predeterminado si el tipo no está definido o reconocido
  // Generar un valor aleatorio
  console.warn(`ADVERTENCIA: Tipo "${fieldType}" no reconocido para el valor "${strValue}", generando valor aleatorio.`);
  return generateRandomValue(numLength, 'alfanumerico');
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
      
      // Determinar el tipo de campo (numérico o alfanumérico)
      const fieldType = element.fieldType || element.type;
      
      console.log(`[DEBUG-FIELD] Campo: ${fieldName}, Longitud: ${fieldLength}, Valor original: "${fieldValue}"`);
      console.log(`[DEBUG-FIELD] Tipo en estructura: ${fieldType || 'NO ENCONTRADO'}`);
      console.log(`[DEBUG-FIELD] Elemento completo: ${JSON.stringify(element)}`);
      
      // Formatear el valor según el tipo de campo usando la función formatValue
      // para mantener consistencia con cómo se tratan los campos de ocurrencias
      const formattedValue = formatValue(fieldValue, fieldLength, fieldType);
      console.log(`[DEBUG-FIELD] Valor formateado: "${formattedValue}"`);
      
      // Agregar al objeto de datos
      data[fieldName] = formattedValue;
      
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
    } 
    else if (element.type === 'occurrence') {
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
                return; // No lanzar error, permitir continuar con el procesamiento
            } else if (remainingLength > expectedTotalLength && remainingLength - expectedTotalLength > 10) {
                // Permitimos una pequeña diferencia para casos de relleno
                console.error(`[ERROR VALIDACIÓN] Longitud excesiva: ${remainingLength} > ${expectedTotalLength}`);
                // No lanzar error, simplemente continuar con el procesamiento
            } else {
                console.log(`[VALIDACIÓN EXITOSA] Longitud de ocurrencias correcta: ${remainingLength} ≈ ${expectedTotalLength}`);
            }
        }
    }
  
  // Reiniciar posición para segunda pasada si no se procresaon las ocurrencias
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

        // Determinar el tipo de campo (numérico o alfanumérico)
          const fieldType = element.fieldType;
          
             // Formatear el valor según el tipo de campo usando la función formatValue
        const formattedValue = formatValue(fieldValue, fieldLength, fieldType);
      
        // Agregar al objeto de datos
        data[fieldName] = formattedValue;
          
          // Avanzar posición
          position += fieldLength;
        }
        // No procesamos más ocurrencias por ahora (podría extenderse si es necesario)
      }
    }
  }
  
  return data;
}

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
      
      // Si no hay datos suficientes, generamos valores aleatorios para los campos
      for (const field of fields) {
        if (field.type === 'field') {
          const fieldName = field.name;
          const fieldLength = field.length;
          const fieldType = field.fieldType || field.type;
          
          // Usar formatValue con string vacío para generar un valor aleatorio
          const formattedValue = formatValue('', fieldLength, fieldType);
          
          // Agregar al objeto de datos
          occurrenceItem[fieldName] = formattedValue;
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
        
        // Determinar el tipo de campo (numérico o alfanumérico)
        const fieldType = field.fieldType || field.type;
        
        console.log(`[DEBUG-OCC-FIELD] Ocurrencia campo: ${fieldName}, Longitud: ${fieldLength}, Valor original: "${fieldValue}"`);
        console.log(`[DEBUG-OCC-FIELD] Tipo en estructura: ${fieldType || 'NO ENCONTRADO'}`);
        console.log(`[DEBUG-OCC-FIELD] Campo completo: ${JSON.stringify(field)}`);
        
        // Formatear el valor según el tipo de campo usando la función formatValue
        const formattedValue = formatValue(fieldValue, fieldLength, fieldType); // <-- MANTENER fieldValue AQUÍ
        
        console.log(`[DEBUG-OCC-FIELD] Valor formateado: "${formattedValue}"`);
        
        // Agregar al objeto de datos
        occurrenceItem[fieldName] = formattedValue;
        
        // Mostrar la estructura completa del campo para depuración
        console.log(`[DEBUG-OCC-ESTRUCTURA] Campo: ${JSON.stringify(field)}`);
        
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
/**
 * Formatea un objeto de datos JSON en un string de posiciones fijas
 * @param {Object} data - Objeto de datos JSON
 * @param {Object} dataStructure - Estructura de datos
 * @returns {string} String de posiciones fijas
 */
function formatDataMessage(data, dataStructure) {
  if (!dataStructure || !dataStructure.elements) {
    throw new Error('Estructura de datos inválida o no proporcionada para formatear');
  }

  let formattedString = '';

  for (const element of dataStructure.elements) {
    if (element.type === 'field') {
      const fieldName = element.name;
      const fieldLength = parseInt(element.length) || 0;
      const fieldType = element.fieldType || element.type;
      const fieldValue = data[fieldName] ?? ''; // Get value from JSON, default to empty string

      // Format the value to the required length and type
      const formattedValue = formatValueForString(fieldValue, fieldLength, fieldType);
      formattedString += formattedValue;

    } else if (element.type === 'occurrence') {
      const occKey = element.id || `occurrence_${element.index}`;
      const occurrenceArray = data[occKey] || []; // Get occurrence array from JSON, default to empty array
      // The count field should be handled as a regular field before the occurrence element
      // We format the actual number of items in the array, but the count field in the string
      // should reflect this count. This requires the count field to be present in the JSON data.
      // Assuming the count field is named something like 'CANT-REG-OR' and is processed before the occurrence.

      // Format the occurrence array
      const formattedOccurrences = formatOccurrence(occurrenceArray, element.fields || element.elements || []);
      formattedString += formattedOccurrences;
    }
  }

  return formattedString;
}

/**
 * Formatea un array de ocurrencias en un string de posiciones fijas
 * @param {Array<Object>} occurrenceArray - Array de objetos de ocurrencia
 * @param {Array<Object>} occurrenceStructure - Estructura de una sola ocurrencia (campos)
 * @returns {string} String de posiciones fijas para las ocurrencias
 */
function formatOccurrence(occurrenceArray, occurrenceStructure) {
  let formattedOccurrencesString = '';

  for (const item of occurrenceArray) {
    let formattedItemString = '';
    for (const field of occurrenceStructure) {
      if (field.type === 'field') {
        const fieldName = field.name;
        const fieldLength = parseInt(field.length) || 0;
        const fieldType = field.fieldType || field.type;
        const fieldValue = item[fieldName] ?? ''; // Get value from occurrence item, default to empty string

        // Format the value
        const formattedValue = formatValueForString(fieldValue, fieldLength, fieldType);
        formattedItemString += formattedValue;

      } else if (field.type === 'occurrence') {
         // Handle nested occurrences recursively
         const nestedOccKey = field.id || `occurrence_${field.index}`;
         const nestedOccurrenceArray = item[nestedOccKey] || [];
         const formattedNestedOccurrences = formatOccurrence(nestedOccurrenceArray, field.fields || field.elements || []);
         formattedItemString += formattedNestedOccurrences;
      }
    }
    formattedOccurrencesString += formattedItemString;
  }

  return formattedOccurrencesString;
}


/**
 * Formatea un valor para ser incluido en un string de posiciones fijas.
 * Rellena con espacios a la derecha para alfanuméricos y ceros a la izquierda para numéricos.
 * @param {*} value - El valor a formatear.
 * @param {number} length - La longitud deseada del campo.
 * @param {string} type - El tipo de dato ('alfanumerico', 'numerico').
 * @returns {string} El valor formateado a la longitud especificada.
 */
function formatValueForString(value, length, type) {
  const strValue = String(value ?? '');
  const numLength = parseInt(length) || 0;

  if (numLength <= 0) {
    return '';
  }

  const fieldType = (type || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (fieldType === 'alfanumerico') {
    // Pad with spaces on the right
    return strValue.padEnd(numLength, ' ').substring(0, numLength);
  } else if (fieldType === 'numerico') {
    // Pad with zeros on the left
    // Ensure it's a valid number string before padding
    const numericValue = strValue.replace(/[^0-9]/g, ''); // Remove non-digits
    return numericValue.padStart(numLength, '0').substring(0, numLength);
  } else {
    // Default to alfanumerico padding if type is unknown
    console.warn(`ADVERTENCIA: Tipo "${fieldType}" no reconocido para formatear "${strValue}", usando relleno alfanumérico.`);
    return strValue.padEnd(numLength, ' ').substring(0, numLength);
  }
}

// Exportar módulo con todas las funciones necesarias
module.exports = {
  parseMessage,
  parseHeaderMessage,
  parseDataMessage,
  parseOccurrence,
  calculateHeaderLength,
  calculateOccurrenceLength,
  formatValue, // Keep the existing parse-time formatValue
  formatDataMessage, // Add the new function
  formatOccurrence, // Add the new helper function
  formatValueForString // Add the new helper function
};
