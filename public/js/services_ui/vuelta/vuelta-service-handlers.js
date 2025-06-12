/**
 * VUELTA Service Handlers
 * 
 * Este módulo gestiona los manejadores específicos para servicios de vuelta,
 * incluyendo el procesamiento de streams de datos y la visualización de resultados.
 */

// Inicialización y eventos para servicios VUELTA
function initializeVueltaServiceHandlers() {
    // Verificar si los manejadores ya han sido inicializados
    if (window.ServiceInitializationState && window.ServiceInitializationState.isVueltaInitialized()) {
        console.log('[Services UI - VUELTA] Manejadores ya inicializados anteriormente, omitiendo inicialización');
        return;
    }
    
    console.log('[Services UI - VUELTA] Inicializando manejadores de servicios VUELTA...');

    try {
        // Obtener referencias a elementos del DOM
        const vueltaServiceSelect = document.getElementById('vueltaServiceSelect');
        const vueltaConfigSelect = document.getElementById('vueltaConfigSelect');  // Agregado si existe
        const streamData = document.getElementById('streamData');
        const processVueltaBtn = document.getElementById('processVueltaBtn');
        const generateExampleBtn = document.getElementById('generateExampleBtn');
        const streamCharCount = document.getElementById('streamCharCount');
        
        // Inicializar conteo de caracteres
        if (streamData && streamCharCount) {
            streamData.addEventListener('input', function() {
                streamCharCount.textContent = this.value.length;
            });
        }

        // Cargar servicios en el select al  de inicialización
        if (vueltaServiceSelect) {
            loadServicesInSelect(vueltaServiceSelect);
            
            // Cargar automáticamente las configuraciones para el servicio 3088 predeterminado
            if (vueltaConfigSelect) {
                setTimeout(() => {
                    loadConfigsForService('3088', vueltaConfigSelect);
                }, 500); // Pequeño delay para asegurar que el DOM esté listo
            }
            
            // Evento al cambiar el servicio
            vueltaServiceSelect.addEventListener('change', function() {
                const serviceNumber = this.value;
                
                if (streamData) {
                    streamData.value = '';
                    if (streamCharCount) streamCharCount.textContent = '0';
                }
                
                // Limpiar resultado anterior
                const vueltaResult = document.getElementById('vueltaResult');
                if (vueltaResult) {
                    vueltaResult.textContent = 'La respuesta se mostrará aquí';
                    // Aplicar formato de texto plano para evitar error de JSON
                    if (typeof formatJsonElement === 'function') {
                        setTimeout(() => formatJsonElement(vueltaResult), 0);
                    }
                }
                
                // Cargar configuraciones para este servicio si existe el selector
                if (vueltaConfigSelect && serviceNumber) {
                    loadConfigsForService(serviceNumber, vueltaConfigSelect);
                }
            });
        }
        
        // Evento para cargar datos desde configuración seleccionada (si existe)
        if (vueltaConfigSelect && streamData) {
            vueltaConfigSelect.addEventListener('change', function() {
                const configId = this.value;
                if (!configId) return;
                
                // Cargar datos desde la configuración
                loadDataFromConfig(configId, streamData);
            });
        }

        // Evento para procesar servicio de vuelta
        if (processVueltaBtn) {
            // Remove previous listener to prevent duplication
            processVueltaBtn.removeEventListener('click', processVueltaHandler);
            
            // Define the handler function
            function processVueltaHandler() {
                console.log('[Services UI - VUELTA] Process Service button clicked');
                const serviceNumber = vueltaServiceSelect ? vueltaServiceSelect.value : null;
                const data = streamData ? streamData.value : null;
                
                if (!serviceNumber) {
                    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                        ConfigUtils.showNotification('Seleccione un servicio primero', 'warning', true);
                    } else {
                        alert('Seleccione un servicio primero');
                    }
                    return;
                }
                
                if (!data) {
                    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                        ConfigUtils.showNotification('Ingrese datos para procesar', 'warning');
                    } else {
                        alert('Ingrese datos para procesar');
                    }
                    return;
                }
                
                // Mostrar loading
                processVueltaBtn.disabled = true;
                processVueltaBtn.textContent = 'Procesando...';
                
                // Procesar servicio de vuelta
                processVueltaService(serviceNumber, data)
                    .then(result => {
                        // Mostrar resultado
                        displayVueltaResult(result);
                    })
                    .catch(error => {
                        console.error('[Services UI - VUELTA] Error al procesar servicio:', error);
                        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                            ConfigUtils.showNotification('Error: ' + error.message, 'error');
                        } else {
                            alert('Error: ' + error.message);
                        }
                        
                        // Mostrar error en el resultado
                        const vueltaResult = document.getElementById('vueltaResult');
                        if (vueltaResult) {
                            vueltaResult.textContent = 'Error: ' + error.message;
                        }
                    })
                    .finally(() => {
                        // Restaurar botón
                        processVueltaBtn.disabled = false;
                        processVueltaBtn.textContent = 'Procesar Servicio de Vuelta';
                    });
            }
            
            // Add the event listener
            processVueltaBtn.addEventListener('click', processVueltaHandler);
            console.log('[Services UI - VUELTA] Event listener added for Process Service button');
        }

        // Evento para generar ejemplo
        if (generateExampleBtn && typeof window.generateSimpleExample === 'function') {
            // Remove previous listener to prevent duplication
            generateExampleBtn.removeEventListener('click', generateExampleHandler);
            
            // Define the handler function
            function generateExampleHandler() {
                console.log('[Services UI - VUELTA] Generate Example button clicked');
                const serviceNumber = vueltaServiceSelect ? vueltaServiceSelect.value : null;
                if (!serviceNumber) {
                    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                        ConfigUtils.showNotification('Seleccione un servicio primero', 'warning');
                    } else {
                        alert('Seleccione un servicio primero');
                    }
                    return;
                }
                
                // Mostrar loading
                generateExampleBtn.disabled = true;
                generateExampleBtn.textContent = 'Generando...';
                
                // Generar ejemplo
                window.generateSimpleExample(serviceNumber)
                    .then(example => {
                        if (streamData) {
                            streamData.value = example;
                            // Trigger evento de cambio para actualizar conteo
                            const event = new Event('input');
                            streamData.dispatchEvent(event);
                        }
                    })
                    .catch(error => {
                        console.error('[Services UI - VUELTA] Error al generar ejemplo:', error);
                        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                            ConfigUtils.showNotification('Error: ' + error.message, 'error');
                        } else {
                            alert('Error: ' + error.message);
                        }
                    })
                    .finally(() => {
                        // Restaurar botón
                        generateExampleBtn.disabled = false;
                        generateExampleBtn.textContent = 'Generar Ejemplo';
                    });
            }
            
            // Add the event listener
            generateExampleBtn.addEventListener('click', generateExampleHandler);
            console.log('[Services UI - VUELTA] Event listener added for Generate Example button');
        }
        
        // Get reference to the copy result button
        const copyVueltaResultBtn = document.getElementById('copyVueltaResultBtn');
        const vueltaResultElement = document.getElementById('vueltaResult');

        // Event for copying result string to clipboard
        if (copyVueltaResultBtn && vueltaResultElement) {
             // Remove previous listener to prevent duplication (if any)
            copyVueltaResultBtn.removeEventListener('click', copyVueltaResultHandler);

            // Define the handler function
            function copyVueltaResultHandler() {
                console.log('[DEBUG] copyVueltaResultHandler: Iniciando función...');
                const textToCopy = vueltaResultElement.textContent;

                if (!textToCopy || textToCopy.trim() === '' || textToCopy.trim() === 'La respuesta se mostrará aquí') {
                    console.log('[DEBUG] copyVueltaResultHandler: No hay resultado para copiar.');
                     if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                        ConfigUtils.showNotification('No hay resultado para copiar', 'warning');
                    } else {
                        alert('No hay resultado para copiar');
                    }
                    return;
                }

                // Use the Clipboard API to copy text
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        console.log('[DEBUG] copyVueltaResultHandler: Resultado copiado al portapapeles.');
                        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                            ConfigUtils.showNotification('Resultado copiado al portapapeles', 'success');
                        } else {
                            alert('Resultado copiado al portapapeles');
                        }
                    })
                    .catch(err => {
                        console.error('[DEBUG] copyVueltaResultHandler: Error al copiar resultado:', err);
                         if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                            ConfigUtils.showNotification('Error al copiar resultado: ' + err.message, 'error');
                        } else {
                            alert('Error al copiar resultado: ' + err.message);
                        }
                    });
            }

            // Add the event listener
            copyVueltaResultBtn.addEventListener('click', copyVueltaResultHandler);
            console.log('[Services UI - VUELTA] Event listener added for Copy Result button');
        }

        console.log('[Services UI - VUELTA] Manejadores de servicios VUELTA inicializados correctamente');
        
        // Marcar como inicializado
        if (window.ServiceInitializationState) {
            window.ServiceInitializationState.setVueltaInitialized();
        }

        // Escuchar evento de actualización de lista de configuraciones
        if (window.EventBus && window.AppEvents && window.AppEvents.CONFIG_LIST_CHANGED) {
            window.EventBus.subscribe(window.AppEvents.CONFIG_LIST_CHANGED, (eventData) => {
                console.log('[Services UI - VUELTA] Evento CONFIG_LIST_CHANGED recibido.', eventData);
                const currentServiceInVueltaTab = vueltaServiceSelect ? vueltaServiceSelect.value : null;
                if (currentServiceInVueltaTab && vueltaConfigSelect) {
                    console.log(`[Services UI - VUELTA] Recargando configuraciones para el servicio ${currentServiceInVueltaTab} en la pestaña VUELTA.`);
                    loadConfigsForService(currentServiceInVueltaTab, vueltaConfigSelect);
                }
            });
        }

    } catch (error) {
        console.error('[Services UI - VUELTA] Error al inicializar manejadores:', error);
    }
}

/**
 * Muestra la estructura completa del mensaje con el string de respuesta
 */
function mostrarEstructuraCompletaMensaje() {
    // Obtener valores necesarios
    const vueltaServiceSelect = document.getElementById('vueltaServiceSelect');
    const vueltaConfigSelect = document.getElementById('vueltaConfigSelect');
    const streamDataElement = document.getElementById('streamData');
    
    if (!vueltaServiceSelect || !streamDataElement) return;
    
    const serviceNumber = vueltaServiceSelect.value;
    const responseString = streamDataElement.value;
    
    // Obtener canal desde la configuración seleccionada
    let canal = 'XX'; // Valor por defecto
    if (vueltaConfigSelect && vueltaConfigSelect.selectedOptions[0]) {
        const selectedOption = vueltaConfigSelect.selectedOptions[0];
        canal = selectedOption.dataset.canal || canal;
    }
    
    // Buscar o crear contenedor para la estructura completa
    let messageContainer = document.getElementById('message-structure-container');
    if (!messageContainer) {
        // Crear el contenedor después del resultado
        const resultSection = document.querySelector('.result-section');
        if (resultSection) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'message-structure-container';
            messageContainer.style.cssText = 'margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background-color: #f9fafb;';
            messageContainer.innerHTML = `
                <h4 style="margin-bottom: 15px; color: #1f2937; font-weight: 600;">Estructura Completa del Mensaje</h4>
                <div class="json-input-container auto-hide-scrollbar" style="margin-bottom: 10px;">
                    <pre id="message-json-editor" class="json-editor" style="min-height: 150px; max-height: 300px; overflow: auto;"></pre>
                </div>
                <button id="copy-message-json" class="action-btn secondary-btn" style="width: 100%;">
                    Copiar JSON
                </button>
            `;
            resultSection.appendChild(messageContainer);
        }
    }
    
    // Crear estructura del mensaje
    const messageStructure = {
        serviceNumber: serviceNumber,
        canal: canal,
        soapResponseString: responseString  // Mantener el nombre del campo como en el documento original
    };
    
    // Mostrar en el editor
    const messageEditor = document.getElementById('message-json-editor');
    if (messageEditor) {
        const jsonString = JSON.stringify(messageStructure, null, 2);
        messageEditor.textContent = jsonString;
        
        // Aplicar formato JSON si está disponible
        if (typeof window.formatJsonElement === 'function') {
            try {
                window.formatJsonElement(messageEditor);
            } catch (e) {
                console.error('[Services UI - VUELTA] Error al formatear JSON:', e);
            }
        }
    }
    
    // Configurar botón de copiar
    const copyBtn = document.getElementById('copy-message-json');
    if (copyBtn) {
        // Remover listener anterior si existe
        const newCopyBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
        
        newCopyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(JSON.stringify(messageStructure, null, 2))
                .then(() => {
                    // Cambiar texto del botón temporalmente
                    const originalText = newCopyBtn.textContent;
                    newCopyBtn.textContent = '¡Copiado!';
                    newCopyBtn.style.backgroundColor = '#10b981';
                    
                    setTimeout(() => {
                        newCopyBtn.textContent = originalText;
                        newCopyBtn.style.backgroundColor = '';
                    }, 2000);
                    
                    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                        ConfigUtils.showNotification('JSON copiado al portapapeles', 'success');
                    }
                })
                .catch(err => {
                    console.error('[Services UI - VUELTA] Error al copiar JSON:', err);
                    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                        ConfigUtils.showNotification('Error al copiar: ' + err.message, 'error');
                    }
                });
        });
    }
    
    // Hacer visible el contenedor
    messageContainer.style.display = 'block';
}

/**
 * Carga la lista de servicios en un select
 * @param {HTMLSelectElement} selectElement - El elemento select donde cargar los servicios
 */
function loadServicesInSelect(selectElement) {
    if (!selectElement) return;
    
    // Usar el cliente de API para obtener los servicios
    if (typeof ServiceApiClient !== 'undefined') {
        ServiceApiClient.getServices()
            .then(services => {
                // Limpiar opciones existentes excepto la primera
                while (selectElement.options.length > 1) {
                    selectElement.remove(1);
                }
                
                // Agregar servicios al select
                services.forEach(service => {
                    const option = document.createElement('option');
                    option.value = service.service_number;
                    option.textContent = `${service.service_number} - ${service.service_name}`;
                    selectElement.appendChild(option);
                });
            })
            .catch(error => {
                console.error('[Services UI - VUELTA] Error al cargar servicios:', error);
            });
    }
}

/**
 * Carga las configuraciones disponibles para un servicio
 * @param {string} serviceNumber - Número de servicio
 * @param {HTMLSelectElement} selectElement - El elemento select donde cargar las configuraciones
 */
function loadConfigsForService(serviceNumber, selectElement) {
    console.log(`[Services UI - VUELTA] Cargando configuraciones para servicio ${serviceNumber}...`);
    
    if (!selectElement) {
        console.error(`[Services UI - VUELTA] El elemento select no existe`);
        return;
    }
    
    if (!serviceNumber) {
        console.error(`[Services UI - VUELTA] No se proporcionó número de servicio`);
        return;
    }
    
    // Verificar si ConfigStorageManager está disponible
    if (typeof ConfigStorageManager === 'undefined') {
        console.error(`[Services UI - VUELTA] ConfigStorageManager no está disponible para cargar configuraciones`);
        
        // Verificar qué otros componentes de configuración están disponibles
        console.debug('ConfigUtils disponible:', typeof ConfigUtils !== 'undefined');
        console.debug('ConfigManager disponible:', typeof ConfigManager !== 'undefined');
        
        // Mostrar error en UI
        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
            ConfigUtils.showNotification('Error: Componente de configuración no disponible', 'error');
        }
        return;
    }
    
    console.log(`[Services UI - VUELTA] Usando ConfigStorageManager para cargar configuraciones de ${serviceNumber}`);
    
    // Limpiar TODAS las opciones y añadir sólo la opción por defecto
    selectElement.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "-- Seleccione una configuración --";
    defaultOption.selected = true;
    defaultOption.disabled = true;
    selectElement.appendChild(defaultOption);
    
    try {
        // Forzar recarga de configuraciones desde el servidor
        ConfigStorageManager.loadSavedConfigurations(serviceNumber, (configs) => {
            console.log(`[Services UI - VUELTA] Configuraciones cargadas para ${serviceNumber}:`, configs);
            
            if (!configs || configs.length === 0) {
                console.log(`[Services UI - VUELTA] No hay configuraciones para el servicio ${serviceNumber}`);
                
                // Modificar la opción por defecto en lugar de añadir otra
                selectElement.innerHTML = ''; // Limpiar todas las opciones
                const noConfigOption = document.createElement('option');
                noConfigOption.value = "";
                noConfigOption.textContent = "-- No hay configuraciones disponibles --";
                noConfigOption.disabled = true;
                noConfigOption.selected = true;
                selectElement.appendChild(noConfigOption);
                return;
            }
            
            // Obtener IDs únicos para evitar duplicados
            const uniqueConfigs = [];
            const configIds = new Set();
            
            configs.forEach(config => {
                // Solo agregar configuración si su ID no está ya incluido
                if (!configIds.has(config.id)) {
                    configIds.add(config.id);
                    uniqueConfigs.push(config);
                }
            });
            
            // Agregar configuraciones al select con información más detallada
            uniqueConfigs.forEach(config => {
                const option = document.createElement('option');
                option.value = config.id;
                
                // Formato más detallado: incluir fecha y hora para diferenciar configuraciones
                let fecha = '';
                if (config.timestamp) {
                    const date = new Date(config.timestamp);
                    fecha = date.toLocaleTimeString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
                
                option.textContent = `${config.canal} - ${config.version || 'v1'} (${fecha})`;
                
                // Guardar datos completos en atributos de datos para referencia
                option.dataset.canal = config.canal;
                option.dataset.version = config.version;
                option.dataset.timestamp = config.timestamp;
                
                selectElement.appendChild(option);
            });
            
            console.log(`[Services UI - VUELTA] ${uniqueConfigs.length} configuraciones únicas añadidas al select`);
        }, true); // Agregar true para forzar recarga desde el servidor
    } catch (error) {
        console.error(`[Services UI - VUELTA] Error al cargar configuraciones:`, error);
        
        // Mostrar error en UI
        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
            ConfigUtils.showNotification(`Error al cargar configuraciones: ${error.message}`, 'error');
        }
    }
}

/**
 * Procesa un servicio de vuelta utilizando el endpoint /receivemessage
 * para procesar strings de datos reales.
 * 
 * @param {string} serviceNumber - Número de servicio
 * @param {string} data - Stream de datos para procesar
 * @returns {Promise<Object>} - Promesa que resuelve con el resultado del procesamiento
 */
function processVueltaService(serviceNumber, data) {
    return new Promise((resolve, reject) => {
        if (!serviceNumber || !data) {
            reject(new Error('Se requiere un número de servicio y datos para procesar'));
            return;
        }
        
        // Construir header y parámetros para la API utilizando el endpoint receivemessage
        // que está diseñado para procesar datos de respuesta reales (strings de vuelta)
        const header = {
            serviceNumber: serviceNumber,
            filterEmptyFields: true  // Para filtrar campos vacíos en la respuesta JSON
        };
        
        const parameters = {
            returnMsg: data  // El mensaje de string de vuelta a procesar
        };
        
        console.log(`[Services UI - VUELTA] Procesando mensaje de ${data.length} caracteres para servicio ${serviceNumber}`);
        
        // Usar el cliente API para procesar el mensaje utilizando el endpoint /receivemessage
        if (typeof ServiceApiClient !== 'undefined') {
            ServiceApiClient.receiveMessage(header, parameters)
                .then(response => {
                    if (response) {
                        console.log(`[Services UI - VUELTA] Mensaje procesado correctamente`);
                        resolve(response);
                    } else {
                        reject(new Error('El servidor devolvió una respuesta vacía'));
                    }
                })
                .catch(error => {
                    console.error('[Services UI - VUELTA] Error al procesar mensaje:', error);
                    reject(error);
                });
        } else {
            reject(new Error('Cliente API no disponible'));
        }
    });
}

/**
 * Carga datos desde una configuración seleccionada para servicios de vuelta
 * @param {string} configId - ID de la configuración
 * @param {HTMLTextAreaElement} streamDataElement - Elemento textarea donde cargar los datos
 */
function loadDataFromConfig(configId, streamDataElement) {
    if (!streamDataElement || !configId) return;
    
    // Usar el módulo ConfigStorageManager para obtener la configuración
    if (typeof ConfigStorageManager !== 'undefined') {
        ConfigStorageManager.loadSavedConfiguration(configId, (config, error) => {
            if (error) {
                console.error(`[Services UI - VUELTA] Error al cargar configuración ${configId}:`, error);
                return;
            }
            
            if (!config) {
                console.error(`[Services UI - VUELTA] No se encontró la configuración ${configId}`);
                return;
            }
            
            try {
                // Intentar usar el texto de ejemplo o generar uno
                if (config.exampleText) {
                    streamDataElement.value = config.exampleText;
                    // Trigger evento para actualizar contador de caracteres
                    streamDataElement.dispatchEvent(new Event('input'));
                } else {
                    // Buscar un ejemplo para este servicio
                    const serviceNumber = config.serviceNumber;
                    if (serviceNumber && typeof window.generateSimpleExample === 'function') {
                        console.log(`[Services UI - VUELTA] Generando ejemplo para ${serviceNumber}`);
                        
                        window.generateSimpleExample(serviceNumber)
                            .then(example => {
                                streamDataElement.value = example;
                                // Trigger evento de cambio para actualizar conteo
                                streamDataElement.dispatchEvent(new Event('input'));
                            })
                            .catch(error => {
                                console.error('[Services UI - VUELTA] Error generando ejemplo:', error);
                                if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                                    ConfigUtils.showNotification('No se pudo generar ejemplo: ' + error.message, 'warning');
                                }
                            });
                    }
                }
            } catch (err) {
                console.error(`[Services UI - VUELTA] Error al procesar la configuración:`, err);
                
                if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                    ConfigUtils.showNotification('Error al procesar configuración: ' + err.message, 'error');
                }
            }
        });
    } else {
        console.error(`[Services UI - VUELTA] ConfigStorageManager no está disponible para cargar configuraciones`);
    }
}

/**
 * Muestra el resultado del procesamiento de un servicio de vuelta
 * @param {Object} result - Resultado del procesamiento
 */
function displayVueltaResult(result) {
    const resultElement = document.getElementById('vueltaResult');
    if (!resultElement) return;

    try {
        // Obtener los datos reales de respuesta (pueden venir en diferentes formatos)
        const responseData = result.response || result.dataVuelta || result;

        // Verificar si la respuesta es válida para evitar errores
        if (!responseData) {
            resultElement.textContent = "No se recibieron datos de respuesta";
            return;
        }

        // --- INICIO: Procesamiento para display (deep copy and remove 'index') ---

        // Recursive function to deep copy and remove 'index' property
        function deepCopyAndRemoveIndex(data) {
            if (typeof data !== 'object' || data === null) {
                return data; // Return primitives directly
            }

            if (Array.isArray(data)) {
                // If it's an array, map and recursively process each item
                return data.map(item => deepCopyAndRemoveIndex(item));
            }

            // If it's an object
            const newObject = {};
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    if (key === 'index' || key === 'randomNumber') { // Check for lowercase 'index' or 'randomNumber'
                        // Skip adding these properties to the new object
                        console.log(`[Services UI - VUELTA] Removing '${key}' field for display.`);
                    } else {
                        newObject[key] = deepCopyAndRemoveIndex(data[key]); // Recurse on other properties
                    }
                }
            }
            return newObject;
        }

        // Create a deep copy and remove the 'index' and 'randomNumber' fields for display
        const dataToDisplay = deepCopyAndRemoveIndex(responseData);

        // --- FIN: Procesamiento para display ---


        // Convertir a JSON limpio
        const cleanJson = JSON.stringify(dataToDisplay, null, 2);

        // Asignar el JSON limpio al elemento
        resultElement.textContent = cleanJson;

        // Aplicar formato JSON de manera segura
        try {
            if (typeof window.formatJsonElement === 'function') {
                window.formatJsonElement(resultElement);
            } else {
                // If formatter is not available, at least keep the text formatted
                resultElement.innerHTML = `<pre class="plain-text-content">${cleanJson}</pre>`;
            }
        } catch (formatError) {
            console.error('[Services UI - VUELTA] Error al formatear JSON:', formatError);
            // In case of error, show the plain JSON
            resultElement.innerHTML = `<pre class="plain-text-content">${cleanJson}</pre>`;
        }

        // Dispatch event to notify that vuelta data has been processed
        // IMPORTANT: Use the original responseData here as per user requirement
        const event = new CustomEvent('vuelta-data-processed', {
            detail: { result: responseData, container: resultElement }
        });
        document.dispatchEvent(event);

        // Mostrar estructura completa del mensaje
        mostrarEstructuraCompletaMensaje();

        // Show extra info in console if available
        if (responseData && responseData.extraInfo) {
            console.log('[Services UI - VUELTA] Información extra:', responseData.extraInfo);
        }

        if (result.stringVuelta) {
            console.log('[Services UI - VUELTA] String de vuelta (longitud):', result.stringVuelta.length);
        }

        // Mostrar notificación de éxito usando string para evitar el error de JSON inválido
        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
            ConfigUtils.showNotification('Servicio procesado correctamente', 'success');
        }
    } catch (error) {
        console.error('[Services UI - VUELTA] Error in displayVueltaResult:', error);
        resultElement.textContent = 'Error displaying result: ' + error.message;

        // Notificar el error
        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
            ConfigUtils.showNotification('Error al procesar resultado: ' + error.message, 'error');
        }
    }
}
