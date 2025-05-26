/**
 * string-format-utils.js
 * Utility functions for string formatting across the system.
 * This module centralizes common string formatting functions to ensure consistent behavior.
 */

/**
 * Formats a value according to its field type and expected length.
 * @param {string|number} value - Value to format, coming from requestData.
 * @param {number} length - Expected length of the field.
 * @param {string} fieldType - Type of the field (numerico or alfanumerico).
 * @param {string} fieldName - Optional. Name of the field for special formatting (like dates).
 * @param {string} fieldValues - Optional. Content of the VALORES column for this field.
 * @returns {string} Formatted value.
 */
function formatValue(value, length, fieldType, fieldName = '', fieldValues = '') {
  // Ensure we have a string to work with, empty string if no value provided
  const stringValue = value !== undefined && value !== null ? value.toString() : "";

  // Check if this is a date field (either by name or by value format)
  const isDateField = 
    fieldName && fieldName.toLowerCase().includes('fecha') || 
    stringValue && (
      /^\d{4}-\d{2}-\d{2}$/.test(stringValue) || // YYYY-MM-DD format
      /^\d{2}\/\d{2}\/\d{4}$/.test(stringValue) || // DD/MM/YYYY format
      /^\d{2}-\d{2}-\d{4}$/.test(stringValue) // DD-MM-YYYY format
    ) ||
    fieldValues && (
      fieldValues.includes('DD/MM') || 
      fieldValues.includes('MM/DD') || 
      fieldValues.includes('AAAA')
    );
    
  // If it's a date field, format according to the expected format
  if (isDateField && stringValue) {
    // Default format in case none is specified
    let targetFormat = 'DD/MM/AAAA'; 
    
    // If fieldValues includes format information, use it
    if (fieldValues) {
      if (fieldValues.includes('DD/MM/AAAA')) {
        targetFormat = 'DD/MM/AAAA';
      } else if (fieldValues.includes('MM/DD/AAAA')) {
        targetFormat = 'MM/DD/AAAA';
      } else if (fieldValues.includes('AAAA-MM-DD')) {
        targetFormat = 'AAAA-MM-DD';
      } else if (fieldValues.includes('AAAAMMDD')) {
        targetFormat = 'AAAAMMDD';
      }
    }
    
    // Parse the date from various possible formats
    let day, month, year;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) { // YYYY-MM-DD
      [year, month, day] = stringValue.split('-');
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(stringValue)) { // DD/MM/YYYY or MM/DD/YYYY
      const parts = stringValue.split('/');
      // Assume DD/MM/YYYY by default
      day = parts[0];
      month = parts[1];
      year = parts[2];
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(stringValue)) { // DD-MM-YYYY or MM-DD-YYYY
      const parts = stringValue.split('-');
      // Assume DD-MM-YYYY by default
      day = parts[0];
      month = parts[1];
      year = parts[2];
    } else {
      // If it's not in a recognizable date format, treat it normally
      if (fieldType === "numerico") {
        return stringValue.padStart(length, '0');
      } else {
        return stringValue.padEnd(length, ' ');
      }
    }

    // Format according to the target format
    let formattedDate = '';
    if (targetFormat === 'DD/MM/AAAA') {
      formattedDate = `${day}/${month}/${year}`;
    } else if (targetFormat === 'MM/DD/AAAA') {
      formattedDate = `${month}/${day}/${year}`;
    } else if (targetFormat === 'AAAA-MM-DD') {
      formattedDate = `${year}-${month}-${day}`;
    } else if (targetFormat === 'AAAAMMDD') {
      formattedDate = `${year}${month}${day}`;
    }
    
    // Ensure the date fits the expected length
    if (formattedDate.length > length) {
      formattedDate = formattedDate.substring(0, length);
    } else if (formattedDate.length < length) {
      formattedDate = formattedDate.padEnd(length, ' ');
    }
    
    return formattedDate;
  }
  
  // If the field is numeric, pad with zeros to the left
  // Otherwise (alphanumeric), pad with spaces to the right
  if (fieldType === "numerico") {
    return stringValue.padStart(length, '0');
  } else {
    // For alphanumeric fields, pad with spaces to the right
    return stringValue.padEnd(length, ' ');
  }
}

/**
 * Safely gets a value from a nested object by property name.
 * Returns default value if property doesn't exist.
 * @param {Object} obj - Object to extract value from.
 * @param {string} propName - Property name to extract.
 * @param {*} defaultVal - Default value if property doesn't exist.
 * @returns {*} The value or default.
 */
function safeGetValue(obj, propName, defaultVal = "") {
  if (!obj || typeof obj !== 'object') return defaultVal;
  return propName in obj ? obj[propName] : defaultVal;
}

/**
 * Trims excess spaces from a string if it exceeds the specified length.
 * @param {string} str - String to trim.
 * @param {number} maxLength - Maximum allowed length.
 * @returns {string} Trimmed string.
 */
function trimToLength(str, maxLength) {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength);
}

/**
 * Generates a meaningful contextual value for fields based on field name.
 * Used for simulation and example data with readable values.
 * @param {number} length - Maximum length of the field.
 * @param {string} fieldName - Name of the field (optional).
 * @returns {string} Contextual value formatted to the specified length.
 */
function generateMeaningfulFieldValue(length, fieldName = '') {
  // Diccionario de términos financieros/transaccionales
  const financialTerms = [
    "TRANSACCION", "OPERACION", "TRAMA", "VALOR", "SEGMENTO", 
    "DEPOSITO", "RETIRO", "CREDITO", "DEBITO", "SALDO",
    "APROBADO", "RECHAZADO", "PENDIENTE", "AUTORIZADO", "PROCESADO",
    "TRANSFERENCIA", "PAGO", "COBRO", "COMISION", "CLIENTE"
  ];
  
  // Seleccionar un término aleatorio
  const randomTerm = financialTerms[Math.floor(Math.random() * financialTerms.length)];
  
  // Si el término es más largo que la longitud permitida, truncarlo
  if (randomTerm.length > length) {
    return randomTerm.substring(0, length);
  }
  
  // Si el término es más corto, rellenar con espacios
  return randomTerm.padEnd(length, ' ');
}

/**
 * Generates a date string according to the specified format
 * @param {string} formatStr - Format specification (e.g., "DD/MM/AAAA", "AAAAMMDD", "AAAA-MM-DD")
 * @returns {string} Formatted date string
 */
function generateDateString(formatStr) {
  // Get current date
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  
  // Extract separator directly from the format string
  let separator = '';
  if (formatStr.includes('/')) {
    separator = '/';
  } else if (formatStr.includes('-')) {
    separator = '-';
  }
  
  // Determine the date format pattern based on the input string
  let formattedDate = '';
  
  // Usar exactamente el formato especificado en el campo VALORES
  // No usar split ni trim para estos formatos específicos para evitar problemas
  if (formatStr === 'AAAA-MM-DD' || formatStr.trim() === 'AAAA-MM-DD') {
    formattedDate = year + '-' + month + '-' + day;
  } else if (formatStr === 'DD/MM/AAAA') {
    formattedDate = day + '/' + month + '/' + year;
  } else if (formatStr === 'MM/DD/AAAA') {
    formattedDate = month + '/' + day + '/' + year;
  } else if (formatStr === 'AAAAMMDD') {
    formattedDate = year + month + day;
  } else if (formatStr.startsWith('DD') || formatStr.toLowerCase().includes('dd/mm')) {
    // DD/MM/AAAA format
    formattedDate = day + separator + month + separator + year;
  } else if (formatStr.startsWith('MM') || formatStr.toLowerCase().includes('mm/dd')) {
    // MM/DD/AAAA format
    formattedDate = month + separator + day + separator + year;
  } else if (formatStr.startsWith('AAAA') || formatStr.toLowerCase().includes('yyyy')) {
    // AAAA-MM-DD format
    formattedDate = year + separator + month + separator + day;
  } else {
    // Default to AAAAMMDD without separators
    formattedDate = year + month + day;
  }
  
  // If there's no separator in the format, remove all separators
  if (!separator && formattedDate.includes('/') || formattedDate.includes('-')) {
    formattedDate = formattedDate.replace(/[/\-]/g, '');
  }
  
  return formattedDate;
}

/**
 * Generates a random value for a field based on its type and length.
 * Used for example and test data generation.
 * @param {number} length - Field length.
 * @param {string} fieldType - Field type (numerico or alfanumerico).
 * @param {boolean} useMeaningful - Whether to use meaningful values for alfanumeric fields.
 * @param {string} fieldName - Name of the field (optional, helps with context-specific formatting).
 * @param {string} fieldValues - Content of the VALORES column for this field (optional).
 * @returns {string} Random value formatted according to field type and length.
 */
function generateRandomFieldValue(length, fieldType, useMeaningful = false, fieldName = '', fieldValues = '') {
  const lowercaseType = fieldType.toLowerCase();
  
  // Check if this is a date field by name or type
  const isDateField = 
    lowercaseType === 'fecha' || 
    (fieldName && fieldName.toLowerCase().includes('fecha')) ||
    (fieldValues && (
      fieldValues.includes('DD/MM') || 
      fieldValues.includes('MM/DD') || 
      fieldValues.includes('AAAA') ||
      fieldValues.includes('DD-MM') ||
      fieldValues.toLowerCase().includes('fecha')
    ));
  
  // Handle date fields specially
  if (isDateField) {
    // Use the format from fieldValues if available, or default format
    const dateFormat = fieldValues && (
      fieldValues.includes('DD/MM') || 
      fieldValues.includes('MM/DD') || 
      fieldValues.includes('AAAA')
    ) ? fieldValues.split('(')[0].trim() : 'DD/MM/AAAA';
    
    // Generate a date string according to the specified format
    const dateValue = generateDateString(dateFormat);
    
    // Ensure it fits the length (although dates should have proper length already)
    return formatValue(dateValue, length, 'alfanumerico');
  }
  
  // For numeric fields, generate random digits
  if (lowercaseType === "numerico") {
    const maxValue = Math.pow(10, length) - 1;
    const randomValue = Math.floor(Math.random() * maxValue);
    // Format with leading zeros
    return formatValue(randomValue, length, "numerico");
  } else {
    // For alphanumeric fields
    if (useMeaningful) {
      // Use meaningful business terms if required
      return generateMeaningfulFieldValue(length);
    } else {
      // Generate random characters
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      // Generate a random string with a random length between 1 and max length
      const resultLength = Math.max(1, Math.floor(Math.random() * length));
      for (let i = 0; i < resultLength; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // Format with trailing spaces
      return formatValue(result, length, "alfanumerico");
    }
  }
}

module.exports = {
  formatValue,
  safeGetValue,
  trimToLength,
  generateRandomFieldValue,
  generateMeaningfulFieldValue,
  generateDateString
};
