/**
 * example-stream.js
 * 
 * Proporciona ejemplos de strings de longitud fija para usar en la pestaña "Servicio de Vuelta".
 * Estos ejemplos se generan dinámicamente basándose en la estructura del servicio.
 */

// Objeto para almacenar las estructuras de servicios cargadas
const loadedStructures = {};

/**
 * Obtiene un string de ejemplo basado en el número de servicio, cargando la estructura dinámicamente.
 * @param {string} serviceNumber - Número del servicio.
 * @returns {Promise<string>} - Promise que resuelve al string de ejemplo generado para ese servicio.
 */
async function getExampleStringForService(serviceNumber) {
    try {
        // Intentar cargar la estructura del servicio
        const structure = await loadServiceStructure(serviceNumber);
        
        if (!structure) {
            // Si no hay estructura disponible, generar un ejemplo genérico
            return generateGenericExampleString(serviceNumber);
        }
        
        // Generar el string de ejemplo usando la estructura
        return generateExampleFromStructure(structure, serviceNumber);
    } catch (error) {
        console.error(`Error al generar ejemplo para servicio ${serviceNumber}:`, error);
        return generateGenericExampleString(serviceNumber); // Fallback al ejemplo genérico
    }
}

/**
 * Carga la estructura del servicio desde el servidor.
 * @param {string} serviceNumber - Número del servicio.
 * @returns {Promise<Object|null>} - Promise que resuelve a la estructura del servicio o null si no se encuentra.
 */
async function loadServiceStructure(serviceNumber) {
    // Si ya tenemos la estructura cargada, la devolvemos directamente
    if (loadedStructures[serviceNumber]) {
        return loadedStructures[serviceNumber];
    }

    try {
        // Cargar la estructura desde el servidor
        const response = await fetch(`/excel/structure-by-service?service_number=${serviceNumber}`);
        if (!response.ok) {
            throw new Error(`Error al cargar estructura (${response.status})`);
        }
        
        const structure = await response.json();
        
        // Guardar la estructura en caché para futuros usos
        loadedStructures[serviceNumber] = structure;
        
        return structure;
    } catch (error) {
        console.error(`Error al cargar la estructura del servicio ${serviceNumber}:`, error);
        return null;
    }
}

/**
* Genera un string de ejemplo basado en la estructura del servicio.
* @param {Object} structure - Estructura del servicio.
* @param {string} serviceNumber - Número del servicio.
* @returns {Promise<string>} - Promise que resuelve al string de ejemplo generado.
*/
async function generateExampleFromStructure(structure, serviceNumber) {
    // Obtener las longitudes de la estructura
    const headerLength = structure.header_structure?.totalLength || 102;
    const responseLength = structure.service_structure?.response?.totalLength || 0;
    
    // VERIFICACIÓN DE ESTRUCTURA COMPLETA
    console.error(`==== ESTRUCTURA COMPLETA PARA SERVICIO ${serviceNumber} ====`);
    console.error(`Header structure totalLength: ${headerLength}`);
    
    // Verificar si la estructura es válida
    if (!structure.service_structure || !structure.service_structure.response) {
        console.error("ERROR: No se encontró estructura de respuesta válida");
        console.error("Estructura recibida:", JSON.stringify(structure, null, 2));
        throw new Error(`Estructura inválida para servicio ${serviceNumber}. No se encontró service_structure.response`);
    }
    
    // Verificar si hay elementos en la respuesta
    if (!structure.service_structure.response.elements || structure.service_structure.response.elements.length === 0) {
        console.error("ERROR: No hay elementos en la estructura de respuesta");
        console.error("Estructura de respuesta:", JSON.stringify(structure.service_structure.response, null, 2));
        throw new Error(`Estructura inválida para servicio ${serviceNumber}. No hay elementos definidos en la respuesta`);
    }
    
    // Verificar si hay totalLength definido para la respuesta
    if (!responseLength || responseLength <= 0) {
        console.error(`ERROR: Valor inválido para responseLength: ${responseLength}`);
        
        // Intentar calcular manualmente
        const calculatedResponseLength = calculateTotalResponseLength(structure.service_structure.response);
        console.error(`Longitud de respuesta calculada manualmente: ${calculatedResponseLength}`);
        
        if (calculatedResponseLength > 0) {
            console.error(`Usando longitud calculada en lugar de la definida en la estructura`);
            responseLength = calculatedResponseLength;
        } else {
            throw new Error(`No se pudo determinar la longitud de la respuesta para servicio ${serviceNumber}`);
        }
    }
    
    console.error(`Generando ejemplo para servicio ${serviceNumber}. Cabecera: ${headerLength}, Respuesta: ${responseLength}`);
    
    // Longitud del cuerpo (excluyendo la cabecera)
    let bodyLength = responseLength - headerLength;
    
    // Validación adicional
    if (bodyLength <= 0) {
        console.error(`ERROR: Longitud de cuerpo inválida (${bodyLength}). Usando valor por defecto.`);
        bodyLength = 1000; // Valor por defecto razonable
    }
    
    console.error(`Longitud calculada para el cuerpo: ${bodyLength} caracteres`);
    
    // Generar la cabecera (ahora es async)
    const header = await generateHeaderExample(structure, serviceNumber, headerLength);
    console.log(`Cabecera generada: [${header}] (${header.length} caracteres)`);
    
    // Generar el cuerpo de respuesta
    const responseBody = generateResponseExample(structure, bodyLength);
    console.log(`Cuerpo generado: [${responseBody}] (${responseBody.length} caracteres)`);
    
    // Combinar cabecera y respuesta
    const fullResponse = header + responseBody;
    console.log(`String completo generado: ${fullResponse.length} caracteres`);
    
    // Validar que el string generado cumpla con los requisitos mínimos
    validateGeneratedString(fullResponse, serviceNumber, structure);
    
    return fullResponse;
}

/**
 * Valida que el string generado cumpla con la estructura básica esperada
 * @param {string} str - String generado 
 * @param {string} serviceNumber - Número de servicio
 * @param {Object} structure - Estructura del servicio
 */
function validateGeneratedString(str, serviceNumber, structure) {
    // Requisitos mínimos a verificar
    const headerLength = structure.header_structure?.totalLength || 102;
    
    // 1. Verificar longitud mínima
    if (str.length < headerLength + 10) {
        throw new Error(`String generado demasiado corto: ${str.length} caracteres. Mínimo esperado: ${headerLength + 10}`);
    }
    
    // 2. Verificar que la cabecera comience con el formato correcto (longitud de mensaje)
    if (!/^\d{8}/.test(str)) {
        throw new Error("String generado no tiene formato válido: No comienza con 8 dígitos para longitud de mensaje");
    }
    
    // 3. Verificar que después de la cabecera haya un código de estado válido (2 dígitos)
    if (str.length >= headerLength + 2) {
        const statusCode = str.substring(headerLength, headerLength + 2);
        if (!/^\d{2}$/.test(statusCode)) {
            throw new Error(`Código de estado "${statusCode}" después de la cabecera no es válido (deben ser 2 dígitos)`);
        }
    }
    
    // 4. Verificar que después del estado haya un contador de registros válido (2 dígitos)
    if (str.length >= headerLength + 4) {
        const registryCountStr = str.substring(headerLength + 2, headerLength + 4);
        const registryCount = parseInt(registryCountStr);
        
        if (isNaN(registryCount)) {
            throw new Error(`Contador de registros "${registryCountStr}" no es un valor numérico válido`);
        }
        
        // Guardar el contador de ocurrencias detectado para uso en la UI
        window.lastGeneratedOccurrenceCount = registryCount;
        console.log(`Contador de ocurrencias guardado: ${registryCount}`);
    }
    
    console.log(`String generado validado correctamente para servicio ${serviceNumber}`);
}

/**
 * Obtiene un ejemplo de cabecera desde el servidor basado en el número de servicio.
 * @param {string} serviceNumber - Número del servicio.
 * @returns {Promise<string>} - Promise que resuelve a la cabecera de ejemplo del servidor o una generada.
 */
async function fetchHeaderSample(serviceNumber) {
    try {
        // Intentar obtener el header sample desde el servidor
        const response = await fetch(`/excel/header-sample/${serviceNumber}`);
        
        if (!response.ok) {
            console.warn(`No se encontró header sample para el servicio ${serviceNumber}, código: ${response.status}`);
            return null;
        }
        
        const headerSample = await response.json();
        
        if (headerSample && headerSample.value) {
            console.log(`Header sample obtenido del servidor para servicio ${serviceNumber}:`, headerSample.value);
            return headerSample.value;
        }
        
        return null;
    } catch (error) {
        console.error(`Error al obtener header sample para el servicio ${serviceNumber}:`, error);
        return null;
    }
}

/**
 * Genera un ejemplo de cabecera basado en la estructura.
 * @param {Object} structure - Estructura del servicio.
 * @param {string} serviceNumber - Número del servicio.
 * @param {number} headerLength - Longitud total de la cabecera.
 * @returns {Promise<string>} - Promise que resuelve a la cabecera de ejemplo.
 */
async function generateHeaderExample(structure, serviceNumber, headerLength) {
    // Primero intentar obtener el header sample desde el servidor
    const headerSample = await fetchHeaderSample(serviceNumber);
    
    // Si tenemos un header sample válido, usarlo (ajustando la longitud si es necesario)
    if (headerSample) {
        if (headerSample.length > headerLength) {
            return headerSample.substring(0, headerLength);
        } else if (headerSample.length < headerLength) {
            return headerSample.padEnd(headerLength, ' ');
        }
        return headerSample;
    }
    
    console.log(`Generando cabecera manualmente para servicio ${serviceNumber}`);
    
    // Si no hay header sample disponible, generar uno manualmente
    const headerParts = [
        "00102000",                 // Longitud del mensaje (8 posiciones)
        "API",                      // Canal (3 posiciones)
        serviceNumber.padEnd(4),    // Servicio (4 posiciones)
        "SISTEMA",                  // Usuario (7 posiciones)
        "0000",                     // Código de retorno (4 posiciones)
        getFechaActual(),           // Fecha (8 posiciones)
        "120000",                   // Hora (6 posiciones)
        "USUARIO1",                 // Usuario (7 posiciones)
        "0001",                     // Ubicación (4 posiciones)
        "PROCESO COMPLETADO CORRECTAMENTE".padEnd(45, ' '), // Texto (45 posiciones)
        "00",                       // Estado enviado (2 posiciones)
        "     "                     // Campo complementario (5 posiciones)
    ];
    
    let header = headerParts.join('');
    
    // Si la cabecera generada es más larga que la esperada, truncarla
    if (header.length > headerLength) {
        header = header.substring(0, headerLength);
    } 
    // Si es más corta, rellenar con espacios
    else if (header.length < headerLength) {
        header = header.padEnd(headerLength, ' ');
    }
    
    return header;
}

/**
 * Genera un ejemplo de cuerpo de respuesta basado en la estructura.
 * @param {Object} structure - Estructura del servicio.
 * @param {number} responseBodyLength - Longitud del cuerpo de la respuesta.
 * @returns {string} - Cuerpo de respuesta de ejemplo.
 */
function generateResponseExample(structure, responseBodyLength) {
    // Obtener las opciones de respuesta y la estructura
    const serviceNumber = structure.service_structure?.serviceNumber;
    const responseStructure = structure.service_structure?.response;
    
    // Verificar si tenemos una estructura de respuesta válida
    if (!responseStructure || !responseStructure.elements) {
        console.warn(`No se encontró estructura de respuesta válida para servicio ${serviceNumber}`);
        return generateGenericResponseBody(serviceNumber, responseBodyLength);
    }
    
    // Analizar la estructura para identificar campos importantes y ocurrencias
    const { 
        hasOccurrences,
        occurrenceDef,
        countField,
        initialFields,
        occurrenceLength 
    } = analyzeResponseStructure(responseStructure);
    
    console.log(`Análisis de estructura para servicio ${serviceNumber}:`, {
        hasOccurrences,
        countFieldName: countField ? countField.name : 'Ninguno',
        occurrenceLength,
        initialFieldsCount: initialFields.length
    });
    
    // Inicializamos el cuerpo de respuesta
    let responseBody = "";
    
    // Generar un número de ocurrencias para este ejemplo de forma dinámica
    // basándonos únicamente en la estructura, sin hardcodear servicios específicos
    let occurrenceCount = 0;
    if (hasOccurrences) {
        // Para cualquier servicio con ocurrencias, SIEMPRE generar al menos 1 ocurrencia (mínimo 2, máximo 5)
        // Esto asegura que el ejemplo siempre tenga ocurrencias para mostrar
        occurrenceCount = Math.floor(Math.random() * 4) + 2; // Genera entre 2-5 ocurrencias
        
        // Asegurar que nunca sea 0, incluso si hubiera algún error en el cálculo random
        if (occurrenceCount < 1) occurrenceCount = 2;
        
        console.log(`Servicio ${serviceNumber}: Generando ${occurrenceCount} ocurrencias (cada una de ${occurrenceLength} caracteres)`);
    }
    
    // Procesar los campos iniciales (antes de las ocurrencias)
    for (const field of initialFields) {
        const fieldLength = parseInt(field.length) || 0;
        if (fieldLength <= 0) continue;
        
        let fieldValue;
        
        // Si es el campo de contador de ocurrencias, usar el valor real
        if (countField && field.name === countField.name) {
            fieldValue = String(occurrenceCount).padStart(fieldLength, '0');
            console.log(`Campo contador de ocurrencias (${field.name}): ${fieldValue}`);
        } else {
            // Para otros campos, generar valores apropiados según el tipo
            fieldValue = generateFieldValue(field, fieldLength);
        }
        
        responseBody += fieldValue;
    }
    
    // Si hay ocurrencias, generarlas según la estructura
    if (hasOccurrences && occurrenceDef && occurrenceCount > 0) {
        console.log(`Generando ${occurrenceCount} ocurrencias de ${occurrenceLength} caracteres cada una`);
        
        // Generar cada ocurrencia
        for (let i = 0; i < occurrenceCount; i++) {
            const occurrenceValue = generateOccurrenceValue(occurrenceDef, i);
            responseBody += occurrenceValue;
        }
    }
    
    // Asegurar que el cuerpo tenga la longitud total requerida
    console.log(`Longitud actual: ${responseBody.length}, requerida: ${responseBodyLength}`);
    
    // Rellenar hasta la longitud total requerida
    if (responseBody.length < responseBodyLength) {
        responseBody = responseBody.padEnd(responseBodyLength, ' ');
    } else if (responseBody.length > responseBodyLength) {
        // Sólo truncar si la diferencia es pequeña o si es claramente un error de cálculo
        if (responseBody.length - responseBodyLength < 10 || responseBody.length > responseBodyLength * 1.5) {
            console.warn(`ADVERTENCIA: Respuesta generada más larga (${responseBody.length}) que la esperada (${responseBodyLength}). Truncando.`);
            responseBody = responseBody.substring(0, responseBodyLength);
        } else {
            // Si la diferencia es significativa, puede indicar un error en la estructura
            console.error(`ERROR: La respuesta generada (${responseBody.length}) excede sustancialmente la longitud esperada (${responseBodyLength}).`);
        }
    }
    
    return responseBody;
}

/**
 * Analiza la estructura de respuesta para identificar los campos importantes.
 * @param {Object} responseStructure - Estructura de respuesta del servicio.
 * @returns {Object} - Objeto con información analizada.
 */
function analyzeResponseStructure(responseStructure) {
    const elements = responseStructure.elements || [];
    const initialFields = [];
    let occurrenceDef = null;
    let countField = null;
    let hasOccurrences = false;
    
    // Buscar campos iniciales y ocurrencia
    for (const element of elements) {
        if (element.type === 'field') {
            // Es un campo normal, añadirlo a los campos iniciales
            initialFields.push(element);
            
            // Comprobar si es un posible campo de contador de registros
            const fieldName = (element.name || '').toLowerCase();
            if (fieldName.includes('cant') && fieldName.includes('reg')) {
                countField = element;
                console.log(`Campo contador de registros encontrado: ${element.name}`);
            }
        } else if (element.type === 'occurrence') {
            // Encontramos la definición de ocurrencia
            occurrenceDef = element;
            hasOccurrences = true;
            break; // Detenemos el procesamiento de elementos iniciales
        }
    }
    
    // Calcular la longitud de una ocurrencia si existe
    let occurrenceLength = 0;
    if (occurrenceDef && occurrenceDef.elements) {
        occurrenceLength = calculateOccurrenceLength(occurrenceDef.elements);
    }
    
    return {
        hasOccurrences,
        occurrenceDef,
        countField,
        initialFields,
        occurrenceLength
    };
}

/**
 * Calcula la longitud total de una ocurrencia.
 * @param {Array} elements - Elementos de la ocurrencia.
 * @returns {number} - Longitud total en caracteres.
 */
function calculateOccurrenceLength(elements) {
    let length = 0;
    for (const element of elements) {
        if (element.type === 'field') {
            length += parseInt(element.length) || 0;
        }
    }
    return length;
}

/**
 * Genera un valor para un campo específico.
 * @param {Object} field - Definición del campo.
 * @param {number} length - Longitud del campo.
 * @returns {string} - Valor generado para el campo.
 */
function generateFieldValue(field, length) {
    const fieldName = field.name || '';
    const fieldType = (field.fieldType || field.type || '').toLowerCase();
    
    // Generar valor apropiado según el tipo
    if (fieldType === 'numerico') {
        if (fieldName.toLowerCase().includes('estado')) {
            return '00'; // Típico código de éxito
        } else if (fieldName.toLowerCase().includes('mas-datos')) {
            return '0';  // Típicamente no hay más datos
        } else {
            // Para otros campos numéricos, generar números aleatorios
            return Array.from({length}, () => Math.floor(Math.random() * 10)).join('');
        }
    } else {
        // Para campos alfanuméricos, usar el nombre como base
        const baseName = fieldName.replace(/[^A-Za-z0-9]/g, '');
        const prefix = baseName.substring(0, Math.min(length, baseName.length));
        return prefix.padEnd(length, ' ');
    }
}

/**
 * Genera un valor completo para una ocurrencia.
 * @param {Object} occurrenceDef - Definición de la ocurrencia.
 * @param {number} index - Índice de la ocurrencia (0-based).
 * @returns {string} - Valor generado para la ocurrencia.
 */
function generateOccurrenceValue(occurrenceDef, index) {
    const elements = occurrenceDef.elements || [];
    let occurrenceValue = '';
    
    for (const element of elements) {
        if (element.type === 'field') {
            const fieldLength = parseInt(element.length) || 0;
            if (fieldLength <= 0) continue;
            
            let fieldValue = '';
            const fieldName = element.name || '';
            const fieldType = (element.fieldType || element.type || '').toLowerCase();
            
            // Generar valores específicos para campos comunes
            if (fieldName.toLowerCase().includes('inconsist')) {
                // Código de inconsistencia: 00=sin error, otros=con error
                fieldValue = index === 0 ? '00' : String(index).padStart(2, '0');
            } else if (fieldName.toLowerCase().includes('id-ops')) {
                // ID de operación
                fieldValue = `OPS${String(10000 + index).padStart(5, '0')}`;
                fieldValue = fieldValue.padEnd(fieldLength, ' ');
            } else if (fieldName.toLowerCase().includes('nro-oper')) {
                // Número de operación
                fieldValue = String(index + 1).padStart(fieldLength, '0');
            } else if (fieldName.toLowerCase().includes('mens-error') && !fieldName.toLowerCase().includes('trama')) {
                // Mensaje de error
                fieldValue = index === 0 ? 'OPERACION CORRECTA' : `ERROR TIPO ${index}`;
                fieldValue = fieldValue.padEnd(fieldLength, ' ');
            } else if (fieldName.toLowerCase().includes('mens-error-trama')) {
                // Detalle de error
                fieldValue = index === 0 
                    ? 'OPERACION PROCESADA CORRECTAMENTE'
                    : `DETALLE DEL ERROR: SE ENCONTRO UN PROBLEMA EN LA OPERACION TIPO ${index}`;
                fieldValue = fieldValue.padEnd(fieldLength, ' ');
            } else {
                // Para otros campos, generar según el tipo
                if (fieldType === 'numerico') {
                    fieldValue = String(Math.floor(Math.random() * Math.pow(10, fieldLength))).padStart(fieldLength, '0');
                } else {
                    // Campo alfanumérico
                    const prefix = `${fieldName}_${index+1}`.substring(0, Math.min(fieldLength, fieldName.length + 3));
                    fieldValue = prefix.padEnd(fieldLength, ' ');
                }
            }
            
            occurrenceValue += fieldValue;
        }
    }
    
    return occurrenceValue;
}

/**
 * Genera un cuerpo de respuesta genérico cuando no hay estructura específica.
 * @param {string} serviceNumber - Número del servicio.
 * @param {number} responseBodyLength - Longitud deseada del cuerpo.
 * @returns {string} - Cuerpo de respuesta genérico.
 */
function generateGenericResponseBody(serviceNumber, responseBodyLength) {
    // Valores iniciales genéricos
    const body =
        "00" +                      // Estado (éxito) - asumimos 2 posiciones
        "03" +                      // Cantidad de registros - asumimos 2 posiciones
        "0";                        // No hay más datos - asumimos 1 posición
        
    // Añadir datos de ejemplo genérico
    const baseBody = body + "DATOS_EJEMPLO_SERVICIO_" + serviceNumber;
    
    // Rellenar hasta la longitud requerida
    return baseBody.padEnd(responseBodyLength, ' ');
}

/**
 * Genera un string de ejemplo genérico para cualquier servicio.
 * @param {string} serviceNumber - Número del servicio.
 * @returns {string} - String de ejemplo genérico.
 */
function generateGenericExampleString(serviceNumber) {
    // Cabecera estándar de 102 posiciones
    const header = 
        "00102000".padEnd(8, '0') +        // Longitud mensaje
        "API".padEnd(3, ' ') +              // Canal 
        serviceNumber.padEnd(4, ' ') +      // Servicio
        "SISTEMA".padEnd(8, ' ') +          // Usuario 
        "0000".padEnd(4, '0') +             // Código retorno
        getFechaActual() +                  // Fecha operación
        "120000" +                          // Hora
        "USUARIO1".padEnd(7, ' ') +         // Usuario
        "0001" +                            // Ubicación
        "PROCESO COMPLETADO".padEnd(45, ' ') + // Texto respuesta
        "00" +                              // Estado enviado
        "     ";                            // Campo complementario

    // Cuerpo genérico para respuesta (en caso de no tener estructura)
    const body =
        "00" +                              // Estado (finalizado correctamente)
        "01" +                              // Cantidad de registros
        "0" +                               // No más datos
        "".padEnd(400, ' ');                // Espacio para resto de respuesta

    return header + body;
}

/**
 * Devuelve la fecha actual en formato AAAAMMDD.
 * @returns {string} Fecha en formato AAAAMMDD.
 */
function getFechaActual() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Calcula la longitud total de la respuesta sumando campos y ocurrencias.
 * @param {Object} responseStructure - Estructura de respuesta del servicio.
 * @returns {number} - Longitud total calculada en caracteres.
 */
function calculateTotalResponseLength(responseStructure) {
    if (!responseStructure || !responseStructure.elements) {
        return 0;
    }
    
    let totalLength = 0;
    let occurrenceCount = 0;
    let occurrenceLength = 0;
    
    // Primera pasada: calcular campos antes de ocurrencias y encontrar info de ocurrencias
    for (const element of responseStructure.elements) {
        if (element.type === 'field') {
            const fieldLength = parseInt(element.length) || 0;
            totalLength += fieldLength;
            
            // Si es un campo de cantidad de registros, guardar el valor
            const fieldName = (element.name || '').toLowerCase();
            if (fieldName.includes('cant') && fieldName.includes('reg')) {
                // Por defecto usamos 3 ocurrencias para el cálculo si no hay valor específico
                occurrenceCount = 3; 
                console.error(`Campo cantidad de registros encontrado: ${element.name}, usando ${occurrenceCount} ocurrencias para cálculo`);
            }
        } else if (element.type === 'occurrence') {
            // Encontramos definición de ocurrencia, calcular su longitud
            if (element.elements) {
                occurrenceLength = calculateOccurrenceLength(element.elements);
            }
            
            // Si no tenemos count específico del campo, usar el de la ocurrencia o un valor por defecto
            if (occurrenceCount === 0) {
                occurrenceCount = parseInt(element.count) || 3;
            }
            
            break; // No procesamos más allá de la primera ocurrencia
        }
    }
    
    // Añadir longitud de ocurrencias
    if (occurrenceCount > 0 && occurrenceLength > 0) {
        const totalOccurrenceLength = occurrenceCount * occurrenceLength;
        totalLength += totalOccurrenceLength;
        console.error(`Calculando ${occurrenceCount} ocurrencias de ${occurrenceLength} caracteres: ${totalOccurrenceLength}`);
    }
    
    return totalLength;
}

// Exportar funciones para uso en otros archivos
if (typeof module !== 'undefined') {
    module.exports = {
        getExampleStringForService
    };
}
