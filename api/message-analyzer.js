/**
 * Módulo para analizar mensajes MQ
 */

const stringFormatUtils = require('../utils/string-format-utils'); // Importado para usar formatFieldToString

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
  const dataStructure = serviceStructure["response"];
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
    
    // Extraer valor del mensaje y trim
    const fieldValue = headerMessage.substring(position, position + fieldLength).trim();
    
    // Almacenar el valor tal cual (después de trim)
    headerData[fieldName] = fieldValue;
    
    // console.log(`[DEBUG-HEADER] Campo: ${fieldName}, Valor: "${fieldValue}", Tipo: ${field.type}`);
    
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

// Removed local formatValue and generateRandomValue as they introduced unwanted randomization during parsing.
// Parsing should reflect the actual content of the message string.

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
      const fieldType = element.fieldType || element.type; // Keep for potential future use if type-specific parsing is needed
      
      // console.log(`[DEBUG-FIELD] Campo: ${fieldName}, Longitud: ${fieldLength}, Valor original: "${fieldValue}"`);
      // console.log(`[DEBUG-FIELD] Tipo en estructura: ${fieldType || 'NO ENCONTRADO'}`);
      
      // Almacenar el valor tal cual (después de trim)
      data[fieldName] = fieldValue;
      
      // Identificar campo de cantidad de registros si existe
      if (validateOccurrences &&
          fieldName.toLowerCase().includes('cant') &&
          fieldName.toLowerCase().includes('reg')) {
        occurrenceCountField = element;
        occurrenceCountValue = parseInt(fieldValue) || 0; // Still parse the count
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
    
    // Actualizar p osición
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
          
          // Formatear el valor según el tipo de campo usando la función formatValue de string-format-utils
          const formattedValue = stringFormatUtils.formatValue(fieldValue, fieldLength, fieldType);
      
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

/**
 * Analiza una ocurrencia y sus ocurrencias anidadas
 * @param {string} message - Mensaje a analizar
 * @param {number} startPosition - Posición inicial en el mensaje
 * @param {Object} occurrenceElement - Definición de la ocurrencia
 * @param {number} count - Cantidad de ocurrencias a procesar
 * @param {boolean} preserveOrder - Si se debe preservar el orden original
 * @returns {Object} Datos de la ocurrencia y nueva posición
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
      
      // Si no hay datos suficientes, creamos una ocurrencia con campos vacíos
      // para mantener la estructura de N ocurrencias si es necesario por el contador.
      for (const field of fields) {
        if (field.type === 'field') {
          occurrenceItem[field.name] = ''; // Campo vacío
        } else if (field.type === 'occurrence') {
          occurrenceItem[`occurrence_${field.index}`] = []; // Array de ocurrencias anidadas vacío
        }
      }
      occurrenceData.push(occurrenceItem);
      // No se avanza 'position' porque no consumimos datos del string para esta ocurrencia vacía.
      // Sin embargo, la lógica externa que llama a parseOccurrence debe manejar el avance de posición
      // basado en occurrenceLength * count, o el string de entrada debe ser lo suficientemente largo.
      // Para el parseo fiel, si el string es corto, las últimas ocurrencias serán parcialmente vacías o totalmente vacías.
      continue;
    }
    
    // Preservar el índice original si se solicita
    if (preserveOrder && occurrenceElement && occurrenceElement.index !== undefined) {
      occurrenceItem.index = parseInt(occurrenceElement.index) + i;
    } else {
      occurrenceItem.index = i; // Fallback
    }
    
    // Procesar campos de la ocurrencia
    for (const field of fields) {
      if (field.type === 'field') {
        const fieldName = field.name;
        const fieldLength = field.length;
        
        // Extraer valor del mensaje y trim
        const fieldValue = message.substring(itemPosition, itemPosition + fieldLength).trim();
        occurrenceItem[fieldName] = fieldValue;
        itemPosition += fieldLength;

      } else if (field.type === 'occurrence') {
        // Procesar ocurrencia anidada
        const nestedOccurrenceCount = field.count || 0;
        
        // Asegurarse de que siempre se retorne un array válido, incluso si count=0
        let nestedData = [];
        let newNestedPosition = itemPosition;
        
        // Solo procesar ocurrencias anidadas si hay un count > 0
        if (nestedOccurrenceCount > 0) {
          const result = parseOccurrence(
            message, itemPosition, field, nestedOccurrenceCount, preserveOrder
          );
          nestedData = result.occurrenceData;
          newNestedPosition = result.newPosition;
        } else {
          // Si count=0, calcular cuánto avanzar en el mensaje
          const nestedOccLength = calculateOccurrenceLength(field.fields || []) * nestedOccurrenceCount;
          newNestedPosition = itemPosition + nestedOccLength;
          
          // Crear un array vacío pero con metadatos
          nestedData = [];
          // Añadir propiedades para identificación
          nestedData._parentIndex = occurrenceElement.index;
          nestedData._occurrenceIndex = field.index;
          nestedData._count = 0;
        }
        
        // Guardar datos y añadir metadatos importantes para procesamiento frontend
        const nestedOccKey = `occurrence_${field.index}`;
        occurrenceItem[nestedOccKey] = nestedData;
        
        // Añadir metadatos específicos para ocurrencias anidadas
        occurrenceItem._hasNestedOccurrence = true;
        if (!occurrenceItem._nestedOccurrences) {
          occurrenceItem._nestedOccurrences = {};
        }
        occurrenceItem._nestedOccurrences[field.index] = {
          index: field.index,
          id: field.id || null,
          count: nestedOccurrenceCount
        };
        
        itemPosition = newNestedPosition;
      }
    }
    occurrenceData.push(occurrenceItem);
    position += occurrenceLength; // Avanzar posición para la siguiente ocurrencia REAL
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
  if (!fields) return 0; // Si no hay campos, la longitud es 0

  for (const field of fields) {
    if (field.type === 'field') {
      totalLength += field.length || 0; // Sumar longitud del campo, o 0 si no está definida
    } else if (field.type === 'occurrence') {
      // Para ocurrencias anidadas, multiplicar longitud por cantidad
      const nestedLength = calculateOccurrenceLength(field.fields || []);
      totalLength += nestedLength * (field.count || 0); // Multiplicar por cantidad, o 0 si no está definida
    }
  }
  return totalLength;
}

// Exportar solo las funciones necesarias para el parseo.
// Las funciones de formateo a string (formatDataMessage, formatOccurrence, formatValueForString)
// y la antigua formatValue (que randomizaba) se eliminan de este módulo.
module.exports = {
  parseMessage,
  parseHeaderMessage, // Aunque simple, se mantiene por si se añaden lógicas de parseo de cabecera más complejas
  parseDataMessage,
  // parseOccurrence, // No se exporta directamente, es un helper de parseDataMessage
  calculateHeaderLength, // Podría ser útil externamente
  calculateOccurrenceLength // Podría ser útil externamente
};
