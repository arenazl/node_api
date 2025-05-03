/**
 * Módulo exclusivo para arreglar los índices y relaciones parentId en el procesamiento
 * 
 * Este archivo es una solución simple y directa para reparar las ocurrencias anidadas
 */

/**
 * Función para mantener exactamente el orden de los índices y las relaciones parentId
 * @param {Object} structure - El objeto de estructura completo
 * @returns {Object} - Estructura corregida con índices ordenados y relaciones parentId preservadas
 */
function fixOccurrenceIndices(structure) {
  // No modificar si no hay estructura completa
  if (!structure || !structure.request || !structure.response) {
    return structure;
  }
  
  // Clonar para no modificar el original
  const fixedStructure = JSON.parse(JSON.stringify(structure));
  
  // Procesar secciones request y response
  for (const sectionName of ['request', 'response']) {
    const section = fixedStructure[sectionName];
    
    // Asegurarnos que hay elementos para procesar
    if (!section || !section.elements || !Array.isArray(section.elements)) {
      continue;
    }
    
    // 1. PROCESAMIENTO PRIMARIO: ordenar todos los elementos por índice (natural)
    section.elements.sort((a, b) => a.index - b.index);
    
    // 2. PROCESAMIENTO DE OCURRENCIAS Y RELACIONES PADRE-HIJO
    const mainOccurrences = section.elements.filter(e => e.type === 'occurrence');
    
    for (const occ of mainOccurrences) {
      // No procesar si no hay campos
      if (!occ.fields || !Array.isArray(occ.fields)) continue;
      
      // Ordenar campos de la ocurrencia principal por índice
      occ.fields.sort((a, b) => a.index - b.index);
      
      // Asegurarse que cada campo tenga el parentId correcto referenciando a esta ocurrencia
      for (const field of occ.fields) {
        field.parentId = occ.id;
      }
      
      // Si hay ocurrencias anidadas (children), procesarlas
      if (occ.children && Array.isArray(occ.children)) {
        // Ordenar ocurrencias anidadas por índice
        occ.children.sort((a, b) => a.index - b.index);
        
        // Asegurarnos que cada ocurrencia anidada tenga el parentId correcto
        for (const childOcc of occ.children) {
          childOcc.parentId = occ.id;
          
          // También ordenar los campos dentro de cada ocurrencia anidada
          if (childOcc.fields && Array.isArray(childOcc.fields)) {
            childOcc.fields.sort((a, b) => a.index - b.index);
            
            // Y asegurarnos que cada campo tenga el parentId correcto
            for (const field of childOcc.fields) {
              field.parentId = childOcc.id;
            }
          }
        }
      }
    }
  }
  
  return fixedStructure;
}

module.exports = {
  fixOccurrenceIndices
};
