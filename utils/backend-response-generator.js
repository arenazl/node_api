/**
 * backend-response-generator.js
 * Generates a simulated backend response ("vuelta") string and its corresponding data object.
 */

const stringFormatUtils = require('./string-format-utils');
const messageCreator = require('./message-creator');
const fs = require('fs-extra');
const path = require('path');

// Utilizamos las funciones de generación de valores aleatorios de string-format-utils
const generateRandomValue = stringFormatUtils.generateRandomFieldValue;
const generateMeaningfulValue = stringFormatUtils.generateMeaningfulFieldValue;
const generateDateString = stringFormatUtils.generateDateString;

/**
 * Carga el header fijo desde headers/{serviceNumber}_header_sample.json
 * @param {string} serviceNumber - Número del servicio
 * @returns {string|null} - Header fijo o null si no existe
 */
function loadFixedHeader(serviceNumber) {
  try {
    const headerPath = path.join(__dirname, '..', 'JsonStorage', 'headers', `${serviceNumber}_header_sample.json`);
    if (fs.existsSync(headerPath)) {
      const headerData = fs.readJsonSync(headerPath);
      if (headerData && headerData.value) {
        console.log(`[backend-response-generator] Header fijo cargado para servicio ${serviceNumber}: ${headerData.value.substring(0, 20)}...`);
        return headerData.value;
      }
    }
  } catch (error) {
    console.warn(`[backend-response-generator] No se pudo cargar header fijo para servicio ${serviceNumber}: ${error.message}`);
  }
  return null;
}

/**
 * Detecta si un campo es de tipo fecha usando la misma lógica que ConfigUtils
 * @param {Object} field - Campo a analizar
 * @returns {boolean} - True si es campo de fecha
 */
function isDateField(field) {
  const fieldName = field.name || '';
  const fieldType = (field.fieldType || '').toLowerCase();
  const fieldValues = field.values || '';

  // Verificar por tipo explícito
  if (fieldType === 'fecha' || fieldType === 'date') {
    return true;
  }

  // Verificar por nombre del campo
  const name = fieldName.toLowerCase();
  if (name.includes('fecha') || name.includes('date') || name.includes('fec-') ||
      name.includes('-fec') || name.includes('-fecha') || name.includes('fecha-')) {
    return true;
  }

  // Verificar por formato en valores
  if (fieldValues && (
    fieldValues.includes('DD/MM') ||
    fieldValues.includes('DD-MM') ||
    fieldValues.includes('MM/DD') ||
    fieldValues.includes('AAAA') ||
    fieldValues.includes('MM/AAAA')
  )) {
    return true;
  }

  return false;
}

/**
 * Busca el campo contador de ocurrencias en la estructura
 * @param {Array} elements - Elementos de la estructura
 * @returns {Object|null} - Campo contador o null
 */
function findOccurrenceCountField(elements) {
  for (const element of elements) {
    if (element.type === 'field') {
      const fieldName = element.name.toLowerCase();
      if (fieldName.includes('cant-reg') || fieldName.includes('cant-ocurr') ||
          fieldName.includes('cant_reg') || fieldName.includes('cant_ocurr') ||
          fieldName.includes('cantidad') && (fieldName.includes('reg') || fieldName.includes('ocurr'))) {
        return element;
      }
    }
  }
  return null;
}

/**
 * Extrae valores específicos de la columna VALORES
 * @param {string} fieldValues - Contenido de la columna VALORES
 * @returns {Array} - Array de valores específicos encontrados
 */
function extractSpecificValues(fieldValues) {
  if (!fieldValues || fieldValues.trim() === '' || fieldValues.trim() === '-' ||
      fieldValues.toLowerCase().trim() === 'valor') {
    return [];
  }

  const values = [];

  // Buscar patrones como "00", "02", "03", etc.
  const codeMatches = fieldValues.match(/\b\d{1,3}\b/g);
  if (codeMatches && codeMatches.length > 0) {
    values.push(...codeMatches);
  }

  // Buscar patrones como "0=...", "1=...", etc.
  const optionMatches = fieldValues.match(/(\d+)=/g);
  if (optionMatches && optionMatches.length > 0) {
    values.push(...optionMatches.map(match => match.replace('=', '')));
  }

  // Buscar patrones como "1. consulta de Alertas", "2. otra opción", etc.
  const dotOptionMatches = fieldValues.match(/(\d+)\.\s+[^\d]+/g);
  if (dotOptionMatches && dotOptionMatches.length > 0) {
    // Extraer solo el número antes del punto
    const numberMatches = dotOptionMatches.map(match => {
      const numMatch = match.match(/^(\d+)\./);
      return numMatch ? numMatch[1] : null;
    }).filter(Boolean);

    values.push(...numberMatches);
  }

  // Buscar valores entre comillas
  const quotedMatches = fieldValues.match(/"([^"]+)"/g);
  if (quotedMatches && quotedMatches.length > 0) {
    values.push(...quotedMatches.map(match => match.replace(/"/g, '')));
  }

  // Limpiar duplicados y valores vacíos
  return [...new Set(values)].filter(v => v && v.trim() !== '');
}

/**
 * Genera un valor inteligente basado en el tipo y características del campo
 * @param {Object} field - Campo de la estructura
 * @param {boolean} simulateMode - Modo de simulación
 * @returns {string} - Valor generado
 */
function generateIntelligentValue(field, simulateMode = false) {
  const fieldName = field.name;
  const fieldLength = parseInt(field.length) || 10;
  const fieldType = (field.fieldType || 'alfanumerico').toLowerCase();
  const fieldValues = field.values || '';

  // 1. PRIORIDAD: Si es campo de fecha, usar formato específico
  if (isDateField(field)) {
    // Extraer formato limpio de la columna VALORES
    const cleanValues = fieldValues.split(/[\s\(]/)[0].trim();
    const dateFormat = cleanValues || 'DD/MM/AAAA';
    return generateDateString(dateFormat);
  }

  // 2. PRIORIDAD: Verificar si hay valores específicos en la columna VALORES
  const specificValues = extractSpecificValues(fieldValues);
  if (specificValues.length > 0) {
    // Seleccionar uno de los valores específicos aleatoriamente
    const selectedValue = specificValues[Math.floor(Math.random() * specificValues.length)];

    // Formatear según el tipo y longitud del campo
    if (fieldType === 'numerico' || fieldType === 'numeric' || fieldType === 'numérico') {
      // Para numéricos, asegurar padding correcto
      return selectedValue.padStart(fieldLength, '0');
    } else {
      // Para alfanuméricos, asegurar longitud correcta
      return selectedValue.padEnd(fieldLength, ' ').substring(0, fieldLength);
    }
  }

  // 2.5 PRIORIDAD: Si el campo tiene un formato como "1. consulta de Alertas" pero no se extrajo valor
  if (fieldValues && fieldValues.match(/^\d+\.\s+/)) {
    // Extraer el número al principio
    const numMatch = fieldValues.match(/^(\d+)\./);
    if (numMatch && numMatch[1]) {
      const numValue = numMatch[1];
      // Formatear según el tipo y longitud del campo
      if (fieldType === 'numerico' || fieldType === 'numeric' || fieldType === 'numérico') {
        return numValue.padStart(fieldLength, '0');
      } else {
        return numValue.padEnd(fieldLength, ' ').substring(0, fieldLength);
      }
    }
  }

  // 3. FALLBACK: Usar lógica de tipos estándar
  if (fieldType === 'numerico' || fieldType === 'numeric' || fieldType === 'numérico') {
    return generateRandomValue(fieldLength, 'numerico');
  }

  // Para alfanuméricos, usar valores significativos en modo simulación
  if (simulateMode) {
    return generateMeaningfulValue(fieldLength, fieldName);
  } else {
    return generateRandomValue(fieldLength, 'alfanumerico');
  }
}

/**
 * Genera un objeto JavaScript con valores aleatorios para una sección de estructura.
 * Versión mejorada con lógica inteligente de tipos y ocurrencias.
 *
 * @param {Object} structureSection - La sección de estructura (e.g., serviceStructure.response).
 * @param {number} currentIndex - Para ocurrencias, índice actual (base 1)
 * @param {boolean} simulateMode - Si es true, genera siempre valores para todos los campos y al menos 5 ocurrencias
 * @param {number} forcedOccurrenceCount - Número forzado de ocurrencias (si hay campo contador)
 * @returns {Object} Un objeto de datos con valores aleatorios.
 */
function generateRandomDataForStructure(structureSection, currentIndex = null, simulateMode = false, forcedOccurrenceCount = null) {
  // Objeto para almacenar los datos generados
  const data = {};

  // Si no hay sección de estructura válida, retornar objeto vacío
  if (!structureSection || (!structureSection.elements && !structureSection.fields)) {
    console.warn('[backend-response-generator] WARN: Sección de estructura vacía o inválida');
    return data;
  }

  // Para ocurrencias que se pasan directamente, usar su array de campos
  const elements = structureSection.elements || structureSection.fields || [];

  // NO agregar índice automáticamente aquí - se maneja en la generación de ocurrencias

  // Buscar campo contador de ocurrencias
  const countField = findOccurrenceCountField(elements);
  let occurrenceCount = null;

  // Si hay campo contador y ocurrencias en la estructura, generar valor para el contador
  if (countField && elements.some(el => el.type === 'occurrence')) {
    if (forcedOccurrenceCount !== null) {
      occurrenceCount = forcedOccurrenceCount;
    } else {
      // Generar número aleatorio entre 1 y 3 para el contador (más realista)
      occurrenceCount = Math.floor(Math.random() * 3) + 1;
    }
    console.log(`[backend-response-generator] Campo contador encontrado: ${countField.name}, generando ${occurrenceCount} ocurrencias`);
  }

  // Procesar cada elemento de la estructura
  for (const element of elements) {
    // Procesar campos individuales
    if (element.type === 'field') {
      const fieldName = element.name;

      // Si es el campo contador de ocurrencias, usar el valor calculado
      if (countField && element.name === countField.name && occurrenceCount !== null) {
        data[fieldName] = occurrenceCount.toString().padStart(parseInt(element.length) || 2, '0');
        continue;
      }

      // En modo simulación, siempre generar valores inteligentes
      data[fieldName] = generateIntelligentValue(element, simulateMode);
    }
    // Procesar ocurrencias (arrays de objetos)
    else if (element.type === 'occurrence') {
      const occurrenceId = element.id;

      // Determinar número de ocurrencias a generar
      let finalOccurrenceCount;

      if (occurrenceCount !== null) {
        // Usar el valor del campo contador
        finalOccurrenceCount = occurrenceCount;
      } else if (simulateMode) {
        // En modo simulación, generar entre 2 y 4 ocurrencias
        finalOccurrenceCount = Math.floor(Math.random() * 3) + 2;
      } else {
        // Modo normal: generar entre 1 y 3 ocurrencias
        finalOccurrenceCount = Math.floor(Math.random() * 3) + 1;
      }

      console.log(`[backend-response-generator] Generando ${finalOccurrenceCount} ocurrencias para ${occurrenceId}`);

      const occurrencesArray = [];

      // Generar cada ocurrencia individual - ÍNDICES EMPIEZAN EN 1
      for (let i = 0; i < finalOccurrenceCount; i++) {
        const occurrenceIndex = i + 1; // CORRECTO: empezar en 1
        const occurrenceData = { index: occurrenceIndex };

        // Agregar campos a la ocurrencia
        for (const field of (element.fields || [])) {
          if (field.type === 'field') {
            const fieldName = field.name;

            // SIEMPRE generar valores inteligentes para las ocurrencias
            occurrenceData[fieldName] = generateIntelligentValue(field, simulateMode);
          }
        }

        // Siempre agregar la ocurrencia (sin filtrar por campos vacíos)
        occurrencesArray.push(occurrenceData);
      }

      // Agregar el array de ocurrencias al objeto principal
      if (occurrencesArray.length > 0) {
        data[occurrenceId] = occurrencesArray;
      }
    }
  }

  return data;
}

/**
 * Verifica si un campo es válido según la estructura oficial
 * @param {string} fieldName - Nombre del campo
 * @returns {boolean} - True si es válido
 */
function isValidField(fieldName) {
  // 1. Campos de servicios (patrón genérico SVC seguido de números)
  if (/^SVC\d+-/.test(fieldName)) {
    return true;
  }

  // 2. Ocurrencias
  if (fieldName.startsWith('occ_')) {
    return true;
  }

  // 3. Índice de ocurrencias
  if (fieldName === 'index') {
    return true;
  }

  // 4. Rechazar explícitamente campos problemáticos
  const invalidPatterns = [
    'random', 'Random', 'RANDOM',
    'temp', 'tmp', 'test',
    'debug', 'Debug', 'DEBUG'
  ];

  for (const pattern of invalidPatterns) {
    if (fieldName.toLowerCase().includes(pattern.toLowerCase())) {
      return false;
    }
  }

  // 5. Por defecto, rechazar campos no reconocidos
  return false;
}

/**
 * Limpia el objeto de datos eliminando campos vacíos y no válidos
 * @param {Object} data - Datos a limpiar
 * @returns {Object} - Datos limpios
 */
function cleanEmptyFields(data) {
  const cleaned = {};

  for (const [key, value] of Object.entries(data)) {
    // FILTRO ESTRICTO: Solo permitir campos válidos
    if (!isValidField(key)) {
      console.log(`[backend-response-generator] FILTRADO: Campo no válido ignorado: ${key}`);
      continue;
    }

    if (Array.isArray(value)) {
      // Para arrays (ocurrencias), limpiar cada elemento
      const cleanedArray = value.map(item => {
        const cleanedItem = {};
        for (const [itemKey, itemValue] of Object.entries(item)) {
          // Aplicar filtro también a elementos del array
          if (isValidField(itemKey) && itemValue !== "" && itemValue !== null && itemValue !== undefined) {
            cleanedItem[itemKey] = itemValue;
          }
        }
        return cleanedItem;
      }).filter(item => Object.keys(item).length > 1); // Mantener si tiene más que solo 'index'

      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Para objetos, limpiar recursivamente
      const cleanedObj = cleanEmptyFields(value);
      if (Object.keys(cleanedObj).length > 0) {
        cleaned[key] = cleanedObj;
      }
    } else if (value !== "" && value !== null && value !== undefined) {
      // Para valores primitivos, mantener solo si no están vacíos
      cleaned[key] = value;
    }
  }

  return cleaned;
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

  // 1. INTENTAR CARGAR HEADER FIJO
  let headerMessage = loadFixedHeader(serviceNumber);

  if (!headerMessage) {
    console.log(`[backend-response-generator] No se encontró header fijo, generando header aleatorio para servicio ${serviceNumber}`);

    // Fallback: Generar header aleatorio como antes
    const headerData = {};

    for (const field of headerStructure.fields) {
      const fieldName = field.name;
      const fieldLength = parseInt(field.length) || 10;
      const fieldType = field.fieldType || field.type || 'alfanumerico';

      headerData[fieldName] = generateRandomValue(fieldLength, fieldType);
    }

    // Asegurar que al menos se incluya el número de servicio
    if (serviceNumber) {
      headerData.SERVICIO = serviceNumber;
    }

    // Crear mensaje de header usando messageCreator
    headerMessage = messageCreator.createHeaderMessage(headerStructure, headerData);
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

  // 2. GENERAR DATOS DE RESPUESTA CON LÓGICA INTELIGENTE
  const responseBodyData = generateRandomDataForStructure(serviceStructure.response, null, simulateMode);

  // 3. CREAR MENSAJE DE DATOS
  let dataMessage = '';
  if (serviceStructure.response && serviceStructure.response.elements) {
    // Preparar datos en formato esperado por messageCreator
    const messageData = {
      header: {}, // Header ya está procesado
      data: responseBodyData
    };

    // Crear solo la parte de datos del mensaje
    dataMessage = messageCreator.createMessage(headerStructure, serviceStructure, messageData, 'response').substring(headerMessage.length);
  }

  // 4. COMBINAR HEADER FIJO + DATOS
  const fullMessage = headerMessage + dataMessage;

  console.log(`[backend-response-generator] Mensaje generado: Header=${headerMessage.length} chars, Data=${dataMessage.length} chars, Total=${fullMessage.length} chars`);

  return fullMessage;
}

/**
 * Genera datos limpios para JSON (sin campos vacíos)
 * @param {string} serviceNumber - Número del servicio
 * @param {Object} structures - Estructuras del servicio
 * @param {boolean} simulateMode - Modo de simulación
 * @returns {Object} - Datos limpios para JSON
 */
function generateCleanResponseData(serviceNumber, structures, simulateMode = false) {
  if (!structures || !structures.serviceStructure || !structures.serviceStructure.response) {
    throw new Error('Service response structure is required.');
  }

  console.log(`[backend-response-generator] Generando datos limpios para JSON del servicio ${serviceNumber}`);

  // Generar datos con lógica inteligente
  const rawData = generateRandomDataForStructure(structures.serviceStructure.response, null, simulateMode);

  // Limpiar campos vacíos
  const cleanData = cleanEmptyFields(rawData);

  console.log(`[backend-response-generator] Datos generados: ${Object.keys(rawData).length} campos originales, ${Object.keys(cleanData).length} campos finales`);

  return cleanData;
}

/**
 * Genera datos coherentes para ambos string y JSON
 * @param {string} serviceNumber - Número del servicio
 * @param {Object} structures - Estructuras del servicio
 * @param {boolean} simulateMode - Modo de simulación
 * @returns {Object} - Objeto con responseData, stringVuelta y jsonVuelta coherentes
 */
function generateCoherentResponse(serviceNumber, structures, simulateMode = false) {
  if (!structures || !structures.headerStructure || !structures.serviceStructure) {
    throw new Error('Header and Service structures are required.');
  }

  const { headerStructure, serviceStructure } = structures;

  // Verificar que exista una estructura de respuesta
  if (!serviceStructure.response || !serviceStructure.response.elements) {
    console.warn(`[backend-response-generator] WARN: El servicio ${serviceNumber} no tiene estructura de respuesta definida`);
    throw new Error(`El servicio ${serviceNumber} no tiene estructura de respuesta definida`);
  }

  // 1. GENERAR DATOS UNA SOLA VEZ (coherentes)
  if (simulateMode) {
    console.log(`[backend-response-generator] Generando datos coherentes para servicio ${serviceNumber} en MODO SIMULACIÓN`);
  } else {
    console.log(`[backend-response-generator] Generando datos coherentes para servicio ${serviceNumber}`);
  }

  const responseData = generateRandomDataForStructure(serviceStructure.response, null, simulateMode);

  // 2. CARGAR HEADER FIJO
  let headerMessage = loadFixedHeader(serviceNumber);

  if (!headerMessage) {
    console.log(`[backend-response-generator] No se encontró header fijo, generando header aleatorio para servicio ${serviceNumber}`);

    // Fallback: Generar header aleatorio
    const headerData = {};

    for (const field of headerStructure.fields) {
      const fieldName = field.name;
      const fieldLength = parseInt(field.length) || 10;
      const fieldType = field.fieldType || field.type || 'alfanumerico';

      headerData[fieldName] = generateRandomValue(fieldLength, fieldType);
    }

    // Asegurar que al menos se incluya el número de servicio
    if (serviceNumber) {
      headerData.SERVICIO = serviceNumber;
    }

    // Crear mensaje de header usando messageCreator
    headerMessage = messageCreator.createHeaderMessage(headerStructure, headerData);
  }

  // 3. CREAR STRING DE VUELTA usando los MISMOS datos
  let dataMessage = '';
  if (serviceStructure.response && serviceStructure.response.elements) {
    // Preparar datos en formato esperado por messageCreator
    const messageData = {
      header: {}, // Header ya está procesado
      data: responseData
    };

    // Crear solo la parte de datos del mensaje
    dataMessage = messageCreator.createMessage(headerStructure, serviceStructure, messageData, 'response').substring(headerMessage.length);
  }

  const stringVuelta = headerMessage + dataMessage;

  // 4. CREAR JSON LIMPIO usando los MISMOS datos
  const jsonVuelta = cleanEmptyFields(responseData);

  console.log(`[backend-response-generator] Respuesta coherente generada: Header=${headerMessage.length} chars, Data=${dataMessage.length} chars, Total=${stringVuelta.length} chars, JSON fields=${Object.keys(jsonVuelta).length}`);

  return {
    responseData,
    stringVuelta,
    jsonVuelta
  };
}

module.exports = {
  generateRandomDataForStructure,
  generateVueltaMessage,
  generateCleanResponseData,
  generateCoherentResponse,
  loadFixedHeader,
  cleanEmptyFields
};
