/**
 * simple-example-generator.js
 * 
 * Este módulo proporciona una forma simple y directa de generar ejemplos
 * para el servicio de vuelta, sin depender de valores hardcodeados en la estructura.
 */

// Función para generar ejemplos simples
function generateSimpleExample(serviceNumber) {
    console.log(`Generando ejemplo simplificado para servicio ${serviceNumber}`);
    
    // 1. Generar la cabecera
    const header = generateSimpleHeader(serviceNumber);
    
    // 2. Generar el cuerpo con algunas ocurrencias
    // El número de ocurrencias será aleatorio entre 2-5 para la demostración
    const occurrenceCount = Math.floor(Math.random() * 4) + 2;
    console.log(`Generando ${occurrenceCount} ocurrencias para el ejemplo`);
    
    // 3. Generar el cuerpo con los campos iniciales y las ocurrencias
    let body = '';
    
    // Para el servicio 3088 y otros servicios comunes, usamos una estructura conocida
    if (serviceNumber === '3088') {
        // Añadir campos iniciales
        body = 
            "00" +                          // Estado (éxito) - 2 posiciones
            String(occurrenceCount).padStart(2, '0') + // Cantidad de registros - 2 posiciones
            "0";                            // No hay más datos - 1 posición
        
        // Añadir ocurrencias (cada una de 367 caracteres para el servicio 3088)
        for (let i = 0; i < occurrenceCount; i++) {
            body += generateSimpleOccurrence(i, 367);
        }
    } else {
        // Para cualquier otro servicio, generar algo genérico
        body = 
            "00" +                          // Estado (éxito) - 2 posiciones
            String(occurrenceCount).padStart(2, '0') + // Cantidad de registros - 2 posiciones
            "0";                            // No hay más datos - 1 posición
        
        // Añadir ocurrencias (de 100 caracteres para servicios desconocidos)
        for (let i = 0; i < occurrenceCount; i++) {
            body += generateSimpleOccurrence(i, 100);
        }
    }
    
    // 4. Combinar cabecera y cuerpo
    const fullExample = header + body;
    console.log(`Ejemplo generado: ${fullExample.length} caracteres totales`);
    console.log(`  - Cabecera: ${header.length} caracteres`);
    console.log(`  - Cuerpo: ${body.length} caracteres`);
    
    return fullExample;
}

/**
 * Genera una cabecera simple para el ejemplo
 * @param {string} serviceNumber - Número del servicio
 * @returns {string} - Cabecera generada (102 caracteres)
 */
function generateSimpleHeader(serviceNumber) {
    // Valores para la cabecera
    const headerParts = [
        "00102000",                     // Longitud del mensaje (8 posiciones)
        "API",                          // Canal (3 posiciones)
        serviceNumber.padEnd(4, ' '),   // Servicio (4 posiciones)
        "SISTEMA",                      // Usuario (7 posiciones)
        "0000",                         // Código de retorno (4 posiciones)
        getCurrentDate(),               // Fecha (8 posiciones)
        "120000",                       // Hora (6 posiciones)
        "USUARIO1",                     // Usuario (7 posiciones)
        "0001",                         // Ubicación (4 posiciones)
        "EJEMPLO GENERADO AUTOMATICAMENTE".padEnd(45, ' '), // Texto (45 posiciones)
        "00",                           // Estado enviado (2 posiciones)
        "     "                         // Campo complementario (5 posiciones)
    ];
    
    // Unir todas las partes
    const header = headerParts.join('');
    
    // Verificar la longitud (debe ser 102 caracteres)
    if (header.length !== 102) {
        console.warn(`Advertencia: La cabecera generada tiene ${header.length} caracteres (esperado: 102)`);
        
        // Ajustar si es necesario
        if (header.length < 102) {
            return header.padEnd(102, ' ');
        } else {
            return header.substring(0, 102);
        }
    }
    
    return header;
}

/**
 * Genera una ocurrencia simple para el ejemplo
 * @param {number} index - Índice de la ocurrencia (0-based)
 * @param {number} length - Longitud de la ocurrencia
 * @returns {string} - Ocurrencia generada
 */
function generateSimpleOccurrence(index, length) {
    // Para el primer registro (index 0), generamos un registro sin errores
    // Para el resto, generamos registros con algún código de error
    const hasError = index > 0;
    
    // Generar algunas partes comunes
    const inconsistCode = hasError ? String(index).padStart(2, '0') : "00";
    const idOps = `OPS${String(10000 + index).padStart(5, '0')}`;
    const operNum = String(index + 1).padStart(5, '0');
    const errorMsg = hasError ? `ERROR TIPO ${index}` : "OPERACION CORRECTA";
    const errorDetail = hasError 
        ? `DETALLE DEL ERROR: SE ENCONTRO UN PROBLEMA EN LA OPERACION TIPO ${index}` 
        : "OPERACION PROCESADA CORRECTAMENTE";
    
    // Construir una ocurrencia base con estas partes
    let occurrence = 
        inconsistCode.padEnd(2, ' ') +      // Código inconsistencia (2 pos)
        idOps.padEnd(30, ' ') +             // ID de operación (30 pos)
        operNum.padEnd(5, ' ') +            // Número de operación (5 pos)
        errorMsg.padEnd(30, ' ') +          // Mensaje de error (30 pos)
        errorDetail.padEnd(300, ' ');       // Detalle de error (300 pos)
    
    // Ajustar a la longitud requerida
    if (occurrence.length < length) {
        return occurrence.padEnd(length, ' ');
    } else if (occurrence.length > length) {
        return occurrence.substring(0, length);
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
