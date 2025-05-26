/**
 * ida-message-utils.js
 * Utility functions for IDA message processing.
 */

// Import centralized string formatting utilities
const { formatValue, safeGetValue } = require('./string-format-utils');

/**
 * Processes structure elements and adds them to the estructura array.
 * This function is intended to be used by generarEstructuraDetallada.
 * @param {Array} elements - Structure elements.
 * @param {Object} data - Corresponding data.
 * @param {Array} estructura - Array to accumulate results.
 */
function procesarElementos(elements, data, estructura) {
  for (const element of elements) {
    if (element.type === 'field') {
      const fieldName = element.name;
      const fieldLength = parseInt(element.length) || 0;
      const fieldType = (element.fieldType || element.type || "alfanumerico").toLowerCase();
      // Get the value from data if available using the utility function
      const rawValue = safeGetValue(data, fieldName, "");
      let fieldValue = "";
      
      // Aplicar formato según el tipo de campo
      if (rawValue !== undefined && rawValue !== null) {
        // Usar la función formatValue de string-format-utils que ahora maneja fechas
        const isNumeric = fieldType === "numerico" || fieldType === "numeric" || fieldType === "number";
        fieldValue = formatValue(
          rawValue.toString(), 
          fieldLength, 
          isNumeric ? "numerico" : "alfanumerico", 
          fieldName,
          element.valores || ''
        );
      }
      
      estructura.push({ nombre: fieldName, valor: fieldValue, longitud: fieldLength, tipo: fieldType });
    } else if (element.type === 'occurrence') {
      const occId = element.id || `occurrence_${element.index}`;
      // Manejar el caso en que occData sea un objeto simple en lugar de un array
      let occData = data[occId];
      if (occData && !Array.isArray(occData)) {
        // Si es un objeto simple, conviértelo en un array con un solo elemento
        occData = [occData];
      } else if (!occData) {
        // Si no existe, usar un array vacío
        occData = [];
      }
      estructura.push({ nombre: `${occId}_cantidad`, valor: occData.length.toString(), longitud: 0, tipo: "contador_ocurrencias" });
      if (element.fields) {
        for (let i = 0; i < occData.length; i++) {
          for (const field of element.fields) {
            if (field.type === 'field') {
              const fieldName = field.name;
              const fieldLength = parseInt(field.length) || 0;
              const fieldType = (field.fieldType || field.type || "alfanumerico").toLowerCase();
              // Get the value from occurrence data if available using the utility function
              const rawValue = safeGetValue(occData[i], fieldName, "");
              let fieldValue = "";
              
              // Aplicar formato según el tipo de campo
              if (rawValue !== undefined && rawValue !== null) {
                // Usar la función formatValue de string-format-utils que ahora maneja fechas
                const isNumeric = fieldType === "numerico" || fieldType === "numeric" || fieldType === "number";
                fieldValue = formatValue(
                  rawValue.toString(), 
                  fieldLength, 
                  isNumeric ? "numerico" : "alfanumerico", 
                  fieldName,
                  field.valores || ''
                );
              }
              
              estructura.push({ nombre: `${occId}[${i}].${fieldName}`, valor: fieldValue, longitud: fieldLength, tipo: fieldType });
            } else if (field.type === 'occurrence') { // Nested
              const nestedOccId = field.id || `occurrence_${field.index}`;
              // Manejar el caso en que nestedOccData sea un objeto simple en lugar de un array
              let nestedOccData = occData[i][nestedOccId];
              if (nestedOccData && !Array.isArray(nestedOccData)) {
                // Si es un objeto simple, conviértelo en un array con un solo elemento
                nestedOccData = [nestedOccData];
              } else if (!nestedOccData) {
                // Si no existe, usar un array vacío
                nestedOccData = [];
              }
              estructura.push({ nombre: `${occId}[${i}].${nestedOccId}_cantidad`, valor: nestedOccData.length.toString(), longitud: 0, tipo: "contador_ocurrencias" });
              if (field.fields) {
                for (let j = 0; j < nestedOccData.length; j++) {
                  for (const nestedField of field.fields) {
                    if (nestedField.type === 'field') {
                      const nestedFieldName = nestedField.name;
                      const nestedFieldLength = parseInt(nestedField.length) || 0;
                      const nestedFieldType = (nestedField.fieldType || nestedField.type || "alfanumerico").toLowerCase();
                      // Get the value from nested occurrence data if available using the utility function
                      const rawValue = safeGetValue(nestedOccData[j], nestedFieldName, "");
                      let nestedFieldValue = "";
                      
                      // Aplicar formato según el tipo de campo
                      if (rawValue !== undefined && rawValue !== null) {
                        // Usar la función formatValue de string-format-utils que ahora maneja fechas
                        const isNumeric = nestedFieldType === "numerico" || nestedFieldType === "numeric" || nestedFieldType === "number";
                        nestedFieldValue = formatValue(
                          rawValue.toString(), 
                          nestedFieldLength, 
                          isNumeric ? "numerico" : "alfanumerico", 
                          nestedFieldName,
                          nestedField.valores || ''
                        );
                      }
                      
                      estructura.push({ nombre: `${occId}[${i}].${nestedOccId}[${j}].${nestedFieldName}`, valor: nestedFieldValue, longitud: nestedFieldLength, tipo: nestedFieldType });
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
}

/**
 * Generates a detailed structure of the fields composing the message.
 * @param {Object} headerStructure - Header structure.
 * @param {Object} serviceStructure - Service structure.
 * @param {Object} requestData - Request data.
 * @returns {Array} Array with details of each field.
 */
function generarEstructuraDetallada(headerStructure, serviceStructure, requestData) {
  const estructura = [];
  if (headerStructure && headerStructure.fields) {
    estructura.push({ nombre: "SECCION", valor: "CABECERA", longitud: 0, tipo: "separator" });
    for (const field of headerStructure.fields) {
      if (field.name === '*' || field.name === 'REQUERIMIENTO') continue;
      const fieldName = field.name;
      const fieldLength = parseInt(field.length) || 0;
      const fieldType = (field.fieldType || field.type || "alfanumerico").toLowerCase();
      // Get the value from request header if available using the utility function
      const rawValue = requestData && requestData.header ? safeGetValue(requestData.header, fieldName, "") : "";
      let fieldValue = "";
      
      // Aplicar formato según el tipo de campo
      if (rawValue !== undefined && rawValue !== null) {
        // Usar la función formatValue de string-format-utils que ahora maneja fechas
        const isNumeric = fieldType === "numerico" || fieldType === "numeric" || fieldType === "number";
        fieldValue = formatValue(
          rawValue.toString(), 
          fieldLength, 
          isNumeric ? "numerico" : "alfanumerico", 
          fieldName,
          field.valores || ''
        );
      }
      
      estructura.push({ nombre: fieldName, valor: fieldValue, longitud: fieldLength, tipo: fieldType });
    }
  }
  if (serviceStructure && serviceStructure.request && serviceStructure.request.elements) {
    estructura.push({ nombre: "SECCION", valor: "REQUERIMIENTO", longitud: 0, tipo: "separator" });
    procesarElementos(serviceStructure.request.elements, requestData.data, estructura);
  }
  return estructura;
}

module.exports = {
  generarEstructuraDetallada,
  procesarElementos
};
