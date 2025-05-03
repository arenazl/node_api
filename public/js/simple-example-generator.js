/**
 * simple-example-generator.js
 * 
 * Este módulo proporciona una forma dinámica de generar ejemplos para los servicios de vuelta,
 * basándose en las estructuras definidas para cada servicio.
 */

// Variable global para almacenar la última cantidad de ocurrencias generadas
window.lastGeneratedOccurrenceCount = 0;

// Función para generar ejemplos dinámicamente
function generateSimpleExample(serviceNumber) {
    console.log(`Generando ejemplo dinámico para servicio ${serviceNumber}`);
    
    // 1. Primero obtenemos la estructura del servicio para saber cómo construir el ejemplo
    return fetchServiceStructure(serviceNumber)
        .then(structure => {
            console.log(`Estructura obtenida para servicio ${serviceNumber}`);
            
            // 2. Generar la cabecera basada en la estructura real
            const headerLength = structure.header_structure?.totalLength || 102;
            return generateSimpleHeader(serviceNumber, headerLength)
                .then(header => {
                    // 3. Determinar el número de ocurrencias aleatoriamente (entre 2-5 ocurrencias para cualquier servicio)
                    const occurrenceCount = Math.floor(Math.random() * 4) + 2;
                    console.log(`Generando ${occurrenceCount} ocurrencias para el ejemplo ${serviceNumber}`);
                    
                    // Guardar el contador de ocurrencias en la variable global para que otros módulos puedan usarlo
                    window.lastGeneratedOccurrenceCount = occurrenceCount;
                    
                    // 4. Calcular la longitud de cada ocurrencia basada en la estructura
                    let occurrenceLength = 100; // Valor por defecto
                    
                    // Buscar elementos de tipo ocurrencia en la estructura de respuesta
                    if (structure.service_structure?.response?.elements) {
                        const elements = structure.service_structure.response.elements;
                        for (const element of elements) {
                            if (element.type === 'occurrence' && element.fields) {
                                // Calcular longitud basada en los campos definidos
                                occurrenceLength = calculateOccurrenceLength(element.fields);
                                console.log(`Longitud de ocurrencia calculada a partir de la estructura: ${occurrenceLength}`);
                                break;
                            }
                        }
                    }
                    
                    // 5. Construir el cuerpo de la respuesta
                    // Usar la estructura del servicio para generar los campos previos a las ocurrencias
                    let body = '';
                    let prefixLength = 0;
                    let prefixFields = [];
                    
                    // Examinar los elementos en la estructura de respuesta para identificar los campos previos
                    if (structure.service_structure?.response?.elements) {
                        const elements = structure.service_structure.response.elements;
                        
                        console.log(`[ESTRUCTURA] Analizando campos previos a ocurrencias...`);
                        
                        // Procesar campos hasta encontrar la primera ocurrencia
                        for (const element of elements) {
                            if (element.type === 'occurrence') {
                                break; // Terminar al encontrar la primera ocurrencia
                            }
                            
                            if (element.type === 'field' && element.length) {
                                const fieldName = element.name;
                                const fieldLength = parseInt(element.length) || 0;
                                
                                // Generar un valor apropiado según el campo
                                let fieldValue = '';
                                
                                // Intentar determinar el valor apropiado según el nombre del campo
                                if (fieldName.toLowerCase().includes('estado')) {
                                    fieldValue = '00'; // Estado éxito
                                } else if (fieldName.toLowerCase().includes('cant') && fieldName.toLowerCase().includes('reg')) {
                                    fieldValue = String(occurrenceCount).padStart(fieldLength, '0'); // Cantidad de registros
                                } else if (fieldName.toLowerCase().includes('mas') && fieldName.toLowerCase().includes('dato')) {
                                    fieldValue = '0'; // No hay más datos
                                } else {
                                    // Para otros campos, generar valores genéricos según su longitud
                                    fieldValue = '0'.repeat(fieldLength);
                                }
                                
                                // Asegurar que el valor tenga la longitud correcta
                                if (fieldValue.length > fieldLength) {
                                    fieldValue = fieldValue.substring(0, fieldLength);
                                } else if (fieldValue.length < fieldLength) {
                                    fieldValue = fieldValue.padEnd(fieldLength, ' ');
                                }
                                
                                // Añadir el campo al cuerpo y a la lista de campos
                                body += fieldValue;
                                prefixLength += fieldLength;
                                prefixFields.push({ name: fieldName, length: fieldLength, value: fieldValue });
                                
                                console.log(`[ESTRUCTURA] Campo previo: ${fieldName}, longitud: ${fieldLength}, valor: "${fieldValue}"`);
                            }
                        }
                        
                        console.log(`[ESTRUCTURA] Total campos previos: ${prefixFields.length}, longitud total: ${prefixLength} caracteres`);
                    }
                    
                    // Añadir ocurrencias con la longitud calculada dinámicamente
                    for (let i = 0; i < occurrenceCount; i++) {
                        body += generateSimpleOccurrence(i, occurrenceLength);
                    }
                    
                    // 6. Combinar cabecera y cuerpo
                    const fullExample = header + body;
                    console.log(`Ejemplo generado dinámicamente: ${fullExample.length} caracteres totales`);
                    console.log(`  - Cabecera: ${header.length} caracteres`);
                    console.log(`  - Cuerpo: ${body.length} caracteres`);
                    console.log(`  - Ocurrencias: ${occurrenceCount} de ${occurrenceLength} caracteres cada una`);
                    
                    // Verificación adicional para cualquier servicio
                    const expectedBodyLength = prefixLength + (occurrenceCount * occurrenceLength);
                    console.log(`[DEBUG FINAL] Longitud del cuerpo: ${body.length}, Esperada: ${expectedBodyLength}`);
                    
                    if (body.length !== expectedBodyLength) {
                        console.error(`[ALERTA] La longitud total del cuerpo (${body.length}) no coincide con la esperada (${expectedBodyLength})`);
                        console.log(`[ANÁLISIS] Diferencia de ${body.length - expectedBodyLength} caracteres`);
                        
                        // Analizar más en detalle
                        console.log(`[ANÁLISIS] Verificando longitudes individuales:`);
                        console.log(`[ANÁLISIS] - Prefix: ${prefixLength} caracteres`);
                        let totalOcurrencias = 0;
                        for (let i = 0; i < occurrenceCount; i++) {
                            const start = prefixLength + (i * occurrenceLength);
                            const end = start + occurrenceLength;
                            const ocurrenciaReal = body.substring(start, end);
                            console.log(`[ANÁLISIS] - Ocurrencia ${i}: ${ocurrenciaReal.length} caracteres (desde posición ${start} hasta ${end})`);
                            totalOcurrencias += ocurrenciaReal.length;
                        }
                        console.log(`[ANÁLISIS] Total ocurrencias: ${totalOcurrencias} caracteres`);
                        console.log(`[ANÁLISIS] Prefix + Total ocurrencias: ${prefixLength + totalOcurrencias} caracteres`);
                    } else {
                        console.log(`[DEBUG FINAL] ¡VERIFICACIÓN EXITOSA! Longitud de cuerpo correcta: ${body.length}`);
                    }
                    
                    // Log para mostrar longitud exacta de cada parte
                    console.log(`[DEBUG FINAL] Estructura de cuerpo: prefix(${prefixLength}) + ${occurrenceCount} ocurrencias de ${occurrenceLength} caracteres = ${prefixLength + (occurrenceCount * occurrenceLength)}`);
                    
                    return fullExample;
                });
        })
        .catch(error => {
            console.error(`Error al generar ejemplo dinámico: ${error.message}`);
            
            // Si falla, generamos un ejemplo genérico como fallback
            return generateSimpleHeader(serviceNumber, 102)
                .then(header => {
                    const occurrenceCount = Math.floor(Math.random() * 4) + 2;
                    
                    // Guardamos el contador incluso en el caso de fallback
                    window.lastGeneratedOccurrenceCount = occurrenceCount;
                    
                    let body = 
                        "00" +                          // Estado (éxito) - 2 posiciones
                        String(occurrenceCount).padStart(2, '0') + // Cantidad de registros - 2 posiciones
                        "0";                            // No hay más datos - 1 posición
                    
                    // Añadir ocurrencias genéricas
                    for (let i = 0; i < occurrenceCount; i++) {
                        body += generateSimpleOccurrence(i, 100);
                    }
                    
                    return header + body;
                });
        });
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
