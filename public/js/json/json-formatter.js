function formatJson(element) {
  if (!element || !element.textContent) return;
  
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
    
    const jsonData = JSON.parse(content);
    const formattedHtml = formatJsonWithColors(jsonData);
    element.innerHTML = formattedHtml;
    
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
      <pre class="json-error-content">${element.textContent}</pre>
    </div>`;
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
  
  formatJson(element);
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
