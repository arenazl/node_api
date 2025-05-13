// Event listeners for various UI components
// Sistema de eventos Socket.IO
let socket;

// Inicializar Socket.IO
function initSocketIO() {
    // Verificar si ya hay una conexión
    if (socket) return;
    
    try {
        // Intentar conectar con el servidor Socket.IO
        socket = io();
        
        // Evento de conexión exitosa
        socket.on('connect', function() {
            console.log('[Socket.IO] Conectado con el servidor, ID:', socket.id);
        });
        
        // Escuchar eventos de configuraciones guardadas
        socket.on('config:saved', function(data) {
            console.log('[Socket.IO] Configuración guardada:', data);
            
            // Actualizar la lista de configuraciones si corresponde al servicio actual
            const idaServiceSelect = document.getElementById('idaServiceSelect');
            if (idaServiceSelect && idaServiceSelect.value === data.serviceNumber) {
                console.log('[Socket.IO] Actualizando lista de configuraciones para el servicio:', data.serviceNumber);
                loadConfigurationsForService(data.serviceNumber);
            }
        });
        
        // Eventos adicionales
        socket.on('services:refreshed', function(data) {
            console.log('[Socket.IO] Servicios actualizados:', data);
            // Recargar selectores de servicios
            loadAllServiceSelectors();
        });
        
        // Manejar reconexiones
        socket.on('reconnect', function(attemptNumber) {
            console.log('[Socket.IO] Reconectado después de', attemptNumber, 'intentos');
            loadAllServiceSelectors(); // Recargar datos después de reconectar
        });
        
        // Manejar errores
        socket.on('error', function(error) {
            console.error('[Socket.IO] Error:', error);
        });
        
        // Desconexión
        socket.on('disconnect', function(reason) {
            console.log('[Socket.IO] Desconectado:', reason);
        });
        
    } catch (error) {
        console.error('[Socket.IO] Error al inicializar:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Socket.IO
    initSocketIO();
    
    // Refresh button for services
    const refreshServicesBtn = document.getElementById('refreshServicesBtn');
    if (refreshServicesBtn) {
        refreshServicesBtn.addEventListener('click', function() {
            refreshServices();
        });
    }

    // Service selection change handlers
    const idaServiceSelect = document.getElementById('idaServiceSelect');
    if (idaServiceSelect) {
        idaServiceSelect.addEventListener('change', function() {
            const serviceNumber = this.value;
            if (serviceNumber) {
                loadConfigurationsForService(serviceNumber);
            }
        });
    }

    // Configuration selection change handlers
    const idaConfigSelect = document.getElementById('idaConfigSelect');
    if (idaConfigSelect) {
        idaConfigSelect.addEventListener('change', function() {
            const configId = this.value;
            if (configId) {
                loadConfigurationData(configId);
            }
        });
    }

    // Service tab navigation buttons (ida/vuelta)
    const serviceTabs = document.querySelectorAll('.services-tab-btn');
    serviceTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remover clase 'active' de todos los tabs
            serviceTabs.forEach(t => t.classList.remove('active'));
            // Agregar clase 'active' al tab clickeado
            this.classList.add('active');
            
            // Mostrar el contenido correspondiente
            const tabName = this.getAttribute('data-service-tab');
            const tabContents = document.querySelectorAll('.service-tab-content');
            
            tabContents.forEach(content => {
                if (content.id === tabName + 'Service') {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            
            // Si estamos cambiando a la pestaña de vuelta, solo sincronizar el servicio seleccionado
            if (tabName === 'vuelta') {
                // Intentar cargar el último servicio seleccionado en ida
                const lastServiceNumber = window.sessionStorage.getItem('lastServiceNumber');
                
                if (lastServiceNumber) {
                    // Seleccionar el mismo servicio que en ida
                    const vueltaServiceSelect = document.getElementById('vueltaServiceSelect');
                    if (vueltaServiceSelect && vueltaServiceSelect.value !== lastServiceNumber) {
                        // Buscar si existe la opción para este servicio
                        const options = Array.from(vueltaServiceSelect.options);
                        const serviceOption = options.find(option => option.value === lastServiceNumber);
                        
                        if (serviceOption) {
                            vueltaServiceSelect.value = lastServiceNumber;
                            console.log(`Sincronizado servicio de vuelta: ${lastServiceNumber}`);
                        }
                    }
                }
                
                // Asegurarse de que el campo de entrada esté vacío
                const streamDataInput = document.getElementById('streamData');
                if (streamDataInput) {
                    streamDataInput.value = '';
                    
                    // Actualizar contador de caracteres
                    const streamCharCount = document.getElementById('streamCharCount');
                    if (streamCharCount) {
                        streamCharCount.textContent = '0';
                    }
                }
                
                // Limpiar el área de resultados
                const resultContainer = document.getElementById('vueltaResult');
                if (resultContainer) {
                    resultContainer.textContent = 'La respuesta se mostrará aquí';
                }
            }
        });
    });

    // Initial load of service selectors
    loadAllServiceSelectors();
    
    // Añadir event listeners para el campo streamData (actualizar contador al pegar texto)
    const streamDataInput = document.getElementById('streamData');
    if (streamDataInput) {
        // Función para actualizar contador con caracteres y ocurrencias
        function updateCharCountAndOccurrences(inputValue) {
            const streamCharCount = document.getElementById('streamCharCount');
            if (streamCharCount && inputValue) {
                // Contar caracteres
                const charCount = inputValue.length;
                
                // Detectar ocurrencias analizando el string
                let occurrenceCount = 0;
                const headerLength = 102; // Longitud estándar de la cabecera
                
                if (charCount > headerLength + 4) { // Asegurarnos que hay suficiente espacio para la cabecera, estado y contador
                    // Intentamos buscar el contador de ocurrencias en diferentes posiciones del string
                    // Primero buscamos en todas las posiciones cercanas a la cabecera (posiciones 100-110)
                    for (let i = 100; i <= 110; i++) {
                        if (i + 2 > inputValue.length) continue;
                        
                        const possibleCounter = inputValue.substring(i, i + 2);
                        const parsedCount = parseInt(possibleCounter);
                        
                        // Si es un número y parece un contador válido (no demasiado grande)
                        if (!isNaN(parsedCount) && parsedCount > 0 && parsedCount < 100) {
                            console.log(`[DETECCIÓN AVANZADA] Posible contador: "${possibleCounter}" (${parsedCount}) en posición ${i}`);
                            
                            // Verificar si después del contador hay datos consistentes
                            const dataAfterCounter = inputValue.substring(i + 2);
                            // Si hay suficientes datos después del contador para albergar ocurrencias
                            if (dataAfterCounter.length > parsedCount * 20) { // Asumimos al menos 20 chars por ocurrencia
                                occurrenceCount = parsedCount;
                                console.log(`[DETECCIÓN CONFIRMADA] Contador de ${parsedCount} ocurrencias en posición ${i}`);
                                break;
                            }
                        }
                    }
                    
                    // Si aún no encontramos ocurrencias, intentar con los métodos originales
                    if (occurrenceCount === 0) {
                        console.log("[DETECCIÓN FALLBACK] Usando métodos originales para detectar ocurrencias");
                        
                        // Primera posibilidad: Posición después del estado (offset 2 desde el fin de la cabecera)
                        let countStr = inputValue.substring(headerLength + 2, headerLength + 4);
                        console.log(`[DETECCIÓN] Intento 1: "${countStr}" en posición ${headerLength + 2}`);
                        occurrenceCount = parseInt(countStr) || 0;
                        
                        // Segunda posibilidad: Directamente después de la cabecera
                        if (occurrenceCount === 0) {
                            countStr = inputValue.substring(headerLength, headerLength + 2);
                            console.log(`[DETECCIÓN] Intento 2: "${countStr}" en posición ${headerLength}`);
                            occurrenceCount = parseInt(countStr) || 0;
                        }
                        
                        // Tercera posibilidad: 3 posiciones después de la cabecera
                        if (occurrenceCount === 0) {
                            countStr = inputValue.substring(headerLength + 3, headerLength + 5);
                            console.log(`[DETECCIÓN] Intento 3: "${countStr}" en posición ${headerLength + 3}`);
                            occurrenceCount = parseInt(countStr) || 0;
                        }
                    }
                    
                    // Inteligencia adicional para detectar ocurrencias por longitud y estructura
                    if (occurrenceCount === 0) {
                        // Analizar la longitud y estructura del mensaje para estimar ocurrencias
                        // Longitud de datos después de la cabecera
                        const bodyLength = charCount - headerLength;
                        
                        // Buscar patrones repetitivos que podrían indicar ocurrencias
                        // (Este es un enfoque alternativo que usaría patrones conocidos en el cuerpo)
                        console.log(`[ANÁLISIS] Longitud de cuerpo: ${bodyLength}. Analizando patrones...`);
                        
                        // Si encontramos varios bloques del mismo tamaño, podrían ser ocurrencias
                        // Este enfoque es más avanzado y requeriría análisis adicional
                        
                        // Por ahora, intentamos una estimación basada en posibles bloques de 80-120 caracteres
                        // Esta es una estimación muy básica, se podría mejorar con más análisis
                        if (bodyLength > 120) { // Si hay suficiente datos para al menos una ocurrencia
                            const possibleLength = Math.floor(bodyLength / 100); // 100 es un tamaño de ocurrencia estimado
                            if (possibleLength > 0) {
                                occurrenceCount = possibleLength;
                                console.log(`[ESTIMACIÓN] Posibles ocurrencias por longitud: ${occurrenceCount}`);
                            }
                        }
                    }
                    
                    console.log(`[RESULTADO] Contador de registros detectado: ${occurrenceCount} ocurrencias`);
                }
                
                // Actualizar el contador con caracteres y ocurrencias
                streamCharCount.textContent = `${charCount} (${occurrenceCount} ocurrencias)`;
                console.log(`Contador actualizado: ${charCount} caracteres, ${occurrenceCount} ocurrencias`);
            }
        }
        
        // Evento para actualizar el contador al escribir o pegar texto
        streamDataInput.addEventListener('input', function() {
            updateCharCountAndOccurrences(this.value);
        });
        
        // Evento específico para paste
        streamDataInput.addEventListener('paste', function() {
            // El evento input se disparará después del paste, pero agregamos un timeout
            // para asegurar que la actualización sea visible
            setTimeout(() => {
                updateCharCountAndOccurrences(this.value);
            }, 10);
        });
    }
});

// Refresh services function
function refreshServices() {
    // Show loading notification
    ConfigUtils.showNotification('Actualizando lista de servicios...', 'info');
    
    // Call the API to refresh services
    fetch('/api/services/refresh')
        .then(response => {
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            console.log('Servicios actualizados:', data);
            ConfigUtils.showNotification(`Servicios actualizados correctamente (${data.services_count} servicios)`, 'success');
            return fetch('/api/services'); // Get the updated list
        })
        .then(response => {
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            // Refresh service selectors and tables with the new data
            updateServiceSelectors(data.services || []);
            updateServicesTable(data.services || []);
        })
        .catch(error => {
            console.error('Error al actualizar servicios:', error);
            ConfigUtils.showNotification(`Error al actualizar servicios: ${error.message}`, 'error');
        });
}

/**
* Carga las configuraciones disponibles para un servicio específico en el select.
* @param {string} serviceNumber - Número del servicio seleccionado.
*/
function loadConfigurationsForService(serviceNumber) {
    const configSelect = document.getElementById('idaConfigSelect');
    if (!configSelect) { 
        console.warn("Elemento 'idaConfigSelect' no encontrado."); 
        return; 
    }

    // Limpiar opciones manteniendo la primera ("Seleccione...")
    while (configSelect.options.length > 1) { 
        configSelect.remove(1); 
    }
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
            configSelect.options[0].textContent = "-- Seleccione una configuración --";

            if (data?.configs?.length > 0) {
                data.configs.forEach(config => {
                    const option = document.createElement('option');
                    option.value = config.id;
                    // Formatear para mostrar "Config (ServiceNumber-Canal-Version)" en vez de usar último segmento
                    const configName = `Config (${config.serviceNumber}-${config.canal}-${config.version})`;
                    option.textContent = `${config.name || configName} [${config.canal || 'N/C'}]`;
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
            ConfigUtils.showNotification('Error al cargar lista de configuraciones.', 'error');
        });
}

// Helper function to update service selectors
function updateServiceSelectors(services) {
    const selectors = [
        document.getElementById('idaServiceSelect'),
        document.getElementById('vueltaServiceSelect')
    ];
    
    selectors.forEach(select => {
        if (!select) return;
        
        // Save current selection
        const currentValue = select.value;
        
        // Clear options
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Set default text
        if (select.options[0]) {
            select.options[0].textContent = "-- Seleccione un servicio --";
            select.options[0].disabled = true;
        }
        
        // Add new options
        if (services && services.length > 0) {
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.service_number;
                option.textContent = `${service.service_number} - ${service.service_name}`;
                select.appendChild(option);
            });
            
            // Restore previous selection if possible
            if (currentValue) {
                const exists = Array.from(select.options).some(opt => opt.value === currentValue);
                if (exists) {
                    select.value = currentValue;
                    
                    // If this is the service select for ida, trigger the change event to reload configs
                    if (select.id === 'idaServiceSelect') {
                        loadConfigurationsForService(currentValue);
                    }
                }
            }
        } else {
            const option = document.createElement('option');
            option.textContent = "No hay servicios disponibles";
            option.disabled = true;
            select.appendChild(option);
        }
    });
}

// Helper function to update services table
function updateServicesTable(services) {
    const table = document.getElementById('servicesTable');
    if (!table || !table.tBodies[0]) return;
    
    const tbody = table.tBodies[0];
    tbody.innerHTML = '';
    
    if (!services || services.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 3;
        cell.className = 'text-center';
        cell.textContent = 'No hay servicios disponibles';
        return;
    }
    
    services.forEach(service => {
        const row = tbody.insertRow();
        
        // Number cell
        const cellNumber = row.insertCell(0);
        cellNumber.textContent = service.service_number;
        
        // Name cell
        const cellName = row.insertCell(1);
        cellName.textContent = service.service_name;
        
        // Action cell
        const cellAction = row.insertCell(2);
        
        // View button
        const viewButton = document.createElement('button');
        viewButton.className = 'action-btn small';
        viewButton.textContent = 'Ver';
        viewButton.title = 'Ver detalles del servicio';
        viewButton.onclick = function() {
            // Select this service in tabs
            const selects = [
                document.getElementById('idaServiceSelect'),
                document.getElementById('vueltaServiceSelect')
            ];
            
            selects.forEach(select => {
                if (select) {
                    select.value = service.service_number;
                    // Trigger change event
                    const event = new Event('change');
                    select.dispatchEvent(event);
                }
            });
            
            // Show ida tab
            const idaTabBtn = document.querySelector('.services-tab-btn[data-service-tab="ida"]');
            if (idaTabBtn) {
                idaTabBtn.click();
            }
        };
        
        cellAction.appendChild(viewButton);
    });
}

// Variable para almacenar referencias a las notificaciones activas
let activeNotifications = {};

// Helper function to show notifications now uses the ConfigUtils implementation

/**
* Carga los datos de una configuración específica y los muestra en el editor JSON.
* @param {string} configId - ID de la configuración a cargar.
*/
function loadConfigurationData(configId) {
    if (!configId) return;

    // Mostrar indicador de carga
    const editorContainer = document.getElementById('idaJsonInput');
    if (editorContainer) {
        editorContainer.innerHTML = '<div class="loading-spinner">Cargando configuración...</div>';
    }

    // Obtener el servicio seleccionado
    const serviceNumber = document.getElementById('idaServiceSelect')?.value;
    if (!serviceNumber) {
        ConfigUtils.showNotification('Error: No se ha seleccionado un servicio', 'error');
        return;
    }

    // Cargar datos de configuración
    fetch(`/service-config/get/${configId}`)
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar la configuración');
            return response.json();
        })
        .then(data => {
            console.log('Configuración cargada:', data);
            
            // Determinar qué datos mostrar según la estructura de respuesta
            let configData = data;
            
            // Si la respuesta tiene un campo 'config', usar ese
            if (data && data.config) {
                configData = data.config;
            }
            
            // Mostrar los datos en el editor JSON
            const jsonContainer = document.getElementById('idaJsonInput');
            if (jsonContainer) {
                // El contenedor ya es un pre, así que simplemente actualizamos su contenido
                const jsonString = JSON.stringify(configData, null, 2);
                jsonContainer.textContent = jsonString;
                
                // Aplicar formato con JSON formatter si está disponible
                if (typeof formatJson === 'function') {
                    formatJson(jsonContainer);
                } else {
                    // Si no está disponible, al menos asegurarnos que sea editable
                    jsonContainer.setAttribute('contenteditable', 'true');
                }
            } else {
                console.warn('No se encontró el contenedor del editor JSON');
            }

            ConfigUtils.showNotification(`Configuración cargada correctamente`, 'success');
        })
        .catch(error => {
            console.error('Error al cargar la configuración:', error);
            
            // Mostrar mensaje de error en el contenedor
            const jsonContainer = document.getElementById('idaJsonInput');
            if (jsonContainer) {
                jsonContainer.textContent = `Error al cargar la configuración: ${error.message}`;
                jsonContainer.classList.add('json-error');
            }
            
            ConfigUtils.showNotification(`Error al cargar la configuración: ${error.message}`, 'error');
        });
}

// Helper function to load all service selectors initially
function loadAllServiceSelectors() {
    // Primero forzar recarga de la caché para obtener los servicios más recientes
    console.log("Forzando recarga de caché de servicios en la pestaña API...");
    
    // Llamar al endpoint de refresh para forzar recarga de caché
    fetch('/api/services/refresh')
        .then(response => response.json())
        .then(() => {
            console.log("Caché de servicios recargada correctamente, obteniendo lista actualizada...");
            // Después de forzar la recarga, obtener la lista actualizada
            return fetch('/api/services');
        })
        .catch(error => {
            console.warn("Error al forzar recarga de caché:", error);
            console.log("Continuando con caché existente...");
            // Aún así intentamos cargar la lista aunque falle el refresh
            return fetch('/api/services');
        })
        .then(response => {
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            const services = data.services || [];
            console.log(`Cargados ${services.length} servicios`);
            updateServiceSelectors(services);
            updateServicesTable(services);
            
            // Check if idaServiceSelect has a value, and load configurations if it does
            const idaServiceSelect = document.getElementById('idaServiceSelect');
            if (idaServiceSelect && idaServiceSelect.value) {
                loadConfigurationsForService(idaServiceSelect.value);
            }
        })
        .catch(error => {
            console.error('Error al cargar servicios:', error);
            ConfigUtils.showNotification(`Error al cargar servicios: ${error.message}`, 'error');
        });
}

// ==========================================================================
// LÓGICA PARA GENERAR STRING FIJO (Incorporado desde service-tabs-new.js)
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

// Agregar el event listener para el botón generateStringBtn
document.addEventListener('DOMContentLoaded', function() {
    // Botón para generar string fijo
    const generateStringBtn = document.getElementById('generateStringBtn');
    if (generateStringBtn) {
        generateStringBtn.addEventListener('click', function() {
            console.log("Botón 'Generar String Fijo' clickeado");
            
            // Obtener el servicio seleccionado
            const serviceSelect = document.getElementById('idaServiceSelect');
            const serviceNumber = serviceSelect ? serviceSelect.value : null;
            
            if (!serviceNumber) {
                ConfigUtils.showNotification('Seleccione un servicio primero', 'error');
                return;
            }
            
            // Obtener la configuración seleccionada
            const configSelect = document.getElementById('idaConfigSelect');
            const configId = configSelect ? configSelect.value : null;
            
            if (!configId) {
                ConfigUtils.showNotification('Seleccione una configuración primero', 'error');
                return;
            }
            
            // Mostrar notificación de carga
            ConfigUtils.showNotification('Generando string fijo...', 'info');
            
            // Obtener la estructura del servicio y los datos de configuración
            fetch(`/excel/structure-by-service?service_number=${serviceNumber}`)
                .then(response => {
                    if (!response.ok) throw new Error(`Error ${response.status} al buscar estructura`);
                    return response.json();
                })
                .then(structure => {
                    // Con la estructura, obtener los datos de configuración
                    return fetch(`/service-config/get/${configId}`)
                        .then(response => {
                            if (!response.ok) throw new Error('Error al cargar la configuración');
                            return response.json();
                        })
                        .then(configResponse => {
                            // Determinar qué datos mostrar según la estructura de respuesta
                            const configData = configResponse.config || configResponse;
                            
                            // Generar el string fijo
                            try {
                                const fixedString = generarStringFijo(structure, configData);
                                
                                // Mostrar el string generado
                                const outputElement = document.getElementById('fixedStringOutput');
                                if (outputElement) {
                                    outputElement.value = fixedString;
                                    
                                    // Actualizar contador de caracteres
                                    const charCountElement = document.getElementById('charCount');
                                    if (charCountElement) {
                                        charCountElement.textContent = fixedString.length;
                                    }

                                    // Guardar el string y el servicio seleccionado para la pestaña de vuelta
                                    if (typeof window.sessionStorage !== 'undefined') {
                                        window.sessionStorage.setItem('lastGeneratedString', fixedString);
                                        window.sessionStorage.setItem('lastServiceNumber', serviceNumber);
                                    }
                                }
                                
                                ConfigUtils.showNotification('String fijo generado correctamente', 'success');

                                // Crear botones de copia si no existen
                                // 1. Botón para copiar string
                                if (!document.getElementById('copyStringBtn')) {
                                    const copyButton = document.createElement('button');
                                    copyButton.id = 'copyStringBtn';
                                    copyButton.className = 'service-button secondary-btn';
                                    copyButton.textContent = 'Copiar String';
                                    copyButton.style.marginLeft = '10px';
                                    
                                    // Insertar botón después del botón de generar string
                                    if (generateStringBtn.parentNode) {
                                        generateStringBtn.parentNode.insertBefore(copyButton, generateStringBtn.nextSibling);
                                    }
                                    
                                    // Agregar evento de click
                                    copyButton.addEventListener('click', function() {
                                        const textArea = document.getElementById('fixedStringOutput');
                                        if (textArea && textArea.value) {
                                            textArea.select();
                                            document.execCommand('copy');
                                            ConfigUtils.showNotification('String copiado al portapapeles', 'success');
                                        } else {
                                            ConfigUtils.showNotification('No hay string para copiar', 'error');
                                        }
                                    });
                                }
                                
                                // 2. Botón para copiar JSON para SIM
                                if (!document.getElementById('copyJsonForSimBtn')) {
                                    const copyJsonBtn = document.createElement('button');
                                    copyJsonBtn.id = 'copyJsonForSimBtn';
                                    copyJsonBtn.className = 'service-button secondary-btn';
                                    copyJsonBtn.textContent = 'Copiar JSON para SIM';
                                    copyJsonBtn.style.marginLeft = '10px';
                                    
                                    // Insertar botón después del botón de copiar string
                                    const copyStringBtn = document.getElementById('copyStringBtn');
                                    if (copyStringBtn && copyStringBtn.parentNode) {
                                        copyStringBtn.parentNode.insertBefore(copyJsonBtn, copyStringBtn.nextSibling);
                                    } else if (generateStringBtn.parentNode) {
                                        generateStringBtn.parentNode.insertBefore(copyJsonBtn, generateStringBtn.nextSibling);
                                    }
                                    
                                    // Agregar evento de click
                                    copyJsonBtn.addEventListener('click', function() {
                                        // Obtener los datos de configuración actuales
                                        fetch(`/service-config/get/${configId}`)
                                            .then(response => {
                                                if (!response.ok) throw new Error('Error al cargar la configuración');
                                                return response.json();
                                            })
                                            .then(data => {
                                                // Formato específico para SIM (copia exacta del JSON)
                                                const jsonStr = JSON.stringify(data, null, 2);
                                                
                                                // Crear un elemento temporal para copiar
                                                const tempTextarea = document.createElement('textarea');
                                                tempTextarea.value = jsonStr;
                                                document.body.appendChild(tempTextarea);
                                                tempTextarea.select();
                                                document.execCommand('copy');
                                                document.body.removeChild(tempTextarea);
                                                
                                                ConfigUtils.showNotification('JSON para SIM copiado al portapapeles', 'success');
                                            })
                                            .catch(error => {
                                                console.error('Error al copiar JSON para SIM:', error);
                                                ConfigUtils.showNotification(`Error: ${error.message}`, 'error');
                                            });
                                    });
                                }
                            } catch (error) {
                                console.error('Error al generar string fijo:', error);
                                ConfigUtils.showNotification(`Error al generar string fijo: ${error.message}`, 'error');
                            }
                        });
                })
                .catch(error => {
                    console.error('Error:', error);
                    ConfigUtils.showNotification(`Error: ${error.message}`, 'error');
                });
        });
    }
    
    // Botón para procesar servicio de vuelta
    const processVueltaBtn = document.getElementById('processVueltaBtn');
    if (processVueltaBtn) {
        processVueltaBtn.addEventListener('click', function() {
            console.log("Botón 'Procesar Servicio de Vuelta' clickeado");
            
            // Obtener el servicio seleccionado
            const serviceSelect = document.getElementById('vueltaServiceSelect');
            const serviceNumber = serviceSelect ? serviceSelect.value : null;
            
            if (!serviceNumber) {
                ConfigUtils.showNotification('Seleccione un servicio primero', 'error');
                return;
            }
            
            // Obtener el stream de datos (del campo o del último string generado)
            const streamDataInput = document.getElementById('streamData');
            let streamData = streamDataInput ? streamDataInput.value : '';
            
                // Si el campo está vacío, intentar usar el último string generado
                if (!streamData) {
                    const lastGeneratedString = window.sessionStorage.getItem('lastGeneratedString');
                    if (lastGeneratedString) {
                        streamData = lastGeneratedString;
                        // Mostrar el string generado en el campo de entrada
                        if (streamDataInput) {
                            streamDataInput.value = lastGeneratedString;
                        }
                        console.log("Usando el último string generado almacenado", streamData.length);
                    } else {
                        ConfigUtils.showNotification('Ingrese datos de stream para procesar o genere un string en la pestaña de Ida', 'error');
                        return;
                    }
                }
            
            // Actualizar contador de caracteres y ocurrencias antes de procesar
            const streamCharCount = document.getElementById('streamCharCount');
            if (streamCharCount && streamData) {
                // Detectar ocurrencias analizando el string
                let occurrenceCount = 0;
                if (streamData.length > 102 + 2) {
                    const countStr = streamData.substring(102, 104);
                    occurrenceCount = parseInt(countStr) || 0;
                }
                
                // Actualizar contador con caracteres y ocurrencias
                streamCharCount.textContent = `${streamData.length} (${occurrenceCount} ocurrencias)`;
            }
            
            // Mostrar notificación de carga
                ConfigUtils.showNotification('Procesando servicio de vuelta...', 'info');
                
                // Procesar el servicio de vuelta
                fetch('/api/services/vuelta', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        service_number: serviceNumber,
                        stream: streamData
                    })
                })
                .then(async response => {
                    if (!response.ok) {
                        // Intentar obtener el mensaje de error detallado
                        const errorData = await response.json().catch(() => null);
                        if (errorData && errorData.error) {
                            throw new Error(errorData.error);
                        }
                        throw new Error(`Error ${response.status} al procesar servicio`);
                    }
                    return response.json();
                })
                .then(data => {
                // Mostrar el resultado JSON formateado en la sección de resultados
                const resultContainer = document.getElementById('vueltaResult');
                if (resultContainer) {
                    try {
                        // Formateamos el JSON exactamente igual que en la pestaña de ida
                        // Primero asignamos el JSON con indentación como texto
                        const formattedJson = JSON.stringify(data, null, 2);
                        resultContainer.textContent = formattedJson;
                        
                        // Luego aplicamos el formateador que agrega colores y nodos colapsables
                        if (typeof formatJson === 'function') {
                            formatJson(resultContainer);
                            console.log("JSON formateado con el formateador principal (con nodos colapsables)");
                        } else {
                            console.warn("Función formatJson no encontrada - usando texto plano indentado");
                        }
                    } catch (formatError) {
                        console.error("Error al formatear JSON:", formatError);
                        resultContainer.textContent = JSON.stringify(data);
                    }
                }
                
                // NO REEMPLAZAMOS EL STRING DE ENTRADA - Mantenemos el string original que pegó el usuario
                console.log("Manteniendo el string original en el campo de entrada");
                
                // Si acaso se hubiera modificado el string, lo restauramos al original
                const streamDataInput = document.getElementById('streamData');
                if (streamDataInput && streamDataInput.value !== streamData) {
                    streamDataInput.value = streamData;
                    
                    // Actualizar contador para asegurar que muestra el valor correcto
                    const streamCharCount = document.getElementById('streamCharCount');
                    if (streamCharCount) {
                        streamCharCount.textContent = streamData.length;
                    }
                }
                
                // Función para mostrar el string de respuesta en el campo de entrada
                function showResponseString(responseString) {
                    // Mostrar el string de respuesta en el campo de entrada
                    const streamDataInput = document.getElementById('streamData');
                    if (streamDataInput) {
                        streamDataInput.value = responseString;
                        
                        // Actualizar contador de caracteres y ocurrencias
                        const streamCharCount = document.getElementById('streamCharCount');
                        if (streamCharCount) {
                            // Detectar ocurrencias analizando el string
                            let occurrenceCount = 0;
                            if (responseString.length > 102 + 2) {
                                const countStr = responseString.substring(102, 104);
                                occurrenceCount = parseInt(countStr) || 0;
                            }
                            
                            // Actualizar el contador con caracteres y ocurrencias
                            streamCharCount.textContent = `${responseString.length} (${occurrenceCount} ocurrencias)`;
                        }
                        
                        console.log(`String de respuesta cargado (${responseString.length} caracteres)`);
                    }
                }
                
                ConfigUtils.showNotification('Servicio de vuelta procesado correctamente', 'success');
                
                // Resaltar el área de resultados para indicar que se ha actualizado
                const resultSection = document.querySelector('.result-section');
                if (resultSection) {
                    resultSection.style.boxShadow = '0 0 10px rgba(25, 135, 84, 0.5)';
                    setTimeout(() => {
                        resultSection.style.boxShadow = '';
                    }, 2000);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                ConfigUtils.showNotification(`Error: ${error.message}`, 'error');
                
                // Mostrar mensaje de error en el resultado
                const resultContainer = document.getElementById('vueltaResult');
                if (resultContainer) {
                    resultContainer.textContent = `Error al procesar el servicio: ${error.message}`;
                }
            });
        });
    }
    
    // Botón para generar ejemplo de stream
    const generateExampleBtn = document.getElementById('generateExampleBtn');
    if (generateExampleBtn) {
        generateExampleBtn.addEventListener('click', function() {
            console.log("Botón 'Generar Ejemplo' clickeado");
            
            // Obtener el servicio seleccionado
            const serviceSelect = document.getElementById('vueltaServiceSelect');
            const serviceNumber = serviceSelect ? serviceSelect.value : null;
            
            if (!serviceNumber) {
                ConfigUtils.showNotification('Seleccione un servicio primero', 'error');
                return;
            }
            
            // Guardar el servicio seleccionado para la pestaña de ida (para sincronizar)
            if (typeof window.sessionStorage !== 'undefined') {
                window.sessionStorage.setItem('lastServiceNumber', serviceNumber);
            }
            
            // Mostrar notificación de carga y botón en estado de carga
            ConfigUtils.showNotification('Generando stream de ejemplo...', 'info');
            generateExampleBtn.disabled = true;
            generateExampleBtn.innerHTML = '<span class="loading-spinner"></span> Generando...';
            
            // LIMPIAR CUALQUIER EJEMPLO ANTERIOR Y ESTABLECER CAMPO VACÍO
            const streamDataInput = document.getElementById('streamData');
            if (streamDataInput) {
                streamDataInput.value = '';
                
                // Actualizar contador de caracteres a 0
                const streamCharCount = document.getElementById('streamCharCount');
                if (streamCharCount) {
                    streamCharCount.textContent = '0';
                }
            }
            
            // La función ahora es asíncrona y devuelve una promesa
            if (typeof window.generateSimpleExample === 'function') {
                window.generateSimpleExample(serviceNumber)
                    .then(exampleString => {
                        if (streamDataInput && exampleString) {
                            streamDataInput.value = exampleString;
                            
                            // Actualizar contador con caracteres y ocurrencias
                            const totalLength = exampleString.length;
            // Contar exactamente cuántas ocurrencias se han generado
            let occurrenceCount = 0;
            
            // Leer el contador de registros del cuerpo (posición después del header)
            const headerLength = exampleString.length >= 102 ? 102 : 0;
            if (exampleString.length > headerLength + 2) {
                // La posición del contador de registros varía, probar diferentes posiciones
                let foundCounter = false;
                
                // Posiciones habituales donde puede estar el contador
                const possiblePositions = [
                    headerLength, // Justo después del header
                    headerLength + 2, // Después del header y código de estado
                    headerLength + 3  // Otra posición posible
                ];
                
                for (let pos of possiblePositions) {
                    if (pos + 2 <= exampleString.length) {
                        const countStr = exampleString.substring(pos, pos + 2);
                        const parsedCount = parseInt(countStr);
                        
                        if (!isNaN(parsedCount) && parsedCount > 0 && parsedCount < 100) {
                            console.log(`Contador de registros encontrado: "${countStr}" (${parsedCount}) en posición ${pos}`);
                            occurrenceCount = parsedCount;
                            foundCounter = true;
                            break;
                        }
                    }
                }
                
                // Si no se encontró en posiciones habituales, buscar en un rango más amplio
                if (!foundCounter) {
                    for (let pos = headerLength; pos < headerLength + 10; pos++) {
                        if (pos + 2 <= exampleString.length) {
                            const countStr = exampleString.substring(pos, pos + 2);
                            const parsedCount = parseInt(countStr);
                            
                            if (!isNaN(parsedCount) && parsedCount > 0 && parsedCount < 100) {
                                console.log(`Contador de registros encontrado (búsqueda extendida): "${countStr}" (${parsedCount}) en posición ${pos}`);
                                occurrenceCount = parsedCount;
                                break;
                            }
                        }
                    }
                }
                
                // Buscar en generador si hay un valor específico
                if (window.lastGeneratedOccurrenceCount && window.lastGeneratedOccurrenceCount > 0) {
                    console.log(`Usando contador de ocurrencias desde generador: ${window.lastGeneratedOccurrenceCount}`);
                    occurrenceCount = window.lastGeneratedOccurrenceCount;
                }
                
                console.log(`Se detectaron ${occurrenceCount} ocurrencias en el mensaje generado`);
            }
                            
                            const streamCharCount = document.getElementById('streamCharCount');
                            if (streamCharCount) {
                                streamCharCount.textContent = `${totalLength} (${occurrenceCount} ocurrencias)`;
                            }
                            
                            ConfigUtils.showNotification(`Ejemplo generado dinámicamente (${totalLength} caracteres)`, 'success');
                        } else {
                            throw new Error('No se pudo establecer el ejemplo generado');
                        }
                    })
                    .catch(error => {
                        console.error('Error al generar ejemplo:', error);
                        ConfigUtils.showNotification(`Error: ${error.message}`, 'error');
                    })
                    .finally(() => {
                        // Restaurar el botón a su estado original
                        generateExampleBtn.disabled = false;
                        generateExampleBtn.textContent = 'Generar Ejemplo';
                    });
            } else {
                ConfigUtils.showNotification('Función generadora de ejemplos no disponible', 'error');
                generateExampleBtn.disabled = false;
                generateExampleBtn.textContent = 'Generar Ejemplo';
            }
        });
    }
});
