/**
 * Script principal para la interfaz de usuario
 */

// Elementos del DOM
const excelFileInput = document.getElementById('excelFile');
const fileNameDisplay = document.getElementById('fileName');
const uploadButton = document.getElementById('uploadButton');
const uploadForm = document.getElementById('uploadForm');
const notification = document.getElementById('notification');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const confirmModal = document.getElementById('confirmModal');
const confirmYesBtn = document.getElementById('confirmYes');
const confirmNoBtn = document.getElementById('confirmNo');
const confirmCloseBtn = document.querySelector('.close');
const confirmMessage = document.getElementById('confirmMessage');

// Tablas
const headerTable = document.getElementById('headerTable').querySelector('tbody');
const requestTable = document.getElementById('requestTable').querySelector('tbody');
const responseTable = document.getElementById('responseTable').querySelector('tbody');
const filesTable = document.getElementById('filesTable').querySelector('tbody');
const jsonContent = document.getElementById('jsonContent');

// Elementos de servicios
const serviceNumberInput = document.getElementById('serviceNumber');
const streamDataInput = document.getElementById('streamData');
const processServiceBtn = document.getElementById('processServiceBtn');
const servicesTable = document.getElementById('servicesTable').querySelector('tbody');
const serviceResult = document.getElementById('serviceResult');

// Variables globales
let currentStructure = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Cargar lista de archivos
  loadFilesList();
  
  // Cargar lista de servicios
  loadServicesList();
  
  // Inicializar pestañas
  initTabs();
  
  // Inicializar eventos de servicios
  initServiceEvents();
});

/**
 * Inicializa el comportamiento de las pestañas
 */
function initTabs() {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Desactivar todas las pestañas
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Activar la pestaña seleccionada
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
      
      // Si es la pestaña de archivos, recargar la lista
      if (tabId === 'archivos') {
        loadFilesList();
      }
      
      // Si es la pestaña de servicios, recargar la lista
      if (tabId === 'servicios') {
        loadServicesList();
      }
    });
  });
}

/**
 * Maneja el cambio en el input de archivo
 */
excelFileInput.addEventListener('change', () => {
  if (excelFileInput.files && excelFileInput.files.length > 0) {
    fileNameDisplay.textContent = excelFileInput.files[0].name;
    uploadButton.disabled = false;
  } else {
    fileNameDisplay.textContent = 'Ningún archivo seleccionado';
    uploadButton.disabled = true;
  }
});

// Maneja eventos del modal de confirmación
confirmYesBtn.addEventListener('click', () => {
  // Ocultar el modal
  confirmModal.style.display = 'none';
  
  // Procesar el archivo (continuar con la subida)
  const formData = new FormData(uploadForm);
  
  // Añadir bandera para indicar que es una actualización
  formData.append('update', 'true');
  
  // Ejecutar la subida
  uploadExcelFile(formData);
});

confirmNoBtn.addEventListener('click', () => {
  // Ocultar el modal y cancelar la subida
  confirmModal.style.display = 'none';
  
  // Restablecer botón
  uploadButton.disabled = false;
  uploadButton.textContent = 'Procesar Archivo';
  
  showNotification('Subida cancelada por el usuario', 'error');
});

confirmCloseBtn.addEventListener('click', () => {
  // Ocultar el modal y cancelar la subida
  confirmModal.style.display = 'none';
  
  // Restablecer botón
  uploadButton.disabled = false;
  uploadButton.textContent = 'Procesar Archivo';
});

/**
 * Maneja el envío del formulario
 */
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!excelFileInput.files || excelFileInput.files.length === 0) {
    showNotification('Por favor seleccione un archivo Excel', 'error');
    return;
  }
  
  uploadButton.disabled = true;
  uploadButton.textContent = 'Procesando...';
  
  try {
    // Primero, intentar extraer el número de servicio del nombre del archivo
    const fileName = excelFileInput.files[0].name;
    let serviceNumber = null;
    
    // Intentar extraer el número SVO del nombre, por ejemplo "SVO3088 - Algo.xls"
    const svoMatch = fileName.match(/SVO(\d+)/i);
    if (svoMatch && svoMatch[1]) {
      serviceNumber = svoMatch[1];
      
      // Verificar si este servicio ya existe
      const checkResponse = await fetch('/excel/check-service-exists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ serviceNumber })
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        
        if (checkData.exists) {
          // Mostrar modal de confirmación
          confirmMessage.textContent = `Ya existen ${checkData.services.length} versión(es) del servicio ${serviceNumber}. ¿Desea actualizar este servicio? La(s) versión(es) anterior(es) seguirá(n) disponible(s).`;
          confirmModal.style.display = 'block';
          return; // Detener aquí y esperar la respuesta del usuario
        }
      }
    }
    
    // Si no hubo coincidencia de servicio o el servicio no existe, continuar normalmente
    const formData = new FormData(uploadForm);
    uploadExcelFile(formData);
    
  } catch (error) {
    showNotification(error.message, 'error');
    
    // Restablecer botón
    uploadButton.disabled = false;
    uploadButton.textContent = 'Procesar Archivo';
  }
});

/**
 * Realiza la subida del archivo Excel
 */
async function uploadExcelFile(formData) {
  try {
    const response = await fetch('/excel/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al procesar el archivo');
    }
    
    const data = await response.json();
    showNotification(data.message, 'success');
    
    // Cargar la estructura del archivo recién subido
    loadStructure(data.structure_file);
    
    // Recargar la lista de archivos
    loadFilesList();
    
    // Recargar la lista de servicios sin recargar la página completa
    await loadServicesList();
    
    // Actualizar los selectores directamente sin recargar toda la página
    await loadServicesIntoSelect('idaServiceSelect');
    await loadServicesIntoSelect('vueltaServiceSelect');
    
    // Mostrar notificación de éxito
    showNotification("Archivo procesado correctamente. Servicios actualizados.", 'success');
    
  } catch (error) {
    showNotification(error.message, 'error');
  } finally {
    uploadButton.disabled = false;
    uploadButton.textContent = 'Procesar Archivo';
  }
}

/**
 * Muestra una notificación
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación ('success' o 'error')
 */
function showNotification(message, type) {
  notification.textContent = message;
  notification.className = 'notification';
  notification.classList.add(type);
  
  // Mostrar la notificación
  notification.style.display = 'block';
  
  // Ocultar la notificación después de 5 segundos
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}

/**
 * Carga la lista de archivos Excel procesados
 */
async function loadFilesList() {
  try {
    const response = await fetch('/excel/files');
    
    if (!response.ok) {
      throw new Error('Error al cargar la lista de archivos');
    }
    
    const data = await response.json();
    
    // Limpiar la tabla
    filesTable.innerHTML = '';
    
    // Si no hay archivos, mostrar mensaje
    if (data.files.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="3">No hay archivos procesados</td>';
      filesTable.appendChild(row);
      return;
    }
    
    // Crear un Map para evitar mostrar servicios repetidos
    // Usamos un Map para mantener el orden de inserción
    const uniqueFiles = new Map();
    
    // Agrupar archivos por número de servicio, manteniendo el más reciente
    data.files.forEach(file => {
      const serviceNumber = file.service_number || '';
      
      // Si tenemos un número de servicio, usarlo como clave para agrupar
      if (serviceNumber) {
        // Si este servicio no existe en el mapa o si la fecha de subida es más reciente
        if (!uniqueFiles.has(serviceNumber) || 
            file.upload_date > uniqueFiles.get(serviceNumber).upload_date) {
          uniqueFiles.set(serviceNumber, file);
        }
      } else {
        // Si no tiene número de servicio, usar el nombre de archivo como clave
        uniqueFiles.set(file.filename, file);
      }
    });
    
    // Convertir el Map a Array para mostrar los archivos
    const uniqueFilesArray = Array.from(uniqueFiles.values());
    
    // Agregar cada archivo único a la tabla
    uniqueFilesArray.forEach(file => {
      const row = document.createElement('tr');
      
      // Usar el nombre completo del servicio en la tabla
      let displayName = file.service_name || file.filename || "Servicio sin nombre";
      
      row.innerHTML = `
        <td>${displayName}</td>
        <td>${file.upload_date}</td>
        <td>
        <button class="action-btn" onclick="loadStructure('${file.structure_file}')">Ver</button>
        </td>
      `;
      
      filesTable.appendChild(row);
    });
    
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

/**
 * Carga la estructura de un archivo
 * @param {string} structureFile - Nombre del archivo de estructura
 */
async function loadStructure(structureFile) {
  try {
    const response = await fetch(`/excel/structure?structure_file=${structureFile}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al cargar la estructura');
    }
    
    const data = await response.json();
    currentStructure = data;
    
    // Mostrar la estructura en las tablas
    displayHeaderStructure(data.header_structure);
    displayServiceStructure(data.service_structure);
    
    // Mostrar todo el JSON en una sola vista
    formatAndDisplayJson(data);
    
    // Cambiar a la pestaña de cabecera
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanes.forEach(pane => pane.classList.remove('active'));
    document.querySelector('[data-tab="cabecera"]').classList.add('active');
    document.getElementById('cabecera').classList.add('active');
    
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

/**
 * Formatea y muestra la estructura JSON
 * @param {Object} data - Datos a mostrar
 */
function formatAndDisplayJson(data) {
  // Si jsonContent está definido, mostrar el JSON formateado con colores y nodos colapsables
  if (jsonContent) {
    // Limpiar el contenedor primero
    jsonContent.innerHTML = '';
    
    // Crear el HTML formateado para el JSON
    const formattedHtml = formatJsonSimple(data, 0);
    
    // Insertar el HTML en el contenedor
    jsonContent.innerHTML = formattedHtml;
    
    // Asegurarse de que los botones de colapso funcionen
    const collapseButtons = jsonContent.querySelectorAll('.json-collapse-btn');
    collapseButtons.forEach(button => {
      const targetId = button.getAttribute('data-target');
      button.onclick = () => {
        toggleJsonNode(targetId, button);
      };
    });
  }
}

/**
 * Muestra la estructura de cabecera en la tabla
 * @param {Object} headerStructure - Estructura de cabecera
 */
function displayHeaderStructure(headerStructure) {
  // Limpiar la tabla
  headerTable.innerHTML = '';
  
  // Si no hay estructura, mostrar mensaje
  if (!headerStructure || !headerStructure.fields || headerStructure.fields.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5">No hay estructura de cabecera disponible</td>';
    headerTable.appendChild(row);
    return;
  }
  
  // Agregar cada campo a la tabla
  headerStructure.fields.forEach(field => {
    const row = document.createElement('tr');
    
    // Formatear los campos para manejar valores largos o múltiples
    const formattedName = field.name;
    const formattedLength = formatFieldValue(field.length);
    const formattedType = formatFieldValue(field.type);
    const formattedRequired = field.required;
    
    // Asegurar que la descripción también tenga scroll si es larga
    let formattedDescription = field.description;
    if (formattedDescription && formattedDescription.length > 50) {
      formattedDescription = `
        <div class="field-value-container">
          <div class="field-value-multiple">${formattedDescription}</div>
        </div>
      `;
    } else {
      formattedDescription = formatFieldValue(field.description);
    }
    
    // Formatear el campo valores
    const formattedValues = formatFieldValue(field.values);
    
    row.innerHTML = `
      <td>${formattedName}</td>
      <td>${formattedLength}</td>
      <td>${formattedType}</td>
      <td>${formattedRequired}</td>
      <td>${formattedValues}</td>
      <td>${formattedDescription}</td>
    `;
    
    headerTable.appendChild(row);
  });
}

/**
 * Muestra la estructura de servicio en las tablas de requerimiento y respuesta
 * @param {Object} serviceStructure - Estructura de servicio
 */
function displayServiceStructure(serviceStructure) {
  // Limpiar las tablas
  requestTable.innerHTML = '';
  responseTable.innerHTML = '';
  
  // Si no hay estructura, mostrar mensaje
  if (!serviceStructure) {
    const requestRow = document.createElement('tr');
    requestRow.innerHTML = '<td colspan="5">No hay estructura de requerimiento disponible</td>';
    requestTable.appendChild(requestRow);
    
    const responseRow = document.createElement('tr');
    responseRow.innerHTML = '<td colspan="5">No hay estructura de respuesta disponible</td>';
    responseTable.appendChild(responseRow);
    return;
  }
  
  // Procesar sección de requerimiento
  if (serviceStructure.request && serviceStructure.request.elements) {
    displayServiceSection(serviceStructure.request, requestTable);
  } else {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5">No hay estructura de requerimiento disponible</td>';
    requestTable.appendChild(row);
  }
  
  // Procesar sección de respuesta
  if (serviceStructure.response && serviceStructure.response.elements) {
    displayServiceSection(serviceStructure.response, responseTable);
  } else {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5">No hay estructura de respuesta disponible</td>';
    responseTable.appendChild(row);
  }
}

/**
 * Muestra una sección de la estructura de servicio en una tabla
 * @param {Object} section - Sección de la estructura (request o response)
 * @param {HTMLElement} table - Tabla donde mostrar la estructura
 */
function displayServiceSection(section, table) {
  // Reorganizar la estructura para manejar ocurrencias anidadas
  const reorganizedSection = reorganizeJsonStructure(section);
  
  // Procesar elementos recursivamente
  displayElements(reorganizedSection.elements, table, 0);
}

/**
 * Reorganiza la estructura JSON para que las ocurrencias anidadas estén dentro de sus padres
 * @param {Object} structure - Estructura a reorganizar
 * @returns {Object} Estructura reorganizada
 */
function reorganizeJsonStructure(structure) {
  // Si no es un objeto o es null, devolver tal cual
  if (typeof structure !== 'object' || structure === null) {
    return structure;
  }
  
  // Si es un array, procesar cada elemento
  if (Array.isArray(structure)) {
    return structure.map(item => reorganizeJsonStructure(item));
  }
  
  // Crear una copia del objeto para no modificar el original
  const result = { ...structure };
  
  // Verificar si es la estructura de ocurrencias
  if (result.elements && Array.isArray(result.elements)) {
    // Crear un mapa de elementos por ID para facilitar la búsqueda
    const elementsById = {};
    result.elements.forEach(el => {
      if (el.id) {
        elementsById[el.id] = el;
      } else if (el.index) {
        elementsById[el.index] = el;
      }
    });
    
    // Crear una estructura jerárquica basada en parentId
    const hierarchicalElements = [];
    const processedElements = new Set();
    
    // Primero, procesar los elementos de nivel 0 (sin parentId)
    result.elements.forEach(el => {
      if (!el.parentId) {
        // Este es un elemento raíz
        hierarchicalElements.push(el);
        processedElements.add(el);
      }
    });
    
    // Luego, procesar los elementos con parentId
    result.elements.forEach(el => {
      if (el.parentId && !processedElements.has(el)) {
        const parentId = el.parentId;
        const parent = elementsById[parentId];
        
        if (parent) {
          // Inicializar el array de children si no existe
          if (!parent.children) {
            parent.children = [];
          }
          
          // Agregar el elemento al array de hijos del padre
          parent.children.push(el);
          processedElements.add(el);
        }
      }
    });
    
    // Actualizar los elementos con la estructura jerárquica
    result.elements = hierarchicalElements;
  }
  
  // Procesar recursivamente cada propiedad del objeto
  for (const key in result) {
    if (result[key] && typeof result[key] === 'object') {
      result[key] = reorganizeJsonStructure(result[key]);
    }
  }
  
  return result;
}

/**
 * Muestra elementos de forma recursiva con niveles de indentación
 * @param {Array} elements - Elementos a mostrar
 * @param {HTMLElement} table - Tabla donde mostrar la estructura
 * @param {number} level - Nivel de anidamiento
 */
function displayElements(elements, table, level = 0) {
  if (!elements || !Array.isArray(elements)) return;
  
  // Ordenar elementos por índice para mantener el orden correcto
  const sortedElements = [...elements].sort((a, b) => {
    return (a.index || 0) - (b.index || 0);
  });
  
  sortedElements.forEach(element => {
    if (element.type === 'field') {
      // Agregar campo
      const row = document.createElement('tr');
      
      // Aplicar indentación según el nivel
      const paddingLeft = level * 30;
      
      // Add data attributes for CSS targeting
      row.setAttribute('data-level', level);
      row.setAttribute('data-type', 'field');
      
      // Asegurar que la descripción también tenga scroll si es larga
      let formattedDescription = element.description;
      if (formattedDescription && formattedDescription.length > 50) {
        formattedDescription = `
          <div class="field-value-container">
            <div class="field-value-multiple">${formattedDescription}</div>
          </div>
        `;
      }
      
      // Formatear todos los campos
      const formattedName = element.name;
      const formattedLength = formatFieldValue(element.length);
      const formattedType = formatFieldValue(element.fieldType);
      const formattedRequired = element.required;
      
      // Formatear los valores largos o múltiples - siempre truncar en valores
      const formattedValues = formatFieldValue(element.values, true);
      
      row.innerHTML = `
        <td style="padding-left: ${paddingLeft}px;">${formattedName}</td>
        <td>${formattedLength}</td>
        <td>${formattedType}</td>
        <td>${formattedRequired}</td>
        <td>${formattedValues}</td>
        <td>${formattedDescription}</td>
      `;
      
      table.appendChild(row);
    } else if (element.type === 'occurrence') {
      // Agregar ocurrencia
      const occRow = document.createElement('tr');
      occRow.className = 'occurrence-row';
      
      // Add data attributes for CSS targeting
      occRow.setAttribute('data-level', level);
      occRow.setAttribute('data-type', 'occurrence');
      occRow.classList.add(`level-color-${level}`);
      
      // Aplicar indentación según el nivel
      const paddingLeft = level * 30;
      
      // Mostrar identificador para aclarar la jerarquía
      const levelIndicator = level > 0 ? `(Nivel ${level+1})` : '';
      const occId = `occ_${element.id || element.index}_${level}`;
      
      // Añadir un atributo de ID para identificar esta ocurrencia
      occRow.setAttribute('data-occurrence-id', occId);
      
      occRow.innerHTML = `
        <td colspan="6" style="padding-left: ${paddingLeft}px;">
          <span class="collapse-btn" onclick="toggleOccurrence('${occId}')">-</span>
          <strong>Ocurrencia ${element.id || element.index} ${levelIndicator} (${element.count})</strong>
        </td>
      `;
      
      table.appendChild(occRow);
      
      // Procesar campos de la ocurrencia
      if (element.fields && element.fields.length > 0) {
        // Ordenar todos los campos y ocurrencias por índice para mantener el orden original
        const sortedFields = [...element.fields].sort((a, b) => {
          return (a.index || 0) - (b.index || 0);
        });
        
        // Mostrar campos y ocurrencias respetando el orden original
        sortedFields.forEach(field => {
          if (field.type === 'field') {
            // Campo regular
            const fieldRow = document.createElement('tr');
            fieldRow.className = 'occurrence-field-row';
            
            // Add data attributes for CSS targeting
            fieldRow.setAttribute('data-level', level + 1);
            fieldRow.setAttribute('data-type', 'field');
            fieldRow.setAttribute('data-parent-occurrence', element.id || element.index);
            fieldRow.setAttribute('data-index', field.index || 0);
            
            const fieldPaddingLeft = (level + 1) * 30;
            
            // Asegurar que la descripción también tenga scroll si es larga
            let formattedDescription = field.description;
            if (formattedDescription && formattedDescription.length > 50) {
              formattedDescription = `
                <div class="field-value-container">
                  <div class="field-value-multiple">${formattedDescription}</div>
                </div>
              `;
            } else {
              formattedDescription = formatFieldValue(field.description);
            }
            
            // Formatear todos los campos
            const formattedName = field.name;
            const formattedLength = formatFieldValue(field.length);
            const formattedType = formatFieldValue(field.fieldType);
            const formattedRequired = field.required;
            
            // Formatear los valores
            const formattedValues = formatFieldValue(field.values);
            
            fieldRow.innerHTML = `
              <td style="padding-left: ${fieldPaddingLeft}px;">${formattedName}</td>
              <td>${formattedLength}</td>
              <td>${formattedType}</td>
              <td>${formattedRequired}</td>
              <td>${formattedValues}</td>
              <td>${formattedDescription}</td>
            `;
            
            table.appendChild(fieldRow);
          } else if (field.type === 'occurrence') {
            // Ocurrencia anidada - llamada recursiva para mostrar
            displayElements([field], table, level + 1);
          }
        });
      }
      
      // Si hay children (para compatibilidad con reorganizeJsonStructure)
      if (element.children && element.children.length > 0) {
        displayElements(element.children, table, level + 1);
      }
      
      // Añadir marcador de fin de ocurrencia
      const endRow = document.createElement('tr');
      endRow.className = 'occurrence-end';
      endRow.classList.add(`level-color-${level}`);
      endRow.setAttribute('data-occurrence-end', occId);
      
      endRow.innerHTML = `
        <td colspan="6"></td>
      `;
      
      table.appendChild(endRow);
    }
  });
}

/**
 * Formatea un valor de campo, detectando valores múltiples o muy largos
 * @param {string} value - Valor a formatear
 * @param {boolean} forceValues - Si es true, siempre truncar el valor a 10 caracteres
 * @returns {string} HTML formateado con el valor
 */
function formatFieldValue(value, forceValues = false) {
  if (!value) return '';
  
  // Convertir a string en caso de que sea un número u otro tipo
  const strValue = String(value);
  
  let multipleValues = [];
  
  // ============= DETECCIÓN DE PATRONES =============
  
  // 1. Patrón NN=Texto
  // Detecta formatos como "112=DEVOLUCIÓN" o "112 = DEVOLUCIÓN"
  if (multipleValues.length === 0) {
    const numericEqualsPattern = /(\d+)\s*=\s*([^=]+?)(?=\s+\d+\s*=|\s*$)/g;
    const numericEqualsMatches = [...strValue.matchAll(numericEqualsPattern)];
    
    if (numericEqualsMatches.length >= 1) {
      numericEqualsMatches.forEach(match => {
        multipleValues.push(`${match[1]}=${match[2].trim()}`);
      });
    }
  }
  
  // 2. Patrón TEXTO NNNN TEXTO
  // Detecta códigos numéricos de 4 o más dígitos embedidos en texto
  // Ejemplo: "CUENTA INEXISTENTE MODULO 5000 5003 IMPUTACION RECHAZADA"
  if (multipleValues.length === 0) {
    // Dividir el texto cuando aparezca un número de 4+ dígitos
    const numericCodePattern = /\b(\d{4,})\b/g;
    const textParts = strValue.split(numericCodePattern);
    
    // Si tenemos al menos un número y texto que lo rodea
    if (textParts.length >= 3) {
      let formattedParts = [];
      let currentText = textParts[0].trim();
      
      // Recorrer las partes
      for (let i = 1; i < textParts.length; i += 2) {
        // Si tenemos un número y su texto siguiente
        if (i+1 < textParts.length) {
          const codigo = textParts[i];
          const siguienteTexto = textParts[i+1].trim();
          
          // Si hay texto acumulado, añadirlo con el código
          if (currentText) {
            formattedParts.push(`${currentText} ${codigo}`);
            currentText = siguienteTexto;
          } else {
            currentText = `${codigo} ${siguienteTexto}`;
          }
        } else if (i < textParts.length) {
          // Si solo queda el número
          formattedParts.push(`${currentText} ${textParts[i]}`);
        }
      }
      
      // Añadir cualquier texto restante
      if (currentText && formattedParts.length > 0) {
        formattedParts.push(currentText);
      } else if (currentText) {
        formattedParts = [currentText];
      }
      
      if (formattedParts.length >= 2) {
        multipleValues = formattedParts.filter(Boolean);
      }
    }
  }
  
  // 3. Separadores convencionales (comas, punto y coma, barras)
  if (multipleValues.length === 0) {
    // Primero verificar si el texto es una fecha para no partirla
    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
    const isDate = datePattern.test(strValue.trim());
    
    if (!isDate) {
      const separators = [
        // Separadores comunes
        /\s*[,;|]\s*/,
        // Otros separadores menos comunes (con espacio antes o después para evitar partir fechas)
        /\s+\/\s+/,
        /\s+\\\s+/,
        // Guiones solo si están rodeados de espacios
        /\s+-\s+/
      ];
      
      for (const separator of separators) {
        // Verificar si el separador está presente
        if (separator instanceof RegExp ? separator.test(strValue) : strValue.includes(separator)) {
          // Dividir por el separador
          const parts = separator instanceof RegExp ? 
            strValue.split(separator) : 
            strValue.split(separator);
          
          // Filtrar valores vacíos
          const filteredParts = parts.map(part => part.trim()).filter(Boolean);
          
          // Si hay al menos 2 elementos, consideramos que son valores múltiples
          if (filteredParts.length >= 2) {
            // Verificar que ninguna parte sea una fecha
            const anyPartIsDate = filteredParts.some(part => datePattern.test(part.trim()));
            if (!anyPartIsDate) {
              multipleValues = filteredParts;
              break;
            }
          }
        }
      }
    }
  }
  
  // Generar un ID único para este campo
  const uniqueId = 'values_' + Math.random().toString(36).substr(2, 9);
  
  // Si hay valores múltiples o el valor es muy largo, usar contenedor con elipsis
  if (multipleValues.length >= 2 || strValue.length > 50) {
    if (multipleValues.length >= 2) {
      // Mostrar solo el primer valor seguido de elipsis y un botón para expandir
      return `
        <div class="field-value-preview">
          <span class="field-value-first">${multipleValues[0]}</span>
          <span class="field-value-ellipsis">...</span>
          <button class="field-value-expand" onclick="toggleValueDetails('${uniqueId}')">+</button>
        </div>
        <div id="${uniqueId}" class="field-value-container" style="display:none;">
          <div class="field-value-multiple">
            ${multipleValues.join('<br>')}
          </div>
        </div>
      `;
    } else {
      // Para valores muy largos, mostrar versión truncada con botón para expandir
      return `
        <div class="field-value-preview">
          <span class="field-value-first">${strValue.substring(0, 50)}</span>
          <span class="field-value-ellipsis">...</span>
          <button class="field-value-expand" onclick="toggleValueDetails('${uniqueId}')">+</button>
        </div>
        <div id="${uniqueId}" class="field-value-container" style="display:none;">
          <div class="field-value-multiple">${strValue}</div>
        </div>
      `;
    }
  }
  
  // Para valores normales, devolverlos tal cual
  return strValue;
}

/**
 * Toggle para mostrar/ocultar los detalles de un valor
 * @param {string} id - ID del contenedor a mostrar/ocultar
 */
function toggleValueDetails(id) {
  const container = document.getElementById(id);
  if (container) {
    const isVisible = container.style.display !== 'none';
    container.style.display = isVisible ? 'none' : 'block';
    
    // Cambiar el icono del botón (+ a - o viceversa)
    const button = document.querySelector(`button[onclick="toggleValueDetails('${id}')"]`);
    if (button) {
      button.textContent = isVisible ? '+' : '-';
    }
  }
}

/**
 * Toggle para expandir/contraer ocurrencias
 * @param {string} id - ID de la ocurrencia
 */
function toggleOccurrence(id) {
  // Obtener todos los elementos relacionados con esta ocurrencia
  const rows = document.querySelectorAll(`[data-parent-occurrence="${id}"], [data-occurrence-end="${id}"]`);
  const occurrenceRow = document.querySelector(`[data-occurrence-id="${id}"]`);
  
  // Si no hay filas para alternar, no hacer nada
  if (rows.length === 0) return;
  
  // Verificar si están visibles (usar la primera fila como referencia)
  const isVisible = window.getComputedStyle(rows[0]).display !== 'none';
  
  // Cambiar el estado de visibilidad
  rows.forEach(row => {
    row.style.display = isVisible ? 'none' : 'table-row';
  });
  
  // Cambiar el icono del botón en la fila de ocurrencia
  if (occurrenceRow) {
    const button = occurrenceRow.querySelector('.collapse-btn');
    if (button) {
      button.textContent = isVisible ? '+' : '-';
    }
  }
}

/**
 * Inicializa los eventos para la sección de servicios
 */
function initServiceEvents() {
  if (processServiceBtn) {
    processServiceBtn.addEventListener('click', processService);
  }
}

/**
 * Carga la lista de servicios
 */
async function loadServicesList() {
  try {
    const response = await fetch('/api/services');
    
    if (!response.ok) {
      throw new Error('Error al cargar la lista de servicios');
    }
    
    const data = await response.json();
    
    // Limpiar la tabla
    if (servicesTable) {
      servicesTable.innerHTML = '';
      
      // Si no hay servicios, mostrar mensaje
      if (data.services.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4">No hay servicios disponibles</td>';
        servicesTable.appendChild(row);
        return;
      }
      
      // Agrupar servicios por número
      const servicesByNumber = {};
      
      data.services.forEach(service => {
        if (!servicesByNumber[service.service_number]) {
          servicesByNumber[service.service_number] = [];
        }
        servicesByNumber[service.service_number].push(service);
      });
      
      // Ordenar los números de servicio
      const sortedNumbers = Object.keys(servicesByNumber).sort((a, b) => parseInt(a) - parseInt(b));
      
      // Mostrar los servicios agrupados
      sortedNumbers.forEach(serviceNumber => {
        const services = servicesByNumber[serviceNumber];
        
        // Ordenar las versiones por fecha (la más reciente primero)
        services.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Agregar fila para el servicio (usando la versión más reciente como representativa)
        const latestService = services[0];
        
        const row = document.createElement('tr');
        
        // Usar el nombre del servicio sin el número
        const displayName = latestService.service_name || latestService.display_name || 'Sin nombre';
        
        row.innerHTML = `
          <td>${serviceNumber}</td>
          <td>${displayName}</td>
          <td>
            <button class="action-btn" onclick="processService('${serviceNumber}')">Probar</button>
            <button class="action-btn" onclick="loadServiceVersions('${serviceNumber}')">Versiones</button>
          </td>
        `;
        
        servicesTable.appendChild(row);
      });
    }
    
    // También cargar los servicios en los selectores si existen
    await loadServicesIntoSelect('idaServiceSelect');
    await loadServicesIntoSelect('vueltaServiceSelect');
    
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

/**
 * Carga los servicios disponibles en un select
 * @param {string} selectId - ID del elemento select
 */
async function loadServicesIntoSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  try {
    const response = await fetch('/api/services');
    
    if (!response.ok) {
      throw new Error('Error al cargar la lista de servicios');
    }
    
    const data = await response.json();
    
    // Recordar el valor seleccionado actualmente
    const currentValue = select.value;
    
    // Limpiar el select (mantener solo la primera opción)
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // Agrupar servicios por número para evitar duplicados
    const servicesByNumber = {};
    
    data.services.forEach(service => {
      if (!servicesByNumber[service.service_number]) {
        servicesByNumber[service.service_number] = [];
      }
      servicesByNumber[service.service_number].push(service);
    });
    
    // Ordenar los números de servicio
    const sortedNumbers = Object.keys(servicesByNumber).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Para cada número de servicio, usar solo la versión más reciente
    for (const serviceNumber of sortedNumbers) {
      const services = servicesByNumber[serviceNumber];
      
      // Ordenar por excel_file (más reciente primero, basándose en el timestamp del nombre)
      services.sort((a, b) => {
        const fileA = a.excel_file || '';
        const fileB = b.excel_file || '';
        return fileB.localeCompare(fileA);
      });
      
      // Tomar solo el servicio más reciente para cada número
      const latestService = services[0];
      
      // Mostrar el nombre completo del servicio
      let displayName = latestService.service_name || latestService.display_name || `Servicio ${serviceNumber}`;
      
      const option = document.createElement('option');
      option.value = serviceNumber;
      option.dataset.excelFile = latestService.excel_file || ''; // Guardar el archivo Excel para referencia
      option.textContent = displayName;
      select.appendChild(option);
    }
    
    // Intentar restaurar el valor seleccionado
    if (currentValue) {
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === currentValue) {
          select.selectedIndex = i;
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('Error al cargar servicios en el select:', error);
  }
}

/**
 * Carga las versiones de un servicio
 * @param {string} serviceNumber - Número de servicio
 */
async function loadServiceVersions(serviceNumber) {
  try {
    const response = await fetch(`/api/services/versions?serviceNumber=${serviceNumber}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar las versiones del servicio');
    }
    
    const data = await response.json();
    
    // Mostrar las versiones en una modal o una sección dedicada
    // Por el momento, simplemente mostramos una notificación
    if (data.versions && data.versions.length > 0) {
      let message = `Versiones disponibles del servicio ${serviceNumber}:\n`;
      data.versions.forEach((version, index) => {
        const date = new Date(version.timestamp).toLocaleString();
        message += `${index + 1}. ${date}\n`;
      });
      
      alert(message);
    } else {
      showNotification(`No se encontraron versiones para el servicio ${serviceNumber}`, 'error');
    }
    
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

/**
 * Procesa un servicio
 * @param {string} [serviceNumber] - Número de servicio (opcional, sino se toma del input)
 */
async function processService(serviceNumber = null) {
  // Si se proporciona un número de servicio, usarlo; de lo contrario, tomar del input
  const svcNumber = serviceNumber || (serviceNumberInput ? serviceNumberInput.value : null);
  
  if (!svcNumber) {
    showNotification('Por favor, ingrese un número de servicio', 'error');
    return;
  }
  
  try {
    // Obtener el texto del stream si está disponible
    const streamData = streamDataInput ? streamDataInput.value : '';
    
    const response = await fetch('/api/services/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        service_number: svcNumber,
        stream: streamData || null
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al procesar el servicio');
    }
    
    const data = await response.json();
    
    // Mostrar el resultado en el área designada
    if (serviceResult) {
      // Formatear JSON para mejor visualización
      const formattedResult = typeof data.result === 'object' ?
        JSON.stringify(data.result, null, 2) :
        data.result;
      
      serviceResult.textContent = formattedResult;
    }
    
    showNotification('Servicio procesado correctamente', 'success');
    
  } catch (error) {
    showNotification(error.message, 'error');
  }
}
