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
              jsonInputContainer.textContent = JSON.stringify(template, null, 2); // Fallback
          }
      })
      .catch(error => {
          console.error('Error en carga de estructura para template:', error);
          jsonInputContainer.classList.remove('loading');
          jsonInputContainer.innerHTML = `<div style="color: red; padding: 10px;">Error al cargar estructura: ${error.message}</div>`;
      });
}


// ==========================================================================
// LÓGICA PARA CARGAR Y APLICAR CONFIGURACIONES GUARDADAS
// ==========================================================================

/**
* Carga las configuraciones disponibles para un servicio específico en el select.
* @param {string} serviceNumber - Número del servicio seleccionado.
*/
function loadConfigurationsForService(serviceNumber) {
  const configSelect = document.getElementById('idaConfigSelect');
  if (!configSelect) { console.warn("Elemento 'idaConfigSelect' no encontrado."); return; }

  // Limpiar opciones manteniendo la primera ("Seleccione...")
  while (configSelect.options.length > 1) { configSelect.remove(1); }
  configSelect.value = ""; // Reset selection

  if (!serviceNumber) {
      configSelect.disabled = true;
      configSelect.options[0].textContent = "Seleccione un servicio";
      return;
  }

  configSelect.disabled = true; // Deshabilitar mientras carga
  configSelect.options[0].textContent = "Cargando configs...";

  fetch(`/service-config/list?service_number=${serviceNumber}`)
      .then(response => {
          if (!response.ok) throw new Error('Error al listar configuraciones');
          return response.json();
      })
      .then(data => {
          configSelect.disabled = false;
          configSelect.options[0].textContent = "Seleccione Config (Opcional)";

          if (data?.configs?.length > 0) {
              data.configs.forEach(config => {
                  const option = document.createElement('option');
                  option.value = config.id;
                  const shortId = config.id.substring(config.id.length - 8); // Últimos 8 chars del ID
                  option.textContent = `${config.name || `Config (${shortId})`} [${config.canal || 'N/C'}]`;
                  option.title = `ID: ${config.id}\nCreado: ${new Date(config.timestamp).toLocaleString()}`;
                  configSelect.appendChild(option);
              });
          } else {
              const noConfigOption = document.createElement('option');
              noConfigOption.textContent = "No hay configs guardadas";
              noConfigOption.disabled = true;
              configSelect.appendChild(noConfigOption);
          }
      })
      .catch(error => {
          console.error('Error al cargar configuraciones:', error);
          configSelect.options[0].textContent = "Error al cargar";
          configSelect.disabled = true;
          showNotification('Error al cargar lista de configuraciones.', 'error');
      });
}

/**
* Carga y aplica visualmente una configuración seleccionada al editor JSON.
* Almacena los datos crudos en el dataset del contenedor del editor.
* @param {string} configId - ID de la configuración seleccionada.
*/
function applyConfigToTemplate(configId) {
  const jsonInputContainer = document.getElementById('idaJsonInput');
  if (!jsonInputContainer) { console.error("Contenedor 'idaJsonInput' no encontrado."); return; }

  // Limpiar datos crudos almacenados previamente
  delete jsonInputContainer.dataset.rawConfigData;

  if (!configId) {
      generateJsonTemplate(); // Volver al template base si se deselecciona
      return;
  }

  jsonInputContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Cargando configuración...</div>';
  jsonInputContainer.classList.add('loading');

  fetch(`/service-config/get/${configId}`)
      .then(response => {
          if (!response.ok) {
               return response.json().catch(() => ({ message: response.statusText })).then(errData => {
                  throw new Error(errData.message || `Error ${response.status} al cargar config`);
               });
          }
          return response.json();
      })
      .then(config => {
          jsonInputContainer.innerHTML = '';
          jsonInputContainer.classList.remove('loading');

          // Almacenar los datos crudos para 'generarStringFijo'
          jsonInputContainer.dataset.rawConfigData = JSON.stringify(config);

          // Objeto SÓLO con header y request para mostrar
          const displayData = {
              "header": config.header || {},
              "request": config.request || {}
          };

          try {
              const formattedHtml = formatJsonSimple(displayData, 0);
              jsonInputContainer.innerHTML = formattedHtml;
              // Re-adjuntar listeners
              const collapseButtons = jsonInputContainer.querySelectorAll('.json-collapse-btn');
              collapseButtons.forEach(button => {
                  button.addEventListener('click', function() {
                      toggleJsonNode(this.getAttribute('data-target'), this);
                  });
              });
          } catch (e) {
              console.error("Error al formatear JSON config:", e);
              jsonInputContainer.textContent = JSON.stringify(displayData, null, 2); // Fallback
               showNotification('Error al formatear visualización JSON.', 'error');
          }
      })
      .catch(error => {
          console.error('Error al cargar configuración:', error);
          jsonInputContainer.classList.remove('loading');
          jsonInputContainer.innerHTML = `<div style="color: red; padding: 10px;">Error al cargar configuración: ${error.message}</div>`;
          showNotification(`Error al cargar configuración: ${error.message}`, 'error');
      });
}

// ==========================================================================
// LÓGICA PARA PROCESAR SERVICIOS (LLAMADAS API)
// ==========================================================================

/**
* Procesa un servicio de ida (envía JSON al backend).
*/
function processIdaService() {
  const select = document.getElementById('idaServiceSelect');
  const jsonInputContainer = document.getElementById('idaJsonInput'); // Contenedor
  const resultContainer = document.getElementById('idaResult');
  const configSelect = document.getElementById('idaConfigSelect');

  if (!select || !jsonInputContainer || !resultContainer) {
       console.error("Faltan elementos UI para procesar servicio IDA.");
       return;
  }

  const serviceNumber = select.value;
  if (!serviceNumber) {
      showNotification('Por favor, seleccione un servicio', 'error');
      return;
  }

  let configData;
  try {
       // Intentar obtener datos desde el dataset (preferido)
       if (jsonInputContainer.dataset.rawConfigData) {
           configData = JSON.parse(jsonInputContainer.dataset.rawConfigData);
           // Validar que el servicio coincida
           if (configData.serviceNumber !== serviceNumber) {
                showNotification('La configuración cargada no coincide con el servicio seleccionado. Recargue la configuración.', 'error');
                return;
           }
       } else {
           // Fallback MUY PELIGROSO: intentar parsear el textContent (probablemente falle si es HTML)
           console.warn("Intentando parsear textContent para procesar IDA (no recomendado).");
           configData = JSON.parse(jsonInputContainer.textContent);
           // Validar si tiene la estructura esperada
           if (!configData || !configData.header || !configData.request) {
               throw new Error("El JSON visible no tiene la estructura header/request esperada.");
           }
           // Intentar obtener serviceNumber del header
           if (configData.header.SERVICIO !== serviceNumber) {
                showNotification('El servicio en el JSON visible no coincide con el seleccionado.', 'error');
                return;
           }
       }
  } catch (error) {
      resultContainer.textContent = `Error al obtener/parsear JSON: ${error.message}\nAsegúrate de haber seleccionado y cargado una configuración guardada.`;
      showNotification(`Error al obtener/parsear JSON: ${error.message}`, 'error');
      return;
  }

  // Preparar datos para la API (solo necesita header y request)
  const apiRequestData = {
      header: configData.header || {},
      request: configData.request || {}
      // Podrías añadir canal y usuario aquí si la API los espera fuera del header
      // canal: configData.canal || configData.header?.CANAL || 'API',
      // usuario: configData.header?.USUARIO || 'SISTEMA'
  };

  resultContainer.textContent = 'Procesando...';
  const processBtn = document.getElementById('processIdaBtn');
  if(processBtn) processBtn.disabled = true;

  // Enviar petición (AJUSTA EL ENDPOINT SI ES NECESARIO)
  fetch(`/api/services/ida`, { // Endpoint específico para servicios ida
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          service_number: serviceNumber, // Añadir número de servicio explícitamente
          ...apiRequestData // Expandir resto de datos
      })
  })
  .then(async response => { // Hacer async para poder leer body en errores
      if (!response.ok) {
          let errorBody = await response.text(); // Intentar leer cuerpo del error
          try { errorBody = JSON.parse(errorBody); } catch(e){} // Intentar parsear como JSON
           console.error("Error response:", errorBody);
          throw new Error(`Error ${response.status}: ${errorBody?.message || response.statusText}`);
      }
      return response.json();
  })
  .then(data => {
      // Mostrar el resultado formateado
       try {
           resultContainer.innerHTML = formatJsonSimple(data, 0); // Formatear respuesta
           // Adjuntar listeners a la respuesta formateada
           const collapseButtons = resultContainer.querySelectorAll('.json-collapse-btn');
           collapseButtons.forEach(button => {
               button.addEventListener('click', function() {
                   toggleJsonNode(this.getAttribute('data-target'), this);
               });
           });
       } catch (e) {
           resultContainer.textContent = JSON.stringify(data, null, 2); // Fallback texto plano
       }
      showNotification('Servicio procesado correctamente', 'success');
  })
  .catch(error => {
      resultContainer.textContent = `Error: ${error.message}`;
      showNotification(`Error al procesar: ${error.message}`, 'error');
  })
  .finally(() => {
       if(processBtn) processBtn.disabled = false;
  });
}


/**
* Procesa un servicio de vuelta (envía string al backend).
*/
function processVueltaService() {
  const select = document.getElementById('vueltaServiceSelect');
  const streamInput = document.getElementById('streamData');
  const resultContainer = document.getElementById('vueltaResult');

  if (!select || !streamInput || !resultContainer) {
       console.error("Faltan elementos UI para procesar servicio VUELTA.");
       return;
  }

  const serviceNumber = select.value;
  if (!serviceNumber) {
      showNotification('Por favor, seleccione un servicio de vuelta', 'error');
      return;
  }

  const stream = streamInput.value;
  if (!stream) {
      showNotification('Por favor, ingrese datos del stream', 'error');
      return;
  }

  resultContainer.textContent = 'Procesando...';
   const processBtn = document.getElementById('processVueltaBtn');
   if(processBtn) processBtn.disabled = true;


  // Enviar petición con el endpoint específico para servicio de vuelta
  fetch('/api/services/vuelta', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          service_number: serviceNumber,
          stream: stream // Enviar el stream como texto
      })
  })
  .then(async response => {
      if (!response.ok) {
          let errorBody = await response.text();
          try { errorBody = JSON.parse(errorBody); } catch(e){}
          console.error("Error response:", errorBody);
          throw new Error(`Error ${response.status}: ${errorBody?.message || response.statusText}`);
      }
      
      // Intentar determinar el tipo de respuesta
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
          // Es JSON, procesarlo normalmente
          return response.json().then(data => ({ isJson: true, data }));
      } else {
          // No es JSON, tratar como texto
          return response.text().then(text => ({ isJson: false, data: text }));
      }
  })
  .then(result => {
      // Mostrar resultado según su tipo
      if (result.isJson) {
          // Es JSON, formatear como antes
          try {
              resultContainer.innerHTML = formatJsonSimple(result.data, 0);
              // Adjuntar listeners a la respuesta formateada
              const collapseButtons = resultContainer.querySelectorAll('.json-collapse-btn');
              collapseButtons.forEach(button => {
                  button.addEventListener('click', function() {
                      toggleJsonNode(this.getAttribute('data-target'), this);
                  });
              });
          } catch (e) {
              resultContainer.textContent = JSON.stringify(result.data, null, 2); // Fallback texto plano
          }
      } else {
          // Es texto plano, mostrar tal cual
          // Para mejor visualización de texto largo, usamos un pre
          resultContainer.innerHTML = `<pre class="plain-text-response">${result.data}</pre>`;
      }
      
      showNotification('Servicio de Vuelta procesado correctamente', 'success');
  })
  .catch(error => {
      resultContainer.textContent = `Error: ${error.message}`;
      showNotification(`Error al procesar vuelta: ${error.message}`, 'error');
  })
   .finally(() => {
        if(processBtn) processBtn.disabled = false;
   });
}


// ==========================================================================
// INICIALIZACIÓN Y EVENT LISTENERS PRINCIPALES
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // --- Tabs Servicio Ida/Vuelta ---
  const serviceTabBtns = document.querySelectorAll('.services-tab-btn');
  const serviceTabContents = document.querySelectorAll('.service-tab-content');
  serviceTabBtns.forEach(button => {
      button.addEventListener('click', () => {
          serviceTabBtns.forEach(btn => btn.classList.remove('active'));
          serviceTabContents.forEach(content => content.classList.remove('active'));
          button.classList.add('active');
          const tabId = button.getAttribute('data-service-tab');
          const targetElement = document.getElementById(tabId + 'Service');
          if (targetElement) targetElement.classList.add('active');
      });
  });

  // --- Selectores y Botones Servicio IDA ---
  const idaServiceSelect = document.getElementById('idaServiceSelect');
  const idaConfigSelect = document.getElementById('idaConfigSelect');
  const jsonInputContainer = document.getElementById('idaJsonInput');
  const processIdaBtn = document.getElementById('processIdaBtn');
  const generateBtn = document.getElementById('generateStringBtn');
  const outputArea = document.getElementById('fixedStringOutput');

  // Listener para cambio de Servicio
  if (idaServiceSelect && idaConfigSelect && jsonInputContainer) {
      idaServiceSelect.addEventListener('change', function() {
          const serviceNumber = this.value;
          // Limpiar select de config y datos almacenados
          while (idaConfigSelect.options.length > 1) { idaConfigSelect.remove(1); }
          idaConfigSelect.value = "";
          idaConfigSelect.disabled = !serviceNumber;
          delete jsonInputContainer.dataset.rawConfigData;

          generateJsonTemplate(); // Generar template base visual

          if (serviceNumber) {
              loadConfigurationsForService(serviceNumber); // Cargar lista de configs
          } else {
              if (idaConfigSelect.options[0]) idaConfigSelect.options[0].textContent = "Seleccione servicio";
          }
      });

      // Listener para cambio de Configuración
      idaConfigSelect.addEventListener('change', function() {
          delete jsonInputContainer.dataset.rawConfigData; // Limpiar datos viejos
          applyConfigToTemplate(this.value); // Cargar y mostrar config + almacenar datos crudos
      });

      // Carga inicial si hay servicio seleccionado
      if (idaServiceSelect.value) {
          const initialService = idaServiceSelect.value;
          generateJsonTemplate();
          loadConfigurationsForService(initialService);
      } else {
          idaConfigSelect.disabled = true;
      }
  }

  // Listener para Procesar Servicio IDA
  if (processIdaBtn) {
      processIdaBtn.addEventListener('click', processIdaService);
  }

  // Función para actualizar el contador de caracteres
  function updateCharCount(textareaValue) {
      const charCountElement = document.getElementById('charCount');
      if (charCountElement) {
          const count = textareaValue.length;
          charCountElement.textContent = count;
          // Cambiar el color según la longitud (opcional)
          if (count > 0) {
              charCountElement.style.color = 'var(--primary-color)';
          } else {
              charCountElement.style.color = 'var(--text-secondary)';
          }
      }
  }

  // Listener para Generar String Fijo
  if (generateBtn && outputArea && idaServiceSelect && idaConfigSelect && jsonInputContainer) {
       // Actualizar contador cuando el textarea cambie (en caso de edición manual)
       if (outputArea) {
           outputArea.addEventListener('input', function() {
               updateCharCount(this.value);
           });
       }
       
       generateBtn.addEventListener('click', async () => {
          outputArea.value = "Generando...";
          updateCharCount("Generando..."); // Actualizar contador mientras se genera
          generateBtn.disabled = true;

          try {
              // Obtener IDs de configuración y servicio
              const configId = idaConfigSelect.value;
              const serviceNumber = idaServiceSelect.value;
              
              if (!serviceNumber) {
                  throw new Error("Debe seleccionar un servicio");
              }
              
              if (!configId) {
                  throw new Error("Debe seleccionar una configuración");
              }

              // 1. Obtener la configuración seleccionada
              let configData;
              try {
                  // Intentar obtener los datos ya parseados del dataset
                  if (jsonInputContainer.dataset.rawConfigData) {
                      configData = JSON.parse(jsonInputContainer.dataset.rawConfigData);
                  } else {
                      // Si no están en el dataset, obtenerlos mediante fetch
                      const configResponse = await fetch(`/service-config/get/${configId}`);
                      if (!configResponse.ok) {
                          throw new Error(`Error al cargar configuración: ${configResponse.statusText}`);
                      }
                      configData = await configResponse.json();
                      // Guardar para uso futuro
                      jsonInputContainer.dataset.rawConfigData = JSON.stringify(configData);
                  }
              } catch (error) {
                  throw new Error(`Error al obtener configuración: ${error.message}`);
              }

              // 2. Obtener la estructura del servicio
              let structureData;
              try {
                  const structureResponse = await fetch(`/excel/structure-by-service?service_number=${serviceNumber}`);
                  if (!structureResponse.ok) {
                      throw new Error(`Error al cargar estructura: ${structureResponse.statusText}`);
                  }
                  structureData = await structureResponse.json();
              } catch (error) {
                  throw new Error(`Error al obtener estructura: ${error.message}`);
              }

              // 3. Generar String - Llamar directamente a la función con ambos parámetros
              const fixedString = generarStringFijo(structureData, configData);

              // 4. Mostrar Resultado
              outputArea.value = fixedString;
              // Actualizar el contador de caracteres con la longitud real del string generado
              updateCharCount(fixedString);
              showNotification(`String fijo generado (${fixedString.length} caracteres).`, 'success');

          } catch (error) {
              console.error("Error en proceso 'Generar String Fijo':", error);
              outputArea.value = `Error: ${error.message}`;
              showNotification(`Error al generar string: ${error.message}`, 'error');
          } finally {
              generateBtn.disabled = false; // Rehabilitar botón
          }
      });
  } else {
       console.warn("Faltan elementos para botón 'Generar String Fijo'. IDs: #generateStringBtn, #fixedStringOutput, #idaConfigSelect, #idaServiceSelect, #idaJsonInput");
  }


  // --- Selectores y Botones Servicio VUELTA ---
  const processVueltaBtn = document.getElementById('processVueltaBtn');
  const streamInput = document.getElementById('streamData');
  
  // Función para actualizar el contador de caracteres del stream
  function updateStreamCharCount(textareaValue) {
      const charCountElement = document.getElementById('streamCharCount');
      if (charCountElement) {
          const count = textareaValue.length;
          charCountElement.textContent = count;
          if (count > 0) {
              charCountElement.style.color = 'var(--primary-color)';
          } else {
              charCountElement.style.color = 'var(--text-secondary)';
          }
      }
  }
  
  // Actualizar contador de caracteres cuando el textarea de stream cambie
  if (streamInput) {
      streamInput.addEventListener('input', function() {
          updateStreamCharCount(this.value);
      });
      
      // Inicializar contador con el valor actual (si hay alguno)
      updateStreamCharCount(streamInput.value);
  }
  // Event listener para el botón Generar Ejemplo
  const generateExampleBtn = document.getElementById('generateExampleBtn');
  const vueltaServiceSelect = document.getElementById('vueltaServiceSelect');
  
  if (generateExampleBtn && streamInput && vueltaServiceSelect) {
      generateExampleBtn.addEventListener('click', async function() {
          const serviceNumber = vueltaServiceSelect.value;
          if (!serviceNumber) {
              showNotification('Por favor, seleccione un servicio primero', 'error');
              return;
          }
          
          // Deshabilitar botón y mostrar mensaje de carga
          generateExampleBtn.disabled = true;
          streamInput.value = "Generando ejemplo...";
          updateStreamCharCount(streamInput.value);
          
          try {
              // Usar la función asíncrona de ejemplo-stream.js para generar un ejemplo basado en la estructura
              if (typeof getExampleStringForService === 'function') {
                  const exampleString = await getExampleStringForService(serviceNumber);
                  streamInput.value = exampleString;
                  updateStreamCharCount(exampleString);
                  showNotification('String de ejemplo generado correctamente', 'success');
              } else {
                  throw new Error('No se pudo cargar la función de ejemplos');
              }
          } catch (error) {
              console.error("Error al generar ejemplo:", error);
              showNotification(`Error: ${error.message}`, 'error');
              streamInput.value = "";
              updateStreamCharCount("");
          } finally {
              // Habilitar el botón nuevamente
              generateExampleBtn.disabled = false;
          }
      });
  }
  
  if (processVueltaBtn) {
      processVueltaBtn.addEventListener('click', processVueltaService);
  }

}); // Fin del DOMContentLoaded principal
