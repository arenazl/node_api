/**
 * IDA Service Handlers
 * 
 * Este módulo gestiona los manejadores específicos para servicios de ida
 * incluyendo la generación de strings fijos y procesamiento de servicios.
 */

// Variable para prevenir cargas consecutivas del mismo servicio
let lastServiceLoaded = {};

// Inicialización y eventos para servicios IDA
function initializeIdaServiceHandlers() {
    // Verificar si los manejadores ya han sido inicializados
    if (window.ServiceInitializationState && window.ServiceInitializationState.isIdaInitialized()) {
        console.log('[Services UI - IDA] Manejadores ya inicializados anteriormente, omitiendo inicialización');
        return;
    }
    
    console.log('[Services UI - IDA] Inicializando manejadores de servicios IDA...');

    try {
        // Obtener referencias a elementos del DOM
        const idaServiceSelect = document.getElementById('idaServiceSelect');
        const idaConfigSelect = document.getElementById('idaConfigSelect');
        const idaJsonInput = document.getElementById('idaJsonInput');
        const fixedStringOutput = document.getElementById('fixedStringOutput');
        const generateStringBtn = document.getElementById('generateStringBtn');
        const processIdaBtn = document.getElementById('processIdaBtn');
        const charCount = document.getElementById('charCount');
        
        // Inicializar conteo de caracteres
        if (fixedStringOutput && charCount) {
            fixedStringOutput.addEventListener('input', function() {
                charCount.textContent = this.value.length;
            });
        }
        
        // Cargar servicios en el select al momento de inicialización
        if (idaServiceSelect) {
            loadServicesInSelect(idaServiceSelect);
            
            // Evento al cambiar el servicio
            idaServiceSelect.addEventListener('change', function() {
                const serviceNumber = this.value;
                
                // Limpiar y resetear elementos
                if (idaJsonInput) {
                    idaJsonInput.textContent = '{}';
                }
                
                if (fixedStringOutput) {
                    fixedStringOutput.value = '';
                    if (charCount) charCount.textContent = '0';
                }
                
                // Cargar configuraciones para este servicio
                if (idaConfigSelect && serviceNumber) {
                    loadConfigsForService(serviceNumber, idaConfigSelect);
                }
            });
        }
        
        // Evento para cargar JSON desde configuración seleccionada
        if (idaConfigSelect && idaJsonInput) {
            idaConfigSelect.addEventListener('change', function() {
                const configId = this.value;
                if (!configId) return;
                
                // Cargar JSON desde la configuración
                loadJsonFromConfig(configId, idaJsonInput);
            });
        }
        
        // Evento para generar string fijo
        if (generateStringBtn) {
            // Remove previous listener to prevent duplication
            generateStringBtn.removeEventListener('click', generateStringClickHandler);
            
            // Define the handler function
            function generateStringClickHandler() {
                console.log('[DEBUG] generateStringClickHandler: Iniciando función...');
                
                const serviceNumber = idaServiceSelect ? idaServiceSelect.value : null;
                console.log('[DEBUG] generateStringClickHandler: serviceNumber =', serviceNumber);
                
                if (!serviceNumber) {
                    console.log('[DEBUG] generateStringClickHandler: No se seleccionó servicio');
                    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                        ConfigUtils.showNotification('Seleccione un servicio primero', 'warning', true);
                    } else {
                        alert('Seleccione un servicio primero');
                    }
                    return;
                }
                
                // Verificar y limpiar el JSON antes de validarlo
                console.log('[DEBUG] generateStringClickHandler: Verificando y limpiando JSON...');
                
                let jsonText = '{}';
                let needsFormatting = false;
                
                if (idaJsonInput) {
                    console.log('[DEBUG] generateStringClickHandler: idaJsonInput existe');
                    console.log('[DEBUG] generateStringClickHandler: idaJsonInput.textContent =', idaJsonInput.textContent);
                    
                    // Detectar cualquier variante de objeto JSON vacío o casi vacío
                    jsonText = idaJsonInput.textContent.trim();
                    console.log('[DEBUG] generateStringClickHandler: jsonText después de trim =', jsonText);
                    
                    if (jsonText === '{ }' || jsonText === '{  }' || /^\{\s*\}$/.test(jsonText)) {
                        console.log('[DEBUG] generateStringClickHandler: Detectado objeto JSON casi vacío');
                        idaJsonInput.textContent = '{}';
                        jsonText = '{}';
                    }
                    
                    // Eliminar espacios en blanco al inicio de las líneas para corregir indentación incorrecta
                    const lines = idaJsonInput.textContent.split('\n');
                    console.log('[DEBUG] generateStringClickHandler: Líneas split =', lines);
                    
                    const formattedLines = lines.map(line => {
                        console.log('[DEBUG] generateStringClickHandler: Procesando línea =', line);
                        return line.trimLeft();
                    }).join('\n');
                    
                    console.log('[DEBUG] generateStringClickHandler: formattedLines =', formattedLines);
                    console.log('[DEBUG] generateStringClickHandler: idaJsonInput.textContent =', idaJsonInput.textContent);
                    
                    if (formattedLines !== idaJsonInput.textContent) {
                        console.log('[DEBUG] generateStringClickHandler: Actualizando contenido con formato corregido');
                        idaJsonInput.textContent = formattedLines;
                        jsonText = formattedLines;
                        needsFormatting = true;
                    }
                } else {
                    console.log('[DEBUG] generateStringClickHandler: idaJsonInput no existe, usando JSON vacío');
                }
                
                // Validar JSON
                console.log('[DEBUG] generateStringClickHandler: Validando JSON...');
                let jsonData;
                try {
                console.log('[DEBUG] generateStringClickHandler: jsonText para parsear =', jsonText);
                    
                    // Si el JSON está completamente vacío o solo contiene espacios en blanco
                    if (!jsonText || jsonText.trim() === '') {
                        console.log('[DEBUG] generateStringClickHandler: JSON vacío detectado, usando objeto vacío');
                        jsonData = {};
                    }
                    // Si es un objeto JSON vacío, asegurarse de que tenga el formato correcto
                    else if (jsonText === '{}' || jsonText === '{ }' || /^\{\s*\}$/.test(jsonText)) {
                        console.log('[DEBUG] generateStringClickHandler: Objeto JSON vacío detectado');
                        jsonData = {};
                    } else {
                        console.log('[DEBUG] generateStringClickHandler: Parseando JSON no vacío');
                        
                        // Limpiar caracteres inválidos en el JSON: específicamente, los "-" después de llaves o corchetes
                        const cleanedJsonText = jsonText
                            .replace(/\{\-/g, '{')  // Reemplazar "{-" por "{"
                            .replace(/\[\-/g, '['); // Reemplazar "[-" por "["
                            
                        console.log('[DEBUG] generateStringClickHandler: JSON limpiado de caracteres inválidos');
                        jsonData = JSON.parse(cleanedJsonText);
                    }
                    
                    console.log('[DEBUG] generateStringClickHandler: JSON parseado con éxito:', jsonData);
                } catch (err) {
                    console.error('[DEBUG] generateStringClickHandler: Error al parsear JSON:', err);
                    console.error('[DEBUG] generateStringClickHandler: Contenido JSON problemático:', jsonText);
                    
                    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                        ConfigUtils.showNotification('JSON inválido: ' + err.message, 'error');
                    } else {
                        alert('JSON inválido: ' + err.message);
                    }
                    return;
                }
                
                // Mostrar loading
                generateStringBtn.disabled = true;
                generateStringBtn.textContent = 'Generando...';
                
                // Generar string fijo
                generateFixedString(serviceNumber, jsonData)
                    .then(fixedString => {
                        if (fixedStringOutput) {
                            fixedStringOutput.value = fixedString;
                            // Trigger evento de cambio para actualizar conteo
                            const event = new Event('input');
                            fixedStringOutput.dispatchEvent(event);
                        }
                        
                        // Mostrar botón de procesar servicio si está disponible
                        if (processIdaBtn) {
                            processIdaBtn.style.display = 'inline-block';
                        }
                    })
                    .catch(error => {
                        console.error('[Services UI - IDA] Error al generar string fijo:', error);
                        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                            ConfigUtils.showNotification('Error: ' + error.message, 'error');
                        } else {
                            alert('Error: ' + error.message);
                        }
                    })
                    .finally(() => {
                        // Restaurar botón
                        generateStringBtn.disabled = false;
                        generateStringBtn.textContent = 'Generar String Fijo';
                    });
            }
            
            // Add the event listener
            generateStringBtn.addEventListener('click', generateStringClickHandler);
            console.log('[Services UI - IDA] Event listener added for Generate String button');
        }
        
        // Evento para procesar servicio de ida
        if (processIdaBtn) {
            // Remove previous listener to prevent duplication
            processIdaBtn.removeEventListener('click', processIdaHandler);
            
            // Define the handler function
            function processIdaHandler() {
                console.log('[Services UI - IDA] Process Service button clicked');
                const serviceNumber = idaServiceSelect ? idaServiceSelect.value : null;
                const fixedString = fixedStringOutput ? fixedStringOutput.value : null;
                
                if (!serviceNumber || !fixedString) {
                    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                        ConfigUtils.showNotification('Se requiere un servicio y un string fijo', 'warning');
                    } else {
                        alert('Se requiere un servicio y un string fijo');
                    }
                    return;
                }
                
                // Mostrar loading
                processIdaBtn.disabled = true;
                processIdaBtn.textContent = 'Procesando...';
                
                // Procesar servicio de ida
                processIdaService(serviceNumber, fixedString)
                    .then(result => {
                        // Mostrar resultado
                        displayIdaResult(result);
                    })
                    .catch(error => {
                        console.error('[Services UI - IDA] Error al procesar servicio:', error);
                        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                            ConfigUtils.showNotification('Error: ' + error.message, 'error');
                        } else {
                            alert('Error: ' + error.message);
                        }
                    })
                    .finally(() => {
                        // Restaurar botón
                        processIdaBtn.disabled = false;
                        processIdaBtn.textContent = 'Procesar Servicio de Ida';
                    });
            }
            
            // Add the event listener
            processIdaBtn.addEventListener('click', processIdaHandler);
            console.log('[Services UI - IDA] Event listener added for Process Service button');
        }
        
        console.log('[Services UI - IDA] Manejadores de servicios IDA inicializados correctamente');
        
        // Marcar como inicializado
        if (window.ServiceInitializationState) {
            window.ServiceInitializationState.setIdaInitialized();
        }
    } catch (error) {
        console.error('[Services UI - IDA] Error al inicializar manejadores:', error);
    }
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
                console.error('[Services UI - IDA] Error al cargar servicios:', error);
            });
    }
}

/**
 * Carga las configuraciones disponibles para un servicio
 * @param {string} serviceNumber - Número de servicio
 * @param {HTMLSelectElement} selectElement - El elemento select donde cargar las configuraciones
 */
function loadConfigsForService(serviceNumber, selectElement) {
    console.log(`[Services UI - IDA] Cargando configuraciones para servicio ${serviceNumber}...`);
    
    // Evitar cargas dobles en un período corto
    const now = Date.now();
    const lastCall = lastServiceLoaded[serviceNumber] || 0;
    if (now - lastCall < 500) { // 500ms debounce
        console.log(`[Services UI - IDA] Evitando llamada duplicada a loadConfigsForService para ${serviceNumber}`);
        return;
    }
    lastServiceLoaded[serviceNumber] = now;
    
    if (!selectElement) {
        console.error(`[Services UI - IDA] El elemento select no existe`);
        return;
    }
    
    if (!serviceNumber) {
        console.error(`[Services UI - IDA] No se proporcionó número de servicio`);
        return;
    }
    
    // Verificar si ConfigStorageManager está disponible
    if (typeof ConfigStorageManager === 'undefined') {
        console.error(`[Services UI - IDA] ConfigStorageManager no está disponible para cargar configuraciones`);
        
        // Verificar qué otros componentes de configuración están disponibles
        console.debug('ConfigUtils disponible:', typeof ConfigUtils !== 'undefined');
        console.debug('ConfigManager disponible:', typeof ConfigManager !== 'undefined');
        
        // Mostrar error en UI
        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
            ConfigUtils.showNotification('Error: Componente de configuración no disponible', 'error');
        }
        return;
    }
    
    console.log(`[Services UI - IDA] Usando ConfigStorageManager para cargar configuraciones de ${serviceNumber}`);
    
    // Limpiar TODAS las opciones y añadir sólo la opción por defecto
    // Asegurándonos de que no queden elementos anteriores
    selectElement.innerHTML = '';
    
    // Crear la opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "-- Seleccione una configuración --";
    defaultOption.selected = true;
    defaultOption.disabled = true;
    selectElement.appendChild(defaultOption);
    
    try {
        // Forzar recarga de configuraciones desde el servidor
        ConfigStorageManager.loadSavedConfigurations(serviceNumber, (configs) => {
            console.log(`[Services UI - IDA] Configuraciones cargadas para ${serviceNumber}:`, configs);
            
            if (!configs || configs.length === 0) {
                console.log(`[Services UI - IDA] No hay configuraciones para el servicio ${serviceNumber}`);
                
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
            
            console.log(`[Services UI - IDA] ${uniqueConfigs.length} configuraciones únicas añadidas al select`);
        }, true); // Agregar true para forzar recarga desde el servidor
    } catch (error) {
        console.error(`[Services UI - IDA] Error al cargar configuraciones:`, error);
        
        // Mostrar error en UI
        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
            ConfigUtils.showNotification(`Error al cargar configuraciones: ${error.message}`, 'error');
        }
    }
}

/**
 * Carga el JSON desde una configuración seleccionada
 * @param {string} configId - ID de la configuración
 * @param {HTMLElement} jsonInputElement - Elemento donde mostrar el JSON
 */
function loadJsonFromConfig(configId, jsonInputElement) {
    if (!jsonInputElement || !configId) return;
    
    // Usar el módulo ConfigStorageManager para obtener la configuración
    if (typeof ConfigStorageManager !== 'undefined') {
        ConfigStorageManager.loadSavedConfiguration(configId, (config, error) => {
            if (error) {
                console.error(`[Services UI - IDA] Error al cargar configuración ${configId}:`, error);
                return;
            }
            
            if (!config) {
                console.error(`[Services UI - IDA] No se encontró la configuración ${configId}`);
                return;
            }
            
            try {
                // Construir objeto JSON con los valores de la configuración
                const jsonData = {
                    // Crear una estructura separada para header
                    header: {}
                };
                
                // Incluir valores de la cabecera (header) si están disponibles
                if (config.header) {
                    Object.keys(config.header).forEach(key => {
                        const headerValue = config.header[key];
                        if (headerValue !== undefined && headerValue !== null) {
                            // Colocar los valores de la cabecera dentro del objeto header
                            jsonData.header[key] = headerValue;
                        }
                    });
                }
                
                // Agregar campos esenciales al header si no existen
                if (!jsonData.header.serviceNumber && config.serviceNumber) {
                    jsonData.header.serviceNumber = config.serviceNumber;
                }
                if (!jsonData.header.canal && config.canal) {
                    jsonData.header.canal = config.canal;
                }
                
                // Si request es un objeto, agregarlo directamente como campo body
                if (config.request && typeof config.request === 'object') {
                    jsonData.body = {};
                    
                    // Si request es un array de objetos con propiedades name y value
                    if (Array.isArray(config.request)) {
                        config.request.forEach(field => {
                            if (field && field.name && field.value !== undefined) {
                                jsonData.body[field.name] = field.value;
                            }
                        });
                    } 
                    // Si request es un objeto directo con pares clave-valor
                    else {
                        Object.keys(config.request).forEach(key => {
                            const value = config.request[key];
                            if (value !== undefined && value !== null) {
                                jsonData.body[key] = value;
                            }
                        });
                    }
                }
                
                // Mostrar JSON en el editor
                if (Object.keys(jsonData).length > 0) {
                    jsonInputElement.textContent = JSON.stringify(jsonData, null, 2);
                } else {
                    jsonInputElement.textContent = '{}';
                }
                
                // Si hay una función de formato disponible, usarla
                if (typeof window.formatJsonElement === 'function') {
                    window.formatJsonElement(jsonInputElement);
                }
            } catch (err) {
                console.error(`[Services UI - IDA] Error al procesar la configuración:`, err);
                jsonInputElement.textContent = '{}';
                
                if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                    ConfigUtils.showNotification('Error al procesar configuración: ' + err.message, 'error');
                }
            }
        });
    } else {
        console.error(`[Services UI - IDA] ConfigStorageManager no está disponible para cargar configuraciones`);
    }
}

/**
 * Genera un string fijo a partir de un JSON para un servicio
 * @param {string} serviceNumber - Número de servicio
 * @param {Object} jsonData - Datos JSON para generar el string
 * @returns {Promise<string>} - Promesa que resuelve con el string fijo generado
 */
function generateFixedString(serviceNumber, jsonData) {
    console.log('[DEBUG] generateFixedString: Iniciando generación con serviceNumber =', serviceNumber);
    console.log('[DEBUG] generateFixedString: jsonData =', JSON.stringify(jsonData));
    
    return new Promise((resolve, reject) => {
        if (!serviceNumber) {
            console.error('[DEBUG] generateFixedString: No se proporcionó número de servicio');
            reject(new Error('Se requiere un número de servicio'));
            return;
        }
        
        // Construir objeto header
        console.log('[DEBUG] generateFixedString: Construyendo objeto header...');
        const header = {
            serviceNumber: serviceNumber,
            canal: 'WEB' // Valor por defecto
        };
        
        // Si tenemos el ConfigUtils, obtener el canal desde la configuración
        if (typeof ConfigUtils !== 'undefined') {
            console.log('[DEBUG] generateFixedString: ConfigUtils está disponible');
            
            if (typeof ConfigUtils.getCanal === 'function') {
                console.log('[DEBUG] generateFixedString: Obteniendo canal desde ConfigUtils.getCanal()');
                const canal = ConfigUtils.getCanal();
                console.log('[DEBUG] generateFixedString: Canal obtenido =', canal);
                header.canal = canal || 'WEB';
            } else {
                console.log('[DEBUG] generateFixedString: ConfigUtils.getCanal no es una función');
            }
        } else {
            console.log('[DEBUG] generateFixedString: ConfigUtils no está disponible, usando canal por defecto');
        }
        
        // Si el JSON tiene una estructura con header, usarla
        if (jsonData && jsonData.header) {
            console.log('[DEBUG] generateFixedString: Fusionando datos de header desde jsonData');
            console.log('[DEBUG] generateFixedString: jsonData.header =', JSON.stringify(jsonData.header));
            Object.assign(header, jsonData.header);
        }
        
        // Extraer datos del cuerpo
        console.log('[DEBUG] generateFixedString: Extrayendo datos del cuerpo...');
        const bodyData = jsonData && jsonData.body ? jsonData.body : jsonData;
        
        console.log('[DEBUG] generateFixedString: Header final =', JSON.stringify(header));
        console.log('[DEBUG] generateFixedString: Body final =', JSON.stringify(bodyData));
        
        // Verificar si el cliente API está disponible
        if (typeof ServiceApiClient === 'undefined') {
            console.error('[DEBUG] generateFixedString: ServiceApiClient no está disponible');
            reject(new Error('Cliente API no disponible'));
            return;
        }
        
        console.log('[DEBUG] generateFixedString: ServiceApiClient está disponible, procediendo...');
        
        // Enviar el mensaje para generar el string fijo usando la estructura del servicio
        console.log('[DEBUG] generateFixedString: Llamando a ServiceApiClient.sendMessage...');
        ServiceApiClient.sendMessage(header, bodyData)
            .then(response => {
                console.log('[DEBUG] generateFixedString: Respuesta del servidor:', JSON.stringify(response));
                
                // Verificar si la respuesta contiene un string fijo válido
                if (response && response.response && response.response.trim() !== '') {
                    console.log('[DEBUG] generateFixedString: String fijo válido generado');
                    console.log('[DEBUG] generateFixedString: Longitud del string =', response.response.length);
                    console.log('[DEBUG] generateFixedString: Primeros 50 caracteres =', response.response.substring(0, 50));
                    resolve(response.response);
                } else {
                    console.error('[DEBUG] generateFixedString: La respuesta no contiene un string válido');
                    throw new Error('El servidor no devolvió un string fijo válido');
                }
            })
            .catch(error => {
                console.error('[DEBUG] generateFixedString: Error al generar string fijo:', error);
                console.error('[DEBUG] generateFixedString: Mensaje de error =', error.message);
                reject(new Error(`No se pudo generar el string fijo: ${error.message || 'Error desconocido'}`));
            });
    });
}

/**
 * Procesa un servicio de ida
 * @param {string} serviceNumber - Número de servicio
 * @param {string} fixedString - String fijo para procesar
 * @returns {Promise<Object>} - Promesa que resuelve con el resultado del procesamiento
 */
function processIdaService(serviceNumber, fixedString) {
    return new Promise((resolve, reject) => {
        if (!serviceNumber || !fixedString) {
            reject(new Error('Se requiere un número de servicio y un string fijo'));
            return;
        }
        
        // TODO: Implementar la lógica para procesar el servicio de ida
        // Esta funcionalidad será implementada en una futura versión
        
        // Por ahora, simular un proceso exitoso
        setTimeout(() => {
            resolve({
                success: true,
                message: 'Servicio procesado correctamente',
                timestamp: new Date().toISOString()
            });
        }, 1000);
    });
}

/**
 * Muestra el resultado del procesamiento del servicio de ida
 * @param {Object} result - Resultado del procesamiento
 */
function displayIdaResult(result) {
    const resultElement = document.getElementById('idaResult');
    const resultSection = document.querySelector('#idaService .result-section');
    
    if (!resultElement || !resultSection) return;
    
    // Mostrar la sección de resultado
    resultSection.style.display = 'block';
    
    // Mostrar el resultado como JSON
    resultElement.textContent = JSON.stringify(result, null, 2);
    
    // Si hay una función de formato disponible, usarla
    if (typeof window.formatJsonElement === 'function') {
        window.formatJsonElement(resultElement);
    } else {
        console.warn('[Services UI - IDA] formatJsonElement no está disponible');
    }
    
    // Disparar evento para notificar que se ha procesado datos de ida
    // Esto permite que otros componentes reaccionen si es necesario
    const event = new CustomEvent('ida-data-processed', { 
        detail: { result, container: resultElement }
    });
    document.dispatchEvent(event);
}
