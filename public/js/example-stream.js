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
    
    console.log(`Generando ejemplo para servicio ${serviceNumber}. Cabecera: ${headerLength}, Respuesta: ${responseLength}`);
    
    // Generar la cabecera (ahora es async)
    const header = await generateHeaderExample(structure, serviceNumber, headerLength);
    
    // Generar el cuerpo de respuesta
    const responseBody = generateResponseExample(structure, responseLength - headerLength);
    
    // Combinar cabecera y respuesta
    return header + responseBody;
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
    // Verificar si estamos trabajando con el servicio 3088 u otro con estructura conocida
    const serviceNumber = structure.service_structure?.serviceNumber;
    
    // Inicializamos los valores de respuesta
    let responseBody = "";
    
    // Si estamos trabajando específicamente con el servicio 3088
    if (serviceNumber === "3088") {
        console.log("Generando respuesta para servicio 3088");
        
        // 1. Valores iniciales fijos para los primeros campos
        responseBody = 
            "00" +                          // SVC3088-ESTADO (2 posiciones) - Finalizado correctamente
            "05" +                          // SVC3088-CANT-REG (2 posiciones) - 5 registros de ejemplo
            "0";                            // SVC3088-MAS-DATOS (1 posición) - No tiene más datos
        
        // 2. Añadir ocurrencias de ejemplo (5 registros con datos)
        for (let i = 0; i < 5; i++) {
            const inconsistencia = i === 0 ? "00" : (i === 1 ? "01" : "02");  // Diferentes códigos para variedad
            const idOps = `OPS${String(12345 + i).padStart(5, '0')}`;         // Diferentes IDs
            const nroOper = String(i + 1).padStart(5, '0');                   // Número de operación incremental
            const mensError = i === 0 ? "OPERACION CORRECTA" : `ERROR TIPO ${i}`;
            const mensErrorDetalle = i === 0 ? "OPERACION PROCESADA CORRECTAMENTE" : 
                                          `DETALLE DEL ERROR: SE ENCONTRO UN PROBLEMA EN LA OPERACION TIPO ${i}`;
            
            // Crear el registro según la estructura de ocurrencias
            const registro = 
                inconsistencia.padEnd(2, ' ') +                    // SVC3088-INCONSIST-SAL (2 pos)
                idOps.padEnd(30, ' ') +                            // SVC3088-CON-ID-OPS-SAL (30 pos)
                nroOper.padEnd(5, ' ') +                           // SVC3088-NRO-OPER-SERV-SAL (5 pos)
                mensError.padEnd(30, ' ') +                        // SVC3088-MENS-ERROR-SAL (30 pos)
                mensErrorDetalle.padEnd(300, ' ');                 // SVC3088-MENS-ERROR-TRAMA (300 pos)
            
            responseBody += registro;
        }
        
    } else {
        // Para otros servicios o cuando no hay estructura específica
        responseBody = 
            "00" +                      // Estado (éxito) - asumimos 2 posiciones
            "01" +                      // Cantidad de registros - asumimos 2 posiciones
            "0";                        // No hay más datos - asumimos 1 posición
            
        // Añadir datos de ejemplo genérico para otros servicios
        responseBody += "DATOS_EJEMPLO_SERVICIO_" + serviceNumber;
    }
    
    // Asegurar que el cuerpo tenga la longitud total requerida
    console.log(`Longitud actual: ${responseBody.length}, requerida: ${responseBodyLength}`);
    
    // Rellenar hasta la longitud total requerida
    if (responseBody.length < responseBodyLength) {
        responseBody = responseBody.padEnd(responseBodyLength, ' ');
    } else if (responseBody.length > responseBodyLength) {
        // Si es más largo, truncar (aunque no debería ocurrir si los cálculos son correctos)
        console.warn(`ADVERTENCIA: Respuesta generada más larga (${responseBody.length}) que la esperada (${responseBodyLength}). Truncando.`);
        responseBody = responseBody.substring(0, responseBodyLength);
    }
    
    return responseBody;
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

// Exportar funciones para uso en otros archivos
if (typeof module !== 'undefined') {
    module.exports = {
        getExampleStringForService
    };
}
