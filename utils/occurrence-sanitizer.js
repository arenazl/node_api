/**
 * Utilidad especializada para sanear ocurrencias manteniendo la estructura exacta
 * del Excel original, especialmente para casos de ocurrencias anidadas (14, 18, 21)
 * 
 * Este archivo es una solución específica para el problema de las "ocurrencias saneadas"
 */

/**
 * Función para mantener exactamente la estructura de ocurrencias del Excel original
 * @param {Object} responseData - Objeto con datos de respuesta, incluyendo ocurrencias
 * @returns {Object} - Datos saneados con estructura preservada exactamente
 */
function sanitizeOccurrences(responseData) {
  console.log("[SANITIZADOR] Iniciando proceso de sanitización con preservación de estructura");
  
  // Si no es un objeto o está vacío, retornar sin cambios
  if (!responseData || typeof responseData !== 'object') {
    return responseData;
  }
  
  // Clonar para no modificar el original
  const result = JSON.parse(JSON.stringify(responseData));
  
  // Procesar todas las keys buscando ocurrencias
  Object.keys(result).forEach(key => {
    // Verificar si es una ocurrencia (key empieza con "occ_", o tiene un array como valor)
    if (key.startsWith('occ_') || (Array.isArray(result[key]) && result[key].length > 0)) {
      // Es una ocurrencia (array)
      const occurrences = result[key];
      
      // Verificar si tiene items
      if (Array.isArray(occurrences) && occurrences.length > 0) {
        console.log(`[SANITIZADOR] Procesando ocurrencia "${key}" con ${occurrences.length} elementos`);
        
        // 1. CRÍTICO: Preservar los índices originales exactos
        occurrences.forEach(occurrence => {
          // Asegurar que tenga índice
          if (occurrence.index === undefined) {
            console.log(`[SANITIZADOR] Ocurrencia sin índice, asignando índice secuencial`);
          } else {
            console.log(`[SANITIZADOR] Preservando índice ${occurrence.index}`);
          }
          
          // 2. PROCESAR OCURRENCIAS ANIDADAS (clave para 14, 18, 21)
          // Buscar properties que empiezan con "occurrence_"
          const nestedKeys = Object.keys(occurrence).filter(k => k.startsWith('occurrence_'));
          
          if (nestedKeys.length > 0) {
            console.log(`[SANITIZADOR] Encontradas ${nestedKeys.length} ocurrencias anidadas: ${nestedKeys.join(', ')}`);
            
            // Preparar una estructura auxiliar con todas las ocurrencias anidadas, pero separadas del resto de campos
            if (!occurrence._nestedOccurrences) {
              occurrence._nestedOccurrences = {};
            }
            
            // Mover todas las ocurrencias anidadas a esta estructura
            nestedKeys.forEach(nestedKey => {
              const nestedIndex = nestedKey.replace('occurrence_', '');
              occurrence._nestedOccurrences[nestedIndex] = occurrence[nestedKey];
              
              // Mover pero no eliminar (para compatibilidad)
              // delete occurrence[nestedKey];
            });
            
            // Agregar metadata para que la UI pueda acceder fácilmente
            occurrence._hasNestedOccurrences = true;
            occurrence._nestedIndices = nestedKeys.map(k => k.replace('occurrence_', ''));
          }
          
          // 3. RECORRIDA RECURSIVA - procesar el resto de propiedades del objeto
          Object.keys(occurrence).forEach(propKey => {
            if (propKey !== 'index' && propKey !== '_nestedOccurrences' && 
                propKey !== '_hasNestedOccurrences' && propKey !== '_nestedIndices') {
              // Si es un objeto, procesarlo recursivamente
              if (occurrence[propKey] && typeof occurrence[propKey] === 'object' && !Array.isArray(occurrence[propKey])) {
                occurrence[propKey] = sanitizeOccurrences(occurrence[propKey]);
              }
              // Si es un array, procesar cada elemento
              else if (Array.isArray(occurrence[propKey])) {
                occurrence[propKey] = sanitizeOccurrences({ array: occurrence[propKey] }).array;
              }
            }
          });
        });
        
        // 4. ORDENAMIENTO FINAL - por índice para preserve la estructura exacta del Excel
        if (occurrences.length > 1) {
          occurrences.sort((a, b) => {
            // Si ambos tienen índice, usar los índices para ordenar
            if (a.index !== undefined && b.index !== undefined) {
              return Number(a.index) - Number(b.index);
            }
            // Si solo uno tiene índice, ese va primero
            else if (a.index !== undefined) {
              return -1;
            }
            else if (b.index !== undefined) {
              return 1;
            }
            // Si ninguno tiene índice, no cambiar orden
            return 0;
          });
        }
      }
    }
    // Si es un objeto (no array), procesarlo recursivamente
    else if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = sanitizeOccurrences(result[key]);
    }
  });
  
  return result;
}

// Exportar la función
module.exports = {
  sanitizeOccurrences
};
