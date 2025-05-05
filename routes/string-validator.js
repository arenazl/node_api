/**
 * String Validator - Validación de strings para servicios de vuelta
 * 
 * Este módulo se encarga de validar strings de longitud fija para asegurar que
 * cumplen con la estructura mínima requerida antes de procesarlos.
 */

/**
 * Valida un string de retorno para asegurar que tiene la estructura mínima
 * @param {string} str - El string a validar
 * @param {Object} structures - Objeto con estructuras header_structure y service_structure
 * @returns {Object} - Resultado de la validación {isValid: boolean, error: string, errorType: string}
 */
function validateReturnString(str, structures) {
    const result = {
        isValid: false,
        error: null,
        errorType: null
    };

    // Verificación básica de que no es vacío
    if (!str || typeof str !== 'string') {
        result.error = "El string proporcionado está vacío o no es válido";
        result.errorType = "EMPTY_STRING";
        return result;
    }

    // Verificación de longitud mínima - 20 caracteres como mínimo absoluto
    if (str.length < 20) {
        result.error = `El string proporcionado es demasiado corto (${str.length} caracteres). La longitud mínima esperada es 20 caracteres.`;
        result.errorType = "STRING_TOO_SHORT";
        return result;
    }

    // Verificar que hay estructuras válidas
    if (!structures || !structures.header_structure) {
        result.error = "No se encontró una estructura de cabecera válida para validar el string";
        result.errorType = "MISSING_STRUCTURE";
        return result;
    }

    // Verificar longitud de cabecera
    const headerLength = structures.header_structure.totalLength || 102;
    if (str.length < headerLength) {
        result.error = `El string no contiene una cabecera completa. Se requieren ${headerLength} caracteres para la cabecera, pero solo hay ${str.length} caracteres.`;
        result.errorType = "HEADER_INCOMPLETE";
        return result;
    }

    // Verificar que hay contenido en el cuerpo después de la cabecera
    if (str.length <= headerLength) {
        result.error = "El string no contiene datos en el cuerpo después de la cabecera";
        result.errorType = "BODY_MISSING";
        return result;
    }

    // Verificar que el cuerpo tiene un tamaño mínimo razonable (al menos 4 caracteres)
    if (str.length < headerLength + 4) {
        result.error = "El cuerpo del mensaje es demasiado corto, debe tener al menos 4 caracteres";
        result.errorType = "BODY_TOO_SHORT";
        return result;
    }

    // Verificaciones específicas según la estructura
    try {
        // Extraer código de estado - normalmente en posiciones después de la cabecera
        const statusCode = str.substring(headerLength, headerLength + 2);
        
        // Verificar que es un código numérico
        if (!/^\d{2}$/.test(statusCode)) {
            result.error = `El código de estado "${statusCode}" en el cuerpo no es un valor numérico de 2 dígitos`;
            result.errorType = "INVALID_STATUS_CODE";
            return result;
        }

        // Verificar contador de registros - generalmente está después del código de estado
        const registryCountStr = str.substring(headerLength + 2, headerLength + 4);
        const registryCount = parseInt(registryCountStr);
        
        if (isNaN(registryCount)) {
            result.error = `El contador de registros "${registryCountStr}" no es un valor numérico válido`;
            result.errorType = "INVALID_REGISTRY_COUNT";
            return result;
        }

        // Verificar que hay suficiente contenido para el número de registros indicados
        // Esta es una validación aproximada, ya que no conocemos el tamaño exacto de cada registro
        const minExpectedLength = headerLength + 4 + (registryCount * 10); // 10 es un tamaño mínimo estimado por registro
        if (str.length < minExpectedLength) {
            result.error = `La longitud del string (${str.length} caracteres) es insuficiente para contener ${registryCount} registros`;
            result.errorType = "INCOMPLETE_DATA";
            return result;
        }
    } catch (error) {
        // Error en validaciones específicas, no bloqueante
        console.warn(`Advertencia en validación específica: ${error.message}`);
        // Continuamos sin fallar la validación
    }

    // Si hemos llegado hasta aquí, el string parece válido
    result.isValid = true;
    return result;
}

module.exports = {
    validateReturnString
};
