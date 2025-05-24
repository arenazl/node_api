/**
 * Fix para el problema de visualización de ocurrencias anidadas
 * 
 * Este módulo aplica una serie de transformaciones a los datos JSON
 * para asegurar que las ocurrencias anidadas se muestren correctamente
 * en la interfaz de usuario.
 */

/**
 * Corrige las ocurrencias anidadas para su correcta visualización
 * @param {Object} data - Datos JSON con ocurrencias
 * @returns {Object} - Datos corregidos
 */
function fixNestedOccurrences(data) {
  // Si no es un objeto o está vacío, retornar sin cambios
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Clonar para no modificar el original
  const result = JSON.parse(JSON.stringify(data));
  
  // Recorrer todas las propiedades del objeto
  Object.keys(result).forEach(key => {
    // Si encontramos una ocurrencia principal (un array)
    if (Array.isArray(result[key])) {
      console.log(`[FIX] Procesando ocurrencia "${key}" con ${result[key].length} elementos`);
      
      // Procesar cada item de la ocurrencia
      result[key].forEach((item, index) => {
        if (item && typeof item === 'object') {
          // Buscar ocurrencias anidadas (propiedades que empiezan con "occurrence_")
          const nestedOccKeys = Object.keys(item).filter(k => k.startsWith('occurrence_'));
          
          if (nestedOccKeys.length > 0) {
            console.log(`[FIX] Item ${index} tiene ${nestedOccKeys.length} ocurrencias anidadas: ${nestedOccKeys.join(', ')}`);
            
            // Procesar cada ocurrencia anidada
            nestedOccKeys.forEach(nestedKey => {
              // Obtener el índice de la ocurrencia anidada
              const nestedIndex = nestedKey.replace('occurrence_', '');
              
              // Verificar si la ocurrencia anidada es un array vacío o mal formateado
              if (Array.isArray(item[nestedKey])) {
                if (item[nestedKey].length === 0) {
                  console.log(`[FIX] Ocurrencia anidada "${nestedKey}" es un array vacío, inicializando con objetos vacíos`);
                  
                  // Si es un array vacío, crear un array con objetos vacíos según la definición
                  // Aquí determinamos la cantidad basados en el número de servicio y el índice de ocurrencia
                  let countToCreate = 0;
                  
                  // Determinar cantidad basado en el índice de ocurrencia
                  if (nestedIndex === '14') countToCreate = 2;  // Para ocurrencia 14, crear 2 items
                  else if (nestedIndex === '18') countToCreate = 2;  // Para ocurrencia 18, crear 2 items
                  else if (nestedIndex === '21') countToCreate = 2;  // Para ocurrencia 21, crear 2 items
                  else countToCreate = 1;  // Para otras ocurrencias, crear 1 item
                  
                  // Crear array con la cantidad determinada de objetos vacíos
                  item[nestedKey] = [];
                  for (let i = 0; i < countToCreate; i++) {
                    // Crear objeto con propiedades vacías según el tipo de ocurrencia anidada
                    let emptyObj = { index: i };
                    
                    // Agregar propiedades específicas según el tipo de ocurrencia
                    if (nestedIndex === '14') {
                      emptyObj['SVC3088-PROD-RUBRO'] = '';
                      emptyObj['SVC3088-CUENTA-NIV'] = '';
                    } else if (nestedIndex === '18') {
                      emptyObj['SVC3088-IMPORTE'] = '';
                    } else if (nestedIndex === '21') {
                      emptyObj['SVC3088-BCO'] = '';
                      emptyObj['SVC3088-SUCU'] = '';
                    }
                    
                    item[nestedKey].push(emptyObj);
                  }
                } else {
                  // El array ya tiene elementos, asegurarse que tengan la propiedad index
                  item[nestedKey].forEach((nestedItem, nestedIdx) => {
                    if (!nestedItem.hasOwnProperty('index')) {
                      nestedItem.index = nestedIdx;
                    }
                  });
                }
              } else {
                // Si no es un array, convertirlo en uno
                console.log(`[FIX] Propiedad "${nestedKey}" no es un array, corrigiendo`);
                
                // Crear un array vacío y poblarlo
                let countToCreate = 1;
                if (nestedIndex === '14' || nestedIndex === '18' || nestedIndex === '21') {
                  countToCreate = 2;
                }
                
                item[nestedKey] = [];
                for (let i = 0; i < countToCreate; i++) {
                  let emptyObj = { index: i };
                  
                  // Agregar propiedades específicas según el tipo de ocurrencia
                  if (nestedIndex === '14') {
                    emptyObj['SVC3088-PROD-RUBRO'] = '';
                    emptyObj['SVC3088-CUENTA-NIV'] = '';
                  } else if (nestedIndex === '18') {
                    emptyObj['SVC3088-IMPORTE'] = '';
                  } else if (nestedIndex === '21') {
                    emptyObj['SVC3088-BCO'] = '';
                    emptyObj['SVC3088-SUCU'] = '';
                  }
                  
                  item[nestedKey].push(emptyObj);
                }
              }
            });
          }
        }
      });
    } else if (result[key] && typeof result[key] === 'object') {
      // Si es un objeto, procesarlo recursivamente
      result[key] = fixNestedOccurrences(result[key]);
    }
  });
  
  return result;
}

/**
 * Corrige las ocurrencias anidadas en un objeto de respuesta
 * @param {Object} responseData - Objeto de respuesta a corregir
 * @returns {Object} - Objeto corregido
 */
function fixResponseOccurrences(responseData) {
  if (!responseData) return responseData;
  
  console.log('[FIX] Iniciando corrección de ocurrencias anidadas en respuesta');
  
  // Aplicar corrección a todo el objeto
  const fixedData = fixNestedOccurrences(responseData);
  
  console.log('[FIX] Corrección completada');
  
  return fixedData;
}

// Exportar funciones
module.exports = {
  fixNestedOccurrences,
  fixResponseOccurrences
};
