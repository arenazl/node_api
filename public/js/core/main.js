/**
 * Script principal para la interfaz de usuario
 * Cache bust: 2025-06-12T02:03:32 - Fixed invalid date in versions popup
 */

// console.log('[Main.js] Script cargado y ejecutándose.');

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
const servicesTable = document.getElementById('servicesTable').querySelector('tbody');
const serviceResult = document.getElementById('serviceResult');

// Variables globales
let currentStructure = null;

  // Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // console.log('[Main] Inicializando aplicación...');

  // Inicializar pestañas primero
  initTabs();

  // Inicializar eventos de servicios
  initServiceEvents();

  // Cargar información del último archivo si está disponible
  loadLastFileInfo();

  // Inicializar manejadores de servicios IDA y VUELTA
  if (typeof initializeIdaServiceHandlers === 'function') {
    // console.log('[Main] Inicializando manejadores de servicios IDA...');
    initializeIdaServiceHandlers();
  } else {
    console.warn('[Main] La función initializeIdaServiceHandlers no está disponible');
  }

  if (typeof initializeVueltaServiceHandlers === 'function') {
    // console.log('[Main] Inicializando manejadores de servicios VUELTA...');
    initializeVueltaServiceHandlers();
  } else {
    console.warn('[Main] La función initializeVueltaServiceHandlers no está disponible');
  }

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
 * Diagnostics helper to check if critical modules are properly loaded
 * Call this from browser console to verify modules loading
 */
window.checkModulesLoaded = function() {
  console.group("Module Loading Diagnostics");

  // Config modules
  console.log("ConfigUtils available:", typeof ConfigUtils !== 'undefined');
  console.log("ConfigManager available:", typeof ConfigManager !== 'undefined');
  console.log("configManager instance available:", typeof window.configManager !== 'undefined');

  // API client
  console.log("ServiceApiClient available:", typeof ServiceApiClient !== 'undefined');

  // Service handlers
  console.log("initializeIdaServiceHandlers available:", typeof initializeIdaServiceHandlers === 'function');
  console.log("initializeVueltaServiceHandlers available:", typeof initializeVueltaServiceHandlers === 'function');

  // Event handlers for buttons
  const generateStringBtn = document.getElementById('generateStringBtn');
  const processVueltaBtn = document.getElementById('processVueltaBtn');

  if (generateStringBtn) {
    console.log("Generate String button found:", true);
    console.log("Generate String button event listeners:", generateStringBtn.onclick ? "Has onclick" : "Using addEventListener");
  } else {
    console.log("Generate String button found:", false);
  }

  if (processVueltaBtn) {
    console.log("Process Vuelta button found:", true);
    console.log("Process Vuelta button event listeners:", processVueltaBtn.onclick ? "Has onclick" : "Using addEventListener");
  } else {
    console.log("Process Vuelta button found:", false);
  }

  console.groupEnd();

  return "Diagnostics completed. Check console for results.";
};

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
// Get reference to the main content container
const mainContainer = document.querySelector('.container');

/**
 * Maneja el cambio en el input de archivo y procesa automáticamente
 */
excelFileInput.addEventListener('change', async () => {
  if (excelFileInput.files && excelFileInput.files.length > 0) {
    fileNameDisplay.textContent = excelFileInput.files[0].name;

    // Show loading indicator and blur background
    if (mainContainer) {
        mainContainer.classList.add('blurred-background');
    }
    const progressOverlay = document.getElementById('progressOverlay');
    if (progressOverlay) {
      progressOverlay.classList.remove('hide');

      // Establecer un timeout para ocultar la barra de progreso automáticamente después de 30 segundos
      // Esto evita que la barra quede visible indefinidamente si hay algún error
      window.progressTimeoutId = setTimeout(() => {
        if (progressOverlay && !progressOverlay.classList.contains('hide')) {
          console.warn("Timeout de progreso alcanzado: ocultando la barra automáticamente");
          progressOverlay.classList.add('hide');
      ConfigUtils.showNotification("El procesamiento está tomando más tiempo de lo esperado. Intente nuevamente si es necesario.", 'warning');
        }
      }, 30000); // 30 segundos de timeout
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
                return; // IMPORTANTE: Salir aquí para evitar doble llamada
              } else {
      // Cancelar la subida y esconder el overlay de progreso
      ConfigUtils.showNotification('Subida cancelada por el usuario', 'info');
      const progressOverlay = document.getElementById('progressOverlay');
      if (progressOverlay) {
        progressOverlay.classList.add('hide');
      }
      // Remove blur
      if (mainContainer) {
          mainContainer.classList.remove('blurred-background');
      }
      // Clear timeout
      if (window.progressTimeoutId) {
          clearTimeout(window.progressTimeoutId);
          window.progressTimeoutId = null;
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

      // If no service match or service doesn't exist, proceed normally
      const formData = new FormData(uploadForm);
      await uploadExcelFile(formData);

    } catch (error) {
      ConfigUtils.showNotification(error.message, 'error');

      // Hide loading indicator and remove blur
      const progressOverlay = document.getElementById('progressOverlay');
      if (progressOverlay) {
        progressOverlay.classList.add('hide');
      }
      if (mainContainer) {
          mainContainer.classList.remove('blurred-background');
      }
      // Clear timeout
      if (window.progressTimeoutId) {
          clearTimeout(window.progressTimeoutId);
          window.progressTimeoutId = null;
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
  ConfigUtils.showNotification('Subida cancelada por el usuario', 'info');

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
/**
 * Muestra un SweetAlert detallado para errores de archivos duplicados o similares
 * @param {Object} errorResult - Resultado con error del step1
 */
function showDuplicateFileError(errorResult) {
    const { error, duplicateFile, message } = errorResult;
    
    // Obtener el tema actual
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 
                        document.body.classList.contains('amber-theme') ? 'amber' : 'light';
    
    const colors = {
        light: {
            background: '#ffffff',
            text: '#1f2937',
            error: '#dc3545',
            warning: '#f59e0b',
            info: '#0ea5e9',
            border: '#e5e7eb'
        },
        dark: {
            background: '#1f2937',
            text: '#f9fafb',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#06b6d4',
            border: '#374151'
        },
        amber: {
            background: '#fffbeb',
            text: '#92400e',
            error: '#dc2626',
            warning: '#d97706',
            info: '#0891b2',
            border: '#fcd34d'
        }
    }[currentTheme];

    const toProperCase = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    const errorHtml = `
    <div style="
        background: ${colors.background};
        color: ${colors.text};
        border-radius: 8px;
        text-align: left;
        line-height: 1.6;">
        
        <div class="duplicate-error-summary" style="
            background: ${colors.warning}15;
            border: 1px solid ${colors.warning}30;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 20px;">
            
            <div class="duplicate-error-title" style="
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
                font-weight: 600;
                font-size: 16px;
                color: ${colors.warning};">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                ${toProperCase('Archivo Idéntico Detectado')}
            </div>
            
            <div class="duplicate-error-message" style="
                background: ${colors.background};
                border: 1px solid ${colors.border};
                border-radius: 4px;
                padding: 12px;
                margin-bottom: 16px;
                font-size: 14px;
                color: ${colors.text};">
                ${message || error}
            </div>
            
            ${duplicateFile ? `
            <div class="duplicate-file-info" style="
                background: ${colors.info}15;
                border: 1px solid ${colors.info}30;
                border-radius: 4px;
                padding: 12px;
                margin-bottom: 16px;">
                
                <div style="font-weight: 600; color: ${colors.info}; margin-bottom: 8px;">
                    ${toProperCase('Archivo Existente:')}
                </div>
                
                <div style="
                    font-family: 'Courier New', monospace;
                    font-size: 13px;
                    color: ${colors.text};
                    word-break: break-all;">
                    ${duplicateFile}
                </div>
            </div>` : ''}
        </div>
        
        <div class="duplicate-suggestions" style="
            background: ${colors.info}15;
            border: 1px solid ${colors.info}30;
            border-radius: 6px;
            padding: 16px;">
            
            <div class="duplicate-suggestions-title" style="
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
                font-weight: 600;
                color: ${colors.info};">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                ${toProperCase('Opciones Disponibles:')}
            </div>
            
            <div class="duplicate-suggestions-list" style="
                display: flex;
                flex-direction: column;
                gap: 8px;
                font-size: 13px;
                color: ${colors.text}99;">
                
                <div class="duplicate-suggestion-item" style="
                    display: flex;
                    align-items: center;
                    gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 4v4m0 4h.01M15 8a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    ${toProperCase('El archivo ya existe en el sistema con el mismo contenido')}
                </div>
                
                <div class="duplicate-suggestion-item" style="
                    display: flex;
                    align-items: center;
                    gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 4v4m0 4h.01M15 8a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    ${toProperCase('Puede usar la versión existente sin necesidad de subirla nuevamente')}
                </div>
                
                <div class="duplicate-suggestion-item" style="
                    display: flex;
                    align-items: center;
                    gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 4v4m0 4h.01M15 8a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    ${toProperCase('Si necesita hacer cambios, modifique el Excel antes de subirlo')}
                </div>
            </div>
        </div>
    </div>`;
    
    // Mostrar SweetAlert con información del archivo duplicado
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `<span style="color: ${colors.warning};">${toProperCase('Archivo Idéntico Detectado')}</span>`,
            html: errorHtml,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: toProperCase('Cerrar'),
            cancelButtonText: toProperCase('Continuar de Todos Modos'),
            confirmButtonColor: colors.info,
            cancelButtonColor: colors.warning,
            width: '900px',
            padding: '20px',
            background: colors.background,
            reverseButtons: true
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.cancel) {
                // Usuario eligió "Continuar de Todos Modos"
                console.log('[MAIN] Usuario eligió continuar con archivo idéntico');
                // Aquí podrías implementar lógica para forzar la subida si es necesario
                ConfigUtils.showNotification('Funcionalidad de "Continuar de Todos Modos" no implementada aún', 'info');
            } else {
                // Usuario eligió "Cerrar" o cerró el modal
                console.log('[MAIN] Usuario canceló la subida de archivo idéntico');
                ConfigUtils.showNotification('Subida cancelada - archivo idéntico', 'info');
            }
        });
    } else {
        // Fallback si SweetAlert no está disponible
        const continuar = confirm(`${error}\n\nArchivo duplicado: ${duplicateFile || 'N/A'}\n\n${message || ''}\n\n¿Desea continuar de todos modos?`);
        if (continuar) {
            console.log('[MAIN] Usuario eligió continuar con archivo idéntico (fallback)');
            ConfigUtils.showNotification('Funcionalidad de "Continuar de Todos Modos" no implementada aún', 'info');
        } else {
            console.log('[MAIN] Usuario canceló la subida (fallback)');
            ConfigUtils.showNotification('Subida cancelada - archivo idéntico', 'info');
        }
    }
}

async function uploadExcelFile(formData) {

    // PASO 1: Grabar en file system - VISIBLE en Network
    console.log('📁 [MAIN] PASO 1: Llamando a step1-upload...');
    const step1Response = await fetch('/api-orchestrator/step1-upload', {
        method: 'POST',
        body: formData
    });

    // Primero intentar parsear la respuesta para obtener el mensaje de error real
    let step1Result;
    try {
        step1Result = await step1Response.json();
    } catch (e) {
        // Si no se puede parsear como JSON, usar un mensaje genérico
        if (!step1Response.ok) {
            throw new Error(`Error en paso 1: Error HTTP ${step1Response.status}`);
        }
        throw new Error('Error procesando respuesta del servidor');
    }
    
    // Si la respuesta no es OK o contiene un error, usar el mensaje del servidor
    if (!step1Response.ok || step1Result.error) {
        const errorMessage = step1Result.message || 
                           step1Result.error || 
                           step1Result.details || 
                           'Error en paso 1: grabado en file system';
        throw new Error(errorMessage);
    }
    console.log('✅ [MAIN] PASO 1 completado:', step1Result);
    
    // Verificar si hay error en step1 (archivo duplicado, etc.)
    if (step1Result.error) {
        console.log('⚠️ [MAIN] Error en step1:', step1Result);
        showDuplicateFileError(step1Result);
        return; // Salir sin continuar al step2
    }

    // Pequeño delay para asegurar que los archivos se hayan escrito completamente
    await new Promise(resolve => setTimeout(resolve, 500));

    // PASO 2: Llamar a Mora.Sim-api - VISIBLE en Network  
    console.log('🔗 [MAIN] PASO 2: Llamando a step2-mora-sim-api...');
    
    // Obtener datos del resultado del paso 1 (step1Result ES el uploadResult)
    const uploadData = step1Result;
    
    const step2FormData = new FormData();
    step2FormData.append('serviceNumber', uploadData.service_number || formData.get('serviceNumber') || '1083');
    step2FormData.append('version', formData.get('version') || '1.0');
    step2FormData.append('fileName', uploadData.filename || formData.get('file')?.name || 'unknown.xlsx');
    step2FormData.append('canalCode', document.getElementById('canalInput')?.value || 'SM');
    step2FormData.append('uploadResult', JSON.stringify(uploadData));
    
    const step2Response = await fetch('/api-orchestrator/step2-mora-sim-api', {
        method: 'POST',
        body: step2FormData
    });

    if (!step2Response.ok) {
        throw new Error('Error en paso 2: llamada a Mora.Sim-api');
    }

    const step2Result = await step2Response.json();
    console.log('✅ [MAIN] PASO 2 completado:', step2Result);
    
    // IMPORTANTE: Almacenar ExcelId en sessionStorage para usar al guardar configuración
    if (step2Result.excelId) {
        const serviceNumber = step1Result.service_number || step2Result.service_number;
        console.log(`📝 [MAIN] Almacenando ExcelId ${step2Result.excelId} para servicio ${serviceNumber}`);
        sessionStorage.setItem(`excelId_${serviceNumber}`, step2Result.excelId);
    }

    // Crear respuesta simulada compatible con el resto del código
    const response = {
        ok: true,
        json: () => Promise.resolve({
            success: true,
            message: step1Result.message || 'Excel procesado exitosamente',
            structure_file: step1Result.structure_file,
            service_number: step1Result.service_number,
            service_name: step1Result.service_name,
            filename: step1Result.filename,
            warnings: step1Result.warnings || {},
            excelId: step2Result.excelId, // Incluir ExcelId en la respuesta
            data: {
                ...step1Result,
                databaseResult: step2Result.data
            }
        })
    };

    if (!response.ok) {
      const errorData = await response.json();

      // Manejar específicamente el error 422 (Unprocessable Entity) - Errores críticos
      if (response.status === 422) {
        // Limpiar UI primero
        const progressOverlay = document.getElementById('progressOverlay');
        if (progressOverlay) {
          progressOverlay.classList.add('hide');
        }
        if (mainContainer) {
            mainContainer.classList.remove('blurred-background');
        }
        if (window.progressTimeoutId) {
            clearTimeout(window.progressTimeoutId);
            window.progressTimeoutId = null;
        }

        // Limpiar el archivo seleccionado
        if (excelFileInput) {
          excelFileInput.value = '';
          fileNameDisplay.textContent = 'Ningún archivo seleccionado';
        }

        // Construir mensaje HTML con los errores críticos con colores y mejores estilos
        let criticalErrorsHtml = '<div style="text-align: left; font-family: Arial, sans-serif;">';
        
        // Encabezado principal con color
        criticalErrorsHtml += '<div style="background: linear-gradient(45deg, #ff6b6b, #ff8e8e); color: white; padding: 12px; border-radius: 8px; margin-bottom: 15px; text-align: center;">';
        criticalErrorsHtml += '<h3 style="margin: 0; font-size: 16px;">Problemas Críticos Detectados</h3>';
        criticalErrorsHtml += '</div>';
        
        if (errorData.critical_errors && errorData.critical_errors.length > 0) {
          criticalErrorsHtml += '<div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin-bottom: 15px;">';
          criticalErrorsHtml += '<h4 style="color: #d68910; margin: 0 0 10px 0; font-size: 14px;">Errores Encontrados:</h4>';
          
          errorData.critical_errors.forEach((error, index) => {
            const errorTypeColors = {
              'service_identification': '#e74c3c',
              'service_name': '#e67e22',
              'empty_request': '#9b59b6',
              'empty_response': '#3498db',
              'request_parsing_error': '#e74c3c',
              'response_parsing_error': '#e74c3c',
              'general_parsing_error': '#34495e'
            };
            
            const errorColor = errorTypeColors[error.type] || '#e74c3c';
            
            criticalErrorsHtml += '<div style="background: white; border-left: 4px solid ' + errorColor + '; padding: 10px; margin: 8px 0; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
            criticalErrorsHtml += `<div style="color: ${errorColor}; font-weight: bold; font-size: 13px;">${error.message}</div>`;
            if (error.details) {
              criticalErrorsHtml += `<div style="color: #666; font-size: 12px; margin-top: 5px; font-style: italic;">${error.details}</div>`;
            }
            criticalErrorsHtml += '</div>';
          });
          criticalErrorsHtml += '</div>';
        }
        
        // Sección de acciones con colores
        criticalErrorsHtml += '<div style="background: linear-gradient(45deg, #004999, #55efc4);color: white;padding: 15px;border-radius: 8px;">';
        criticalErrorsHtml += '<h4 style="margin: 0 0 10px 0; font-size: 14px;">Acciones Requeridas:</h4>';
        criticalErrorsHtml += '<ul style="margin: 0; padding-left: 20px; color: white;">';
        criticalErrorsHtml += '<li style="margin: 5px 0;">Verificar que el archivo Excel tenga el formato correcto</li>';
        criticalErrorsHtml += '<li style="margin: 5px 0;">Asegurar que contenga las secciones REQUERIMIENTO y RESPUESTA</li>';
        criticalErrorsHtml += '<li style="margin: 5px 0;">Verificar que el nombre del servicio esté presente</li>';
        criticalErrorsHtml += '<li style="margin: 5px 0;">Corregir los errores listados arriba y volver a intentar</li>';
        criticalErrorsHtml += '</ul>';
        criticalErrorsHtml += '</div>';
        
        criticalErrorsHtml += '</div>';

        // Mostrar SweetAlert con errores críticos y mejor estilo
        if (typeof Swal !== 'undefined') {
          await Swal.fire({
            title: '<span style="color: #e74c3c;">Errores Críticos en el Archivo</span>',
            html: criticalErrorsHtml,
            icon: 'error',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#e74c3c',
            width: '700px',
            padding: '20px',
            background: '#f8f9fa',
            customClass: {
              popup: 'swal-critical-errors'
            }
          });
        } else {
          // Fallback si Swal no está disponible
          alert(`Errores críticos: ${errorData.error || 'El archivo contiene errores que impiden su procesamiento.'}`);
        }
        return; // Detener la ejecución aquí después de manejar el error 422
      }

      // Manejar específicamente el error 409 (Conflict) - Archivo duplicado
      if (response.status === 409) {
        // Limpiar UI primero para asegurar que el usuario vea que el proceso ha terminado
        // Hide loading indicator and remove blur
        const progressOverlay = document.getElementById('progressOverlay');
        if (progressOverlay) {
          progressOverlay.classList.add('hide');
        }
        if (mainContainer) {
            mainContainer.classList.remove('blurred-background');
        }
        // Clear timeout
        if (window.progressTimeoutId) {
            clearTimeout(window.progressTimeoutId);
            window.progressTimeoutId = null;
        }

        // Limpiar el archivo seleccionado
        if (excelFileInput) {
          excelFileInput.value = '';
          fileNameDisplay.textContent = 'Ningún archivo seleccionado';
        }

        // Ahora mostrar el mensaje al usuario
        if (typeof Swal !== 'undefined') {
          // Limpiar UI ANTES de mostrar el Swal
          const progressOverlay = document.getElementById('progressOverlay');
          if (progressOverlay) {
            progressOverlay.classList.add('hide');
          }
          if (mainContainer) {
              mainContainer.classList.remove('blurred-background');
          }
          if (window.progressTimeoutId) {
              clearTimeout(window.progressTimeoutId);
              window.progressTimeoutId = null;
          }
          if (excelFileInput) {
            excelFileInput.value = '';
            fileNameDisplay.textContent = 'Ningún archivo seleccionado';
          }

          await Swal.fire({
            title: 'Archivo duplicado',
            html: `<div style="text-align: left;">
                     <p>El archivo que intentas subir ya existe en el sitsema o tiene un nombre que entra en conflicto con uno existente.</p>
                     <p>Por favor, verifica el nombre del archivo o si realmente necesitas volver a subirlo.</p>
                     <p><strong>Detalles del error:</strong> ${errorData.error || 'Conflicto de archivo.'}</p>
                   </div>`,
            icon: 'warning',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#2563eb'
          });
        } else {
          // Fallback si Swal no está definido (aunque debería estarlo)
          alert(`Archivo duplicado: ${errorData.error || 'Conflicto de archivo.'}`);
        }
        return; // Detener la ejecución aquí después de manejar el error 409
      }

      // Para otros tipos de errores, seguir con el comportamiento normal
      throw new Error(errorData.error || 'Error al procesar el archivo');
    }

    const data = await response.json();
    // ConfigUtils.showNotification(data.message, 'success'); // Comentado temporalmente para depurar SweetAlert

    // Hide loading indicator and remove blur on success
    const progressOverlay = document.getElementById('progressOverlay');
    if (progressOverlay) {
      progressOverlay.classList.add('hide');
    }
    if (mainContainer) {
        mainContainer.classList.remove('blurred-background');
    }
    // Clear timeout
    if (window.progressTimeoutId) {
        clearTimeout(window.progressTimeoutId);
        window.progressTimeoutId = null;
    }

    // Verificar si hay warnings que mostrar al usuario
    // Primero verificamos si data.warnings existe antes de acceder a sus propiedades
    if (data.warnings) {
      console.log("Warnings recibidos:", data.warnings);

      // Asegurarnos de que tenga valores por defecto
      const warnings = {
        missingHeaderTab: data.warnings.missingHeaderTab || false,
        headerTabAvailable: data.warnings.headerTabAvailable || 0,
        headerSampleError: data.warnings.headerSampleError || null,
        parserErrors: data.warnings.parserErrors || []
      };

      // Si hay alguna advertencia relacionada con la falta de cabecera o errores en el Excel
      if (warnings.missingHeaderTab || warnings.headerSampleError ||
         (warnings.parserErrors && warnings.parserErrors.length > 0)) {

        let warningMessage = '';


        // Mostrar warning sobre la falta de la tercera solapa (header sample)
        if (data.warnings.missingHeaderTab) {
        warningMessage += '⚠️ <strong>Advertencia:</strong> El archivo Excel no tiene la tercera solapa con ejemplos de cabecera.<br>';
        warningMessage += 'Solo se encontraron ${data.warnings.headerTabAvailable} pestañas en el Excel.<br>'
        warningMessage += 'Esto <u>no es un error bloqueante</u>, pero podría limitar algunas funcionalidades.<br><br>';
      }


      // Mostrar warning sobre otros errores del header sample
      if (data.warnings.headerSampleError) {
        warningMessage += `⚠️ <strong>Advertencia:</strong> Error al procesar la cabecera: ${data.warnings.headerSampleError}<br>`;
        warningMessage += 'Esto <u>no es un error bloqueante</u>, pero podría limitar algunas funcionalidades.<br><br>';
      }

      // Mostrar errores del parser si existen
      if (data.warnings.parserErrors && data.warnings.parserErrors.length > 0) {
        warningMessage += '⚠️ <strong>Advertencia:</strong> Se detectaron problemas al analizar el archivo:<br><ul>';

        // Limitar a los primeros 5 errores para no saturar el modal
        const errorsToShow = data.warnings.parserErrors.slice(0, 5);
        errorsToShow.forEach(err => {
          const errorMsg = err.message || err;
          warningMessage += `<li>${errorMsg}</li>`;
        });

        // Si hay más de 5 errores, mostrar un contador
        if (data.warnings.parserErrors.length > 5) {
          const remainingErrors = data.warnings.parserErrors.length - 5;
          warningMessage += `<li>...y ${remainingErrors} problemas más</li>`;
        }

        warningMessage += '</ul><br>Estos problemas <u>no bloquean la operación</u>, pero podrían afectar los resultados.';
      }

      // Para casos específicos relacionados con Excel sin pestaña de cabecera, forzar SweetAlert
      if (data.warnings.missingHeaderTab) {
        // Mensaje específico sobre la pestaña faltante con formato HTML para SweetAlert
        const headerTabMsg = `⚠️ <strong>Advertencia:</strong> El archivo Excel no tiene la tercera pestaña con ejemplos de cabecera.<br>
          Solo se encontraron ${data.warnings.headerTabAvailable} pestañas en el Excel.<br>
          Esto <u>no es un error bloqueante</u> y el servicio se ha procesado correctamente, pero podría limitar algunas funcionalidades.`;

        // Forzar SweetAlert para este tipo específico de advertencia
        ConfigUtils.showNotification(headerTabMsg, 'warning', true);
      } else {
        // Para otras advertencias, usar el mensaje completo
        ConfigUtils.showNotification(warningMessage, 'warning', true);
      }

    }

      // Pequeño delay adicional antes de cargar estructura para asegurar que esté disponible
      await new Promise(resolve => setTimeout(resolve, 300));
      
      try {
        await loadStructure(data.structure_file);
        console.log("Estructura cargada correctamente:", data.structure_file);
      } catch (structureError) {
        console.error("Error al cargar estructura:", structureError);
        // Intentar una vez más después de un delay más largo
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await loadStructure(data.structure_file);
          console.log("Estructura cargada correctamente en segundo intento:", data.structure_file);
        } catch (secondError) {
          console.error("Error al cargar estructura en segundo intento:", secondError);
          // ConfigUtils.showNotification("Error al cargar la estructura del archivo", "error"); // Comentado para evitar duplicados
        }
      }

      try {
        await loadFilesList();
        console.log("Lista de archivos actualizada");
      } catch (error) {
        console.error("Error al actualizar lista de archivos:", error);
      }

      await loadServicesList();
      console.log("Lista de servicios actualizada");

      // Notificar a todos los componentes que se han actualizado los servicios
      try {
        if (window.EventBus && window.AppEvents) {
          window.EventBus.publish(window.AppEvents.SERVICES_REFRESHED, {
            service_number: data.service_number,
            timestamp: new Date().toISOString()
          });
          console.log("Evento SERVICES_REFRESHED publicado");
        }
      } catch (eventError) {
        console.log("No se pudo publicar evento SERVICES_REFRESHED:", eventError.message);
      }

    // Actualizar los selectores directamente sin recargar toda la página


      // Actualizar TODOS los selectores de servicios con múltiples métodos (redundante pero funcional)
      console.log("[Main] Actualizando TODOS los selectores de servicios después de cargar Excel...");
      
      // Método 1: Usando loadServicesIntoSelect
      try {
        await loadServicesIntoSelect('idaServiceSelect');
        console.log("[Main] Selector IDA actualizado");
      } catch(e) {
        console.log("[Main] Error actualizando selector IDA:", e.message);
      }
      
      try {
        await loadServicesIntoSelect('vueltaServiceSelect');
        console.log("[Main] Selector VUELTA actualizado");
      } catch(e) {
        console.log("[Main] Error actualizando selector VUELTA:", e.message);
      }
      
      try {
        await loadServicesIntoSelect('configServiceSelect');
        console.log("[Main] Selector CONFIG actualizado");
      } catch(e) {
        console.log("[Main] Error actualizando selector CONFIG:", e.message);
      }
      
      // Método 2: Forzar actualización con updateServiceDropdowns si existe
      if (typeof updateServiceDropdowns === 'function') {
        console.log("[Main] Llamando updateServiceDropdowns()...");
        try {
          updateServiceDropdowns();
        } catch(e) {
          console.log("[Main] Error en updateServiceDropdowns:", e.message);
        }
      }
      
      // Método 3: Actualización directa con fetch (más redundancia)
      setTimeout(async () => {
        try {
          const response = await fetch('/api/services');
          const servicesData = await response.json();
          
          if (servicesData.services && Array.isArray(servicesData.services)) {
            // Actualizar selector IDA si aún está vacío
            const idaSelect = document.getElementById('idaServiceSelect');
            if (idaSelect && idaSelect.options.length <= 1) {
              console.log("[Main] Poblando selector IDA directamente con fetch...");
              servicesData.services.forEach(service => {
                if (service.service_number && !Array.from(idaSelect.options).some(opt => opt.value === service.service_number)) {
                  const option = document.createElement('option');
                  option.value = service.service_number;
                  option.textContent = `${service.service_number} - ${service.service_name || 'Servicio'}`;
                  idaSelect.appendChild(option);
                }
              });
            }
            
            // Actualizar selector VUELTA si aún está vacío
            const vueltaSelect = document.getElementById('vueltaServiceSelect');
            if (vueltaSelect && vueltaSelect.options.length <= 1) {
              console.log("[Main] Poblando selector VUELTA directamente con fetch...");
              servicesData.services.forEach(service => {
                if (service.service_number && !Array.from(vueltaSelect.options).some(opt => opt.value === service.service_number)) {
                  const option = document.createElement('option');
                  option.value = service.service_number;
                  option.textContent = `${service.service_number} - ${service.service_name || 'Servicio'}`;
                  vueltaSelect.appendChild(option);
                }
              });
            }
          }
        } catch(e) {
          console.log("[Main] Error en actualización directa de selectores:", e.message);
        }
      }, 1000);
      
      console.log("Selectores de servicios actualizados con múltiples métodos");

      // Notificar a todos los componentes que se ha cargado un nuevo archivo
      try {
        if (window.EventBus && window.AppEvents) {
          window.EventBus.publish(window.AppEvents.FILE_UPLOADED, {
            service_number: data.service_number,
            structure_file: data.structure_file,
            timestamp: new Date().toISOString()
          });
          console.log("Evento FILE_UPLOADED publicado con service_number:", data.service_number);

          // Ejecutar el auto-llenado automático si existe la funcionalidad
          if (typeof ConfigDataHandler !== 'undefined' &&
              typeof ConfigDataHandler.autoFillFields === 'function' &&
              typeof ConfigServiceLoader !== 'undefined') {

            setTimeout(() => {
              // Intentar ejecutar el auto-llenado después de que la estructura se haya cargado
              try {
                // Obtener estructura del servicio recién cargado
                const structure = ConfigServiceLoader.currentStructure;
                const canalInput = document.getElementById('canalInput');

                if (structure && structure.header_structure) {
                  console.log("Ejecutando auto-llenado automático después de guardar Excel");
                  ConfigDataHandler.autoFillFields(data.service_number, structure.header_structure, canalInput);
                  console.log("Auto-llenado ejecutado con éxito después de guardar Excel");
                }
              } catch (autoFillError) {
                console.error("Error al ejecutar auto-llenado automático:", autoFillError);
              }
            }, 500); // Pequeño retraso para asegurar que la estructura se ha cargado
          }
        }
      } catch (eventError) {
        console.log("No se pudo publicar evento FILE_UPLOADED:", eventError.message);
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

      // NUEVO: Almacenar información del Excel para uso posterior en configuraciones
      if (data.service_number && step2Result.data) {
        window.currentExcelInfo = {
          serviceNumber: data.service_number,
          serviceName: data.service_name,
          filename: data.filename,
          structureFile: data.structure_file,
          excelId: step2Result.data?.ExcelId || step2Result.data?.excelId,
          databaseResult: step2Result.data
        };
        console.log('📋 [MAIN] Información del Excel almacenada para configuraciones:', window.currentExcelInfo);
      }


    // Mostrar notificación de éxito (comentada temporalmente)
    // ConfigUtils.showNotification("Archivo procesado correctamente. Servicios actualizados.", 'success');

    // Preguntar al usuario si desea iniciar la configuración para el servicio cargado
    console.log("[Main.js] Intentando mostrar SweetAlert para configuración. Service Name:", data.service_name, "Service Number:", data.service_number);
    if (typeof Swal !== 'undefined' && data.service_name && data.service_number) {
      console.log("[Main.js] Condiciones cumplidas, mostrando Swal.fire...");
      Swal.fire({
        title: 'Configuración de Servicio',
        html: `El servicio <strong>${data.service_name} (${data.service_number})</strong> se ha cargado correctamente.<br><br>¿Desea iniciar la configuración para este servicio?`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, iniciar configuración',
        cancelButtonText: 'No, más tarde',
        allowOutsideClick: false, // Evitar cierre al hacer clic fuera
        allowEscapeKey: false     // Evitar cierre con la tecla Escape
      }).then((result) => {
        console.log("[Main.js] SweetAlert .then() ejecutado, result.isConfirmed:", result.isConfirmed);
        if (result.isConfirmed) {
          // Activar la pestaña de configuración
          const configTabButton = document.querySelector('.main-tab-btn[data-tab="configuracion"]');
          if (configTabButton) {
            configTabButton.click(); 
          }
          
          // Dar un pequeño delay para asegurar que la pestaña se renderice
          setTimeout(() => {
            const configServiceSelect = document.getElementById('configServiceSelect');
            if (configServiceSelect) {
              // SIEMPRE recargar los servicios para asegurar que estén actualizados
              console.log("[Main.js] Recargando servicios para el selector de configuración...");
              
              // Forzar recarga de servicios usando múltiples métodos (redundante pero funcional)
              
              // Método 1: Usar ConfigServiceLoader
              if (typeof ConfigServiceLoader !== 'undefined' && ConfigServiceLoader.loadAvailableServices) {
                ConfigServiceLoader.loadAvailableServices(configServiceSelect, function(services) {
                  console.log(`[Main.js] ${services.length} servicios cargados via ConfigServiceLoader`);
                  // Seleccionar el servicio actual
                  setTimeout(() => {
                    configServiceSelect.value = data.service_number;
                    const event = new Event('change', { bubbles: true });
                    configServiceSelect.dispatchEvent(event);
                  }, 100);
                });
              }
              
              // Método 2: Cargar servicios directamente (redundante pero asegura funcionamiento)
              fetch('/api/services')
                .then(response => response.json())
                .then(servicesData => {
                  if (servicesData.services && Array.isArray(servicesData.services)) {
                    // Solo poblar si está vacío
                    if (configServiceSelect.options.length <= 1) {
                      while (configServiceSelect.options.length > 1) {
                        configServiceSelect.remove(1);
                      }
                      
                      servicesData.services.forEach(service => {
                        if (service.service_number) {
                          const option = document.createElement('option');
                          option.value = service.service_number;
                          option.textContent = `${service.service_number} - ${service.service_name || 'Servicio'}`;
                          configServiceSelect.appendChild(option);
                        }
                      });
                    }
                    
                    // Seleccionar el servicio actual con otro delay
                    setTimeout(() => {
                      configServiceSelect.value = data.service_number;
                      const event = new Event('change', { bubbles: true });
                      configServiceSelect.dispatchEvent(event);
                    }, 200);
                  }
                })
                .catch(err => {
                  console.error('[Main.js] Error cargando servicios directamente:', err);
                });
              
              // Método 3: Disparar evento de inicialización de configuración (redundante)
              if (typeof ConfigInit !== 'undefined' && ConfigInit.initServiceSelector) {
                setTimeout(() => {
                  console.log("[Main.js] Reinicializando selector de servicios...");
                  ConfigInit.initServiceSelector();
                }, 300);
              }
            }
          }, 500); // Delay de medio segundo para asegurar que todo esté listo
          // Ocultar overlay de progreso si el usuario confirma y navega
          const progressOverlay = document.getElementById('progressOverlay');
          if (progressOverlay) {
            progressOverlay.classList.add('hide');
            if (window.progressTimeoutId) {
              clearTimeout(window.progressTimeoutId);
              window.progressTimeoutId = null;
            }
          }
        } else {
          // Si el usuario cancela o cierra el SweetAlert, activar la pestaña de carga por defecto
          activateDefaultLoadTabs();
        }
      });
    } else {
      console.log("[Main.js] Condiciones para Swal.fire NO cumplidas. Service Name:", data.service_name, "Service Number:", data.service_number, "Swal defined:", typeof Swal !== 'undefined');
      // Si el SweetAlert no se muestra, activar la pestaña de carga por defecto
      activateDefaultLoadTabs();
    }

    // Función para activar las pestañas de carga por defecto
    function activateDefaultLoadTabs() {
      setTimeout(() => {
        try {
          console.log("Activando pestañas de carga por defecto...");
          const cargaTab = document.querySelector('.main-tab-btn[data-tab="carga"]');
          if (cargaTab && !cargaTab.classList.contains('active')) { 
            document.querySelectorAll('.main-tab-btn.active').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane.active').forEach(pane => pane.classList.remove('active'));
            cargaTab.click(); 
            console.log("Pestaña 'carga' activada por defecto.");
          } else if (cargaTab && cargaTab.classList.contains('active')) {
            console.log("Pestaña 'carga' ya está activa, asegurando subpestaña cabecera.");
          }

          const cargaPane = document.getElementById('carga');
          if (cargaPane && cargaPane.classList.contains('active')) {
            const cabeceraSubTab = cargaPane.querySelector('[data-subtab="cabecera"]');
            if (cabeceraSubTab) {
                const isActiveSubTab = cabeceraSubTab.classList.contains('active');
                if (!isActiveSubTab) {
                    cargaPane.querySelectorAll('.subtab-btn.active').forEach(btn => btn.classList.remove('active'));
                    cargaPane.querySelectorAll('.subtab-pane.active').forEach(pane => pane.classList.remove('active'));
                    cabeceraSubTab.click(); 
                    console.log("Subpestaña 'cabecera' activada por defecto.");
                } else {
                    console.log("Subpestaña 'cabecera' ya está activa.");
                }
            }
          }
        } catch (error) {
          console.error("Error al activar pestañas de carga por defecto:", error);
        }

        // Ocultar el overlay de progreso
        const progressOverlay = document.getElementById('progressOverlay');
        if (progressOverlay) {
          progressOverlay.classList.add('hide');
          if (window.progressTimeoutId) {
            clearTimeout(window.progressTimeoutId);
            window.progressTimeoutId = null;
          }
        }
      }, 250); // Reducido el timeout ligeramente, ya que el Swal ahora maneja un flujo.
    }
  }
}

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
          <button class="action-btn open-excel-btn" onclick="openExcelFile('${file.filename}', this)">Abrir Excel</button>
        </td>
      `;

      filesTable.appendChild(row);
    });

  } catch (error) {
    ConfigUtils.showNotification(error.message, 'error');
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
      ConfigUtils.showNotification('Archivo de estructura no especificado', 'error');
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
    const parseErrors = data.service_structure?.parse_errors || [];
    const requestErrors = data.service_structure?.parse_errors_request || [];
    const responseErrors = data.service_structure?.parse_errors_response || [];

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

        // Log resumido en consola
        const totalErrors = (headerErrors?.length || 0) + (requestErrors?.length || 0) + (responseErrors?.length || 0);
        console.log(`⚠️ Excel: ${totalErrors} errores encontrados (${headerErrors?.length || 0} cabecera, ${requestErrors?.length || 0} request, ${responseErrors?.length || 0} response)`);
        
        // Log detallado solo si VERBOSE está activado
        if (window.VERBOSE_LOGS || localStorage.getItem('VERBOSE_LOGS') === 'true') {
          console.error(errorMsg);
        }

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
          ConfigUtils.showNotification('Se encontraron errores específicos al procesar el Excel. Verifique la consola para más detalles.', 'warning');
        }
      } else {
        // Si no tenemos información detallada, mostrar mensaje genérico
        ConfigUtils.showNotification('La estructura de servicio está incompleta: Cabecera presente pero faltan secciones Request/Response. Esto puede deberse a problemas con el formato del Excel.', 'warning');

        // Log resumido de estructura incompleta
        console.log(`⚠️ Estructura incompleta: Cabecera ${headerComplete ? '✓' : '✗'} | Request ${requestComplete ? '✓' : '✗'} | Response ${responseComplete ? '✓' : '✗'}`);
        
        // Información detallada solo si VERBOSE está activado
        if (window.VERBOSE_LOGS || localStorage.getItem('VERBOSE_LOGS') === 'true') {
          console.warn("Estructura incompleta detectada:", {
            headerComplete,
            requestComplete,
            responseComplete,
            headerFields: data.header_structure?.fields?.length || 0,
            requestElements: data.service_structure?.request?.elements?.length || 0,
            responseElements: data.service_structure?.response?.elements?.length || 0
          });
        }

        // Análisis de posibles causas comunes
        let posibleCausa = 'Posibles causas:\n';

        if (data.service_structure && data.service_structure.serviceNumber) {
          posibleCausa += `• Servicio ${data.service_structure.serviceNumber} (${data.service_structure.serviceName}) detectado, pero con elementos vacíos\n`;
        }

        posibleCausa += '• Las pestañas de Excel no tienen los nombres esperados (deben ser "Cabecera", "Requerimiento", "Respuesta")\n';
        posibleCausa += '• La estructura de columnas no corresponde al formato esperado\n';
        posibleCausa += '• Hay celdas combinadas que interrumpen el parsing\n';
        posibleCausa += '• La hoja puede contener celdas con formato especial (html, imágenes) que interfieren con el procesamiento';

        // Log de posibles causas solo si VERBOSE está activado
        if (window.VERBOSE_LOGS || localStorage.getItem('VERBOSE_LOGS') === 'true') {
          console.warn(posibleCausa);
        }

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
    ConfigUtils.showNotification(error.message, 'error');
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
    ConfigUtils.showNotification('Nombre de archivo no válido', 'error');
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
        ConfigUtils.showNotification('Error al acceder al archivo Excel', 'error');
        // Restaurar el botón inmediatamente en caso de error
        button.innerHTML = originalContent;
        button.disabled = false;
        button.classList.remove('btn-loading');
      }
    })
    .catch(error => {
      console.error('Error verificando archivo:', error);
      ConfigUtils.showNotification('Error al acceder al archivo Excel', 'error');
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
      return `<span class="json-string">"${json.replace(/</g, '<').replace(/>/g, '>')}"</span>`;
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
    const formattedLength = formatFieldValueForDisplay(field.length);
    const formattedType = formatFieldValueForDisplay(field.type);
    let formattedRequired = '-';
    
    // Verificar si ConfigUtils está disponible
    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.formatRequiredText) {
        formattedRequired = ConfigUtils.formatRequiredText(field.required);
    } else {
        // Fallback manual si ConfigUtils no está disponible
        if (field.required && typeof field.required === 'string' && field.required.trim() !== '') {
            const text = field.required.trim();
            // Algoritmo simple: toLowerCase + properCase
            const lowerText = text.toLowerCase();
            formattedRequired = lowerText.charAt(0).toUpperCase() + lowerText.slice(1);
        }
    }

    // Asegurar que la descripción también tenga scroll si es larga
    let formattedDescription = field.description;
    if (formattedDescription && formattedDescription.length > 50) {
      formattedDescription = `
        <div class="field-value-container">
          <div class="field-value-multiple">${formattedDescription}</div>
        </div>
      `;
    } else {
      formattedDescription = formatFieldValueForDisplay(field.description);
    }

    // Formatear el campo valores
    const formattedValues = formatFieldValueForDisplay(field.values);

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
  // Verify requestTable and responseTable elements still exist
  const requestTableBody = document.getElementById('requestTable')?.querySelector('tbody') || null;
  const responseTableBody = document.getElementById('responseTable')?.querySelector('tbody') || null;

  if (!requestTableBody || !responseTableBody) {
    console.error("Error: requestTable or responseTable not found in DOM");
    return;
  }

  // Limpiar las tablas
  requestTableBody.innerHTML = '';
  responseTableBody.innerHTML = '';

  // Si no hay estructura, mostrar mensaje de error claro
  if (!serviceStructure) {
    const errorMessage = 'No se pudo cargar la estructura del servicio. El archivo Excel puede tener problemas de formato.';
    if (typeof ConfigUtils !== 'undefined') {
      ConfigUtils.showNotification(errorMessage, 'error');
    } else {
      console.error(errorMessage);
    }

    const requestRow = document.createElement('tr');
    requestRow.innerHTML = `<td colspan="6" class="error-message">Error: ${errorMessage}</td>`;
    requestTableBody.appendChild(requestRow);

    const responseRow = document.createElement('tr');
    responseRow.innerHTML = `<td colspan="6" class="error-message">Error: ${errorMessage}</td>`;
    responseTableBody.appendChild(responseRow);
    return;
  }

  // Make sure we save the structure so we can reload it if needed
  window.currentStructure = window.currentStructure || {};
  window.currentStructure.service_structure = serviceStructure;

  // Debugging log de la estructura
  console.log('Estructura de servicio recibida:', {
    hasRequest: !!serviceStructure.request,
    requestElements: serviceStructure.request?.elements?.length || 0,
    hasResponse: !!serviceStructure.response,
    responseElements: serviceStructure.response?.elements?.length || 0
  });

  // Procesar sección de requerimiento
  if (serviceStructure.request && serviceStructure.request.elements) {
    // Log de procesamiento solo si VERBOSE está activado
    if (window.VERBOSE_LOGS || localStorage.getItem('VERBOSE_LOGS') === 'true') {
      console.log('Processing request structure with', serviceStructure.request.elements.length, 'elements');
    }
    const originalElementsCount = serviceStructure.request.elements.length;
    displayServiceSection(serviceStructure.request, requestTable);

    // Verificar si se generaron filas en la tabla
    if (requestTable.childElementCount === 0) {
      const errorMsg = `Error al procesar estructura de requerimiento: Se encontraron ${originalElementsCount} elementos pero no se pudieron interpretar correctamente.`;
      console.log(`⚠️ Request: ${originalElementsCount} elementos no procesados`);
      if (window.VERBOSE_LOGS || localStorage.getItem('VERBOSE_LOGS') === 'true') {
        console.error(errorMsg);
      }

      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="6" class="error-message">${errorMsg}</td>`;
      requestTable.appendChild(row);

      // Mostrar notificación solo si no se pudo procesar ningún elemento
      ConfigUtils.showNotification('Error al procesar la estructura de requerimiento. Verifique el formato del Excel.', 'error');
    }
  } else {
    const errorMsg = 'No hay estructura de requerimiento disponible. El archivo Excel puede estar incompleto o tener un formato inadecuado.';
    console.warn(errorMsg);

    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="6" class="error-message">${errorMsg}</td>`;
    requestTable.appendChild(row);

    // Mostrar notificación para alertar al usuario
    ConfigUtils.showNotification('No se encontró estructura de requerimiento en el Excel cargado.', 'warning');
  }

  // Procesar sección de respuesta
  if (serviceStructure.response && serviceStructure.response.elements) {
    // Log de procesamiento solo si VERBOSE está activado
    if (window.VERBOSE_LOGS || localStorage.getItem('VERBOSE_LOGS') === 'true') {
      console.log('Processing response structure with', serviceStructure.response.elements.length, 'elements');
    }
    const originalElementsCount = serviceStructure.response.elements.length;
    displayServiceSection(serviceStructure.response, responseTable);

    // Verificar si se generaron filas en la tabla
    if (responseTable.childElementCount === 0) {
      const errorMsg = `Error al procesar estructura de respuesta: Se encontraron ${originalElementsCount} elementos pero no se pudieron interpretar correctamente.`;
      console.log(`⚠️ Response: ${originalElementsCount} elementos no procesados`);
      if (window.VERBOSE_LOGS || localStorage.getItem('VERBOSE_LOGS') === 'true') {
        console.error(errorMsg);
      }

      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="6" class="error-message">${errorMsg}</td>`;
      responseTable.appendChild(row);

      // Mostrar notificación solo si no se pudo procesar ningún elemento
      ConfigUtils.showNotification('Error al procesar la estructura de respuesta. Verifique el formato del Excel.', 'error');
    }
  } else {
    const errorMsg = 'No hay estructura de respuesta disponible. El archivo Excel puede estar incompleto o tener un formato inadecuado.';
    console.warn(errorMsg);

    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="6" class="error-message">${errorMsg}</td>`;
    responseTable.appendChild(row);

    // Mostrar notificación para alertar al usuario
    ConfigUtils.showNotification('No se encontró estructura de respuesta en el Excel cargado.', 'warning');
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
      const formattedLength = formatFieldValueForDisplay(element.length);
      const formattedType = formatFieldValueForDisplay(element.fieldType);
      let formattedRequired = '-';
      
      // Verificar si ConfigUtils está disponible
      if (typeof ConfigUtils !== 'undefined' && ConfigUtils.formatRequiredText) {
          formattedRequired = ConfigUtils.formatRequiredText(element.required);
      } else {
          // Fallback manual si ConfigUtils no está disponible
          if (element.required && typeof element.required === 'string' && element.required.trim() !== '') {
              const text = element.required.trim();
              // Algoritmo simple: toLowerCase + properCase
              const lowerText = text.toLowerCase();
              formattedRequired = lowerText.charAt(0).toUpperCase() + lowerText.slice(1);
          }
      }

      // Formatear los valores largos o múltiples - siempre truncar en valores
      const formattedValues = formatFieldValueForDisplay(element.values, true);

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
              formattedDescription = formatFieldValueForDisplay(field.description);
            }

            // Formatear todos los campos
            const formattedName = field.name;
            const formattedLength = formatFieldValueForDisplay(field.length);
            const formattedType = formatFieldValueForDisplay(field.fieldType);
            let formattedRequired = '-';
    
    // Verificar si ConfigUtils está disponible
    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.formatRequiredText) {
        formattedRequired = ConfigUtils.formatRequiredText(field.required);
    } else {
        // Fallback manual si ConfigUtils no está disponible
        if (field.required && typeof field.required === 'string' && field.required.trim() !== '') {
            const text = field.required.trim();
            // Algoritmo simple: toLowerCase + properCase
            const lowerText = text.toLowerCase();
            formattedRequired = lowerText.charAt(0).toUpperCase() + lowerText.slice(1);
        }
    }

            // Formatear los valores
            const formattedValues = formatFieldValueForDisplay(field.values);

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
 * Formatea un valor de campo para visualización en la UI, detectando valores múltiples o muy largos
 * @param {string} value - Valor a formatear
 * @param {boolean} forceValues - Si es true, siempre truncar el valor a 10 caracteres
 * @returns {string} HTML formateado con el valor para mostrar en la interfaz
 */
function formatFieldValueForDisplay(value, forceValues = false) {
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
 * Carga la lista de servicios usando cache centralizado
 */
async function loadServicesList() {
  try {
    // Usar cache centralizado si está disponible
    let services;
    if (typeof ServicesCache !== 'undefined') {
      services = await ServicesCache.getServices();
    } else {
      // Fallback al método directo si no hay cache
      const response = await fetch('/api/services');
      if (!response.ok) {
        throw new Error('Error al cargar la lista de servicios');
      }
      const data = await response.json();
      services = data.services;
    }

    // Limpiar la tabla
    if (servicesTable) {
      servicesTable.innerHTML = '';

      // Si no hay servicios, mostrar mensaje
      if (services.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4">No hay servicios disponibles</td>';
        servicesTable.appendChild(row);
        return;
      }

      // Agrupar servicios por número
      const servicesByNumber = {};

      services.forEach(service => {
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
            <button class="action-btn" onclick="loadServiceVersions('${serviceNumber}')">Versiones</button>
          </td>
        `;

        servicesTable.appendChild(row);
      });
    }

    // También cargar los servicios en los selectores si existen (usando los servicios ya obtenidos)
    loadServicesIntoSelectWithData('idaServiceSelect', services);
    loadServicesIntoSelectWithData('vueltaServiceSelect', services);
    loadServicesIntoSelectWithData('configServiceSelect', services);

  } catch (error) {
    ConfigUtils.showNotification(error.message, 'error');
  }
}

/**
 * Carga los servicios en un select usando datos ya obtenidos (evita llamadas API adicionales)
 * @param {string} selectId - ID del elemento select
 * @param {Array} services - Array de servicios ya obtenidos
 */
function loadServicesIntoSelectWithData(selectId, services) {
  const select = document.getElementById(selectId);
  if (!select) return;

  // Recordar el valor seleccionado actualmente
  const currentValue = select.value;

  // Limpiar el select (mantener solo la primera opción)
  while (select.options.length > 1) {
    select.remove(1);
  }

  // Agrupar servicios por número para evitar duplicados
  const servicesByNumber = {};

  services.forEach(service => {
    if (!servicesByNumber[service.service_number]) {
      servicesByNumber[service.service_number] = [];
    }
    servicesByNumber[service.service_number].push(service);
  });

  // Ordenar los números de servicio
  const sortedNumbers = Object.keys(servicesByNumber).sort((a, b) => parseInt(a) - parseInt(b));

  // Para cada número de servicio, usar solo la versión más reciente
  for (const serviceNumber of sortedNumbers) {
    const servicesForNumber = servicesByNumber[serviceNumber];

    // Ordenar por excel_file (más reciente primero, basándose en el timestamp del nombre)
    servicesForNumber.sort((a, b) => {
      const fileA = a.excel_file || '';
      const fileB = b.excel_file || '';
      return fileB.localeCompare(fileA);
    });

    // Tomar solo el servicio más reciente para cada número
    const latestService = servicesForNumber[0];

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
}

/**
 * Carga los servicios disponibles en un select usando cache centralizado
 * @param {string} selectId - ID del elemento select
 */
async function loadServicesIntoSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    // Usar cache centralizado si está disponible
    let services;
    if (typeof ServicesCache !== 'undefined') {
      services = await ServicesCache.getServices();
    } else {
      // Fallback al método directo si no hay cache
      const response = await fetch('/api/services');
      if (!response.ok) {
        throw new Error('Error al cargar la lista de servicios');
      }
      const data = await response.json();
      services = data.services;
    }

    // Recordar el valor seleccionado actualmente
    const currentValue = select.value;

    // Limpiar el select (mantener solo la primera opción)
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Agrupar servicios por número para evitar duplicados
    const servicesByNumber = {};

    services.forEach(service => {
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
          // Formateo de fecha corregido
          let date = 'Fecha no disponible';
          
          // Intentar con timestamp primero
          if (version.timestamp) {
            try {
              const parsedDate = new Date(version.timestamp);
              console.log('Parsing timestamp:', version.timestamp, 'Result:', parsedDate);
              
              if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
                date = parsedDate.toLocaleString('es-ES', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
              } else {
                console.warn('Invalid timestamp:', version.timestamp);
                date = version.timestamp; // Mostrar el valor crudo si no se puede parsear
              }
            } catch (error) {
              console.error('Error parsing timestamp:', error);
              date = version.timestamp; // Mostrar el valor crudo en caso de error
            }
          } 
          // Fallback a upload_date
          else if (version.upload_date) {
            try {
              const parsedDate = new Date(version.upload_date);
              if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
                date = parsedDate.toLocaleString('es-ES', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
              } else {
                date = version.upload_date; // Mostrar el valor crudo
              }
            } catch (error) {
              console.error('Error parsing upload_date:', error);
              date = version.upload_date; // Mostrar el valor crudo
            }
          }
          
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
      ConfigUtils.showNotification(`No se encontraron versiones para el servicio ${serviceNumber}`, 'warning');
    }

  } catch (error) {
    ConfigUtils.showNotification(error.message, 'error');
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
    ConfigUtils.showNotification('Por favor, ingrese un número de servicio', 'error');
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

    ConfigUtils.showNotification('Servicio procesado correctamente', 'success');

  } catch (error) {
    ConfigUtils.showNotification(error.message, 'error');
  }
}

// Detectar cambio de tab y recargar configuraciones guardadas al entrar a 'Configuración'
document.addEventListener('DOMContentLoaded', function() {
  const configTabBtn = document.querySelector('.main-tab-btn[data-tab="configuracion"]');
  if (configTabBtn) {
    configTabBtn.addEventListener('click', function() {
      // Cargar servicios en el selector si está vacío
      const configServiceSelect = document.getElementById('configServiceSelect');
      if (configServiceSelect && configServiceSelect.options.length <= 1) {
        console.log("[Main] Cargando servicios en selector de configuración...");
        
        // Usar ConfigServiceLoader si está disponible
        if (typeof ConfigServiceLoader !== 'undefined' && ConfigServiceLoader.loadAvailableServices) {
          ConfigServiceLoader.loadAvailableServices(configServiceSelect, function(services) {
            console.log(`[Main] ${services.length} servicios cargados en selector`);
          });
        }
      }
      
      // Cargar configuraciones guardadas
      if (typeof ConfigStorageManager !== 'undefined' && typeof ConfigUIManager !== 'undefined') {
        ConfigStorageManager.loadSavedConfigurations(null, function(configs) {
          if (ConfigUIManager.updateSavedConfigurationsList) {
            ConfigUIManager.updateSavedConfigurationsList(configs);
          }
        }, true); // true = forzar recarga
      }
    });
  }
  
  // Detectar cambio de tab y cargar servicios al entrar a 'API/Servicios'
  const serviciosTabBtn = document.querySelector('.main-tab-btn[data-tab="servicios"]');
  if (serviciosTabBtn) {
    serviciosTabBtn.addEventListener('click', function() {
      console.log("[Main] Tab API/Servicios activada, cargando servicios...");
      
      // Forzar carga de servicios en todos los selectores de la pestaña API
      setTimeout(() => {
        // Cargar servicios en selector IDA
        const idaServiceSelect = document.getElementById('idaServiceSelect');
        if (idaServiceSelect && idaServiceSelect.options.length <= 1) {
          console.log("[Main] Cargando servicios en selector IDA...");
          if (typeof loadServicesIntoSelect === 'function') {
            loadServicesIntoSelect('idaServiceSelect');
          }
        }
        
        // Cargar servicios en selector VUELTA
        const vueltaServiceSelect = document.getElementById('vueltaServiceSelect');
        if (vueltaServiceSelect && vueltaServiceSelect.options.length <= 1) {
          console.log("[Main] Cargando servicios en selector VUELTA...");
          if (typeof loadServicesIntoSelect === 'function') {
            loadServicesIntoSelect('vueltaServiceSelect');
          }
        }
        
        // También actualizar usando updateServiceDropdowns si está disponible
        if (typeof updateServiceDropdowns === 'function') {
          console.log("[Main] Actualizando todos los dropdowns de servicios...");
          updateServiceDropdowns();
        }
        
        // NO disparar evento FILE_UPLOADED aquí porque causa que vuelva a la pestaña CARGA
        // Solo actualizar los selectores directamente sin eventos
      }, 300); // Pequeño delay para asegurar que la pestaña esté completamente renderizada
    });
  }
});

function updateBreadcrumb() {
  // Buscar el tab principal activo o visible
  let mainTabBtn = document.querySelector('.main-tab-btn.active');
  if (!mainTabBtn) {
    // Si no hay activo, buscar el que tenga aria-selected="true" o visible
    mainTabBtn = document.querySelector('.main-tab-btn[aria-selected="true"]') || document.querySelector('.main-tab-btn');
  }
  // Buscar el subtab activo o visible
  let subTabBtn = document.querySelector('.subtab-btn.active');
  if (!subTabBtn) {
    subTabBtn = document.querySelector('.subtab-btn[aria-selected="true"]') || document.querySelector('.subtab-btn');
  }
  const breadcrumbBar = document.getElementById('breadcrumb-bar');
  if (!breadcrumbBar) return;

  let html = '';
  if (mainTabBtn) {
    html += `<span class=\"breadcrumb-main\">${mainTabBtn.textContent.trim()}</span>`;
  }
  if (subTabBtn && subTabBtn.offsetParent !== null) {
    html += `<span class=\"breadcrumb-sep\">&gt;</span> <span class=\"breadcrumb-sub\">${subTabBtn.textContent.trim()}</span>`;
  }
  breadcrumbBar.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
  // Actualizar al cargar
  updateBreadcrumb();
  // Actualizar al cambiar de tab principal
  document.querySelectorAll('.main-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      setTimeout(updateBreadcrumb, 10);
    });
  });
  // Actualizar al cambiar de subtab
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      setTimeout(updateBreadcrumb, 10);
    });
  });
});
