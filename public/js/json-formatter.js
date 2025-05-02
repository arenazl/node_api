/**
 * Formateador de JSON con colores y opciones de colapso
 */

/**
 * Formatea y muestra el JSON en el elemento especificado
 * @param {Object} data - Datos JSON a mostrar
 * @param {string} elementId - ID del elemento donde mostrar el JSON (opcional, por defecto 'jsonContent')
 */
function formatAndDisplayJson(data, elementId = 'jsonContent') {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Limpiar el contenedor
  element.innerHTML = '';
  
  // Asegurar que tenemos datos para formatear
  if (!data) {
    element.textContent = 'No hay datos disponibles';
    return;
  }

  // Crear el HTML formateado para el JSON
  const formattedHtml = formatJsonSimple(data, 0);
  
  // Insertar el HTML en el contenedor
  element.innerHTML = formattedHtml;
}

/**
 * Formatea un JSON de manera simple con indentación y colores
 * @param {Object} data - Datos a formatear
 * @param {number} level - Nivel de indentación
 * @returns {string} HTML formateado
 */
function formatJsonSimple(data, level = 0) {
  // Aplicar indentación
  const indent = '  '.repeat(level);
  let html = '';
  const nodeId = `json_node_${Math.random().toString(36).substr(2, 9)}`;
  
  if (data === null) {
    return `<span class="json-null">null</span>`;
  } else if (typeof data === 'string') {
    return `<span class="json-string">"${escapeHtml(data)}"</span>`;
  } else if (typeof data === 'number') {
    return `<span class="json-number">${data}</span>`;
  } else if (typeof data === 'boolean') {
    return `<span class="json-boolean">${data}</span>`;
  } else if (Array.isArray(data)) {
    // Si el array está vacío
    if (data.length === 0) {
      return `<span class="json-brackets">[]</span>`;
    }
    
    // Determinar qué clase aplicar basado en el contenido (para diferenciar arrays importantes)
    let arrayClass = "";
    
    // Evaluar si es un array de fields o elements (importante en la estructura)
    if (data.length > 0 && data[0] && data[0].name) {
      // Si el array contiene elementos con nombre, puede ser fields o elements
      if (data[0].type === 'field' || data[0].type === 'occurrence') {
        arrayClass = "json-elements-array";
      } else if ('length' in data[0] && 'type' in data[0]) {
        arrayClass = "json-header-fields";
      }
    }
    
  // Formatear array con botón de colapso
    html += `<span class="json-brackets ${arrayClass}">
      <span class="json-collapse-btn" data-target="${nodeId}" onclick="toggleJsonNode('${nodeId}', this)">-</span>
      [</span><div id="${nodeId}" class="json-collapsible">`;
    
    data.forEach((item, index) => {
      html += `${indent}  ${formatJsonSimple(item, level + 1)}`;
      
      // Añadir coma excepto en el último elemento
      if (index < data.length - 1) {
        html += '<span class="json-comma">,</span>';
      }
    });
    
    html += `</div><span class="json-brackets ${arrayClass}">]</span>`;
    return html;
  } else if (typeof data === 'object') {
    // Si el objeto está vacío
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return `<span class="json-brackets">{}</span>`;
    }
    
    // Detectar qué tipo de objeto es para aplicar el color correcto
    let objectClass = "";
    
    // Verificar si es header o service
    if ('header_structure' in data) {
      objectClass = "json-header-section"; 
    } else if ('service_number' in data || 'serviceName' in data) {
      objectClass = "json-service-section";
    } else if ('request' in data || 'response' in data) {
      if ('request' in data) {
        objectClass = "json-request-section";
      } else {
        objectClass = "json-response-section";
      }
    }
    
    // Formatear objeto con botón de colapso
    html += `<span class="json-brackets ${objectClass}">
      <span class="json-collapse-btn" data-target="${nodeId}" onclick="toggleJsonNode('${nodeId}', this)">-</span>
      {</span><div id="${nodeId}" class="json-collapsible">`;
    
    // Usar el orden original de las claves en el objeto
    // No ordenar las claves, para mantener el mismo orden que tiene el archivo JSON original
    const orderedKeys = keys;
    
    orderedKeys.forEach((key, index) => {
      // Determinar clase para el key basado en el contexto
      let keyClass = "json-key";
      
      // Dar colores específicos a claves importantes
      if (key === 'header_structure') {
        keyClass = "json-key-header";
      } else if (key === 'service_structure' || key === 'service_name' || key === 'service_number') {
        keyClass = "json-key-service";
      } else if (key === 'request') {
        keyClass = "json-key-request";
      } else if (key === 'response') {
        keyClass = "json-key-response";
      }
      
      // Tratamiento especial para el campo "values" - truncar a 20 caracteres
      let formattedValue;
      if (key === 'values' && typeof data[key] === 'string' && data[key].length > 5) {
        const uniqueId = `json_val_${Math.random().toString(36).substr(2, 9)}`;
        formattedValue = `<span class="json-string json-short" onclick="toggleJsonNode('${uniqueId}', this)">"${escapeHtml(data[key].substring(0, 20))}..."</span><span id="${uniqueId}" class="json-full" style="display:none">"${escapeHtml(data[key])}"</span>`;
      } else {
        formattedValue = formatJsonSimple(data[key], level + 1);
      }
      
      html += `${indent}  <span class="${keyClass}">${escapeHtml(key)}</span>: ${formattedValue}`;
      
      // Añadir coma excepto en el último elemento
      if (index < keys.length - 1) {
        html += '<span class="json-comma">,</span>';
      }
      
      html += '<br>';
    });
    
    html += `${indent}</div><span class="json-brackets ${objectClass}">}</span>`;
    return html;
  }
  
  return escapeHtml(String(data));
}

/**
 * Alterna la visibilidad de un nodo JSON
 * @param {string} nodeId - ID del nodo a alternar
 * @param {HTMLElement} button - Botón que se ha pulsado
 */
function toggleJsonNode(nodeId, button) {
  const node = document.getElementById(nodeId);
  if (node) {
    if (node.style.display === 'none') {
      node.style.display = 'block';
      button.textContent = '-';
    } else {
      node.style.display = 'none';
      button.textContent = '+';
    }
  }
}

/**
 * Formatea un nodo JSON (objeto, array o valor)
 * @param {*} node - Nodo a formatear
 * @param {number} level - Nivel de anidamiento
 * @param {string} key - Clave del nodo (si es parte de un objeto)
 * @returns {string} HTML formateado
 */
function formatJsonNode(node, level, key = null) {
  const indent = '  '.repeat(level);
  let html = '';
  
  // Determinar el tipo de nodo
  if (node === null) {
    return formatKeyValue(key, '<span class="json-null">null</span>', level);
  } else if (Array.isArray(node)) {
    return formatArray(node, level, key);
  } else if (typeof node === 'object') {
    return formatObject(node, level, key);
  } else if (typeof node === 'string') {
    return formatKeyValue(key, `<span class="json-string">"${escapeHtml(node)}"</span>`, level);
  } else if (typeof node === 'number') {
    return formatKeyValue(key, `<span class="json-number">${node}</span>`, level);
  } else if (typeof node === 'boolean') {
    return formatKeyValue(key, `<span class="json-boolean">${node}</span>`, level);
  } else {
    return formatKeyValue(key, `<span class="json-unknown">${escapeHtml(String(node))}</span>`, level);
  }
}

/**
 * Formatea un objeto JSON
 * @param {Object} obj - Objeto a formatear
 * @param {number} level - Nivel de anidamiento
 * @param {string} key - Clave del objeto (si es parte de otro objeto)
 * @returns {string} HTML formateado
 */
function formatObject(obj, level, key = null) {
  const indent = '  '.repeat(level);
  const keys = Object.keys(obj);
  
  // Determinar si este es un tipo específico para colorear
  let sectionClass = '';
  
  // Detectar si es header, request o response
  if (key === 'header_structure') {
    sectionClass = 'json-header-section';
  } else if (key === 'request') {
    sectionClass = 'json-request-section';
  } else if (key === 'response') {
    sectionClass = 'json-response-section';
  }
  
  // Para objetos vacíos, mostrar simplemente {}
  if (keys.length === 0) {
    return formatKeyValue(key, '<span class="json-brackets">{}</span>', level);
  }
  
  // ID único para este nodo colapsable
  const nodeId = `json_node_${Math.random().toString(36).substr(2, 9)}`;
  
  // Iniciar HTML
  let html = '';
  
  // Añadir clave si existe
  if (key !== null) {
    html += `${indent}<span class="json-key">${escapeHtml(key)}</span>: `;
  } else {
    html += indent;
  }
  
  // Añadir clase de sección si existe
  html += `<span class="json-brackets ${sectionClass}">
    <span class="json-collapse-btn" data-target="${nodeId}">-</span>
    {
  </span>
  <div id="${nodeId}" class="json-collapsible">`;
  
  // Añadir cada propiedad
  keys.forEach((objKey, index) => {
    const value = obj[objKey];
    const isLastItem = index === keys.length - 1;
    
    html += formatJsonNode(value, level + 1, objKey);
    
    // Añadir coma si no es el último elemento
    if (!isLastItem) {
      html += '<span class="json-comma">,</span>';
    }
    
    html += '\n';
  });
  
  // Cerrar objeto
  html += `${indent}<span class="json-brackets ${sectionClass}">}</span>`;
  
  return html;
}

/**
 * Formatea un array JSON
 * @param {Array} arr - Array a formatear
 * @param {number} level - Nivel de anidamiento
 * @param {string} key - Clave del array (si es parte de un objeto)
 * @returns {string} HTML formateado
 */
function formatArray(arr, level, key = null) {
  const indent = '  '.repeat(level);
  
  // Para arrays vacíos, mostrar simplemente []
  if (arr.length === 0) {
    return formatKeyValue(key, '<span class="json-brackets">[]</span>', level);
  }
  
  // ID único para este nodo colapsable
  const nodeId = `json_node_${Math.random().toString(36).substr(2, 9)}`;
  
  // Iniciar HTML
  let html = '';
  
  // Añadir clave si existe
  if (key !== null) {
    html += `${indent}<span class="json-key">${escapeHtml(key)}</span>: `;
  } else {
    html += indent;
  }
  
  // Determinar si es elements (campo especial para tipos)
  let arrayClass = '';
  if (key === 'elements' || key === 'fields') {
    arrayClass = 'json-elements-array';
  }
  
  // Abrir array con botón de colapso
  html += `<span class="json-brackets ${arrayClass}">
    <span class="json-collapse-btn" data-target="${nodeId}">-</span>
    [
  </span>
  <div id="${nodeId}" class="json-collapsible">`;
  
  // Añadir cada elemento
  arr.forEach((item, index) => {
    const isLastItem = index === arr.length - 1;
    
    // Para elementos de array, no enviamos clave
    html += formatJsonNode(item, level + 1);
    
    // Añadir coma si no es el último elemento
    if (!isLastItem) {
      html += '<span class="json-comma">,</span>';
    }
    
    html += '\n';
  });
  
  // Cerrar array
  html += `${indent}<span class="json-brackets ${arrayClass}">]</span>`;
  
  return html;
}

/**
 * Formatea un par clave-valor
 * @param {string} key - Clave
 * @param {string} formattedValue - Valor ya formateado en HTML
 * @param {number} level - Nivel de anidamiento
 * @returns {string} HTML formateado
 */
function formatKeyValue(key, formattedValue, level) {
  const indent = '  '.repeat(level);
  
  if (key !== null) {
    return `${indent}<span class="json-key">${escapeHtml(key)}</span>: ${formattedValue}`;
  } else {
    return `${indent}${formattedValue}`;
  }
}

/**
 * Escapa caracteres HTML para evitar inyección
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Función formatJson para usar con elementos pre existentes
 * @param {HTMLElement} element - Elemento pre que contiene el JSON
 */
function formatJson(element) {
  if (!element || !element.textContent) return;
  
  try {
    // Parsear el JSON del elemento
    const jsonData = JSON.parse(element.textContent);
    
    // Aplicar el formato
    const formattedHtml = formatJsonSimple(jsonData, 0);
    
    // Actualizar el contenido
    element.innerHTML = formattedHtml;
    
    // Hacer que sea editable si no lo es
    if (!element.hasAttribute('contenteditable')) {
      element.setAttribute('contenteditable', 'true');
    }
  } catch (e) {
    console.error("Error al formatear JSON:", e);
    // Si hay error, al menos asegurarse que sea editable
    if (!element.hasAttribute('contenteditable')) {
      element.setAttribute('contenteditable', 'true');
    }
  }
}

/**
 * Añade event listeners a los botones de colapso
 * @param {HTMLElement} container - Contenedor con los botones
 */
function addCollapseListeners(container) {
  const collapseButtons = container.querySelectorAll('.json-collapse-btn');
  
  collapseButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const target = document.getElementById(targetId);
      
      if (target) {
        const isCollapsed = target.classList.contains('collapsed');
        
        if (isCollapsed) {
          target.classList.remove('collapsed');
          button.textContent = '-';
        } else {
          target.classList.add('collapsed');
          button.textContent = '+';
        }
      }
    });
  });
}
