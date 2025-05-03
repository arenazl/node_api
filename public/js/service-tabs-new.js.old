/**
 * services_script.js
 *
 * Maneja la interacción en la página de servicios, incluyendo:
 * - Pestañas de Servicio Ida/Vuelta.
 * - Carga de estructuras y templates JSON.
 * - Carga y aplicación de configuraciones guardadas.
 * - Generación de la cadena de texto de longitud fija.
 * - Envío de peticiones a la API para procesar servicios.
 * - Notificaciones al usuario.
 */

// ==========================================================================
// FUNCIONES UTILITARIAS Y DE AYUDA
// ==========================================================================

/**
 * Muestra una notificación visual al usuario.
 * @param {string} message - Mensaje a mostrar.
 * @param {'success'|'error'|'warning'|'info'} type - Tipo de notificación.
 */
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  if (!notification) {
      console.warn("Elemento 'notification' no encontrado para mostrar:", message);
      alert(`${type.toUpperCase()}: ${message}`); // Fallback si no existe el div
      return;
  }
  notification.textContent = message;
  // Usar clases de alerta (ej. Bootstrap) para que coincida con el CSS
  notification.className = `notification alert alert-${type}`; // Asegúrate que CSS maneje .alert-*
  notification.style.display = 'block';
  // Estilos para posicionamiento fijo (pueden estar en CSS también)
  notification.style.position = 'fixed';
  notification.style.top = '10px';
  notification.style.right = '10px';
  notification.style.zIndex = '1050';

  // Ocultar después de 5 segundos
  setTimeout(() => {
      notification.style.display = 'none';
  }, 5000);
}

/**
* Devuelve la fecha actual en formato AAAAMMDD.
* @returns {string} Fecha en formato AAAAMMDD.
*/
function getFechaActual() {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
* Formatea un objeto/array JavaScript como HTML coloreado y colapsable.
* (Implementación básica - Necesita ser robusta para estructuras complejas)
* @param {*} data - El dato (objeto, array, primitivo) a formatear.
* @param {number} [level=0] - Nivel de indentación actual.
* @returns {string} - El HTML formateado.
*/
function formatJsonSimple(data, level = 0) {
  let html = '';
  const indent = '&nbsp;'.repeat(level * 4);
  const nextLevel = level + 1;
  const type = typeof data;
  // Generar ID único para nodos colapsables
  const idBase = `jsonNode_${level}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  if (type === 'object' && data !== null) {
      const isArray = Array.isArray(data);
      const entries = Object.entries(data);
      const isEmpty = entries.length === 0;
      const nodeId = `${idBase}_content`; // ID para el div colapsable

      // Botón para colapsar/expandir
      html += `<span class="json-collapse-btn" data-target="${nodeId}">${isEmpty ? (isArray ? '[]' : '{}') : '-'}</span>`; // Mostrar vacío si no hay contenido
      html += isArray ? '[' : '{';

      if (!isEmpty) {
          html += `<div id="${nodeId}" class="json-collapsible">`; // Contenedor colapsable
          entries.forEach(([key, value], index) => {
              html += `<div style="padding-left: 20px;">`; // Indentación para cada línea
              if (!isArray) {
                  html += `<span class="json-key">"${key}"</span><span class="json-colon">:</span> `;
              }
              html += formatJsonSimple(value, nextLevel); // Llamada recursiva
              if (index < entries.length - 1) {
                  html += '<span class="json-comma">,</span>';
              }
              html += `</div>`; // Cierre de línea
          });
          html += `</div>`; // Cierre de contenido colapsable
          html += indent; // Indentación para el cierre
      }

      html += isArray ? ']' : '}';

  } else if (type === 'string') {
      // Escapar caracteres HTML y comillas dentro del string
      const escapedString = data.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '\\"');
      html += `<span class="json-string">"${escapedString}"</span>`;
  } else if (type === 'number') {
      html += `<span class="json-number">${data}</span>`;
  } else if (type === 'boolean') {
      html += `<span class="json-boolean">${data}</span>`;
  } else if (data === null) {
      html += '<span class="json-null">null</span>';
  } else { // undefined u otros tipos
      html += `<span class="json-undefined">undefined</span>`;
  }

  return html;
}

/**
* Alterna la visibilidad de un nodo JSON colapsable.
* @param {string} targetId - El ID del div colapsable.
* @param {HTMLElement} button - El botón que se presionó.
*/
function toggleJsonNode(targetId, button) {
  const targetElement = document.getElementById(targetId);
  if (targetElement && button) {
      const isCollapsed = targetElement.classList.toggle('collapsed'); // Asume que CSS define .collapsed { display: none; }
      button.textContent = isCollapsed ? '+' : '-';
       // Evitar que el botón muestre +/- para nodos vacíos
       if (targetElement.children.length === 0) {
           button.textContent = Array.isArray(JSON.parse(targetElement.dataset.originalValue || 'null')) ? '[]' : '{}'; // Mostrar si está vacío
           button.style.cursor = 'default';
       } else {
           button.style.cursor = 'pointer';
       }
  }
}

// ==========================================================================
// LÓGICA PARA REFRESCAR SERVICIOS
// ==========================================================================

/**
* Refresca la lista de servicios disponibles mediante una llamada a la API.
* @returns {Promise<Array>} Promise que se resuelve con los servicios actualizados.
*/
function refreshServices() {
  // Notificar al usuario que se están actualizando los servicios
  showNotification('Actualizando lista de servicios...', 'info');
  
  // Actualizar todos los selectores de servicios
  const allServiceSelects = [
      document.getElementById('idaServiceSelect'),
      document.getElementById('vueltaServiceSelect'),
      document.getElementById('configServiceSelect')
  ];
  
  // Deshabilitar selectores durante la actualización
  allServiceSelects.forEach(select => {
      if (select) {
          select.disabled = true;
          if (select.options[0]) select.options[0].textContent = "Actualizando servicios...";
      }
  });
  
  // Actualizar la tabla de servicios
  const servicesTable = document.getElementById('servicesTable');
  if (servicesTable && servicesTable.tBodies[0]) {
      const tbody = servicesTable.tBodies[0];
      tbody.innerHTML = '<tr><td colspan="3" class="text-center">Actualizando servicios...</td></tr>';
  }
  
  // Llamar a la API para forzar una actualización de la caché de servicios
  return fetch('/api/services/refresh')
      .then(response => {
          if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
          return response.json();
      })
      .then(data => {
          console.log('Servicios actualizados:', data);
          
          // Notificar éxito
          showNotification(`Servicios actualizados correctamente (${data.services_count} servicios)`, 'success');
          
          // Actualizar la UI con los servicios actualizados
          return loadAllServiceSelectors();
      })
      .catch(error => {
          console.error('Error al actualizar servicios:', error);
          showNotification(`Error al actualizar servicios: ${error.message}`, 'error');
          
          // Rehabilitar selectores
          allServiceSelects.forEach(select => {
              if (select) select.disabled = false;
          });
          
          // Lanzar el error para manejo superior si es necesario
          throw error;
      });
}

/**
* Carga la lista de servicios en todos los selectores y tablas.
* @returns {Promise<Array>} Promise que se resuelve con los servicios cargados.
*/
function loadAllServiceSelectors() {
  return fetch('/api/services')
      .then(response => {
          if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
          return response.json();
      })
      .then(data => {
          const services = data.services || [];
          console.log(`Cargados ${services.length} servicios para los selectores`);
          
          // Actualizar todos los selectores
          updateServiceSelectors(services);
          
          // Actualizar la tabla de servicios
          updateServicesTable(services);
          
          return services;
      })
      .catch(error => {
          console.error('Error al cargar servicios para selectores:', error);
          showNotification(`Error al cargar servicios: ${error.message}`, 'error');
          throw error;
      });
}

/**
* Actualiza todos los selectores de servicios con la lista proporcionada.
* @param {Array} services - Lista de servicios a mostrar en los selectores.
*/
function updateServiceSelectors(services) {
  const selectors = [
      document.getElementById('idaServiceSelect'),
      document.getElementById('vueltaServiceSelect'),
      document.getElementById('configServiceSelect')
  ];
  
  selectors.forEach(select => {
      if (!select) return;
      
      // Guardar el valor seleccionado actualmente
      const currentValue = select.value;
      
      // Limpiar opciones manteniendo solo la primera
      while (select.options.length > 1) {
          select.remove(1);
      }
      
      // Restaurar el texto de la primera opción
      if (select.options[0]) {
          select.options[0].textContent = "-- Seleccione un servicio --";
      }
      
      // Añadir las nuevas opciones
      if (services && services.length > 0) {
          services.forEach(service => {
              const option = document.createElement('option');
              option.value = service.service_number;
              option.textContent = `${service.service_number} - ${service.service_name}`;
              select.appendChild(option);
          });
          
          // Rehabilitar el selector
          select.disabled = false;
          
          // Restaurar el valor seleccionado si todavía existe
          if (currentValue) {
              const stillExists = Array.from(select.options).some(opt => opt.value === currentValue);
              if (stillExists) {
                  select.value = currentValue;
              }
          }
      } else {
          // No hay servicios, añadir opción de "No hay servicios"
          const noServicesOption = document.createElement('option');
          noServicesOption.textContent = "No hay servicios disponibles";
          noServicesOption.disabled = true;
          select.appendChild(noServicesOption);
      }
  });
}

/**
* Actualiza la tabla de servicios con la lista proporcionada.
* @param {Array} services - Lista de servicios a mostrar en la tabla.
*/
function updateServicesTable(services) {
  const table = document.getElementById('servicesTable');
  if (!table || !table.tBodies[0]) return;
  
  const tbody = table.tBodies[0];
  tbody.innerHTML = ''; // Limpiar filas actuales
  
  if (!services || services.length === 0) {
      const row = tbody.insertRow();
      const cell = row.insertCell(0);
      cell.colSpan = 3;
      cell.className = 'text-center';
      cell.textContent = 'No hay servicios disponibles';
      return;
  }
  
  // Añadir filas para cada servicio
  services.forEach(service => {
      const row = tbody.insertRow();
      
      // Celda número
      const cellNumber = row.insertCell(0);
      cellNumber.textContent = service.service_number;
      
      // Celda nombre
      const cellName = row.insertCell(1);
      cellName.textContent = service.service_name;
      
      // Celda acción
      const cellAction = row.insertCell(2);
      
      // Botón de vista/uso
      const viewButton = document.createElement('button');
      viewButton.className = 'action-btn small';
      viewButton.textContent = 'Ver';
      viewButton.title = 'Ver detalles del servicio';
      viewButton.onclick = function() {
          // Seleccionar este servicio en los tabs de ida y vuelta
          const selects = [
              document.getElementById('idaServiceSelect'),
              document.getElementById('vueltaServiceSelect')
          ];
          
          selects.forEach(select => {
              if (select) {
                  select.value = service.service_number;
                  // Disparar manualmente el evento change
                  const event = new Event('change');
                  select.dispatchEvent(event);
              }
          });
          
          // Mostrar el tab de ida por defecto
          const idaTabBtn = document.querySelector('.services-tab-btn[data-service-tab="ida"]');
          if (idaTabBtn) {
              idaTabBtn.click();
          }
      };
      
      cellAction.appendChild(viewButton);
  });
}

// ==========================================================================
// LÓGICA PARA GENERAR STRING FIJO
// ==========================================================================

/**
* Rellena o trunca un valor para que tenga una longitud fija.
* @param {string|number|null|undefined} value - El valor a procesar.
* @param {number} length - La longitud final deseada.
* @param {string} type - El tipo de campo ('numerico', 'alfanumerico', etc.).
* @returns {string} - El valor formateado con la longitud fija.
*/
function padValue(value, length, type) {
  // Convertir valor a string, tratando null/undefined como string vacío
  const strValue = String(value ?? '');
  
  // Normalizar el tipo a minúsculas y sin acentos para comparaciones más robustas
  const fieldType = (type || '').toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const numLength = parseInt(length || 0);
  if (numLength <= 0) return '';

  // Truncar si es más largo que la longitud requerida
  let processedValue = (strValue.length > numLength) ? strValue.substring(0, numLength) : strValue;

  // Imprimir información completa para depuración
  console.log(`Procesando campo: valor="${strValue}", tipo="${type}", fieldType="${fieldType}", longitud=${numLength}`);

  // VERIFICACIÓN SIMPLIFICADA PARA LOS DOS ÚNICOS TIPOS POSIBLES
  
  // Verificación para los tipos específicos de la estructura
  if (fieldType === 'alfanumerico') {
    console.log(`   → Campo de tipo "alfanumerico", rellenando con ESPACIOS: "${processedValue.padEnd(numLength, ' ')}"`);
    return processedValue.padEnd(numLength, ' ');
  }
  
  if (fieldType === 'numerico') {
    console.log(`   → Campo de tipo "numerico", rellenando con CEROS: "${processedValue.padStart(numLength, '0')}"`);
    return processedValue.padStart(numLength, '0');
  }

  // Si llegamos aquí, es porque el tipo no está definido claramente en la estructura
  // Asumimos tipo alfanumérico como comportamiento predeterminado más seguro
  console.log(`   → ADVERTENCIA: Tipo "${fieldType}" no reconocido, tratando como ALFANUMÉRICO: "${processedValue.padEnd(numLength, ' ')}"`);
  return processedValue.padEnd(numLength, ' ');
}

/**
* Procesa recursivamente los elementos (campos/ocurrencias) de la estructura
* para generar partes de la cadena fija, respetando estrictamente el orden definido en la estructura.
* @param {Array} elements - Array de elementos de la estructura a procesar.
* @param {Object|null|undefined} dataContext - Los datos correspondientes a este nivel.
* @param {Array<string>} stringParts - El array donde se acumulan las partes de la cadena.
*/
function processRequestElementsToString(elements, dataContext, stringParts) {
  if (!elements || !Array.isArray(elements)) return;

  // Imprimir para depuración
  console.log(`Procesando ${elements.length} elementos, con dataContext:`, dataContext);

  // IMPORTANTE: Usar elementos en su orden original, sin ordenar por índice
  // La búsqueda de valores se hará por nombre de campo, no por posición
  
  // Iterar sobre los elementos en su orden original
  elements.forEach(element => {
      if (element.type === 'field') {
          // Es un campo simple
          const name = element.name;
          const length = parseInt(element.length) || 0;
          if (length <= 0 || !name) return;

          // Obtener el tipo y el valor
          const type = (element.fieldType || element.type || '').toLowerCase();
          
          // ASIGNACIÓN CLAVE: Aquí buscamos el valor en la configuración para este campo
          const hasValue = dataContext && typeof dataContext === 'object' && dataContext.hasOwnProperty(name);
          const rawValue = hasValue ? dataContext[name] : '';
          
          // Procesar el valor según el tipo y la longitud
          const paddedValue = padValue(rawValue, length, type);
          stringParts.push(paddedValue);
          
          // Imprimir para depuración detallada
          console.log(`CAMPO ESTRUCTURA: "${name}" (${type}, longitud ${length})`);
          console.log(`  → ${hasValue ? 'ENCONTRADO' : 'NO ENCONTRADO'} en configuración, valor: "${rawValue}"`);
          console.log(`  → Valor procesado final: "${paddedValue}"`);

      } else if (element.type === 'occurrence') {
          // Es una ocurrencia (array de objetos)
          const occurrenceDefId = element.id || `occ_${element.index}`;
          const requiredCount = parseInt(element.count) || 1;
          
          // Obtener los elementos hijos de la ocurrencia (campos o sub-ocurrencias)
          const childElements = element.elements || element.fields || [];
          
          // Buscar instancias de datos para esta ocurrencia
          const dataInstances = (dataContext && 
                               typeof dataContext === 'object' && 
                               dataContext.hasOwnProperty(occurrenceDefId) && 
                               Array.isArray(dataContext[occurrenceDefId]))
                               ? dataContext[occurrenceDefId]
                               : [];

          console.log(`Ocurrencia: ${occurrenceDefId}, Requeridas: ${requiredCount}, Encontradas: ${dataInstances.length}`);

          // Procesar cada instancia requerida
          for (let i = 0; i < requiredCount; i++) {
              const currentInstanceData = dataInstances[i]; // undefined si no hay datos para esta iteración
              console.log(`  Instancia ${i+1} de ${requiredCount} para ${occurrenceDefId}:`, currentInstanceData);
              
              // Procesar recursivamente los elementos hijos con la instancia de datos correspondiente
              processRequestElementsToString(childElements, currentInstanceData, stringParts);
          }
      }
  });
}

/**
* Función principal para generar la cadena de longitud fija.
* @param {Object} structure - El objeto completo de estructura del servicio.
* @param {Object} configData - El objeto con los datos de configuración.
* @returns {string} - La cadena de longitud fija generada.
* @throws {Error} If structure or configData is invalid.
*/
function generarStringFijo(structure, configData) {
  console.log("Iniciando generación de string fijo...");
  // Validaciones robustas de entrada
  if (!structure || typeof structure !== 'object' || !structure.header_structure || !structure.service_structure) {
      throw new Error("Estructura de servicio inválida o incompleta proporcionada.");
  }
  if (!configData || typeof configData !== 'object' || !configData.header || !configData.request) {
      throw new Error("Datos de configuración inválidos o incompletos proporcionados.");
  }

  const stringParts = [];

// --- 1. Procesar Cabecera (Header) manteniendo el orden original de los campos ---
  console.log("Procesando cabecera...");
  if (structure.header_structure.fields) {
      // IMPORTANTE: Usar los campos en su orden original sin ordenar por índice
      // La estructura se procesa en el orden en que llega, y la búsqueda se hace por nombre
      const headerFields = structure.header_structure.fields;
      
      // Referencia directa al objeto header original de la configuración
      const headerData = configData.header;

      console.log("==== MAPEO CAMPOS HEADER ====");
      console.log("Datos de configuración header:", headerData);

      // Procesamos cada campo de la estructura en su orden original
      headerFields.forEach(field => {
          if (field.name && field.name !== '*' && field.name !== 'REQUERIMIENTO' && field.type !== 'Longitud del CAMPO') {
               const name = field.name;
               const length = parseInt(field.length) || 0;
               if (length <= 0) return;

               const type = (field.type || '').toLowerCase();
               
               // ASIGNACIÓN CLAVE: Aquí se busca el valor en la configuración
               const hasValue = headerData && headerData.hasOwnProperty(name);
               const rawValue = hasValue ? headerData[name] : '';
               
               console.log(`Campo estructura: "${name}" (${type}, ${length})`);
               console.log(`  → ${hasValue ? 'ENCONTRADO' : 'NO ENCONTRADO'} en config, valor: "${rawValue}"`);
               
               const paddedValue = padValue(rawValue, length, type);
               stringParts.push(paddedValue);
          }
      });
  } else {
      console.warn("Advertencia: Estructura de cabecera no contiene 'fields'.");
  }

  // --- 2. Procesar Requerimiento (Request) usando el orden específico de la estructura ---
  console.log("Procesando requerimiento...");
  if (structure.service_structure.request && structure.service_structure.request.elements) {
      const requestElements = structure.service_structure.request.elements;
      // Usamos directamente el objeto request original sin modificarlo
      const requestData = configData.request;
      
      // Procesamos los elementos según la estructura pero usando los datos de configuración
      processRequestElementsToString(requestElements, requestData, stringParts);
  } else {
      console.warn("Advertencia: Estructura de request no contiene 'elements'.");
  }

  // --- 3. Unir todas las partes y devolver ---
  const finalString = stringParts.join('');
  const finalLength = finalString.length;
  console.log(`String fijo generado. Longitud total: ${finalLength}`);

  // Validar longitud total (opcional pero recomendado)
  try {
      const expectedRequestLength = parseInt(structure.service_structure?.request?.totalLength || 0);
      const expectedHeaderLength = parseInt(structure.header_structure?.totalLength || 0);
      if (expectedHeaderLength > 0 && expectedRequestLength > 0) { // Solo si ambas longitudes están definidas
          const totalExpected = expectedHeaderLength + expectedRequestLength;
          console.log(`Longitud esperada (header + request): ${totalExpected}`);
          if (finalLength !== totalExpected) {
              console.warn(`¡ADVERTENCIA! La longitud generada (${finalLength}) no coincide con la suma de longitudes esperadas (${totalExpected}).`);
          }
      }
  } catch (e) {
       console.error("Error al calcular/comparar longitud esperada:", e);
  }

  return finalString;
}

// ==========================================================================
// LÓGICA PARA GENERAR TEMPLATE JSON VISUAL
// ==========================================================================

/**
* Genera un valor de ejemplo basado en el campo.
*/
function generateExampleValue(field) {
  if (!field) return "VALOR";
  // Lógica simplificada (puedes expandirla como antes si es necesario)
  const fieldName = field.name?.toLowerCase() || '';
  const fieldType = (field.fieldType || field.type || '').toLowerCase();

  if (fieldName.includes('fecha')) return getFechaActual();
  if (fieldName.includes('importe') || fieldName.includes('monto')) return "0.00";
  if (fieldName.includes('cant')) return "1";
  if (fieldType.includes('numeric') || fieldType.includes('numérico')) return "0";
  if (fieldType.includes('alfa')) return ""; // Vacío por defecto para alfa
  return ""; // Vacío por defecto general
}

/**
* Procesa una ocurrencia para el template JSON visual.
*/
function processOccurrenceForTemplate(occurrence, targetObject) {
  if (!occurrence) return;
  const occurrenceId = occurrence.id || `occ_${occurrence.index}`;
  const fieldsForOccurrence = {};
  const childElements = occurrence.elements || occurrence.fields || [];

  const sortedChildren = [...childElements].sort((a, b) => a.index - b.index);

  sortedChildren.forEach(element => {
      if (element.type === 'field') {
          fieldsForOccurrence[element.name] = generateExampleValue(element);
      } else if (element.type === 'occurrence') {
          processOccurrenceForTemplate(element, fieldsForOccurrence); // Recursión
      }
  });
  // Añadir la ocurrencia como un array con UNA instancia de ejemplo
  targetObject[occurrenceId] = [fieldsForOccurrence];
}

/**
* Procesa elementos (campos/ocurrencias) para el template JSON visual.
*/
function processElementsForTemplate(elements, targetObject) {
  if (!elements || !Array.isArray(elements)) return;
  const sortedElements = [...elements].sort((a, b) => a.index - b.index);

  sortedElements.forEach(element => {
      if (element.type === 'field') {
          targetObject[element.name] = generateExampleValue(element);
      } else if (element.type === 'occurrence') {
          processOccurrenceForTemplate(element, targetObject); // Llama a la función específica para template
      }
  });
}

/**
* Procesa la estructura completa para generar el objeto template base.
*/
function processStructureToTemplate(structureData, templateObject) {
  // Procesar header
  if (structureData.header_structure && structureData.header_structure.fields) {
      structureData.header_structure.fields.forEach(field => {
          const name = field.name;
          if (name && name !== '*' && name !== 'REQUERIMIENTO' && field.type !== 'Longitud del CAMPO') {
               // Usar valores por defecto o predefinidos si existen
              templateObject.header[name] = templateObject.header[name] ?? generateExampleValue(field);
          }
      });
  }
  // Procesar request usando la lógica de template
  if (structureData.service_structure?.request?.elements) {
      processElementsForTemplate(structureData.service_structure.request.elements, templateObject.request);
  }
}

/**
* Genera y muestra un template JSON visual basado en el servicio seleccionado.
*/
function generateJsonTemplate() {
  const select = document.getElementById('idaServiceSelect');
  const jsonInputContainer = document.getElementById('idaJsonInput'); // El contenedor DIV

  if (!select || !jsonInputContainer) return;

  const serviceNumber = select.value;
  // Limpiar datos crudos almacenados al generar template
  delete jsonInputContainer.dataset.rawConfigData;

  if (!serviceNumber) {
      jsonInputContainer.innerHTML = formatJsonSimple({}); // Mostrar objeto vacío
      return;
  }

  jsonInputContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Cargando estructura...</div>';
  jsonInputContainer.classList.add('loading');

  fetch(`/excel/structure-by-service?service_number=${serviceNumber}`)
      .then(response => {
          if (!response.ok) throw new Error(`Error ${response.status} al buscar estructura`);
          return response.json();
      })
      .then(data => {
          const template = {
              "header": { // Valores base para el header del template
                   "CANAL": "API", // O el valor del input #canalInput si existe
                   "USUARIO": "SISTEMA", // O un valor de usuario por defecto
                   "SERVICIO": serviceNumber,
                   "FECHA": getFechaActual() // Fecha actual por defecto
                   // Otros campos de header se añadirán desde la estructura
              },
              "request": {}
          };
          // Poblar el template con la estructura
          processStructureToTemplate(data, template);

          jsonInputContainer.innerHTML = ''; // Limpiar 'Cargando...'
          jsonInputContainer.classList.remove('loading');

          try {
              const formattedHtml = formatJsonSimple(template, 0);
              jsonInputContainer.innerHTML = formattedHtml;
              // Re-adjuntar listeners
              const collapseButtons = jsonInputContainer.querySelectorAll('.json-collapse-btn');
              collapseButtons.forEach(button => {
                  button.addEventListener('click', function() {
                      const targetId = this.getAttribute('data-target');
                      toggleJsonNode(targetId, this);
                  });
              });
          } catch (e) {
              console.error("Error al formatear JSON template:", e);
              jsonInputContainer.textContent = JSON
