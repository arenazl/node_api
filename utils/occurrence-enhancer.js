/**
 * Formatear ocurrencias anidadas en el JSON
 * 
 * Esta función se encarga de aplicar estilos y formato específicos
 * a las ocurrencias anidadas en el objeto JSON
 * 
 * @param {object} data - El objeto JSON con ocurrencias
 * @returns {object} - El objeto JSON con ocurrencias preparadas para visualización
 */
function prepareNestedOccurrences(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Si es un array, procesar cada elemento
  if (Array.isArray(data)) {
    return data.map(item => prepareNestedOccurrences(item));
  }
  
  // Clonar para no modificar el original
  const result = {...data};
  
  // Buscar ocurrencias anidadas (claves que empiezan por "occurrence_")
  const nestedOccurrenceKeys = Object.keys(result).filter(key => 
    key.startsWith('occurrence_') || 
    key.match(/^occ_\d+$/)
  );
  
  // Si hay ocurrencias anidadas, marcarlas especialmente
  if (nestedOccurrenceKeys.length > 0) {
    // Marca general de que este objeto tiene ocurrencias anidadas
    result._hasNestedOccurrences = true;
    
    // Procesar cada ocurrencia anidada
    nestedOccurrenceKeys.forEach(key => {
      // Extraer el índice/número de la ocurrencia
      const occIndex = key.replace(/^occurrence_/, '');
      // Si es occ_N, extraer N
      const occMatch = key.match(/^occ_(\d+)$/);
      const occNumber = occMatch ? occMatch[1] : occIndex;
      
      // Añadir metadatos para identificación en la UI
      result[`_occurrence_${occNumber}_meta`] = {
        index: occNumber,
        key: key
      };
      
      // Si el valor es un array, procesarlo también
      if (Array.isArray(result[key])) {
        result[key] = result[key].map(item => prepareNestedOccurrences(item));
        
        // Si está vacío, añadir un marcador para mejor visualización
        if (result[key].length === 0) {
          result[key]._isEmpty = true;
        }
      }
    });
  }
  
  // Procesar propiedades anidadas
  Object.keys(result).forEach(key => {
    if (result[key] && typeof result[key] === 'object' && !key.startsWith('_')) {
      result[key] = prepareNestedOccurrences(result[key]);
    }
  });
  
  return result;
}

// Exportar para uso desde otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { prepareNestedOccurrences };
}

// También disponible para uso directo en el navegador
if (typeof window !== 'undefined') {
  window.prepareNestedOccurrences = prepareNestedOccurrences;
}
