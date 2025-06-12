/**
 * Utilidad para hacer merge profundo de objetos
 */

/**
 * Hace un merge profundo de dos objetos
 * @param {Object} target - Objeto destino
 * @param {Object} source - Objeto fuente
 * @returns {Object} Objeto con merge profundo
 */
function deepMerge(target, source) {
  // Si source no es un objeto, retornar target
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return target;
  }

  // Si target no es un objeto, usar source
  if (!target || typeof target !== 'object') {
    return source;
  }

  // Crear una copia del target
  const result = { ...target };

  // Iterar sobre las propiedades de source
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (Array.isArray(sourceValue)) {
        // Si es array, hacer merge de arrays
        if (Array.isArray(targetValue)) {
          result[key] = mergeArrays(targetValue, sourceValue);
        } else {
          result[key] = [...sourceValue];
        }
      } else if (sourceValue && typeof sourceValue === 'object') {
        // Si es objeto, hacer merge recursivo
        if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          result[key] = deepMerge(targetValue, sourceValue);
        } else {
          result[key] = deepMerge({}, sourceValue);
        }
      } else {
        // Si es valor primitivo, sobrescribir
        result[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * Hace merge de arrays, combinando elementos por índice
 * @param {Array} targetArray - Array destino
 * @param {Array} sourceArray - Array fuente
 * @returns {Array} Array con merge
 */
function mergeArrays(targetArray, sourceArray) {
  const result = [...targetArray];
  
  for (let i = 0; i < sourceArray.length; i++) {
    if (i < result.length) {
      // Si existe elemento en target, hacer merge
      if (typeof sourceArray[i] === 'object' && typeof result[i] === 'object') {
        result[i] = deepMerge(result[i], sourceArray[i]);
      } else {
        // Sobrescribir con valor de source
        result[i] = sourceArray[i];
      }
    } else {
      // Si no existe, agregar elemento de source
      result.push(sourceArray[i]);
    }
  }
  
  return result;
}

module.exports = {
  deepMerge,
  mergeArrays
};
