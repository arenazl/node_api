function formatJson(element, forceFormat = false) { // Añadir parámetro forceFormat
  if (!element) return;

  // Si ya está formateado y no se fuerza, no hacer nada.
  if (element.dataset.jsonFormatted === 'true' && !forceFormat) {
    // console.log('[JSON_FORMATTER] Elemento ya formateado, omitiendo:', element.id || 'sin ID');
    return;
  }
  // Si se fuerza el formato, limpiar la marca para permitir reformateo.
  if (forceFormat) {
    delete element.dataset.jsonFormatted;
  }

  if (!element.textContent) { // Mover esta comprobación aquí después de la de dataset.jsonFormatted
    // Si no hay contenido, no hay nada que formatear, pero marcar como "formateado" para evitar bucles si se añade contenido vacío.
    // Opcionalmente, se podría limpiar el innerHTML aquí si se espera que siempre haya contenido.
    // element.dataset.jsonFormatted = 'true'; // Considerar si esto es deseable para contenido vacío.
    return;
  }
  
  try {
    // Validar si el contenido parece JSON antes de intentar parsear
    const content = element.textContent.trim();
    
    // Detectar si el contenido no parece ser JSON (por ejemplo, mensajes en español)
    if (!content.startsWith('{') && !content.startsWith('[') && 
        !content.startsWith('"') && !/^\d+$/.test(content)) {
      console.log('El contenido no parece ser JSON válido:', content.substring(0, 50) + '...');
      
      // Detección mejorada de texto en español o mensajes de error o placeholders
      const placeholderText = [
        'La respuesta', 'se mostrará aquí', 'respuesta se mostrará',
        'Seleccione', 'No hay datos', 'No se encontró',
        'Error'
      ];
      
      // Revisar si es texto placeholder
      const isPlaceholder = placeholderText.some(phrase => content.includes(phrase));
      
      // Detección de texto en español o mensajes de error
      const isSpanishText = 
        isPlaceholder ||
        content.startsWith('Error') ||
        content.includes('mensaje') ||
        content.includes('servicio') ||
        /^[A-Za-záéíóúüñÁÉÍÓÚÜÑ\s,\.]+$/.test(content.substring(0, 30));
      
      if (isSpanishText) {
        console.log('Mostrando contenido como texto plano (texto en español detectado)');
        element.innerHTML = `<div class="formatted-text">
          <pre class="plain-text-content">${element.textContent}</pre>
        </div>`;
      } else {
        // Mostrar el contenido original con un indicador de error
        element.innerHTML = `<div class="json-error">
          <span class="json-error-icon">⚠️</span>
          <span class="json-error-message">El contenido no es un JSON válido</span>
          <pre class="json-error-content">${element.textContent}</pre>
        </div>`;
      }
      return;
    }

    // Verificación adicional para JSON vacío o malformado que podría pasar los filtros anteriores
    if (content.trim() === "" || 
        (content.startsWith('{') && !content.endsWith('}')) || 
        (content.startsWith('[') && !content.endsWith(']')) ||
        (content === "{") || (content === "[")) { // Específicamente para '{' o '[' solos
        console.warn('Contenido JSON detectado como vacío, incompleto o inválido antes del parseo:', content.substring(0, 70) + '...');
        element.innerHTML = `<div class="json-error">
          <span class="json-error-icon">⚠️</span>
          <span class="json-error-message">Contenido JSON vacío o inválido</span>
          <pre class="json-error-content" style="white-space: pre-wrap;">${element.textContent}</pre>
        </div>`;
        return;
    }

    // Verificación adicional para JSON vacío o malformado que podría pasar los filtros anteriores
    if (content.trim() === "" || 
        (content.startsWith('{') && !content.endsWith('}')) || 
        (content.startsWith('[') && !content.endsWith(']')) ||
        (content === "{") || (content === "[")) { // Específicamente para '{' o '[' solos
        console.warn('[JSON_FORMATTER] Contenido JSON detectado como vacío, incompleto o inválido antes del parseo:', content.substring(0, 70) + '...');
        element.innerHTML = `<div class="json-error">
          <span class="json-error-icon">⚠️</span>
          <span class="json-error-message">Contenido JSON vacío o inválido</span>
          <pre class="json-error-content" style="white-space: pre-wrap;">${element.textContent}</pre>
        </div>`;
        delete element.dataset.jsonFormatted; // No se pudo formatear
        return;
    }
    
    let contentToParse = content;
    // Eliminar BOM si está presente al inicio de la cadena
    if (contentToParse.charCodeAt(0) === 0xFEFF) {
        console.warn('[JSON_FORMATTER] BOM detectado y eliminado del inicio del JSON.');
        contentToParse = contentToParse.substring(1);
    }

    console.log('[JSON_FORMATTER] Intentando parsear el siguiente contenido:', JSON.stringify(contentToParse)); 
    const jsonData = JSON.parse(contentToParse);
    const formattedHtml = formatJsonWithColors(jsonData);
    element.innerHTML = formattedHtml;
    element.dataset.jsonFormatted = 'true'; // Marcar como formateado
    
    // Asegurarse de que los botones de colapso funcionen
    const collapseButtons = element.querySelectorAll('.json-collapse-btn');
    collapseButtons.forEach(button => {
      const targetId = button.getAttribute('data-target');
      button.onclick = () => {
        toggleJsonNode(targetId, button);
      };
    });
  } catch (e) {
    console.error('Error al formatear JSON:', e);
    
    // Mostrar un mensaje de error amigable en el elemento
    element.innerHTML = `<div class="json-error">
      <span class="json-error-icon">⚠️</span>
      <span class="json-error-message">Error al parsear JSON: ${e.message}</span>
      <pre class="json-error-content" style="white-space: pre-wrap;">${element.textContent}</pre>
    </div>`;
    delete element.dataset.jsonFormatted; // Falló el formateo
  }
}

function formatJsonWithColors(data, indent = 0) {
  const indentStr = '  '.repeat(indent);
  
  if (data === null) return `<span class="json-null">null</span>`;
  
  if (typeof data === 'string') {
    return `<span class="json-string">"${data}"</span>`;
  }
  
  if (typeof data === 'number') {
    return `<span class="json-number">${data}</span>`;
  }
  
  if (typeof data === 'boolean') {
    return `<span class="json-boolean">${data}</span>`;
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    
    // Generar ID único para este nodo collapsible
    const nodeId = 'json_' + Math.random().toString(36).substr(2, 9);
    
    const items = data.map(item => 
      `${indentStr}  ${formatJsonWithColors(item, indent + 1)}`
    ).join(',\n');
    
    return `[<span class="json-collapse-btn" data-target="${nodeId}">-</span>\n` +
           `<div id="${nodeId}" class="json-collapsible">${items}\n${indentStr}]</div>`;
  }
  
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return '{}';
    
    // Generar ID único para este nodo collapsible
    const nodeId = 'json_' + Math.random().toString(36).substr(2, 9);
    
    const properties = keys.map(key => 
      `${indentStr}  <span class="json-key">"${key}"</span>: ${formatJsonWithColors(data[key], indent + 1)}`
    ).join(',\n');
    
    return `{<span class="json-collapse-btn" data-target="${nodeId}">-</span>\n` +
           `<div id="${nodeId}" class="json-collapsible">${properties}\n${indentStr}}</div>`;
  }
  
  return String(data);
}

/**
 * Muestra/oculta un nodo JSON
 * @param {string} nodeId - ID del nodo a mostrar/ocultar
 * @param {HTMLElement} button - Botón que controla el nodo
 */
function toggleJsonNode(nodeId, button) {
  const node = document.getElementById(nodeId);
  if (node) {
    const isVisible = node.style.display !== 'none';
    node.style.display = isVisible ? 'none' : 'block';
    button.textContent = isVisible ? '+' : '-';
  }
}

/**
 * Formatea un elemento específico como JSON
 * Esta función puede ser llamada manualmente para formatear un elemento específico
 * @param {string|HTMLElement} elementOrId - ID del elemento o el elemento mismo
 */
function formatJsonElement(elementOrId) {
  const element = typeof elementOrId === 'string' 
    ? document.getElementById(elementOrId) 
    : elementOrId;
  
  if (!element) {
    console.error('Elemento no encontrado:', elementOrId);
    return;
  }
  
  // Pasar true para forzar el reformateo si es necesario desde una llamada explícita
  formatJson(element, true); 
}

// Exponer las funciones para uso global
window.formatJson = formatJson;
window.formatJsonElement = formatJsonElement;
window.toggleJsonNode = toggleJsonNode;

// Para elementos específicos
document.addEventListener('DOMContentLoaded', () => {
  const jsonElements = document.querySelectorAll('.json-editor');
  jsonElements.forEach(formatJson);
});
