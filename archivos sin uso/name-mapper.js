/**
 * Utilidades para mapear nombres de campos entre diferentes formatos
 * Permite convertir entre los formatos utilizados en las estructuras y los JSON
 */

/**
 * Convierte un nombre en formato kebab-case a camelCase
 * @example kebabToCamelCase("svc1004-nip") => "svc1004Nip"
 * @param {string} str - String en formato kebab-case
 * @returns {string} String en formato camelCase
 */
function kebabToCamelCase(str) {
  if (!str) return '';
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Convierte un nombre en formato snake_case a camelCase
 * @example snakeToCamelCase("longitud_mensaje") => "longitudMensaje"
 * @param {string} str - String en formato snake_case
 * @returns {string} String en formato camelCase
 */
function snakeToCamelCase(str) {
  if (!str) return '';
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Convierte un nombre en formato mayúsculas con espacios a camelCase
 * @example upperSpaceToCamelCase("LONGITUD DEL MENSAJE") => "longitudDelMensaje"
 * @param {string} str - String en formato mayúsculas con espacios
 * @returns {string} String en formato camelCase
 */
function upperSpaceToCamelCase(str) {
  if (!str) return '';
  
  // Convertir a minúsculas primero
  const lowercase = str.toLowerCase();
  
  // Convertir primera letra de cada palabra a mayúscula (excepto la primera)
  const camelCase = lowercase.replace(/\s+(.)/g, (m, char) => char.toUpperCase());
  
  return camelCase;
}

/**
 * Convierte un nombre de servicio a prefijo estándar
 * @example serviceToPrefix("1004") => "svc1004"
 * @param {string} serviceNumber - Número de servicio
 * @returns {string} Prefijo estándar
 */
function serviceToPrefix(serviceNumber) {
  if (!serviceNumber) return '';
  return `svc${serviceNumber}`;
}

/**
 * Genera un nombre de propiedad en camelCase basado en un campo de estructura
 * @example generatePropertyName("1004", "NIP") => "svc1004Nip"
 * @param {string} serviceNumber - Número de servicio
 * @param {string} fieldName - Nombre del campo en la estructura
 * @returns {string} Nombre de propiedad en camelCase
 */
function generatePropertyName(serviceNumber, fieldName) {
  if (!fieldName) return '';
  
  // Convertir nombre de campo a formato adecuado
  let processedName = fieldName;
  
  // Si el campo es todo mayúsculas y tiene espacios
  if (fieldName === fieldName.toUpperCase() && fieldName.includes(' ')) {
    processedName = upperSpaceToCamelCase(fieldName);
  } 
  // Si el campo tiene guiones
  else if (fieldName.includes('-')) {
    processedName = kebabToCamelCase(fieldName);
  }
  // Si el campo tiene guiones bajos
  else if (fieldName.includes('_')) {
    processedName = snakeToCamelCase(fieldName);
  }
  
  // Si el campo ya incluye el prefijo del servicio, devolverlo directamente
  if (processedName.toLowerCase().startsWith(`svc${serviceNumber.toLowerCase()}`)) {
    return processedName;
  }
  
  // Si no, agregar el prefijo del servicio
  return kebabToCamelCase(`${serviceToPrefix(serviceNumber)}-${processedName}`);
}

/**
 * Convierte un objeto con propiedades en formato original a camelCase
 * @param {string} serviceNumber - Número de servicio
 * @param {Object} data - Objeto con propiedades en formato original
 * @returns {Object} Objeto con propiedades en camelCase
 */
function convertObjectToCamelCase(serviceNumber, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }
  
  const result = {};
  
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      
      // Convertir nombre de propiedad a camelCase
      const camelKey = generatePropertyName(serviceNumber, key);
      
      // Recursivamente convertir valores que son objetos
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[camelKey] = convertObjectToCamelCase(serviceNumber, value);
      } 
      // Convertir valores que son arrays de objetos
      else if (Array.isArray(value)) {
        result[camelKey] = value.map(item => {
          if (item && typeof item === 'object') {
            return convertObjectToCamelCase(serviceNumber, item);
          }
          return item;
        });
      }
      // Valores primitivos se copian directamente
      else {
        result[camelKey] = value;
      }
    }
  }
  
  return result;
}

/**
 * Convierte un objeto con propiedades en camelCase al formato de estructura original
 * @param {string} serviceNumber - Número de servicio
 * @param {Object} data - Objeto con propiedades en camelCase
 * @param {Object} structure - Estructura con definiciones de campos
 * @returns {Object} Objeto con propiedades en formato original
 */
function convertCamelCaseToStructure(serviceNumber, data, structure) {
  if (!data || typeof data !== 'object' || !structure) {
    return data;
  }
  
  const result = {};
  const fieldMap = buildFieldMap(serviceNumber, structure);
  
  // Mapear propiedades camelCase a nombres de campos originales
  for (const camelKey in data) {
    if (Object.prototype.hasOwnProperty.call(data, camelKey)) {
      const value = data[camelKey];
      
      // Buscar el nombre original del campo
      const originalKey = findOriginalFieldName(camelKey, fieldMap);
      
      if (originalKey) {
        // Si el valor es un objeto o array, procesarlo recursivamente
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[originalKey] = convertCamelCaseToStructure(
            serviceNumber, 
            value, 
            findSubStructure(originalKey, structure)
          );
        } else if (Array.isArray(value)) {
          result[originalKey] = value.map(item => {
            if (item && typeof item === 'object') {
              return convertCamelCaseToStructure(
                serviceNumber,
                item,
                findSubStructure(originalKey, structure)
              );
            }
            return item;
          });
        } else {
          result[originalKey] = value;
        }
      } else {
        // Si no hay mapeo, usar la clave tal cual
        result[camelKey] = value;
      }
    }
  }
  
  return result;
}

/**
 * Construye un mapa de campos camelCase a nombres originales
 * @param {string} serviceNumber - Número de servicio
 * @param {Object} structure - Estructura con definiciones de campos
 * @returns {Object} Mapa de campos {camelCaseName: originalName}
 */
function buildFieldMap(serviceNumber, structure) {
  const fieldMap = {};
  
  // Función para procesar campos de forma recursiva
  function processFields(fields, parent = '') {
    if (!fields || !Array.isArray(fields)) return;
    
    for (const field of fields) {
      if (!field.name) continue;
      
      const camelName = generatePropertyName(serviceNumber, field.name);
      fieldMap[camelName] = field.name;
      
      // Procesar subfields si existen
      if (field.fields) {
        processFields(field.fields, field.name);
      }
    }
  }
  
  // Procesar todos los campos de la estructura
  if (structure.fields) {
    processFields(structure.fields);
  }
  
  // Procesar campos de request y response
  if (structure.request && structure.request.elements) {
    processFields(structure.request.elements);
  }
  
  if (structure.response && structure.response.elements) {
    processFields(structure.response.elements);
  }
  
  return fieldMap;
}

/**
 * Encuentra el nombre original de un campo a partir de su versión camelCase
 * @param {string} camelCaseName - Nombre en formato camelCase
 * @param {Object} fieldMap - Mapa de campos
 * @returns {string|null} Nombre original o null si no se encuentra
 */
function findOriginalFieldName(camelCaseName, fieldMap) {
  return fieldMap[camelCaseName] || null;
}

/**
 * Encuentra una subestructura para un campo específico
 * @param {string} fieldName - Nombre del campo
 * @param {Object} structure - Estructura completa
 * @returns {Object|null} Subestructura o null si no se encuentra
 */
function findSubStructure(fieldName, structure) {
  // Implementación simplificada - se podría expandir para búsqueda recursiva
  return null;
}

module.exports = {
  kebabToCamelCase,
  snakeToCamelCase,
  upperSpaceToCamelCase,
  serviceToPrefix,
  generatePropertyName,
  convertObjectToCamelCase,
  convertCamelCaseToStructure
};
