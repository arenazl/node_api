/**
 * backend-response-generator.js
 * Generates a simulated backend response ("vuelta") string and its corresponding data object.
 */

const stringFormatUtils = require('./string-format-utils');
const messageCreator = require('../api/message-creator');

// Utilizamos las funciones de generación de valores aleatorios de string-format-utils
const generateRandomValue = stringFormatUtils.generateRandomFieldValue;
const generateMeaningfulValue = stringFormatUtils.generateMeaningfulFieldValue;
const generateDateString = stringFormatUtils.generateDateString;
/**
 * Genera un objeto JavaScript con valores aleatorios para una sección de estructura.
 * Esta versión es completamente genérica sin valores hardcodeados para campos específicos.
 * 
 * @param {Object} structureSection - La sección de estructura (e.g., serviceStructure.response).
 * @param {number} currentIndex - Para ocurrencias, índice actual (base 1)
 * @param {boolean} simulateMode - Si es true, genera siempre valores para todos los campos y al menos 5 ocurrencias
 * @returns {Object} Un objeto de datos con valores aleatorios.
 */
function generateRandomDataForStructure(structureSection, currentIndex = null, simulateMode = false) {
  // Objeto para almacenar los datos generados
  const data = {};
  
  // Si no hay sección de estructura válida, retornar objeto vacío
  if (!structureSection || (!structureSection.elements && !structureSection.fields)) {
    console.warn('[backend-response-generator] WARN: Sección de estructura vacía o inválida');
    return data;
  }
  
  // Para ocurrencias que se pasan directamente, usar su array de campos
  const elements = structureSection.elements || structureSection.fields || [];
  
  // Agregar índice actual para ocurrencias
  if (currentIndex !== null) {
    data.index = currentIndex;
  }

  // Procesar cada elemento de la estructura
  for (const element of elements) {
    // Procesar campos individuales
    if (element.type === 'field') {
      const fieldName = element.name;
      const fieldLength = parseInt(element.length) || 10;
      const fieldType = element.fieldType || 'alfanumerico';

      if (simulateMode) {
        // En modo simulación, siempre generar valores y usar términos significativos para alfanuméricos
        const lowercaseType = fieldType.toLowerCase();
        // Obtener el valor de la columna VALORES si está disponible en la estructura del campo
        const fieldValues = element.values || '';
        
        // Verificar si es un campo de fecha basado en el nombre o los valores
        const isDateField = 
          lowercaseType === 'fecha' || 
          fieldName.toLowerCase().includes('fecha') ||
          (fieldValues && (
            fieldValues.includes('DD/MM') || 
            fieldValues.includes('MM/DD') || 
            fieldValues.includes('AAAA') ||
            fieldValues.includes('DD-MM')
          ));
        
        if (isDateField) {
                // Usar exactamente el formato especificado en la columna VALORES
                // Usar exactamente el formato definido en la estructura
                // Quitar cualquier texto explicativo después de espacios o paréntesis
                const cleanValues = fieldValues.split(/[\s\(]/)[0].trim();
                
                // Si hay un formato específico definido en la columna VALORES, usarlo
                const dateFormat = cleanValues || 'DD/MM/AAAA';
                
                // Generar fecha formateada según el formato especificado en la estructura
                data[fieldName] = generateDateString(dateFormat);
        } 
        else if (lowercaseType === "numerico") {
          data[fieldName] = generateRandomValue(fieldLength, fieldType);
        } else {
          // Para campos alfanuméricos, usar valores con sentido
          data[fieldName] = generateMeaningfulValue(fieldLength, fieldName);
        }
      } else {
        // Modo normal: Aleatoriamente decidir si generar un valor o dejarlo vacío
        // Aproximadamente el 50% de los campos tendrán valores
        if (Math.random() > 0.5) {
          // Generar un valor aleatorio apropiado para el tipo de campo
          data[fieldName] = generateRandomValue(fieldLength, fieldType);
        } else {
          // Dejar el campo vacío
          data[fieldName] = "";
        }
      }
    } 
    // Procesar ocurrencias (arrays de objetos)
    else if (element.type === 'occurrence') {
      const occurrenceId = element.id;
      
      // Determinar número de ocurrencias a generar
      let occurrenceCount;
      if (simulateMode) {
        // En modo simulación, generar al menos 5 ocurrencias (entre 5 y 8)
        occurrenceCount = Math.floor(Math.random() * 4) + 5;
        console.log(`[backend-response-generator] Generando ${occurrenceCount} ocurrencias en modo simulación`);
      } else {
        // Modo normal: generar entre 1 y 3 ocurrencias para mantener datos manejables
        occurrenceCount = Math.floor(Math.random() * 3) + 1;
      }
      
      const occurrencesArray = [];
      
      // Generar cada ocurrencia individual
      for (let i = 0; i < occurrenceCount; i++) {
        const occurrenceIndex = i + 1;
        const occurrenceData = { index: occurrenceIndex };
        
        // Agregar campos a la ocurrencia
        for (const field of (element.fields || [])) {
          if (field.type === 'field') {
            const fieldName = field.name;
            const fieldLength = parseInt(field.length) || 10;
            const fieldType = field.fieldType || 'alfanumerico';
            
            if (simulateMode) {
              // En modo simulación siempre generar valores
              const lowercaseType = fieldType.toLowerCase();
              // Obtener el valor de la columna VALORES si está disponible
              const fieldValues = field.values || '';
              
              // Verificar si es un campo de fecha
              const isDateField = 
                lowercaseType === 'fecha' || 
                fieldName.toLowerCase().includes('fecha') ||
                (fieldValues && (
                  fieldValues.includes('DD/MM') || 
                  fieldValues.includes('MM/DD') || 
                  fieldValues.includes('AAAA') ||
                  fieldValues.includes('DD-MM')
                ));
              
              if (isDateField) {
                // Usar exactamente el formato definido en la estructura
                // Quitar cualquier texto explicativo después de espacios o paréntesis
                const cleanValues = fieldValues.split(/[\s\(]/)[0].trim();
                
                // Si hay un formato específico definido en la columna VALORES, usarlo
                const dateFormat = cleanValues || 'DD/MM/AAAA';
                
                // Generar fecha formateada según el formato especificado en la estructura
                occurrenceData[fieldName] = generateDateString(dateFormat);
              }
              else if (lowercaseType === "numerico") {
                occurrenceData[fieldName] = generateRandomValue(fieldLength, fieldType);
              } else {
                // Para campos alfanuméricos, usar valores con sentido
                occurrenceData[fieldName] = generateMeaningfulValue(fieldLength, fieldName);
              }
            } else {
              // Modo normal: Aleatoriamente decidir si generar un valor o dejarlo vacío
              if (Math.random() > 0.5) {
                occurrenceData[fieldName] = generateRandomValue(fieldLength, fieldType);
              } else {
                occurrenceData[fieldName] = ""; // Campo vacío
              }
            }
          }
        }
        
        // Agregamos la ocurrencia al array
        occurrencesArray.push(occurrenceData);
      }
      
      // Agregar el array de ocurrencias al objeto principal
      data[occurrenceId] = occurrencesArray;
    }
  }
  
  return data;
}

/**
 * Generates a complete "vuelta" message string (header + data).
 * @param {string} serviceNumber - The service number.
 * @param {Object} structures - Object containing headerStructure and serviceStructure.
 * @param {boolean} simulateMode - Si es true, genera valores más significativos y al menos 5 ocurrencias.
 * @returns {string} The complete fixed-length "vuelta" message string.
 */
function generateVueltaMessage(serviceNumber, structures, simulateMode = false) {
  if (!structures || !structures.headerStructure || !structures.serviceStructure) {
    throw new Error('Header and Service structures are required.');
  }

  const { headerStructure, serviceStructure } = structures;

  // Verificar que exista una estructura de respuesta
  if (!serviceStructure.response || !serviceStructure.response.elements) {
    console.warn(`[backend-response-generator] WARN: El servicio ${serviceNumber} no tiene estructura de respuesta definida`);
  }

  // Preparar datos para la cabecera de respuesta
  const headerData = {};
  
  // Generar valores aleatorios para todos los campos de la cabecera
  for (const field of headerStructure.fields) {
    const fieldName = field.name;
    const fieldLength = parseInt(field.length) || 10;
    const fieldType = field.fieldType || field.type || 'alfanumerico';
    
    // Usar la función generateRandomValue para todos los campos
    headerData[fieldName] = generateRandomValue(fieldLength, fieldType);
  }
  
  // Asegurar que al menos se incluya el número de servicio
  if (serviceNumber) {
    headerData.SERVICIO = serviceNumber;
  }

  // Asegurarse de usar la estructura de RESPONSE, no la de REQUEST
  if (!serviceStructure.response) {
    console.error(`[backend-response-generator] ERROR: Servicio ${serviceNumber} no tiene sección 'response' definida`);
    throw new Error(`El servicio ${serviceNumber} no tiene estructura de respuesta definida`);
  }

  if (simulateMode) {
    console.log(`[backend-response-generator] Generando datos para estructura de RESPONSE del servicio ${serviceNumber} en MODO SIMULACIÓN`);
  } else {
    console.log(`[backend-response-generator] Generando datos para estructura de RESPONSE del servicio ${serviceNumber}`);
  }
  
  // Generate random data for the response body using ONLY the response structure
  const responseBodyData = generateRandomDataForStructure(serviceStructure.response, null, simulateMode);

  // Combine into the messageData format expected by messageCreator
  const messageData = {
    header: headerData,
    data: responseBodyData
  };

  // Create the full message string - using 'response' as message type
  return messageCreator.createMessage(headerStructure, serviceStructure, messageData, 'response');
}

module.exports = {
  generateRandomDataForStructure,
  generateVueltaMessage
};
