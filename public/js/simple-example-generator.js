/**
 * simple-example-generator.js
 * 
 * Este módulo proporciona una forma dinámica de generar ejemplos para los servicios de vuelta,
 * basándose en las estructuras definidas para cada servicio.
 */

// Variable global para almacenar la última cantidad de ocurrencias generadas
window.lastGeneratedOccurrenceCount = 0;


// Función para generar ejemplos dinámicamente

/**
 * Genera un ejemplo simple de stream para un servicio específico
 * @param {string} serviceNumber - Número de servicio
 * @returns {Promise<string>} - Stream de ejemplo generado
 */
async function generateSimpleExample(serviceNumber) {
  try {
    // 1. Cargar estructura del servicio
    const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber);
    if (!headerStructure || !serviceStructure) {
      throw new Error(`Estructura no encontrada para el servicio ${serviceNumber}`);
    }
    
    // 2. Generar cabecera con código de retorno exitoso (0000)
    const headerData = {
      CANAL: "API",
      SERVICIO: serviceNumber,
      USUARIO: "SISTEMA",
      "CODIGO-RETORNO": "0000", // Código de éxito
      "TIPO-MENSAJE": "RESP"    // Es una respuesta
    };
    
    // Crear mensaje de cabecera
    const headerMessage = createHeaderMessage(headerStructure, headerData);
    
    // 3. Generar cuerpo de la respuesta con valores aleatorios
    const responseData = generateRandomResponseData(serviceStructure.response);
    
    // 4. Formatear el mensaje de respuesta
    let bodyMessage = "";
    
    // Verificar si tiene estructura de respuesta
    if (serviceStructure.response && serviceStructure.response.elements) {
      // Utilizar el formatDataMessage de message-creator
      bodyMessage = formatRandomResponseMessage(serviceStructure.response);
    }
    
    // 5. Combinar cabecera y cuerpo
    const completeMessage = headerMessage + bodyMessage;
    
    return completeMessage;
  } catch (error) {
    console.error(`Error al generar ejemplo para el servicio ${serviceNumber}:`, error);
    throw error;
  }
}

/**
 * Genera datos de respuesta aleatorios basados en la estructura
 * @param {Object} responseStructure - Estructura de respuesta del servicio
 * @returns {Object} - Datos aleatorios generados
 */
function generateRandomResponseData(responseStructure) {
  const data = {};
  
  if (!responseStructure || !responseStructure.elements) {
    return data;
  }
  
  // Recorrer los elementos de la estructura
  for (const element of responseStructure.elements) {
    if (element.type === 'field') {
      // Generar valor aleatorio para campo
      const fieldName = element.name;
      const fieldLength = element.length;
      const fieldType = element.fieldType || element.type;
      
      // Generar valores significativos según nombre del campo
      let value = '';
      
      if (fieldName.includes('ESTADO') || fieldName.includes('CODIGO')) {
        value = '00'; // Código exitoso por defecto
      } else if (fieldName.includes('CANT') || fieldName.includes('CAN-REG')) {
        // Cantidad de registros - para ocurrencias
        // Debe coincidir con el count de las ocurrencias que generemos después
        const occElement = responseStructure.elements.find(e => e.type === 'occurrence');
        value = occElement ? String(occElement.count || 3) : '03';
      } else {
        // Generar valor aleatorio según tipo
        value = generateRandomValue(fieldLength, fieldType);
      }
      
      data[fieldName] = value;
      
    } else if (element.type === 'occurrence') {
      // Generar ocurrencias aleatorias
      const occurrenceId = element.id || `occ_${element.index}`;
      const occurrenceCount = element.count || 3; // Por defecto, 3 ocurrencias
      
      // Actualizar cantidad de registros en un campo relacionado si existe
      const cantRegField = Object.keys(data).find(key => 
        key.includes('CANT-REG') || key.includes('CAN-REG') || key.includes('CANT_REG'));
      if (cantRegField) {
        data[cantRegField] = String(occurrenceCount).padStart(2, '0');
      }
      
      // Generar array de ocurrencias
      const occurrences = [];
      
      for (let i = 0; i < occurrenceCount; i++) {
        const occurrenceItem = {
          index: i // Mantener índice para preservar orden
        };
        
        // Generar valores para los campos de la ocurrencia
        if (element.fields) {
          for (const field of element.fields) {
            if (field.type === 'field') {
              const fieldName = field.name;
              const fieldLength = field.length;
              const fieldType = field.fieldType || field.type;
              
              // Generar valor significativo según nombre
              let value = '';
              
              if (fieldName.includes('ID') || fieldName.includes('CODIGO')) {
                // Generar IDs o códigos únicos
                value = String(100000 + i).padStart(fieldLength, '0').substring(0, fieldLength);
              } else if (fieldName.includes('MONTO') || fieldName.includes('IMPORTE')) {
                // Generar montos significativos
                const amount = Math.floor(1000 + Math.random() * 9000);
                value = String(amount).padStart(fieldLength, '0').substring(0, fieldLength);
              } else if (fieldName.includes('FECHA')) {
                // Generar fechas
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                value = `${year}${month}${day}`.substring(0, fieldLength);
              } else if (fieldName.includes('NOMBRE') || fieldName.includes('RAZON')) {
                // Nombres genéricos
                const names = ['JUAN PEREZ', 'MARIA GOMEZ', 'EMPRESA SA', 'COMERCIO XYZ'];
                value = names[i % names.length].padEnd(fieldLength, ' ').substring(0, fieldLength);
              } else {
                // Valor aleatorio
                value = generateRandomValue(fieldLength, fieldType);
              }
              
              occurrenceItem[fieldName] = value;
            } else if (field.type === 'occurrence') {
              // Ocurrencias anidadas
              const nestedOccId = field.id || `occ_${field.index}`;
              const nestedCount = field.count || 2;
              
              const nestedOccurrences = [];
              
              for (let j = 0; j < nestedCount; j++) {
                const nestedItem = {
                  index: j
                };
                
                // Generar valores para campos anidados
                if (field.fields) {
                  for (const nestedField of field.fields) {
                    if (nestedField.type === 'field') {
                      const nestedName = nestedField.name;
                      const nestedLength = nestedField.length;
                      const nestedType = nestedField.fieldType || nestedField.type;
                      
                      nestedItem[nestedName] = generateRandomValue(nestedLength, nestedType);
                    }
                  }
                }
                
                nestedOccurrences.push(nestedItem);
              }
              
              occurrenceItem[nestedOccId] = nestedOccurrences;
            }
          }
        }
        
        occurrences.push(occurrenceItem);
      }
      
      data[occurrenceId] = occurrences;
    }
  }
  
  return data;
}

/**
 * Formatea un mensaje de respuesta aleatorio basado en la estructura
 * @param {Object} responseStructure - Estructura de respuesta del servicio
 * @returns {string} - Mensaje de respuesta formateado
 */
function formatRandomResponseMessage(responseStructure) {
  let message = '';
  
  if (!responseStructure || !responseStructure.elements) {
    return message;
  }
  
  // Recorrer los elementos de la estructura
  for (const element of responseStructure.elements) {
    if (element.type === 'field') {
      // Formatear campo
      const fieldLength = element.length;
      const fieldType = element.fieldType || element.type;
      
      // Generar valor aleatorio
      const fieldValue = generateRandomValue(fieldLength, fieldType);
      
      // Agregar al mensaje
      message += fieldValue;
      
    } else if (element.type === 'occurrence') {
      // Formatear ocurrencias
      const occurrenceCount = element.count || 3;
      
      // Primero agregar contador de ocurrencias si es necesario
      // (en algunos formatos se incluye un número de 2 dígitos)
      if (responseStructure.elements.some(e => e.name && 
         (e.name.includes('CANT-REG') || e.name.includes('CAN-REG')))) {
        message += String(occurrenceCount).padStart(2, '0');
      }
      
      // Luego formatear cada ocurrencia
      for (let i = 0; i < occurrenceCount; i++) {
        // Para cada campo de la ocurrencia
        if (element.fields) {
          for (const field of element.fields) {
            if (field.type === 'field') {
              const fieldLength = field.length;
              const fieldType = field.fieldType || field.type;
              
              // Generar valor aleatorio
              const fieldValue = generateRandomValue(fieldLength, fieldType);
              
              // Agregar al mensaje
              message += fieldValue;
              
            } else if (field.type === 'occurrence') {
              // Formatear ocurrencias anidadas
              const nestedCount = field.count || 2;
              
              // Primero agregar contador si es necesario
              if (field.fields && field.fields.some(f => f.name && 
                 (f.name.includes('CANT-REG') || f.name.includes('CAN-REG')))) {
                message += String(nestedCount).padStart(2, '0');
              }
              
              // Luego formatear cada ocurrencia anidada
              for (let j = 0; j < nestedCount; j++) {
                if (field.fields) {
                  for (const nestedField of field.fields) {
                    if (nestedField.type === 'field') {
                      const nestedLength = nestedField.length;
                      const nestedType = nestedField.fieldType || nestedField.type;
                      
                      // Generar valor aleatorio
                      const nestedValue = generateRandomValue(nestedLength, nestedType);
                      
                      // Agregar al mensaje
                      message += nestedValue;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  return message;
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
  const isNumeric = type === 'numerico' || type === 'numeric' ||
                   type === 'number' || type.includes('num');

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


/**
 * Obtiene la estructura del servicio mediante una llamada al servidor
 * @param {string} serviceNumber - Número del servicio
 * @returns {Promise<Object>} - Estructura del servicio
 */
function fetchServiceStructure(serviceNumber) {
    return fetch(`/excel/structure-by-service?service_number=${serviceNumber}`)
        .then(response => {
            if (!response.ok) throw new Error(`Error ${response.status} al obtener estructura`);
            return response.json();
        });
}

/**
 * Calcula la longitud total de una ocurrencia basada en sus campos
 * @param {Array} fields - Campos de la ocurrencia
 * @returns {number} - Longitud total calculada
 */
function calculateOccurrenceLength(fields) {
    if (!fields || !Array.isArray(fields)) return 100; // Valor por defecto
    
    let totalLength = 0;
    
    console.log(`Calculando longitud para ${fields.length} campos en la ocurrencia...`);
    
    for (const field of fields) {
        if (field.type === 'field' && field.length) {
            const fieldLength = parseInt(field.length) || 0;
            totalLength += fieldLength;
            console.log(`  Campo: ${field.name}, longitud: ${fieldLength}`);
        } else if (field.type === 'occurrence' && field.count) {
            // Para ocurrencias anidadas, multiplicar por la cantidad
            let nestedFields = field.fields || field.elements || [];
            if (!Array.isArray(nestedFields)) nestedFields = [];
            
            const nestedLength = calculateOccurrenceLength(nestedFields);
            const count = parseInt(field.count) || 1;
            const subtotal = nestedLength * count;
            totalLength += subtotal;
            console.log(`  Ocurrencia anidada: ${field.id || 'sin ID'}, ${count} x ${nestedLength} = ${subtotal}`);
        } else {
            console.log(`  Campo no reconocido: ${field.type || 'sin tipo'}, ${field.name || 'sin nombre'}`);
        }
    }
    
    // NO aplicamos ajustes arbitrarios, usamos exactamente lo que define la estructura
    if (totalLength > 0) {
        // Mostrar la longitud calculada directamente de los campos
        console.log(`  [INFO] Longitud total calculada sumando campos: ${totalLength} caracteres`);
        console.log(`  [INFO] Usando longitud exacta de la estructura sin ajustes adicionales`);
    }
    
    console.log(`Longitud final calculada para la ocurrencia: ${totalLength}`);
    return totalLength > 0 ? totalLength : 100; // Mínimo 100 caracteres
}
    
// Se elimina esta parte porque ahora generamos ejemplos dinámicamente

/**
 * Genera una cabecera para el ejemplo buscando dinámicamente en la carpeta headers
 * @param {string} serviceNumber - Número del servicio
 * @param {number} headerLength - Longitud esperada de la cabecera
 * @returns {Promise<string>} - Promise que resuelve a la cabecera generada con la longitud especificada
 */
function generateSimpleHeader(serviceNumber, headerLength) {
    console.log(`[HEADER] Buscando header para servicio ${serviceNumber}`);
    
    // Intentar cargar el header dinámicamente desde el servidor
    return fetch(`/headers/${serviceNumber}_header_sample.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`No se encontró header para servicio ${serviceNumber}`);
            }
            return response.json();
        })
        .then(data => {
            const headerValue = data.value;
            console.log(`[HEADER] Header encontrado para servicio ${serviceNumber}: ${headerValue}`);
            
            // Ajustar la longitud si es necesario
            if (headerValue.length !== headerLength) {
                console.log(`[HEADER] Ajustando longitud del header: ${headerValue.length} → ${headerLength} caracteres`);
                
                if (headerValue.length < headerLength) {
                    return headerValue.padEnd(headerLength, ' ');
                } else {
                    return headerValue.substring(0, headerLength);
                }
            }
            
            return headerValue;
        })
        .catch(error => {
            // Si no se encuentra el header o hay algún error, generar uno genérico
            console.log(`[HEADER] ${error.message}, generando uno dinámico`);
            
            const headerValue = String(headerLength).padStart(8, '0') +    // Longitud del mensaje (8 posiciones)
                          "API" +                                     // Canal (3 posiciones)
                          serviceNumber.padEnd(4, ' ') +              // Servicio (4 posiciones)
                          "SISTEMA" +                                 // Usuario (7 posiciones)
                          "0000" +                                    // Código de retorno (4 posiciones)
                          getCurrentDate() +                          // Fecha (8 posiciones)
                          "120000" +                                  // Hora (6 posiciones)
                          "USUARIO1" +                                // Usuario (7 posiciones)
                          "0001" +                                    // Ubicación (4 posiciones)
                          "EJEMPLO GENERADO DINAMICAMENTE".padEnd(45, ' ') + // Texto (45 posiciones)
                          "00" +                                      // Estado enviado (2 posiciones)
                          "     ";                                    // Campo complementario (5 posiciones)
                          
            return headerValue.length !== headerLength ? 
                   headerValue.padEnd(headerLength, ' ').substring(0, headerLength) : 
                   headerValue;
        });
}

/**
 * Genera una ocurrencia simple para el ejemplo
 * @param {number} index - Índice de la ocurrencia (0-based)
 * @param {number} length - Longitud de la ocurrencia
 * @returns {string} - Ocurrencia generada
 */
function generateSimpleOccurrence(index, length) {
    console.log(`Generando ocurrencia ${index} con longitud ${length}`);
    
    // Simplemente generamos una cadena de texto del tamaño exacto
    // Evitamos usar valores hardcodeados y simplemente rellenamos con datos genéricos
    let occurrence = '';
    
    // La primera parte de la ocurrencia usa valores con algún significado
    const inconsistCode = index > 0 ? String(index).padStart(2, '0') : "00";
    occurrence += inconsistCode;
    
    // El resto simplemente lo rellenamos como espacios genéricos hasta alcanzar la longitud exacta
    // Este enfoque es completamente dinámico y no depende de ningún servicio específico
    const remainingLength = length - inconsistCode.length;
    
    // Ajustar exactamente a la longitud requerida
    if (remainingLength > 0) {
        occurrence += " ".repeat(remainingLength);
    }
    
    // Log adicional para verificar la longitud exacta
    console.log(`  [DEBUG OCURRENCIA] Longitud final de ocurrencia ${index}: ${occurrence.length} caracteres (esperado: ${length})`);
    
    // Verificación final
    if (occurrence.length !== length) {
        console.error(`  [ALERTA] La ocurrencia ${index} tiene ${occurrence.length} caracteres pero debería tener EXACTAMENTE ${length}!`);
        // Forzar longitud correcta
        occurrence = occurrence.padEnd(length, ' ').substring(0, length);
        console.log(`  [CORRECCIÓN] Longitud corregida a ${occurrence.length} caracteres`);
    }
    
    return occurrence;
}

/**
 * Obtiene la fecha actual en formato AAAAMMDD
 * @returns {string} - Fecha en formato AAAAMMDD
 */
function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// Exportar función para uso global
window.generateSimpleExample = generateSimpleExample;
