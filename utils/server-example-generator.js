/**
 * utils/server-example-generator.js
 * 
 * Versión para servidor del generador de ejemplos dinámicos
 * Basado en public/js/simple-example-generator.js pero adaptado para Node.js
 */

const path = require('path');
const fs = require('fs-extra');
const messageAnalyzer = require('../api/message-analyzer');

/**
 * Genera un ejemplo dinámico para un servicio
 * @param {string} serviceNumber - Número de servicio
 * @param {Object} structures - Estructuras del servicio ya cargadas
 * @returns {string} - String simulado de respuesta
 */
async function generateServerExample(serviceNumber, structures) {
  const { headerStructure, serviceStructure } = structures;
  console.log(`Generando ejemplo dinámico para servicio ${serviceNumber}`);
  
  // Guardar la estructura del servicio en una variable global para que pueda ser accedida por generateSimpleOccurrence
  global.currentServiceStructure = serviceStructure;
  console.log(`[DEBUG-GLOBAL] Guardada estructura del servicio ${serviceNumber} en variable global`);
  
  try {
    // 1. Generar la cabecera (reutilizar la cabecera de la solicitud con código de retorno exitoso)
    const headerLength = headerStructure.totalLength || 102;
    const header = await generateSimpleHeader(serviceNumber, headerLength);
    
    // 2. Determinar el número de ocurrencias (entre 2-5 ocurrencias)
    const occurrenceCount = Math.floor(Math.random() * 4) + 2;
    console.log(`Generando ${occurrenceCount} ocurrencias para el ejemplo ${serviceNumber}`);
    
    // 3. Calcular la longitud de cada ocurrencia basada en la estructura
    let occurrenceLength = 10; // Valor por defecto
    
    // Buscar elementos de tipo ocurrencia en la estructura de respuesta
    if (serviceStructure.response && serviceStructure.response.elements) {
      const elements = serviceStructure.response.elements;
      for (const element of elements) {
        if (element.type === 'occurrence' && element.fields) {
          // Calcular longitud basada en los campos definidos
          occurrenceLength = calculateOccurrenceLength(element.fields);
          console.log(`Longitud de ocurrencia calculada: ${occurrenceLength}`);
          break;
        }
      }
    }
    
    // 4. Construir el cuerpo de la respuesta
    let body = '';
    let prefixLength = 0;
    let prefixFields = [];
    let isNumeric = false;
    
    // Examinar los elementos en la estructura de respuesta para identificar los campos
    if (serviceStructure.response && serviceStructure.response.elements) {
      const elements = serviceStructure.response.elements;
      
      console.log(`[ESTRUCTURA] Analizando campos previos a ocurrencias...`);
      
      // Encontrar el índice de la primera ocurrencia
      let firstOccurrenceIndex = -1;
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].type === 'occurrence') {
          firstOccurrenceIndex = i;
          break;
        }
      }
      
      // Procesar campos antes de la primera ocurrencia
      for (let i = 0; i < elements.length; i++) {
        // Si llegamos a la primera ocurrencia, saltamos a los campos después de todas las ocurrencias
        if (i === firstOccurrenceIndex) {
          continue;
        }
        
        // Si estamos después de la primera ocurrencia pero hay otra ocurrencia, la saltamos
        if (i > firstOccurrenceIndex && elements[i].type === 'occurrence') {
          continue;
        }
        
        const element = elements[i];
        
        if (element.type === 'field' && element.length) {
          const fieldName = element.name;
          const fieldLength = parseInt(element.length) || 0;
          
          // Generar un valor apropiado según el campo
          let fieldValue = '';
          
          // Determinar el tipo de campo (numérico o alfanumérico)
        
          console.log("ELEMENT")
          console.log(element)

           let fieldType = (element.fieldType).toLowerCase();

          isNumeric = (fieldType == 'numerico')
         
          // Intentar determinar el valor apropiado según el nombre del campo
          if (fieldName.toLowerCase().includes('estado')) {
            fieldValue = '00'; // Estado éxito
          } else if (fieldName.toLowerCase().includes('cant') && fieldName.toLowerCase().includes('reg')) {
            fieldValue = String(occurrenceCount).padStart(fieldLength, '0'); // Cantidad de registros
          } else if (fieldName.toLowerCase().includes('mas') && fieldName.toLowerCase().includes('dato')) {
            fieldValue = '0'; // No hay más datos
          } else {
            // Para otros campos, generar valores genéricos según su tipo
            if (isNumeric) {
              fieldValue = '0'.repeat(fieldLength); // Campos numéricos rellenados con ceros
            } else {
              fieldValue = ' '.repeat(fieldLength); // Campos alfanuméricos rellenados con espacios
            }
          }
          
          // Asegurar que el valor tenga la longitud correcta
          if (fieldValue.length > fieldLength) {
            fieldValue = fieldValue.substring(0, fieldLength);
          } else if (fieldValue.length < fieldLength) {
            // Relleno según tipo de campo
            if (isNumeric) {
              fieldValue = fieldValue.padStart(fieldLength, '0');
            } else {
              fieldValue = fieldValue.padEnd(fieldLength, ' ');
            }
          }
          
          // Añadir el campo al cuerpo y a la lista de campos
          body += fieldValue;
          prefixLength += fieldLength;
          prefixFields.push({ name: fieldName, length: fieldLength, value: fieldValue });

        
        }
      }
    }
    
    // 5. Añadir ocurrencias con la longitud calculada dinámicamente
    for (let i = 0; i < occurrenceCount; i++) {
      body += generateSimpleOccurrence(i, occurrenceLength);
    }
    
    // 6. Procesar campos después de las ocurrencias
    if (serviceStructure.response && serviceStructure.response.elements) {
      const elements = serviceStructure.response.elements;
      let foundOccurrence = false;
      
      console.log(`[DEBUG-STRUCTURE] Procesando ${elements.length} elementos en la estructura de respuesta`);
      
      for (let i = 0; i < elements.length; i++) {
        console.log(`[DEBUG-STRUCTURE] Elemento ${i}: tipo=${elements[i].type}, nombre=${elements[i].name || 'sin nombre'}, índice=${elements[i].index || 'sin índice'}`);
        
        // Si encontramos una ocurrencia, marcamos que ya pasamos por ella
        if (elements[i].type === 'occurrence') {
          console.log(`[DEBUG-STRUCTURE] Encontrada ocurrencia en posición ${i}, índice=${elements[i].index}`);
          foundOccurrence = true;
          continue;
        }
        
        // Si ya pasamos por una ocurrencia y este es un campo, lo procesamos
        if (foundOccurrence && elements[i].type === 'field') {
          const fieldName = elements[i].name;
          const fieldLength = parseInt(elements[i].length) || 0;
          
          if (fieldLength <= 0) {
            console.log(`[DEBUG-STRUCTURE] Campo ${fieldName} con longitud inválida: ${fieldLength}, saltando`);
            continue;
          }
          
          // Generar un valor apropiado según el campo
          let fieldValue = '';

          // Determinar el tipo de campo (numérico o alfanumérico)
          const fieldType = (elements[i].fieldType || elements[i].type || '').toLowerCase();
          isNumeric = fieldType === 'numerico' || fieldType === 'numeric' ||
                           fieldType === 'number' || fieldType.includes('num');
          
          console.log(`[DEBUG-STRUCTURE] Campo ${fieldName}, longitud=${fieldLength}, tipo=${fieldType}, isNumeric=${isNumeric}`);
          console.log(`[DEBUG-STRUCTURE] Elemento completo: ${JSON.stringify(elements[i])}`);
          
          // Para campos después de ocurrencias, generar valores aleatorios según su tipo
          fieldValue = generateRandomValue(fieldLength, fieldType);
          console.log(`[DEBUG-STRUCTURE] Generando valor aleatorio para ${fieldName}: "${fieldValue}"`);
          
          // Añadir el campo al cuerpo
          body += fieldValue;
          console.log(`[DEBUG-STRUCTURE] Añadido campo ${fieldName} al cuerpo, longitud actual: ${body.length}`);
        }
      }
    } else {
      console.log(`[DEBUG-STRUCTURE] No se encontró estructura de respuesta válida`);
    }
    
    // 7. Combinar cabecera y cuerpo
    const fullExample = header + body;
    console.log(`Ejemplo generado: ${fullExample.length} caracteres (cabecera: ${header.length}, cuerpo: ${body.length})`);
    
    return fullExample;
    
  } catch (error) {
    console.error(`Error al generar ejemplo: ${error.message}`);
    throw error;
  }
}

/**
 * Genera una cabecera para el ejemplo
 * @param {string} serviceNumber - Número del servicio
 * @param {number} headerLength - Longitud esperada de la cabecera
 * @returns {Promise<string>} - Cabecera generada con la longitud especificada
 */
async function generateSimpleHeader(serviceNumber, headerLength) {
  try {
    // Intentar cargar el header desde el archivo
    const headerPath = path.join(__dirname, '..', 'headers', `${serviceNumber}_header_sample.json`);
    
    if (await fs.exists(headerPath)) {
      const headerFile = await fs.readJson(headerPath);
      const headerValue = headerFile.value;
      
      // Ajustar la longitud si es necesario
      if (headerValue.length !== headerLength) {
        if (headerValue.length < headerLength) {
          return headerValue.padEnd(headerLength, ' ');
        } else {
          return headerValue.substring(0, headerLength);
        }
      }
      
      return headerValue;
    }
    
    // Si no se encuentra el archivo, generar un header genérico
    const currentDate = new Date();
    const dateStr = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(currentDate.getHours()).padStart(2, '0')}${String(currentDate.getMinutes()).padStart(2, '0')}${String(currentDate.getSeconds()).padStart(2, '0')}`;
    
    const headerValue = String(headerLength).padStart(8, '0') +    // Longitud del mensaje (8 posiciones)
                  "API" +                                     // Canal (3 posiciones)
                  serviceNumber.padEnd(4, ' ') +              // Servicio (4 posiciones)
                  "0000" +                                    // Código de retorno (4 posiciones)
                  "000000001" +                               // ID del mensaje (9 posiciones)
                  dateStr +                                   // Fecha (8 posiciones)
                  timeStr.substring(0, 6) +                   // Hora (6 posiciones)
                  "SISTEMA " +                                // Usuario (8 posiciones)
                  "1000" +                                    // Ubicación (4 posiciones)
                  "EJEMPLO GENERADO DINAMICAMENTE".padEnd(45, ' ') + // Texto (45 posiciones)
                  "00" +                                      // Estado enviado (2 posiciones)
                  "     ";                                    // Campo complementario (5 posiciones)
                  
    return headerValue.length !== headerLength ? 
           headerValue.padEnd(headerLength, ' ').substring(0, headerLength) : 
           headerValue;
  } catch (error) {
    console.error(`Error generando cabecera: ${error.message}`);
    
    // En caso de error, generar una cabecera básica
    return ' '.repeat(headerLength);
  }
}

/**
 * Calcula la longitud total de una ocurrencia basada en sus campos
 * @param {Array} fields - Campos de la ocurrencia
 * @returns {number} - Longitud total calculada
 */
function calculateOccurrenceLength(fields) {
  if (!fields || !Array.isArray(fields)) return 100; // Valor por defecto
  
  let totalLength = 0;
  
  for (const field of fields) {
    if (field.type === 'field' && field.length) {
      const fieldLength = parseInt(field.length) || 0;
      totalLength += fieldLength;
    } else if (field.type === 'occurrence' && field.count) {
      // Para ocurrencias anidadas, multiplicar por la cantidad
      let nestedFields = field.fields || field.elements || [];
      if (!Array.isArray(nestedFields)) nestedFields = [];
      
      const nestedLength = calculateOccurrenceLength(nestedFields);
      const count = parseInt(field.count) || 1;
      totalLength += nestedLength * count;
    }
  }
  
  return totalLength > 0 ? totalLength : 100; // Mínimo 100 caracteres
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
 
  let isNumeric= false;
  
  // Verificar explícitamente si es numérico o alfanumérico
  isNumeric = (fieldType == 'numerico');
  
  console.log(`[DEBUG-RANDOM] Generando valor aleatorio para campo de longitud ${numLength}, tipo: ${fieldType}, isNumeric: ${isNumeric}`);
  
  // Generar valor aleatorio según el tipo
  let value = '';
  
  if (isNumeric) {
    // Para campos numéricos, SOLO generar dígitos (0-9)
    // Con 30% de probabilidad, generar todos ceros (valor por defecto)
    if (Math.random() < 0.3) {
      value = '0'.repeat(numLength);
      console.log(`[DEBUG-RANDOM] Generando valor numérico por defecto (ceros): "${value}"`);
    } else {
      // Generar un número aleatorio con la longitud especificada
      // Asegurarnos de que solo contenga dígitos
      for (let i = 0; i < numLength; i++) {
        // Para el primer dígito, permitir que sea 0 solo si la longitud es 1
        if (i === 0 && numLength > 1) {
          value += Math.floor(Math.random() * 9) + 1; // 1-9 para el primer dígito
        } else {
          value += Math.floor(Math.random() * 10); // 0-9 para el resto
        }
      }
      console.log(`[DEBUG-RANDOM] Generando valor numérico aleatorio: "${value}"`);
    }
  } else {
    // Para campos alfanuméricos
    // Con 30% de probabilidad, generar todos espacios (valor por defecto)
    if (Math.random() < 0.3) {
      value = ' '.repeat(numLength);
      console.log(`[DEBUG-RANDOM] Generando valor alfanumérico por defecto (espacios): "${value}"`);
    } else {
      // Caracteres permitidos para campos alfanuméricos
      // Incluir letras, números y espacios
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
      for (let i = 0; i < numLength; i++) {
        value += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      console.log(`[DEBUG-RANDOM] Generando valor alfanumérico aleatorio: "${value}"`);
    }
  }
  
  // Verificación final para asegurar que la longitud sea exactamente la requerida
  if (value.length !== numLength) {
    console.log(`[DEBUG-RANDOM] ¡ADVERTENCIA! Longitud incorrecta: ${value.length}, ajustando a ${numLength}`);
    if (value.length > numLength) {
      value = value.substring(0, numLength);
    } else {
      // Rellenar según el tipo
      if (isNumeric) {
        value = value.padStart(numLength, '0');
      } else {
        value = value.padEnd(numLength, ' ');
      }
    }
    console.log(`[DEBUG-RANDOM] Valor ajustado: "${value}"`);
  }
  
  return value;
}

/**
 * Genera una ocurrencia simple para el ejemplo
 * @param {number} index - Índice de la ocurrencia (0-based)
 * @param {number} length - Longitud de la ocurrencia
 * @returns {string} - Ocurrencia generada
 */
function generateSimpleOccurrence(index, length) {
  console.log(`[DEBUG-OCCURRENCE] Generando ocurrencia ${index} con longitud ${length}`);
  
  // Buscar la estructura de ocurrencia en la estructura del servicio
  let occurrenceStructure = null;
  let occurrenceFields = [];
  let isNumeric =false;
  

  try {
    // Intentar obtener la estructura de la ocurrencia desde el contexto global
    if (global.currentServiceStructure &&
        global.currentServiceStructure.response &&
        global.currentServiceStructure.response.elements) {
      
      const elements = global.currentServiceStructure.response.elements;
      
      // Buscar el elemento de tipo ocurrencia
      for (const element of elements) {
        if (element.type === 'occurrence' && element.fields) {
          occurrenceStructure = element;
          occurrenceFields = element.fields;
          console.log(`[DEBUG-OCCURRENCE] Encontrada estructura de ocurrencia: ${element.id || 'sin ID'}, campos: ${occurrenceFields.length}`);
          break;
        }
      }
    }
  } catch (error) {
    console.error(`[DEBUG-OCCURRENCE] Error al buscar estructura de ocurrencia: ${error.message}`);
  }
  
  // Generar valores específicos para campos dentro de ocurrencias
  // El índice (que a menudo es usado como código) será numérico
  const prefixCode = String(index).padStart(2, '0');
  console.log(`[DEBUG-OCCURRENCE] Generando prefijo numérico: "${prefixCode}"`);
  
  // Para el resto de la ocurrencia, usamos una mezcla de espacios (para alfanuméricos)
  // y ceros (para numéricos) según la estructura
  let occurrence = prefixCode;
  
  // Si tenemos la estructura de la ocurrencia, generar valores según el tipo de campo
  if (occurrenceFields.length > 0) {
    console.log(`[DEBUG-OCCURRENCE] Usando estructura para generar ${occurrenceFields.length} campos`);
    
    // Reiniciar la ocurrencia para generarla completa según la estructura
    occurrence = '';
    
    for (const field of occurrenceFields) {
      if (field.type !== 'field') continue;
      
      const fieldName = field.name;
      const fieldLength = parseInt(field.length) || 0;
      
      if (fieldLength <= 0) {
        console.log(`[DEBUG-OCCURRENCE] Campo ${fieldName} con longitud inválida: ${fieldLength}, saltando`);
        continue;
      }
     
      // Determinar el tipo de campo (numérico o alfanumérico)
      const fieldType = field.fieldType

      isNumeric = (fieldType === 'numerico')
      
      console.log(`[DEBUG-OCCURRENCE] Campo ${fieldName}, longitud=${fieldLength}, tipo=${fieldType}, isNumeric=${isNumeric}`);

          
      // Generar valor según el tipo
      let fieldValue = '';

        
      // Para el primer campo de la ocurrencia, usar el índice como valor

      if (field === occurrenceFields[0]) {

        fieldValue = prefixCode;

        // Formatear el valor según el tipo usando la función formatValue
 
       //EL ERROR ESTA ACA

        fieldValue = messageAnalyzer.formatValue(fieldValue, fieldLength, fieldType);

      } else {

        // Para el resto de campos, generar valores aleatorios según el tipo
        fieldValue = generateRandomValue(fieldLength, fieldType);
      }
      
      console.log(`[DEBUG-OCCURRENCE] Valor generado para ${fieldName}: "${fieldValue}"`);
      occurrence += fieldValue;
    }
    
    console.log(`[DEBUG-OCCURRENCE] Ocurrencia generada con estructura: "${occurrence}", longitud: ${occurrence.length}`);
  } else {
    // Si no tenemos estructura, generar de forma genérica
    console.log(`[DEBUG-OCCURRENCE] No se encontró estructura, generando ocurrencia genérica`);
    
    // El resto lo rellenamos como espacios
    const remainingLength = length - prefixCode.length;
    if (remainingLength > 0) {
      occurrence += " ".repeat(remainingLength);
    }
  }
  
  // Verificación final de longitud
  if (occurrence.length !== length) {
    console.log(`[DEBUG-OCCURRENCE] Ajustando longitud de ${occurrence.length} a ${length}`);
    occurrence = occurrence.padEnd(length, ' ').substring(0, length);
  }
  
  console.log(`[DEBUG-OCCURRENCE] Ocurrencia final: "${occurrence}", longitud: ${occurrence.length}`);
  return occurrence;
}

module.exports = {
  generateServerExample
};
