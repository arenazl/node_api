/**
 * Script principal para la interfaz de usuario
 */

// Elementos del DOM
const excelFileInput = document.getElementById('excelFile');
const fileNameDisplay = document.getElementById('fileName');
const uploadForm = document.getElementById('uploadForm');
const notification = document.getElementById('notification');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const confirmModal = document.getElementById('confirmModal');
const confirmYesBtn = document.getElementById('confirmYes');
const confirmNoBtn = document.getElementById('confirmNo');
const confirmCloseBtn = document.querySelector('.close');
const confirmMessage = document.getElementById('confirmMessage');

// Tablas - Verificamos que existan antes de acceder a ellas
const headerTable = document.getElementById('headerTable')?.querySelector('tbody') || null;
const requestTable = document.getElementById('requestTable')?.querySelector('tbody') || null;
const responseTable = document.getElementById('responseTable')?.querySelector('tbody') || null;
const filesTable = document.getElementById('filesTable')?.querySelector('tbody') || null;
const jsonContent = document.getElementById('jsonContent');

// Elementos de servicios
const serviceNumberInput = document.getElementById('serviceNumber');
const streamDataInput = document.getElementById('streamData');
const processServiceBtn = document.getElementById('processServiceBtn');
const servicesTable = document.getElementById('servicesTable')?.querySelector('tbody') || null;
const serviceResult = document.getElementById('serviceResult');

// Variables globales
let currentStructure = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar pestañas primero
  initTabs();
  
  // Inicializar eventos de servicios
  initServiceEvents();
  
  // Cargar información del último archivo si está disponible
  loadLastFileInfo();
  
  // Cargar lista de archivos y servicios después de inicializar la UI
  setTimeout(() => {
    loadFilesList();
    loadServicesList();
  }, 100);
});

/**
 * Carga la información del último archivo procesado
 * Ya no persiste entre recargas de página
 */
function loadLastFileInfo() {
  // Esta función ya no carga información de localStorage
  // Solo se muestra la info cuando se carga un archivo en la sesión actual
  
  // Asegurar que no haya información visible al iniciar
  try {
    const fileInfoContainer = document.getElementById('current-file-info');
    if (fileInfoContainer) {
      fileInfoContainer.style.display = 'none';
      
      // También limpiar localStorage para evitar que se muestre en sesiones futuras
      localStorage.removeItem('currentFileName');
      localStorage.removeItem('currentFileService');
      localStorage.removeItem('fileInfoVisible');
    }
  } catch (e) {
    console.warn('Error al restablecer la información del archivo:', e);
  }
}

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
 * Maneja el cambio en el input de archivo y procesa automáticamente
 */
excelFileInput.addEventListener('change', async () => {
  if (excelFileInput.files && excelFileInput.files.length > 0) {
    fileNameDisplay.textContent = excelFileInput.files[0].name;
    
    // Mostrar el overlay de progreso completo
    const progressOverlay = document.getElementById('progressOverlay');
    if (progressOverlay) {
      progressOverlay.classList.remove('hide');
    }
    
    // Procesar el archivo automáticamente
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
            if (typeof Swal !== 'undefined') {
              // Usar SweetAlert2 para la confirmación
              const result = await Swal.fire({
                title: 'Servicio existente',
                html: `Ya existen <strong>${checkData.services.length}</strong> versión(es) del servicio <strong>${serviceNumber}</strong>.<br><br>¿Desea actualizar este servicio?<br>La(s) versión(es) anterior(es) seguirá(n) disponible(s).`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, actualizar',
                cancelButtonText: 'No, cancelar'
              });
              
              if (result.isConfirmed) {
                // Procesar el archivo con la bandera de actualización
                const formData = new FormData(uploadForm);
                formData.append('update', 'true');
                await uploadExcelFile(formData);
              } else {
      // Cancelar la subida y esconder el overlay de progreso
      showNotification('Subida cancelada por el usuario', 'info');
      const progressOverlay = document.getElementById('progressOverlay');
      if (progressOverlay) {
        progressOverlay.classList.add('hide');
      }
                // Reiniciar el campo de archivo para permitir seleccionar el mismo archivo de nuevo
                if (excelFileInput) {
                  excelFileInput.value = '';
                  fileNameDisplay.textContent = 'Ningún archivo seleccionado';
                }
              }
              return; // Detener aquí y esperar la respuesta del usuario
            } else {
              // Fallback al modal original si SweetAlert2 no está disponible
              confirmMessage.textContent = `Ya existen ${checkData.services.length} versión(es) del servicio ${serviceNumber}. ¿Desea actualizar este servicio? La(s) versión(es) anterior(es) seguirá(n) disponible(s).`;
              confirmModal.style.display = 'block';
              return; // Detener aquí y esperar la respuesta del usuario
            }
          }
        }
      }
      
      // Si no hubo coincidencia de servicio o el servicio no existe, continuar normalmente
      const formData = new FormData(uploadForm);
      await uploadExcelFile(formData);
      
    } catch (error) {
      showNotification(error.message, 'error');
      
      // Ocultar el overlay de progreso
      const progressOverlay = document.getElementById('progressOverlay');
      if (progressOverlay) {
        progressOverlay.classList.add('hide');
      }
    }
  } else {
    fileNameDisplay.textContent = 'Ningún archivo seleccionado';
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
  
  // Mostrar notificación
  showNotification('Subida cancelada por el usuario', 'info');
  
  // Reiniciar el campo de archivo para permitir seleccionar el mismo archivo de nuevo
  if (excelFileInput) {
    excelFileInput.value = '';
    fileNameDisplay.textContent = 'Ningún archivo seleccionado';
  }
  
    // Ocultar el overlay de progreso
    const progressOverlay = document.getElementById('progressOverlay');
    if (progressOverlay) {
      progressOverlay.classList.add('hide');
    }
});

confirmCloseBtn.addEventListener('click', () => {
  // Ocultar el modal y cancelar la subida
  confirmModal.style.display = 'none';
  
  // Reiniciar el campo de archivo para permitir seleccionar el mismo archivo de nuevo
  if (excelFileInput) {
    excelFileInput.value = '';
    fileNameDisplay.textContent = 'Ningún archivo seleccionado';
  }
  
  // Ocultar el overlay de progreso
  const progressOverlay = document.getElementById('progressOverlay');
  if (progressOverlay) {
    progressOverlay.classList.add('hide');
  }
});

/**
 * Maneja el envío del formulario
 */
// Prevenimos el envío normal del formulario (por si el usuario presiona Enter)
uploadForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // No hacemos nada más aquí, ya que el procesamiento se realiza al seleccionar el archivo
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
    try {
      await loadStructure(data.structure_file);
      console.log("Estructura cargada correctamente:", data.structure_file);
    } catch (structureError) {
      console.error("Error al cargar estructura:", structureError);
      showNotification("Error al cargar estructura: " + structureError.message, 'error');
    }
    
    // Recargar la lista de archivos
    try {
      await loadFilesList();
      console.log("Lista de archivos actualizada");
    } catch (filesError) {
      console.error("Error al cargar lista de archivos:", filesError);
    }
    
    // Recargar la lista de servicios sin recargar la página completa
    try {
      await loadServicesList();
      console.log("Lista de servicios actualizada");
      
      // Notificar a todos los componentes que se han actualizado los servicios
      if (window.EventBus && window.AppEvents) {
        window.EventBus.publish(window.AppEvents.SERVICES_REFRESHED, { 
          service_number: data.service_number,
          timestamp: new Date().toISOString()
        });
        console.log("Evento SERVICES_REFRESHED publicado");
      }
    } catch (servicesError) {
      console.error("Error al cargar lista de servicios:", servicesError);
    }
    
    // Actualizar los selectores directamente sin recargar toda la página
    try {
      await loadServicesIntoSelect('idaServiceSelect');
      await loadServicesIntoSelect('vueltaServiceSelect');
      await loadServicesIntoSelect('configServiceSelect'); // Agregar selector de la pestaña configuración
      console.log("Selectores de servicios actualizados");
      
      // Notificar a todos los componentes que se ha cargado un nuevo archivo
      if (window.EventBus && window.AppEvents) {
        window.EventBus.publish(window.AppEvents.FILE_UPLOADED, {
          service_number: data.service_number,
          structure_file: data.structure_file,
          timestamp: new Date().toISOString()
        });
        console.log("Evento FILE_UPLOADED publicado con service_number:", data.service_number);
      }
      
      // Actualizar información del archivo cargado usando el método global
      if (window.updateFileInfo) {
        window.updateFileInfo(
          formData.get('file').name, 
          data.service_number, 
          data.service_name
        );
      }
      
      // Disparar un evento personalizado para otros componentes que necesiten saber que se cargó un archivo
      const fileUploadedEvent = new CustomEvent('fileUploaded', { 
        detail: {
          fileName: formData.get('file').name,
          serviceNumber: data.service_number,
          serviceName: data.service_name,
          structureFile: data.structure_file
        }
      });
      window.dispatchEvent(fileUploadedEvent);
      
      // Además, seleccionar el servicio recién cargado en todos los selectores si está disponible
      if (data.service_number) {
        const selectors = ['idaServiceSelect', 'vueltaServiceSelect', 'configServiceSelect'];
        for (const selectorId of selectors) {
          const selector = document.getElementById(selectorId);
          if (selector) {
            // Buscar la opción correspondiente al servicio recién cargado
            for (let i = 0; i < selector.options.length; i++) {
              if (selector.options[i].value === data.service_number) {
                selector.selectedIndex = i;
                
                // Si es el selector de configuración, disparar el evento change para cargar los campos
                if (selectorId === 'configServiceSelect') {
                  selector.dispatchEvent(new Event('change'));
                }
                
                break;
              }
            }
          }
        }
      }
    } catch (selectError) {
      console.error("Error al actualizar selectores:", selectError);
    }
    
    // Mostrar notificación de éxito
    showNotification("Archivo procesado correctamente. Servicios actualizados.", 'success');
    
    // Garantizar que las tablas y el contenido JSON estén visibles
    // Usar el nuevo tabManager para activar las pestañas correctas
    setTimeout(() => {
      if (window.tabManager) {
        // Activar primero la pestaña principal 'carga'
        if (window.tabManager.activateTab('carga')) {
          console.log("Pestaña 'carga' activada correctamente");
        }
        
        // Luego activar la subpestaña 'cabecera'
        if (window.tabManager.activateSubtab('cabecera')) {
          console.log("Subpestaña 'cabecera' activada correctamente");
        }
      } else {
        console.warn("tabManager no disponible, usando método alternativo");
        // Método alternativo si tabManager no está disponible
        const cargaTab = document.querySelector('[data-tab="carga"]');
        if (cargaTab) {
          cargaTab.click();
          
          const cabeceraTab = document.querySelector('[data-subtab="cabecera"]');
          if (cabeceraTab) {
            cabeceraTab.click();
            console.log("Cambiado a subpestaña 'cabecera' (método alternativo)");
          }
        }
      }
      
      // Ocultar el overlay de progreso inmediatamente una vez que el contenido está cargado
      const progressOverlay = document.getElementById('progressOverlay');
      if (progressOverlay) {
        progressOverlay.classList.add('hide');
      }
      
    }, 500);
    
  } catch (error) {
    showNotification(error.message, 'error');
    
    // Ocultar el overlay de progreso en caso de error
    const progressOverlay = document.getElementById('progressOverlay');
    if (progressOverlay) {
      progressOverlay.classList.add('hide');
    }
  } finally {
    // Restablecer campo de archivo para permitir seleccionar uno nuevo
    if (excelFileInput) {
      excelFileInput.value = '';
      fileNameDisplay.textContent = 'Ningún archivo seleccionado';
    }
    // No ocultamos la barra de progreso aquí, lo haremos después de que el contenido esté cargado
  }
}

/**
 * Muestra una notificación utilizando Toastr
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación ('success', 'error', 'info', 'warning')
 */
function showNotification(message, type) {
  // Verificar si Toastr está disponible
  if (typeof toastr !== 'undefined') {
    // Configuración de Toastr
    toastr.options = {
      closeButton: true,
      progressBar: true,
      positionClass: "toast-top-right",
      timeOut: 5000,
      extendedTimeOut: 2000,
      preventDuplicates: false,
      newestOnTop: true,
      showEasing: "swing",
      hideEasing: "linear",
      showMethod: "fadeIn",
      hideMethod: "fadeOut"
    };
    
    // Usar el método apropiado según el tipo
    switch (type) {
      case 'success':
        toastr.success(message, 'Éxito');
        break;
      case 'error':
        toastr.error(message, 'Error');
        break;
      case 'warning':
        toastr.warning(message, 'Advertencia');
        break;
      default:
        toastr.info(message, 'Información');
    }
  } else {
    // Fallback al método original si Toastr no está disponible
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
    if (filesTable) { // Added null check
      filesTable.innerHTML = '';
      
      // Si no hay archivos, mostrar mensaje
      if (data.files.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="3">No hay archivos procesados</td>';
        filesTable.appendChild(row);
        return;
      }
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
          <button class="action-btn open-excel-btn" onclick="openExcelFile('${file.filename}', this)">Abrir Excel</button>
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
    // Verificar si se proporcionó un nombre de archivo válido
    if (!structureFile) {
      showNotification('Archivo de estructura no especificado', 'error');
      return;
    }
    
    const response = await fetch(`/excel/structure?structure_file=${structureFile}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => {
        // Si la respuesta de error no es un JSON válido, crear un objeto de error personalizado
        return { error: `Error ${response.status} al cargar la estructura` };
      });
      throw new Error(errorData.error || 'Error al cargar la estructura');
    }
    
    const data = await response.json();
    currentStructure = data;
    
    // Comprobar si la estructura está completa o parcial
    const headerComplete = data.header_structure && data.header_structure.fields && data.header_structure.fields.length > 0;
    const requestComplete = data.service_structure && data.service_structure.request && data.service_structure.request.elements && data.service_structure.request.elements.length > 0;
    const responseComplete = data.service_structure && data.service_structure.response && data.service_structure.response.elements && data.service_structure.response.elements.length > 0;
    
    // Verificar si hay mensajes de error específicos en la respuesta de la API
    const parseErrors = data.parse_errors || [];
    const requestErrors = data.parse_errors_request || [];
    const responseErrors = data.parse_errors_response || [];
    
    // Comprobar si tenemos información sobre errores de parsing
    const hasDetailedErrors = parseErrors.length > 0 || requestErrors.length > 0 || responseErrors.length > 0;
    
    // Mostrar advertencia si hay estructura incompleta pero parseable
    if (headerComplete && (!requestComplete || !responseComplete)) {
      // Si tenemos información detallada sobre los errores, mostrarla
      if (hasDetailedErrors) {
        // Construir mensaje detallado con las líneas específicas que fallaron
        let errorMsg = 'Se detectaron problemas al procesar el archivo Excel:\n\n';
        
        if (parseErrors.length > 0) {
          errorMsg += '• Errores generales:\n';
          parseErrors.forEach(err => {
            errorMsg += `  - ${err.message || err} (línea ${err.line || '?'}, columna ${err.column || '?'})\n`;
          });
        }
        
        if (!requestComplete && requestErrors.length > 0) {
          errorMsg += '\n• Errores en sección Request:\n';
          requestErrors.forEach(err => {
            errorMsg += `  - ${err.message || err} (hoja "${err.sheet || 'Desconocida'}", fila ${err.row || '?'}, columna ${err.column || '?'})\n`;
          });
        }
        
        if (!responseComplete && responseErrors.length > 0) {
          errorMsg += '\n• Errores en sección Response:\n';
          responseErrors.forEach(err => {
            errorMsg += `  - ${err.message || err} (hoja "${err.sheet || 'Desconocida'}", fila ${err.row || '?'}, columna ${err.column || '?'})\n`;
          });
        }
        
        console.error(errorMsg);
        
        // Mostrar notificación más específica con SweetAlert para mejor formato si está disponible
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            title: 'Errores en el archivo Excel',
            html: errorMsg.replace(/\n/g, '<br>'),
            icon: 'warning',
            confirmButtonText: 'Entendido'
          });
        } else {
          // Fallback a la notificación estándar
          showNotification('Se encontraron errores específicos al procesar el Excel. Verifique la consola para más detalles.', 'warning');
        }
      } else {
        // Si no tenemos información detallada, mostrar mensaje genérico
        showNotification('La estructura de servicio está incompleta: Cabecera presente pero faltan secciones Request/Response. Esto puede deberse a problemas con el formato del Excel.', 'warning');
        
        // Agregar información detallada para depuración
        console.warn("Estructura incompleta detectada:", {
          headerComplete,
          requestComplete,
          responseComplete,
          headerFields: data.header_structure?.fields?.length || 0,
          requestElements: data.service_structure?.request?.elements?.length || 0,
          responseElements: data.service_structure?.response?.elements?.length || 0
        });
        
        // Análisis de posibles causas comunes
        let posibleCausa = 'Posibles causas:\n';
        
        if (data.service_structure && data.service_structure.serviceNumber) {
          posibleCausa += `• Servicio ${data.service_structure.serviceNumber} (${data.service_structure.serviceName}) detectado, pero con elementos vacíos\n`;
        }
        
        posibleCausa += '• Las pestañas de Excel no tienen los nombres esperados (deben ser "Cabecera", "Requerimiento", "Respuesta")\n';
        posibleCausa += '• La estructura de columnas no corresponde al formato esperado\n';
        posibleCausa += '• Hay celdas combinadas que interrumpen el parsing\n';
        posibleCausa += '• La hoja puede contener celdas con formato especial (html, imágenes) que interfieren con el procesamiento';
        
        console.warn(posibleCausa);
        
        // Mostrar causas posibles en una alerta más detallada
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            title: 'Estructura incompleta detectada',
            html: `<div style="text-align: left">Se ha detectado una estructura incompleta en el Excel.<br><br>
                  <strong>Partes encontradas:</strong><br>
                  ✅ Cabecera: ${headerComplete ? 'Completa' : 'Incompleta'}<br>
                  ${requestComplete ? '✅' : '❌'} Request: ${requestComplete ? 'Completo' : 'Faltante o incompleto'}<br>
                  ${responseComplete ? '✅' : '❌'} Response: ${responseComplete ? 'Completo' : 'Faltante o incompleto'}<br><br>
                  <strong>Posibles causas:</strong><br>
                  • Las pestañas del Excel no tienen los nombres esperados<br>
                  • La estructura de columnas no corresponde al formato esperado<br>
                  • Hay celdas combinadas que interrumpen el parsing<br>
                  • La hoja puede contener celdas con formato especial</div>`,
            icon: 'warning',
            confirmButtonText: 'Entendido'
          });
        }
      }
    }
    
    // Mostrar la estructura en las tablas
    displayHeaderStructure(data.header_structure);
    displayServiceStructure(data.service_structure);
    
    // Mostrar todo el JSON en una sola vista
    formatAndDisplayJson(data);
    
try {
  // Cambiar a la pestaña de cabecera de manera segura
  const tabButtonsCabecera = document.querySelectorAll('.tab-btn');
  const tabPanesCabecera = document.querySelectorAll('.tab-pane');
  
  // Desactivar todas las pestañas y paneles (si existen)
  if (tabButtonsCabecera) {
    tabButtonsCabecera.forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
  }
  
  if (tabPanesCabecera) {
    tabPanesCabecera.forEach(pane => {
      if (pane) pane.classList.remove('active');
    });
  }
  
  // Activar la pestaña cabecera (verificando que existe primero)
  const cabeceraTab = document.querySelector('[data-tab="cabecera"]');
  const cabeceraPane = document.getElementById('cabecera');
  
  if (cabeceraTab) cabeceraTab.classList.add('active');
  if (cabeceraPane) cabeceraPane.classList.add('active');
    
  } catch (error) {
    showNotification(error.message, 'error');
  }
} catch (error) {
  console.error("Error al cambiar a pestaña de cabecera:", error);
}

/**
 * Abre o descarga un archivo Excel
 * @param {string} filename - Nombre del archivo Excel en la carpeta uploads
 * @param {HTMLButtonElement} button - El botón que se presionó para abrir el Excel
 */
function openExcelFile(filename, button) {
  if (!filename) {
    showNotification('Nombre de archivo no válido', 'error');
    return;
  }
  
  // Guardar el contenido original del botón
  const originalContent = button.innerHTML;
  
  // Mostrar el spinner y deshabilitar el botón
  button.innerHTML = '<div class="button-content"><span class="loading-spinner"></span><span class="button-text">Cargando...</span></div>';
  button.disabled = true;
  button.classList.add('btn-loading');
  
  // Crear URL para la descarga
  const downloadUrl = `/excel/download/${encodeURIComponent(filename)}`;
  
  // Restaurar el botón después de un breve retraso para que el usuario no tenga que esperar
  // incluso si la ventana que se abre es cerrada
  setTimeout(() => {
    button.innerHTML = originalContent;
    button.disabled = false;
    button.classList.remove('btn-loading');
    
    // Abrir en una nueva pestaña
    window.open(downloadUrl, '_blank');
  }, 800); // Un poco de retraso para que se vea el spinner
  
  // Establecer un fetch para verificar si el archivo existe y está disponible
  fetch(downloadUrl, { method: 'HEAD' })
    .then(response => {
      if (!response.ok) {
        showNotification('Error al acceder al archivo Excel', 'error');
        // Restaurar el botón inmediatamente en caso de error
        button.innerHTML = originalContent;
        button.disabled = false;
        button.classList.remove('btn-loading');
      }
    })
    .catch(error => {
      console.error('Error verificando archivo:', error);
      showNotification('Error al acceder al archivo Excel', 'error');
      // Restaurar el botón inmediatamente en caso de error
      button.innerHTML = originalContent;
      button.disabled = false;
      button.classList.remove('btn-loading');
    });
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
 * Formatea un objeto JSON a HTML para visualización
 * @param {Object} json - Objeto JSON a formatear
 * @param {number} level - Nivel actual de indentación 
 * @returns {string} HTML formateado
 */
function formatJsonSimple(json, level = 0) {
  if (json === null) return '<span class="json-null">null</span>';
  
  // Formatear según el tipo de dato
  switch (typeof json) {
    case 'number':
      return `<span class="json-number">${json}</span>`;
    case 'boolean':
      return `<span class="json-boolean">${json}</span>`;
    case 'string':
      return `<span class="json-string">"${json.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</span>`;
    case 'object':
      if (Array.isArray(json)) {
        if (json.length === 0) return '[]';
        
        // Generar ID único para este nodo
        const nodeId = 'json_' + Math.random().toString(36).substr(2, 9);
        
        // Formatear array
        const items = json.map(item => {
          const indent = '  '.repeat(level + 1);
          return `${indent}${formatJsonSimple(item, level + 1)}`;
        }).join(',\n');
        
        return `[<span class="json-collapse-btn" data-target="${nodeId}">-</span>\n` +
               `<div id="${nodeId}" class="json-collapsible">${items}\n${'  '.repeat(level)}]</div>`;
      } else {
        const keys = Object.keys(json);
        if (keys.length === 0) return '{}';
        
        // Generar ID único para este nodo
        const nodeId = 'json_' + Math.random().toString(36).substr(2, 9);
        
        // Formatear objeto
        const properties = keys.map(key => {
          const indent = '  '.repeat(level + 1);
          return `${indent}<span class="json-key">"${key}"</span>: ${formatJsonSimple(json[key], level + 1)}`;
        }).join(',\n');
        
        return `{<span class="json-collapse-btn" data-target="${nodeId}">-</span>\n` +
               `<div id="${nodeId}" class="json-collapsible">${properties}\n${'  '.repeat(level)}}</div>`;
      }
    default:
      return String(json);
  }
}
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
 * Muestra la estructura de cabecera en la tabla
 * @param {Object} headerStructure - Estructura de cabecera
 */
function displayHeaderStructure(headerStructure) {
  // Limpiar la tabla
  headerTable.innerHTML = '';
  
  // Si no hay estructura, mostrar mensaje
  if (!headerStructure || !headerStructure.fields || headerStructure.fields.length === 0) {
    const row = document.createElement('tr');
    row.classList.add('empty-message');
    row.innerHTML = '<td colspan="6" class="text-center">Seleccione un archivo Excel para ver la estructura de cabecera.</td>';
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
  
  // Si no hay estructura, mostrar mensaje de error claro
  if (!serviceStructure) {
    const errorMessage = 'No se pudo cargar la estructura del servicio. El archivo Excel puede tener problemas de formato.';
    showNotification(errorMessage, 'error');
    
    const requestRow = document.createElement('tr');
    requestRow.innerHTML = `<td colspan="6" class="error-message">Error: ${errorMessage}</td>`;
    requestTable.appendChild(requestRow);
    
    const responseRow = document.createElement('tr');
    responseRow.innerHTML = `<td colspan="6" class="error-message">Error: ${errorMessage}</td>`;
    responseTable.appendChild(responseRow);
    return;
  }
  
  // Procesar sección de requerimiento
  if (serviceStructure.request && serviceStructure.request.elements) {
    const originalElementsCount = serviceStructure.request.elements.length;
    displayServiceSection(serviceStructure.request, requestTable);
    
    // Verificar si se generaron filas en la tabla
    if (requestTable.childElementCount === 0) {
      const errorMsg = `Error al procesar estructura de requerimiento: Se encontraron ${originalElementsCount} elementos pero no se pudieron interpretar correctamente.`;
      console.error(errorMsg);
      
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="6" class="error-message">${errorMsg}</td>`;
      requestTable.appendChild(row);
      
      // Mostrar notificación solo si no se pudo procesar ningún elemento
      showNotification('Error al procesar la estructura de requerimiento. Verifique el formato del Excel.', 'error');
    }
  } else {
    const errorMsg = 'No hay estructura de requerimiento disponible. El archivo Excel puede estar incompleto o tener un formato inadecuado.';
    console.warn(errorMsg);
    
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="6" class="error-message">${errorMsg}</td>`;
    requestTable.appendChild(row);
    
    // Mostrar notificación para alertar al usuario
    showNotification('No se encontró estructura de requerimiento en el Excel cargado.', 'warning');
  }
  
  // Procesar sección de respuesta
  if (serviceStructure.response && serviceStructure.response.elements) {
    const originalElementsCount = serviceStructure.response.elements.length;
    displayServiceSection(serviceStructure.response, responseTable);
    
    // Verificar si se generaron filas en la tabla
    if (responseTable.childElementCount === 0) {
      const errorMsg = `Error al procesar estructura de respuesta: Se encontraron ${originalElementsCount} elementos pero no se pudieron interpretar correctamente.`;
      console.error(errorMsg);
      
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="6" class="error-message">${errorMsg}</td>`;
      responseTable.appendChild(row);
      
      // Mostrar notificación solo si no se pudo procesar ningún elemento
      showNotification('Error al procesar la estructura de respuesta. Verifique el formato del Excel.', 'error');
    }
  } else {
    const errorMsg = 'No hay estructura de respuesta disponible. El archivo Excel puede estar incompleto o tener un formato inadecuado.';
    console.warn(errorMsg);
    
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="6" class="error-message">${errorMsg}</td>`;
    responseTable.appendChild(row);
    
    // Mostrar notificación para alertar al usuario
    showNotification('No se encontró estructura de respuesta en el Excel cargado.', 'warning');
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
        <td>${formattedName}</td>
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
  // Obtener la fila de la ocurrencia
  const occurrenceRow = document.querySelector(`[data-occurrence-id="${id}"]`);
  
  // Obtener level actual de esta ocurrencia para identificar hijos anidados
  const level = parseInt(occurrenceRow.getAttribute('data-level') || '0');
  const nextLevel = level + 1;
  
  // Selector más completo para encontrar todos los elementos relacionados:
  // 1. Elementos directamente asociados a la ocurrencia
  // 2. Elementos hijos con nivel superior
  // 3. Marcadores de fin de ocurrencia
  const allRelatedElements = document.querySelectorAll(`
    [data-parent-occurrence="${id}"],
    [data-occurrence-end="${id}"],
    tr[data-level="${nextLevel}"]
  `);
  
  // Si no hay filas para alternar, no hacer nada
  if (allRelatedElements.length === 0) return;
  
  // Verificar si están visibles (usar la primera fila como referencia)
  const isVisible = window.getComputedStyle(allRelatedElements[0]).display !== 'none';
  
  // Cambiar el estado de visibilidad
  allRelatedElements.forEach(row => {
    // Si este es un elemento de nivel inferior, ocultarlo/mostrarlo
    row.style.display = isVisible ? 'none' : 'table-row';
    
    // Si este elemento es una ocurrencia anidada, también cambiar su botón
    const nestedButton = row.querySelector('.collapse-btn');
    if (nestedButton && isVisible) {
      // Si estamos ocultando, asegurarnos de que los botones de los hijos muestren "+"
      nestedButton.textContent = '+';
    }
  });
  
  // Obtener también todas las ocurrencias anidadas dentro de esta ocurrencia
  const nestedOccurrences = document.querySelectorAll(`[data-level="${nextLevel}"][data-type="occurrence"]`);
  
  // Si estamos colapsando, asegurarse de colapsar todas las ocurrencias anidadas también
  if (isVisible) {
    nestedOccurrences.forEach(nestedOcc => {
      const nestedId = nestedOcc.getAttribute('data-occurrence-id');
      if (nestedId) {
        // Ocultar todos los elementos de estas ocurrencias anidadas recursivamente
        const nestedChildren = document.querySelectorAll(`[data-parent-occurrence="${nestedId}"], [data-occurrence-end="${nestedId}"]`);
        // Ocultar cada elemento hijo de la ocurrencia anidada
        nestedChildren.forEach(child => {
          child.style.display = 'none';
        });
      }
    });
  }
  
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
    await loadServicesIntoSelect('configServiceSelect');  // Agregar selector de configuración
    
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
    
    if (data.versions && data.versions.length > 0) {
      // Verificar si SweetAlert2 está disponible
      if (typeof Swal !== 'undefined') {
        // Preparar el HTML para mostrar las versiones
        let htmlContent = `<div class="versions-list">`;
        htmlContent += `<table class="swal2-table">`;
        htmlContent += `<thead><tr><th>#</th><th>Fecha</th><th>Archivo</th><th>Descargar</th></tr></thead>`;
        htmlContent += `<tbody>`;
        
        data.versions.forEach((version, index) => {
          const date = new Date(version.timestamp).toLocaleString();
          const fileName = version.excel_file || "N/A";
          const downloadable = fileName !== "N/A";
          
          htmlContent += `<tr>`;
          htmlContent += `<td>${index + 1}</td>`;
          htmlContent += `<td>${date}</td>`;
          htmlContent += `<td>${fileName}</td>`;
          htmlContent += `<td>`;
          
          if (downloadable) {
            htmlContent += `<button class="action-btn" onclick="openExcelFile('${fileName}', this)" style="padding: 4px 8px; font-size: 0.8rem;">
              Descargar
            </button>`;
          } else {
            htmlContent += `<span class="text-muted">No disponible</span>`;
          }
          
          htmlContent += `</td>`;
          htmlContent += `</tr>`;
        });
        
        htmlContent += `</tbody></table></div>`;
        
        // Mostrar SweetAlert con las versiones
        Swal.fire({
          title: `Versiones del servicio ${serviceNumber}`,
          html: htmlContent,
          icon: 'info',
          width: '600px',
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#2563eb'
        });
      } else {
        // Fallback a alert si SweetAlert no está disponible
        let message = `Versiones disponibles del servicio ${serviceNumber}:\n`;
        data.versions.forEach((version, index) => {
          const date = new Date(version.timestamp).toLocaleString();
          message += `${index + 1}. ${date}\n`;
        });
        
        alert(message);
      }
    } else {
      showNotification(`No se encontraron versiones para el servicio ${serviceNumber}`, 'warning');
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
