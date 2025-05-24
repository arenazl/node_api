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
 * @returns {string} Formatted value.
 */
function formatValue(value, length, fieldType) {
  // Ensure we have a string to work with, empty string if no value provided
  const stringValue = value !== undefined && value !== null ? value.toString() : "";
  
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
 * Generates a random value for a field based on its type and length.
 * Used for example and test data generation.
 * @param {number} length - Field length.
 * @param {string} fieldType - Field type (numerico or alfanumerico).
 * @param {boolean} useMeaningful - Whether to use meaningful values for alfanumeric fields.
 * @returns {string} Random value formatted according to field type and length.
 */
function generateRandomFieldValue(length, fieldType, useMeaningful = false) {
  const lowercaseType = fieldType.toLowerCase();
  
  // Generate an appropriate random value based on field type
  if (lowercaseType === "numerico") {
    // For numeric fields, generate random digits
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
  generateMeaningfulFieldValue
};
