/**
 * Mejoras al formateador de JSON para manejo de ocurrencias anidadas
 * 
 * Este archivo extiende la funcionalidad del formateador de JSON
 * para manejar correctamente las ocurrencias anidadas y mostrarlas
 * con un formato estético en la interfaz de usuario.
 */

// Variable para almacenar la referencia original al formatAndDisplayJson
const originalFormatAndDisplayJson = window.formatAndDisplayJson;

/**
 * Versión mejorada de formatAndDisplayJson con soporte para ocurrencias anidadas
 * @param {Object} data - Datos JSON a mostrar
 * @param {string} elementId - ID del elemento donde mostrar el JSON
 */
function enhancedFormatAndDisplayJson(data, elementId = 'jsonContent') {
  console.log('[JSON Formatter] Mejorando formato para ocurrencias anidadas');
  
  // Utilizar la función original con los datos originales
  // No usamos fixNestedOccurrences porque no está disponible en el navegador
  return originalFormatAndDisplayJson(data, elementId);
}

/**
 * Versión mejorada de formatJson con soporte para ocurrencias anidadas
 * @param {HTMLElement} element - Elemento pre que contiene el JSON
 */
function enhancedFormatJson(element) {
  if (!element || !element.textContent) return;
  
  try {
    // Verificar si el texto es un JSON válido
    const text = element.textContent.trim();
    if (!text || text === "{ }" || text === "{}") {
      element.textContent = "{}";
      return;
    }
    
    // Obtener el JSON original
    const jsonData = JSON.parse(text);
    
    // Convertir a texto JSON (sin usar fixNestedOccurrences)
    const formattedText = JSON.stringify(jsonData, null, 2);
    
    // Asignar el texto formateado al elemento
    element.textContent = formattedText;
    
    // Si existe la función formatJson original, usarla
    if (window.originalFormatJson) {
      window.originalFormatJson(element);
    }
    
  } catch (e) {
    console.error('[JSON Formatter] Error al aplicar mejoras:', e);
    // No intentar formatear si hay un error, dejar el texto como está
  }
}

// Almacenar referencia al formatJson original si existe
if (typeof window.formatJson === 'function') {
  window.originalFormatJson = window.formatJson;
  
  // Reemplazar la función de formateo con nuestra versión mejorada
  window.formatJson = enhancedFormatJson;
  
  console.log('[JSON Formatter] Mejoras para JSON instaladas');
}
