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

        // Manejadores para las nuevas sub-pestañas de entrada de IDA
        const idaInputTabButtons = document.querySelectorAll('.ida-input-tab-btn');
        const idaInputPanes = document.querySelectorAll('.ida-input-pane');
        const generateStringButtonGroup = document.querySelector('#idaService .button-group'); // Botón "Generar String Fijo"
        const fixedStringOutputGroup = document.querySelector('#fixedStringOutput').closest('.form-group'); // Textarea y botón de copiar

        idaInputTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                idaInputTabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                const tabId = button.getAttribute('data-ida-input-tab');
                idaInputPanes.forEach(pane => {
                    if (pane.id === `ida-input-${tabId}-pane`) {
                        pane.style.display = 'block';
                    } else {
                        pane.style.display = 'none';
                    }
                });

                // Mostrar u ocultar la sección de "Generar String Fijo"
                if (tabId === 'params') {
                    // Mostrar en "Json Parametros Dinamicos"
                    if (generateStringButtonGroup) generateStringButtonGroup.style.display = 'block';
                    if (fixedStringOutputGroup) fixedStringOutputGroup.style.display = 'block';
                } else { // 'json' (Json Completo)
                    // Ocultar en "Json Completo"
                    if (generateStringButtonGroup) generateStringButtonGroup.style.display = 'none';
                    if (fixedStringOutputGroup) fixedStringOutputGroup.style.display = 'none';
                }
            });
        });
        
        // Inicializar conteo de caracteres
        if (fixedStringOutput && charCount) {
            // Almacenar la longitud real del string
            fixedStringOutput.realStringLength = 0;
            
            fixedStringOutput.addEventListener('input', function(event) {
                // Si tenemos la longitud real almacenada, usar esa
                // De lo contrario, usar la longitud del valor (que puede tener espacios recortados)
                if (this.realStringLength && this.realStringLength > 0) {
                    charCount.textContent = this.realStringLength;
                } else {
                    charCount.textContent = this.value.length;
                }
            });
        }
        
        // Cargar servicios en el select al momento de inicialización
        if (idaServiceSelect) {
            loadServicesInSelect(idaServiceSelect);
            
            // Evento al cambiar el servicio
            idaServiceSelect.addEventListener('change', function() {
                const serviceNumber = this.value;
                const detailedParamsView = document.getElementById('idaDetailedParamsView');

                // Limpiar y resetear elementos
                if (idaJsonInput) {
                    idaJsonInput.textContent = '{}';
                     if (typeof window.formatJsonElement === 'function') {
                        setTimeout(() => window.formatJsonElement(idaJsonInput, true), 0); // Forzar formato
                    }
                }
                if (detailedParamsView) {
                    detailedParamsView.innerHTML = '<p>Seleccione una configuración para ver los parámetros detallados.</p>';
                }


                if (fixedStringOutput) {
                    fixedStringOutput.value = '';
                    fixedStringOutput.realStringLength = 0; // Resetear la longitud real
                    if (charCount) charCount.textContent = '0';
                }

                if (!serviceNumber) {
                    console.log('[Services UI - IDA] No service selected, clearing structure and configs.');
                    if (typeof ConfigServiceLoader !== 'undefined') {
                        ConfigServiceLoader.currentStructure = null;
                    }
                    if (idaConfigSelect) {
                         idaConfigSelect.innerHTML = '<option value="">-- Seleccione una configuración --</option>';
                    }
                    if (detailedParamsView) {
                        detailedParamsView.innerHTML = '<p>Seleccione un servicio y luego una configuración.</p>';
                    }
                    return;
                }

                console.log(`[Services UI - IDA] Service selected: ${serviceNumber}. Loading structure...`);

                if (typeof ConfigServiceLoader !== 'undefined') {
                    ConfigServiceLoader.loadServiceStructure(
                        serviceNumber,
                        (structure) => {
                            console.log('[Services UI - IDA] Service structure loaded successfully.', structure);
                            if (idaConfigSelect) {
                                loadConfigsForService(serviceNumber, idaConfigSelect);
                            }
                            if (detailedParamsView) {
                                detailedParamsView.innerHTML = '<p>Seleccione una configuración para ver los parámetros detallados.</p>';
                            }
                            // Sincronizar con el select de VUELTA
                            const vueltaServiceSelect = document.getElementById('vueltaServiceSelect');
                            if (vueltaServiceSelect) {
                                vueltaServiceSelect.value = serviceNumber;
                                // Disparar el evento change para que se actualicen configs y UI de vuelta
                                const event = new Event('change');
                                vueltaServiceSelect.dispatchEvent(event);
                            }
                        },
                        (errorMessage) => {
                            console.error('[Services UI - IDA] Error loading service structure:', errorMessage);
                            if (idaConfigSelect) {
                                idaConfigSelect.innerHTML = '<option value="">-- Error al cargar configuraciones --</option>';
                            }
                            if (detailedParamsView) {
                                detailedParamsView.innerHTML = '<p>Error al cargar la estructura del servicio.</p>';
                            }
                        }
                    );
                } else {
                    console.error('[Services UI - IDA] ConfigServiceLoader is not available.');
                    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                        ConfigUtils.showNotification('Error interno: ConfigServiceLoader no disponible.', 'error');
                    }
                    if (idaConfigSelect) {
                         idaConfigSelect.innerHTML = '<option value="">-- Error interno --</option>';
                    }
                    if (detailedParamsView) {
                        detailedParamsView.innerHTML = '<p>Error interno: ConfigServiceLoader no disponible.</p>';
                    }
                }
            });
        }
        
        if (idaConfigSelect && idaJsonInput) {
            idaConfigSelect.addEventListener('change', function() {
                const configId = this.value;
                const serviceNumber = idaServiceSelect ? idaServiceSelect.value : null; 
                
                const detailedParamsView = document.getElementById('idaDetailedParamsView');
                const idaDynamicParamsInput = document.getElementById('idaDynamicParamsInput');
                
                if (!configId) {
                     if (detailedParamsView) {
                        detailedParamsView.innerHTML = '<p>Seleccione una configuración para ver los parámetros detallados.</p>';
                     }
                     if (idaJsonInput) {
                        idaJsonInput.textContent = '{}';
                        if (typeof window.formatJsonElement === 'function') {
                           setTimeout(() => window.formatJsonElement(idaJsonInput, true), 0); // Forzar formato
                        }
                     }
                     if (idaDynamicParamsInput) {
                        idaDynamicParamsInput.textContent = '{}';
                        if (typeof window.formatJsonElement === 'function') {
                           setTimeout(() => window.formatJsonElement(idaDynamicParamsInput, true), 0); // Forzar formato
                        }
                     }
                    return;
                }
                loadJsonFromConfig(configId, idaJsonInput, serviceNumber);
                loadDynamicParamsFromConfig(configId, idaDynamicParamsInput, serviceNumber);
            });
        }
        
        if (generateStringBtn) {
            generateStringBtn.removeEventListener('click', generateStringClickHandler);
            generateStringBtn.addEventListener('click', generateStringClickHandler);
            console.log('[Services UI - IDA] Event listener added for Generate String button');
        }

        const copyFixedStringBtn = document.getElementById('copyFixedStringBtn');
        if (copyFixedStringBtn && fixedStringOutput) {
            copyFixedStringBtn.removeEventListener('click', copyStringClickHandler);
            copyFixedStringBtn.addEventListener('click', copyStringClickHandler);
            console.log('[Services UI - IDA] Event listener added for Copy String button');
        }

        if (processIdaBtn) {
            processIdaBtn.removeEventListener('click', processIdaHandler);
            processIdaBtn.addEventListener('click', processIdaHandler);
            console.log('[Services UI - IDA] Event listener added for Process Service button');
        }

        const copyIdaJsonBtn = document.getElementById('copyIdaJsonBtn');
        const idaResultElement = document.getElementById('idaResult');
        if (copyIdaJsonBtn && idaResultElement) {
            copyIdaJsonBtn.removeEventListener('click', copyJsonClickHandler);
            copyIdaJsonBtn.addEventListener('click', copyJsonClickHandler);
            console.log('[Services UI - IDA] Event listener added for Copy JSON button');
        }

        // Agregar event listener para el botón de copiar JSON de parámetros dinámicos
        const copyDetailedParamsJsonBtn = document.getElementById('copyDetailedParamsJsonBtn');
        if (copyDetailedParamsJsonBtn) {
            copyDetailedParamsJsonBtn.removeEventListener('click', copyDetailedParamsJsonClickHandler);
            copyDetailedParamsJsonBtn.addEventListener('click', copyDetailedParamsJsonClickHandler);
            console.log('[Services UI - IDA] Event listener added for Copy Detailed Params JSON button');
        }

        console.log('[Services UI - IDA] Manejadores de servicios IDA inicializados correctamente');

        if (window.ServiceInitializationState) {
            window.ServiceInitializationState.setIdaInitialized();
        }

        if (window.EventBus && window.AppEvents && window.AppEvents.CONFIG_LIST_CHANGED) {
            window.EventBus.subscribe(window.AppEvents.CONFIG_LIST_CHANGED, (eventData) => {
                console.log('[Services UI - IDA] Evento CONFIG_LIST_CHANGED recibido.', eventData);
                const currentServiceInIdaTab = idaServiceSelect ? idaServiceSelect.value : null;
                if (currentServiceInIdaTab && idaConfigSelect) {
                    console.log(`[Services UI - IDA] Recargando configuraciones para el servicio ${currentServiceInIdaTab} en la pestaña IDA.`);
                    loadConfigsForService(currentServiceInIdaTab, idaConfigSelect);
                }
            });
        }

    } catch (error) {
        console.error('[Services UI - IDA] Error al inicializar manejadores:', error);
    }
}

function generateStringClickHandler() {
    const idaServiceSelect = document.getElementById('idaServiceSelect');
    const idaJsonInput = document.getElementById('idaJsonInput');
    const idaDynamicParamsInput = document.getElementById('idaDynamicParamsInput');
    const fixedStringOutput = document.getElementById('fixedStringOutput');
    const generateStringBtn = document.getElementById('generateStringBtn');
    const processIdaBtn = document.getElementById('processIdaBtn');
    const serviceNumber = idaServiceSelect ? idaServiceSelect.value : null;
    
    if (!serviceNumber) {
        if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Seleccione un servicio primero', 'warning', true);
        return;
    }
    
    // Detectar cuál pestaña está activa
    const activeTabBtn = document.querySelector('.ida-input-tab-btn.active');
    const activeTabId = activeTabBtn ? activeTabBtn.getAttribute('data-ida-input-tab') : 'json';
    
    generateStringBtn.disabled = true;
    generateStringBtn.textContent = 'Generando...';
    
    let paramsData;
    
    if (activeTabId === 'params') {
        // Pestaña "Json Parametros Dinamicos" - usar valores editables + settings
        let jsonText = idaDynamicParamsInput ? idaDynamicParamsInput.textContent.trim() : '{}';
        if (jsonText === '{ }' || /^\{\s*\}$/.test(jsonText)) jsonText = '{}';
        
        
        try {
            paramsData = JSON.parse(jsonText === '' ? '{}' : jsonText);
            
            // VALIDAR LONGITUDES DE CAMPOS usando la validación existente
            const validationErrors = validateJsonAgainstConfigInputs(paramsData);
            if (validationErrors.length > 0) {
                showFieldLengthValidationError(validationErrors);
                generateStringBtn.disabled = false;
                generateStringBtn.textContent = 'Generar String Fijo';
                return;
            }
            
        } catch (err) {
            if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('JSON de parámetros dinámicos inválido: ' + err.message, 'error');
            generateStringBtn.disabled = false;
            generateStringBtn.textContent = 'Generar String Fijo';
            return;
        }
    } else {
        // Pestaña "Json Completo" - convertir formato legacy a formato dinámico
        let jsonText = idaJsonInput ? idaJsonInput.textContent.trim() : '{}';
        if (jsonText === '{ }' || /^\{\s*\}$/.test(jsonText)) jsonText = '{}';
        
        let jsonData;
        try {
            // Limpiar caracteres problemáticos del formato JSON
            const cleanedJsonText = jsonText.replace(/\{\-|\{\+/g, '{').replace(/\[\-/g, '[');
            jsonData = JSON.parse(cleanedJsonText === '' ? '{}' : cleanedJsonText);
        } catch (err) {
            if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('JSON inválido: ' + err.message, 'error');
            generateStringBtn.disabled = false;
            generateStringBtn.textContent = 'Generar String Fijo';
            return;
        }
        
        // Convertir formato legacy {header: {}, body: {}} a formato dinámico {header: {}, parameters: {}}
        paramsData = {
            header: jsonData.header || { serviceNumber: serviceNumber, canal: 'PO' },
            parameters: jsonData.body || {}
        };
        
        // VALIDAR LONGITUDES DE CAMPOS antes de enviar
        const validationErrors = validateFieldLengths(paramsData, serviceNumber);
        if (validationErrors.length > 0) {
            showFieldLengthValidationError(validationErrors);
            generateStringBtn.disabled = false;
            generateStringBtn.textContent = 'Generar String Fijo';
            return;
        }
    }
    
    // SIEMPRE usar el backend - eliminar formateo local del frontend
    generateFixedStringWithDynamicParams(serviceNumber, paramsData)
        .then(fixedString => {
            if (fixedStringOutput) {
                // Almacenar la longitud real antes de asignar el valor
                fixedStringOutput.realStringLength = fixedString.length;
                fixedStringOutput.value = fixedString;
                
                // Actualizar el contador con la longitud real del string
                const charCount = document.getElementById('charCount');
                if (charCount) {
                    charCount.textContent = fixedString.length;
                }
            }
            if (processIdaBtn) processIdaBtn.style.display = 'inline-block';
        })
        .catch(error => {
            if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Error: ' + error.message, 'error');
        })
        .finally(() => {
            generateStringBtn.disabled = false;
            generateStringBtn.textContent = 'Generar String Fijo';
        });
}

function copyStringClickHandler() {
    const fixedStringOutput = document.getElementById('fixedStringOutput');
    const textToCopy = fixedStringOutput.value;
    if (!textToCopy) {
        if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('No hay string para copiar', 'warning');
        return;
    }
    navigator.clipboard.writeText(textToCopy)
        .then(() => { if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('String copiado al portapapeles', 'success'); })
        .catch(err => { if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Error al copiar string: ' + err.message, 'error'); });
}

function processIdaHandler() {
    const idaServiceSelect = document.getElementById('idaServiceSelect');
    const fixedStringOutput = document.getElementById('fixedStringOutput');
    const processIdaBtn = document.getElementById('processIdaBtn');
    const serviceNumber = idaServiceSelect ? idaServiceSelect.value : null;
    const fixedString = fixedStringOutput ? fixedStringOutput.value : null;
    if (!serviceNumber || !fixedString) {
        if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Se requiere un servicio y un string fijo', 'warning');
        return;
    }
    processIdaBtn.disabled = true;
    processIdaBtn.textContent = 'Procesando...';
    processIdaService(serviceNumber, fixedString)
        .then(result => displayIdaResult(result))
        .catch(error => { if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Error: ' + error.message, 'error'); })
        .finally(() => {
            processIdaBtn.disabled = false;
            processIdaBtn.textContent = 'Procesar Servicio de Ida';
        });
}

function copyJsonClickHandler() {
    const idaResultElement = document.getElementById('idaResult');
    const textToCopy = idaResultElement.textContent;
    if (!textToCopy || textToCopy.trim() === '' || textToCopy.trim() === 'La respuesta se mostrará aquí') {
        if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('No hay JSON para copiar', 'warning');
        return;
    }
    navigator.clipboard.writeText(textToCopy)
        .then(() => { if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('JSON copiado al portapapeles', 'success'); })
        .catch(err => { if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Error al copiar JSON: ' + err.message, 'error'); });
}

function loadServicesInSelect(selectElement) {
    if (!selectElement) return;
    if (typeof ServiceApiClient !== 'undefined') {
        ServiceApiClient.getServices()
            .then(services => {
                while (selectElement.options.length > 1) selectElement.remove(1);
                services.forEach(service => {
                    const option = document.createElement('option');
                    option.value = service.service_number;
                    option.textContent = `${service.service_number} - ${service.service_name}`;
                    selectElement.appendChild(option);
                });
            })
            .catch(error => console.error('[Services UI - IDA] Error al cargar servicios:', error));
    }
}

function loadConfigsForService(serviceNumber, selectElement) {
    const now = Date.now();
    if (now - (lastServiceLoaded[serviceNumber] || 0) < 500) return;
    lastServiceLoaded[serviceNumber] = now;
    if (!selectElement || !serviceNumber) return;
    if (typeof ConfigStorageManager === 'undefined') {
        if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Error: Componente de configuración no disponible', 'error');
        return;
    }
    selectElement.innerHTML = '<option value="" selected disabled>-- Seleccione una configuración --</option>';
    ConfigStorageManager.loadSavedConfigurations(serviceNumber, (configs) => {
        if (!configs || configs.length === 0) {
            selectElement.innerHTML = '<option value="" selected disabled>-- No hay configuraciones disponibles --</option>';
            return;
        }
        const uniqueConfigs = Array.from(new Map(configs.map(c => [c.id, c])).values());
        uniqueConfigs.forEach(config => {
            const option = document.createElement('option');
            option.value = config.id;
            let fecha = config.timestamp ? new Date(config.timestamp).toLocaleTimeString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            option.textContent = `${config.canal} - ${config.version || 'v1'} (${fecha})`;
            Object.assign(option.dataset, { canal: config.canal, version: config.version, timestamp: config.timestamp });
            selectElement.appendChild(option);
        });
    }, true);
}

function loadJsonFromConfig(configId, jsonInputElement, currentServiceNumber) {
    if (!jsonInputElement || !configId) return;
    const detailedParamsView = document.getElementById('idaDetailedParamsView');
    if (typeof ConfigStorageManager !== 'undefined') {
        ConfigStorageManager.loadSavedConfiguration(configId, (config, error) => {
            if (error || !config) {
                if (detailedParamsView) detailedParamsView.innerHTML = `<p>Error al cargar la configuración: ${error || 'No encontrada'}</p>`;
                jsonInputElement.textContent = '{}';
                if (typeof window.formatJsonElement === 'function') window.formatJsonElement(jsonInputElement, true);
                return;
            }
            if (ConfigServiceLoader && ConfigServiceLoader.currentStructure && ConfigServiceLoader.currentStructure.service_structure && ConfigServiceLoader.currentStructure.service_structure.request) {
                populateIdaDetailedParamsView(config, currentServiceNumber, config.canal, ConfigServiceLoader.currentStructure.service_structure.request, detailedParamsView);
            } else {
                if (detailedParamsView) detailedParamsView.innerHTML = '<p>Estructura del servicio no disponible.</p>';
            }
            try {
                const jsonData = { header: config.header || {}, body: (config.request && typeof config.request === 'object' && !Array.isArray(config.request)) ? config.request : (Array.isArray(config.request) ? config.request.reduce((obj, item) => { if(item.name) obj[item.name] = item.value; return obj; }, {}) : {}) };
                jsonInputElement.textContent = (Object.keys(jsonData.header).length || Object.keys(jsonData.body).length) ? JSON.stringify(jsonData, null, 2) : '{}';

                if (typeof window.formatJsonElement === 'function') window.formatJsonElement(jsonInputElement, true);

            } catch (err) {
                jsonInputElement.textContent = '{}';
                if (typeof window.formatJsonElement === 'function') window.formatJsonElement(jsonInputElement, true);
                if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Error al procesar config para JSON: ' + err.message, 'error');
            }
        });
    } else {
        if (detailedParamsView) detailedParamsView.innerHTML = '<p>Error interno: Gestor de almacenamiento no disponible.</p>';
    }
}

function populateIdaDetailedParamsView(config, serviceNumber, canal, serviceRequestStructure, viewContainerElement) {
    if (!viewContainerElement) return;
    viewContainerElement.innerHTML = ''; 

    if (!config || !serviceRequestStructure || !serviceRequestStructure.elements) {
        viewContainerElement.innerHTML = '<p>No hay datos de configuración o estructura de servicio para mostrar.</p>';
        return;
    }

    // Esta función se mantiene para compatibilidad futura
    const getVariableFields = () => {
        return new Set();
    };

    const variableFields = getVariableFields();
    
    const detailedViewObject = {
        header: {},
        parameters: {} // Cambiado de body a parameters
    };

    // El header solo debe tener los dos campos fijos con sus valores dinámicos
    detailedViewObject.header = {
        serviceNumber: serviceNumber,
        canal: canal
    };

    const configBodyData = (config && (config.body || config.request)) ? (config.body || config.request) : {};
    const flatConfigBody = Array.isArray(configBodyData) ? configBodyData.reduce((acc, field) => { if(field.name) acc[field.name] = field.value; return acc; }, {}) : configBodyData;

    function buildParametersObject(elements, currentConfigScope, isTopLevel = true) {
        const paramsObj = {};
        elements.forEach(element => {
            if (element.type === 'field') {
                const valueFromConfig = currentConfigScope[element.name];
                                // Solo incluir campos que están vacíos en settings (para que el usuario los complete)
                                if (valueFromConfig === undefined || valueFromConfig === null || String(valueFromConfig).trim() === "") {
                                    paramsObj[element.name] = '';
                                }
            } else if (element.type === 'occurrence') {
                const occurrenceKey = element.id || element.name;
                const occurrenceDataArrayFromConfig = currentConfigScope[occurrenceKey] || [];
                
                if (isTopLevel) {
                    // Si hay ocurrencias en la configuración, procesarlas para encontrar campos vacíos
                    if (occurrenceDataArrayFromConfig.length > 0) {
                        const instancesArray = [];
                        
                        // Para cada instancia en la configuración
                        occurrenceDataArrayFromConfig.forEach(instanceData => {
                            // Crear un objeto solo con los campos vacíos
                            const emptyFieldsInstance = {};
                            
                            // Procesar cada campo de la ocurrencia
                            if (element.fields && Array.isArray(element.fields)) {
                                element.fields.forEach(field => {
                                    if (field.type === 'field') {
                                        const fieldValue = instanceData[field.name];
                                        // Solo incluir campos vacíos
                                        if (fieldValue === undefined || fieldValue === null || String(fieldValue).trim() === "") {
                                            emptyFieldsInstance[field.name] = '';
                                        }
                                    } else if (field.type === 'occurrence') {
                                        // Procesar ocurrencias anidadas
                                        const nestedOccKey = field.id || field.name;
                                        const nestedOccArray = instanceData[nestedOccKey] || [];
                                        
                                        if (nestedOccArray.length > 0) {
                                            const nestedInstancesArray = [];
                                            
                                            // Para cada instancia en la ocurrencia anidada
                                            nestedOccArray.forEach(nestedInstanceData => {
                                                // Crear un objeto solo con los campos vacíos
                                                const nestedEmptyFieldsInstance = {};
                                                
                                                // Procesar cada campo de la ocurrencia anidada
                                                if (field.fields && Array.isArray(field.fields)) {
                                                    field.fields.forEach(nestedField => {
                                                        if (nestedField.type === 'field') {
                                                            const nestedFieldValue = nestedInstanceData[nestedField.name];
                                                            // Solo incluir campos vacíos
                                                            if (nestedFieldValue === undefined || nestedFieldValue === null || String(nestedFieldValue).trim() === "") {
                                                                nestedEmptyFieldsInstance[nestedField.name] = '';
                                                            }
                                                        }
                                                    });
                                                }
                                                
                                                // Solo agregar la instancia si tiene campos vacíos
                                                if (Object.keys(nestedEmptyFieldsInstance).length > 0) {
                                                    nestedInstancesArray.push(nestedEmptyFieldsInstance);
                                                }
                                            });
                                            
                                            // Solo agregar el array de ocurrencias anidadas si tiene instancias con campos vacíos
                                            if (nestedInstancesArray.length > 0) {
                                                emptyFieldsInstance[nestedOccKey] = nestedInstancesArray;
                                            }
                                        } else {
                                            // Si el campo de ocurrencia anidada está vacío, incluirlo
                                            if (field.fields && Array.isArray(field.fields)) {
                                                const nestedEmptyInstance = {};
                                                field.fields.forEach(nestedField => {
                                                    if (nestedField.type === 'field') {
                                                        nestedEmptyInstance[nestedField.name] = '';
                                                    }
                                                });
                                                
                                                if (Object.keys(nestedEmptyInstance).length > 0) {
                                                    emptyFieldsInstance[nestedOccKey] = [nestedEmptyInstance];
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                            
                            // Solo agregar la instancia si tiene campos vacíos
                            if (Object.keys(emptyFieldsInstance).length > 0) {
                                instancesArray.push(emptyFieldsInstance);
                            }
                        });
                        
                        // Solo agregar el array de ocurrencias si tiene instancias con campos vacíos
                        if (instancesArray.length > 0) {
                            paramsObj[occurrenceKey] = instancesArray;
                        }
                    } else {
                        // Si no hay ocurrencias en la configuración, mostrar una instancia vacía
                        const emptyInstance = {};
                        if (element.fields && Array.isArray(element.fields)) {
                            element.fields.forEach(field => {
                                if (field.type === 'field') {
                                    emptyInstance[field.name] = '';
                                }
                            });
                        }
                        
                        // Solo agregar la instancia si tiene campos
                        if (Object.keys(emptyInstance).length > 0) {
                            paramsObj[occurrenceKey] = [emptyInstance];
                        } else {
                            paramsObj[occurrenceKey] = [];
                        }
                    }
                }
            }                                                                                               
        });
        return paramsObj;
    }

    if (serviceRequestStructure.elements && serviceRequestStructure.elements.length > 0) {
        detailedViewObject.parameters = buildParametersObject(serviceRequestStructure.elements, flatConfigBody, true); // true indica que es nivel superior
    }

    const preElement = document.createElement('pre');
    preElement.className = 'json-editor';
    preElement.id = `ida-detailed-params-json-${Date.now()}`;
    preElement.contentEditable = 'true';
    preElement.textContent = JSON.stringify(detailedViewObject, null, 2);
    
    viewContainerElement.appendChild(preElement);



    if (typeof window.formatJsonElement === 'function') {
        setTimeout(() => window.formatJsonElement(preElement, true), 0); // Forzar formato
    }

    console.log('[Services UI - IDA] Vista de parámetros detallados poblada con JSON filtrado por campos variables.');
}

// FUNCIÓN ELIMINADA: generateFixedString() 
// Esta función hacía formateo local con bugs en el frontend.
// Ahora TODO el formateo se hace en el backend usando utils/string-format-utils.js

function processIdaService(serviceNumber, fixedString) {
    return new Promise((resolve, reject) => {
        if (!serviceNumber || !fixedString) {
            reject(new Error('Se requiere un número de servicio y un string fijo'));
            return;
        }
        setTimeout(() => {
            resolve({
                success: true,
                message: 'String fijo generado y procesado (simulado) correctamente',
                timestamp: new Date().toISOString(),
                processedString: fixedString 
            });
        }, 500); 
    });
}

function copyDetailedParamsJsonClickHandler() {
    // Intentar obtener el contenido del editor editable de parámetros dinámicos
    const idaDynamicParamsInput = document.getElementById('idaDynamicParamsInput');
    
    if (idaDynamicParamsInput) {
        // Usar el contenido del editor editable
        let textToCopy = idaDynamicParamsInput.textContent || idaDynamicParamsInput.innerText;
        
        if (!textToCopy || textToCopy.trim() === '' || textToCopy.trim() === '{}') {
            if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('No hay JSON de parámetros para copiar', 'warning');
            return;
        }
        
        try {
            // Limpiar caracteres problemáticos básicos
            textToCopy = textToCopy.replace(/\{\-/g, '{').replace(/\[\-/g, '[').replace(/\{\+/g, '{').replace(/\[\+/g, '[');
            
            // Validar que sea JSON válido
            const parsedJson = JSON.parse(textToCopy);
            
            // Regenerar JSON limpio y bien formateado
            const cleanJson = JSON.stringify(parsedJson, null, 2);
            
            navigator.clipboard.writeText(cleanJson)
                .then(() => { 
                    if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('JSON de parámetros dinámicos copiado al portapapeles', 'success'); 
                })
                .catch(err => { 
                    if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Error al copiar JSON: ' + err.message, 'error'); 
                });
        } catch (parseError) {
            console.error('Error al parsear JSON para copiar:', parseError);
            console.error('Contenido problemático:', textToCopy);
            
            // Si hay error de parsing, intentar copiar el texto limpio sin validación
            const fallbackText = textToCopy.replace(/\{\-/g, '{').replace(/\[\-/g, '[').replace(/\{\+/g, '{').replace(/\[\+/g, '[');
            
            navigator.clipboard.writeText(fallbackText)
                .then(() => { 
                    if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('JSON copiado (con correcciones de formato)', 'warning'); 
                })
                .catch(err => { 
                    if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Error al copiar JSON: ' + err.message, 'error'); 
                });
        }
        return;
    }
    
    // Fallback: usar el método anterior si no se encuentra el editor editable
    const detailedParamsView = document.getElementById('idaDetailedParamsView');
    if (!detailedParamsView) {
        if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('No hay JSON de parámetros para copiar', 'warning');
        return;
    }
    
    const preElement = detailedParamsView.querySelector('pre');
    if (!preElement) {
        if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('No hay JSON de parámetros para copiar', 'warning');
        return;
    }
    
    // Obtener el texto original sin formato HTML
    let textToCopy = preElement.textContent || preElement.innerText;
    
    if (!textToCopy || textToCopy.trim() === '' || textToCopy.includes('Seleccione una configuración')) {
        if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('No hay JSON de parámetros para copiar', 'warning');
        return;
    }
    
    try {
        // Limpiar cualquier carácter inválido y validar JSON
        textToCopy = textToCopy.replace(/\{\-/g, '{').replace(/\[\-/g, '[').replace(/\{\+/g, '{').replace(/\[\+/g, '[');
        
        // Validar que sea JSON válido
        const parsedJson = JSON.parse(textToCopy);
        
        // Regenerar JSON limpio y bien formateado
        const cleanJson = JSON.stringify(parsedJson, null, 2);
        
        navigator.clipboard.writeText(cleanJson)
            .then(() => { 
                if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('JSON de parámetros dinámicos copiado al portapapeles', 'success'); 
            })
            .catch(err => { 
                if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Error al copiar JSON: ' + err.message, 'error'); 
            });
    } catch (parseError) {
        console.error('Error al parsear JSON para copiar:', parseError);
        console.error('Contenido problemático:', textToCopy);
        
        // Si hay error de parsing, intentar copiar el texto limpio sin validación
        const fallbackText = textToCopy.replace(/\{\-/g, '{').replace(/\[\-/g, '[').replace(/\{\+/g, '{').replace(/\[\+/g, '[');
        
        navigator.clipboard.writeText(fallbackText)
            .then(() => { 
                if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('JSON copiado (con correcciones de formato)', 'warning'); 
            })
            .catch(err => { 
                if (typeof ConfigUtils !== 'undefined') ConfigUtils.showNotification('Error al copiar JSON: ' + err.message, 'error'); 
            });
    }
}

function displayIdaResult(result) {
    const resultElement = document.getElementById('idaResult');
    const resultSection = document.querySelector('#idaService .result-section');
    if (!resultElement || !resultSection) return;
    resultSection.style.display = 'block';
    if (result && result.processedString) {
        resultElement.textContent = result.processedString;
        resultElement.className = 'plain-text-content'; 
    } else {
        resultElement.textContent = JSON.stringify(result, null, 2);
        resultElement.className = 'json-editor';
        if (typeof window.formatJsonElement === 'function') window.formatJsonElement(resultElement, true);
    }
    document.dispatchEvent(new CustomEvent('ida-data-processed', { detail: { result, container: resultElement } }));
}

/**
 * Carga los parámetros dinámicos desde una configuración en el editor editable
 * @param {string} configId - ID de la configuración
 * @param {HTMLElement} dynamicParamsInputElement - Elemento editor donde cargar los parámetros
 * @param {string} currentServiceNumber - Número de servicio actual
 */
function loadDynamicParamsFromConfig(configId, dynamicParamsInputElement, currentServiceNumber) {
    if (!dynamicParamsInputElement || !configId) return;
    
    if (typeof ConfigStorageManager !== 'undefined') {
        ConfigStorageManager.loadSavedConfiguration(configId, (config, error) => {
            if (error || !config) {

                dynamicParamsInputElement.textContent = '{}';
                if (typeof window.formatJsonElement === 'function') {
                    setTimeout(() => window.formatJsonElement(dynamicParamsInputElement, true), 0);
                }

                return;
            }
            
            try {
                // Crear el objeto de parámetros dinámicos con la estructura esperada
                const dynamicParams = {
                    header: {
                        serviceNumber: currentServiceNumber,
                        canal: config.canal || ''
                    },
                    parameters: {}
                };
                
                // Obtener los datos del body/request de la configuración
                const configBodyData = (config && (config.body || config.request)) ? (config.body || config.request) : {};
                const flatConfigBody = Array.isArray(configBodyData) ? 
                    configBodyData.reduce((acc, field) => { 
                        if(field.name) acc[field.name] = field.value; 
                        return acc; 
                    }, {}) : configBodyData;
                
                // Si tenemos estructura del servicio, filtrar solo campos vacíos
                if (ConfigServiceLoader && ConfigServiceLoader.currentStructure && 
                    ConfigServiceLoader.currentStructure.service_structure && 
                    ConfigServiceLoader.currentStructure.service_structure.request) {
                    
                    const serviceRequestStructure = ConfigServiceLoader.currentStructure.service_structure.request;
                    
                    function buildDynamicParametersObject(elements, currentConfigScope) {
                        const paramsObj = {};
                        elements.forEach(element => {
                            if (element.type === 'field') {
                                const valueFromConfig = currentConfigScope[element.name];
                                // Solo incluir campos que están vacíos en settings (para que el usuario los complete)
                                if (valueFromConfig === undefined || valueFromConfig === null || String(valueFromConfig).trim() === "") {
                                    paramsObj[element.name] = '';
                                }
                            } else if (element.type === 'occurrence') {
                                const occurrenceKey = element.id || element.name;
                                const occurrenceDataArrayFromConfig = currentConfigScope[occurrenceKey] || [];
                                
                                // Si hay ocurrencias en la configuración, procesarlas completamente
                                if (occurrenceDataArrayFromConfig.length > 0) {
                                    const instancesArray = [];
                                    
                                    // Para cada instancia en la configuración
                                    occurrenceDataArrayFromConfig.forEach(instanceData => {
                                        // Crear un objeto con TODOS los campos
                                        const fieldsInstance = {};
                                        
                                        // Procesar cada campo de la ocurrencia
                                        if (element.fields && Array.isArray(element.fields)) {
                                            element.fields.forEach(field => {
                                                if (field.type === 'field') {
                                                    const fieldValue = instanceData[field.name];
                                                    // Solo incluir campos que están vacíos en settings
                                                    if (fieldValue === undefined || fieldValue === null || String(fieldValue).trim() === "") {
                                                        fieldsInstance[field.name] = '';
                                                    }
                                                } else if (field.type === 'occurrence') {
                                                    // Procesar ocurrencias anidadas
                                                    const nestedOccKey = field.id || field.name;
                                                    const nestedOccArray = instanceData[nestedOccKey] || [];
                                                    
                                                    if (nestedOccArray.length > 0) {
                                                        const nestedInstancesArray = [];
                                                        
                                                        // Para cada instancia en la ocurrencia anidada
                                                        nestedOccArray.forEach(nestedInstanceData => {
                                                            // Crear un objeto con TODOS los campos anidados
                                                            const nestedFieldsInstance = {};
                                                            
                                                            // Procesar cada campo de la ocurrencia anidada
                                                            if (field.fields && Array.isArray(field.fields)) {
                                                                field.fields.forEach(nestedField => {
                                                                    if (nestedField.type === 'field') {
                                                                        const nestedFieldValue = nestedInstanceData[nestedField.name];
                                                                        // Solo incluir campos anidados que están vacíos en settings
                                                                        if (nestedFieldValue === undefined || nestedFieldValue === null || String(nestedFieldValue).trim() === "") {
                                                                            nestedFieldsInstance[nestedField.name] = '';
                                                                        }
                                                                    }
                                                                });
                                                            }
                                                            
                                                            nestedInstancesArray.push(nestedFieldsInstance);
                                                        });
                                                        
                                                        fieldsInstance[nestedOccKey] = nestedInstancesArray;
                                                    } else {
                                                        // Si no hay ocurrencias anidadas, crear una instancia vacía
                                                        if (field.fields && Array.isArray(field.fields)) {
                                                            const nestedEmptyInstance = {};
                                                            field.fields.forEach(nestedField => {
                                                                if (nestedField.type === 'field') {
                                                                    nestedEmptyInstance[nestedField.name] = '';
                                                                }
                                                            });
                                                            
                                                            fieldsInstance[nestedOccKey] = [nestedEmptyInstance];
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                        
                                        instancesArray.push(fieldsInstance);
                                    });
                                    
                                    paramsObj[occurrenceKey] = instancesArray;
                                } else {
                                    // Si no hay ocurrencias en la configuración, crear una instancia con todos los campos vacíos
                                    const emptyInstance = {};
                                    if (element.fields && Array.isArray(element.fields)) {
                                        element.fields.forEach(field => {
                                            if (field.type === 'field') {
                                                emptyInstance[field.name] = '';
                                            } else if (field.type === 'occurrence') {
                                                // Para ocurrencias anidadas, crear estructura vacía
                                                const nestedOccKey = field.id || field.name;
                                                if (field.fields && Array.isArray(field.fields)) {
                                                    const nestedEmptyInstance = {};
                                                    field.fields.forEach(nestedField => {
                                                        if (nestedField.type === 'field') {
                                                            nestedEmptyInstance[nestedField.name] = '';
                                                        }
                                                    });
                                                    emptyInstance[nestedOccKey] = [nestedEmptyInstance];
                                                }
                                            }
                                        });
                                    }
                                    
                                    paramsObj[occurrenceKey] = [emptyInstance];
                                }
                            }
                        });
                        return paramsObj;
                    }
                    
                    if (serviceRequestStructure.elements && serviceRequestStructure.elements.length > 0) {
                        dynamicParams.parameters = buildDynamicParametersObject(serviceRequestStructure.elements, flatConfigBody);
                    }
                } else {
                    // Si no hay estructura, usar todos los campos del body como parámetros
                    dynamicParams.parameters = flatConfigBody;
                }
                
                // Debug: Verificar que el objeto está bien formado antes de stringify
                console.log('[DEBUG] dynamicParams object antes de stringify:', dynamicParams);
                console.log('[DEBUG] Tipo de dynamicParams:', typeof dynamicParams);
                console.log('[DEBUG] Keys de dynamicParams:', Object.keys(dynamicParams));
                
                // Verificar que el objeto es válido
                if (!dynamicParams || typeof dynamicParams !== 'object') {
                    console.error('[DEBUG] dynamicParams no es un objeto válido:', dynamicParams);
                    dynamicParamsInputElement.textContent = '{}';
                    return;
                }
                
                // Establecer el JSON en el editor
                let jsonText;
                try {
                    jsonText = JSON.stringify(dynamicParams, null, 2);
                    console.log('[DEBUG] JSON.stringify exitoso, resultado:', jsonText.substring(0, 100) + '...');
                } catch (stringifyError) {
                    console.error('[DEBUG] Error en JSON.stringify:', stringifyError);
                    dynamicParamsInputElement.textContent = '{}';
                    return;
                }
                
                dynamicParamsInputElement.textContent = jsonText;
                
                // Debug: Verificar que se asignó correctamente
                console.log('[DEBUG] Contenido asignado al elemento:', dynamicParamsInputElement.textContent.substring(0, 100) + '...');
                
                // Aplicar formato JSON
                
                if (typeof window.formatJsonElement === 'function') {
                    setTimeout(() => window.formatJsonElement(dynamicParamsInputElement, true), 0);
                }
                
                console.log('[Services UI - IDA] Parámetros dinámicos cargados en editor editable');
                
            } catch (err) {
                console.error('[Services UI - IDA] Error al procesar configuración para parámetros dinámicos:', err);
                dynamicParamsInputElement.textContent = '{}';
                if (typeof window.formatJsonElement === 'function') {
                    setTimeout(() => window.formatJsonElement(dynamicParamsInputElement, true), 0);
                }
                if (typeof ConfigUtils !== 'undefined') {
                    ConfigUtils.showNotification('Error al procesar configuración: ' + err.message, 'error');
                }
            }
        });
    } else {
        console.error('[Services UI - IDA] ConfigStorageManager no disponible para cargar parámetros dinámicos');
        dynamicParamsInputElement.textContent = '{}';
        if (typeof window.formatJsonElement === 'function') {
            setTimeout(() => window.formatJsonElement(dynamicParamsInputElement, true), 0);
        }
    }
}

/**
 * Genera un string fijo usando los parámetros dinámicos del editor junto con los valores de settings
 * @param {string} serviceNumber - Número de servicio
 * @param {Object} dynamicParamsData - Datos de parámetros dinámicos del editor
 * @returns {Promise<string>} - Promesa que resuelve con el string fijo generado
 */
function generateFixedStringWithDynamicParams(serviceNumber, dynamicParamsData) {
    return new Promise((resolve, reject) => {
        if (!serviceNumber) {
            reject(new Error('Se requiere un número de servicio'));
            return;
        }
        
        // console.log('[Services UI - IDA] Generando string con parámetros dinámicos:', dynamicParamsData);
        
        // Usar el endpoint del node_api para generar el string con los parámetros dinámicos
        if (typeof ServiceApiClient !== 'undefined') {
            // Construir el header correcto para ServiceApiClient (formato simple)
            const apiHeader = {
                serviceNumber: serviceNumber,
                canal: (dynamicParamsData.header && dynamicParamsData.header.canal) || 'PO'
            };
            
            const parameters = dynamicParamsData.parameters || {};
            
            // console.log('[Services UI - IDA] Enviando a API - Header:', apiHeader, 'Parameters:', parameters);
            
            // Llamar al endpoint sendmessage que combina parámetros dinámicos con settings
            ServiceApiClient.sendMessage(apiHeader, parameters)
                .then(response => {
                    if (response && response.response) {
                        console.log('[Services UI - IDA] String fijo generado exitosamente, longitud:', response.response.length);
                        resolve(response.response);
                    } else if (response && response.fixedString) {
                        console.log('[Services UI - IDA] String fijo generado exitosamente, longitud:', response.fixedString.length);
                        resolve(response.fixedString);
                    } else if (response && response.stringIda) {
                        console.log('[Services UI - IDA] String ida generado exitosamente, longitud:', response.stringIda.length);
                        resolve(response.stringIda);
                    } else {
                        console.error('[Services UI - IDA] Respuesta inesperada de la API:', response);
                        reject(new Error('La API no devolvió un string válido'));
                    }
                })
                .catch(error => {
                    console.error('[Services UI - IDA] Error al generar string con API:', error);
                    reject(error);
                });
        } else {
            reject(new Error('Cliente API no disponible'));
        }
    });
}

/**
 * Valida los datos JSON usando ÚNICAMENTE la estructura del servicio
 * @param {Object} paramsData - Datos de parámetros con estructura {header: {}, parameters: {}}
 * @returns {Array} Array de errores de validación
 */
function validateJsonAgainstConfigInputs(paramsData) {
    const validationErrors = [];
    
    if (!paramsData || !paramsData.parameters) {
        return validationErrors;
    }
    
    // Obtener la estructura del servicio actual
    if (!ConfigServiceLoader || !ConfigServiceLoader.currentStructure || 
        !ConfigServiceLoader.currentStructure.service_structure ||
        !ConfigServiceLoader.currentStructure.service_structure.request) {
        console.warn('[Field Validation] No hay estructura de servicio disponible para validar');
        return validationErrors;
    }
    
    const serviceStructure = ConfigServiceLoader.currentStructure.service_structure.request;
    
    /**
     * Función recursiva para validar campos usando la estructura del servicio
     * @param {Array} elements - Elementos de la estructura del servicio
     * @param {Object} dataToValidate - Datos a validar
     * @param {string} parentPath - Ruta padre para construir el path completo del campo
     */
    function validateElementsRecursively(elements, dataToValidate, parentPath = '') {
        if (!elements || !Array.isArray(elements)) return;
        
        elements.forEach(element => {
            if (element.type === 'field') {
                const fieldName = element.name;
                const fieldLength = parseInt(element.length) || 0;
                const fieldType = element.fieldType || element.type || 'alfanumerico';
                const fieldValue = dataToValidate[fieldName];
                
                if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                    const valueStr = String(fieldValue);
                    const valueLength = valueStr.length;
                    const fullFieldPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;
                    
                    // Validar longitud
                    if (fieldLength > 0 && valueLength > fieldLength) {
                        validationErrors.push({
                            field: fieldName,
                            path: fullFieldPath,
                            currentLength: valueLength,
                            maxLength: fieldLength,
                            value: valueStr,
                            type: 'length_exceeded',
                            fieldType: fieldType
                        });
                    }
                    
                    // Validar tipo de dato
                    if (valueStr.trim() !== '') {
                        if (fieldType === 'numérico' || fieldType === 'numerico') {
                            // Campo numérico: solo números
                            const numericPattern = /^\d+$/;
                            if (!numericPattern.test(valueStr)) {
                                validationErrors.push({
                                    field: fieldName,
                                    path: fullFieldPath,
                                    value: valueStr,
                                    type: 'invalid_type',
                                    expectedType: 'numeric',
                                    fieldType: fieldType
                                });
                            }
                        }
                        // Los campos alfanuméricos pueden contener números Y letras, no hay restricción
                    }
                }
            } else if (element.type === 'occurrence') {
                const occurrenceKey = element.id || element.name;
                const occurrenceData = dataToValidate[occurrenceKey];
                
                if (occurrenceData && Array.isArray(occurrenceData)) {
                    occurrenceData.forEach((instance, index) => {
                        const instancePath = parentPath ? `${parentPath}.${occurrenceKey}[${index}]` : `${occurrenceKey}[${index}]`;
                        
                        if (element.fields && Array.isArray(element.fields)) {
                            validateElementsRecursively(element.fields, instance, instancePath);
                        }
                    });
                }
            }
        });
    }
    
    // Validar parámetros principales usando la estructura
    if (serviceStructure.elements && Array.isArray(serviceStructure.elements)) {
        validateElementsRecursively(serviceStructure.elements, paramsData.parameters);
    }
    
    return validationErrors;
}

/**
 * Valida las longitudes de los campos contra la estructura del servicio
 * @param {Object} paramsData - Datos de parámetros con estructura {header: {}, parameters: {}}
 * @param {string} serviceNumber - Número de servicio
 * @returns {Array} Array de errores de validación
 */
function validateFieldLengths(paramsData, serviceNumber) {
    const validationErrors = [];
    
    if (!paramsData || !paramsData.parameters) {
        return validationErrors;
    }
    
    // Obtener la estructura del servicio actual
    if (!ConfigServiceLoader || !ConfigServiceLoader.currentStructure || 
        !ConfigServiceLoader.currentStructure.service_structure ||
        !ConfigServiceLoader.currentStructure.service_structure.request) {
        console.warn('[Field Validation] No hay estructura de servicio disponible para validar longitudes');
        return validationErrors;
    }
    
    const serviceStructure = ConfigServiceLoader.currentStructure.service_structure.request;
    
    /**
     * Función recursiva para validar campos en elementos y ocurrencias
     * @param {Array} elements - Elementos de la estructura del servicio
     * @param {Object} dataToValidate - Datos a validar
     * @param {string} parentPath - Ruta padre para construir el path completo del campo
     */
    function validateElementsRecursively(elements, dataToValidate, parentPath = '') {
        if (!elements || !Array.isArray(elements)) return;
        
        elements.forEach(element => {
            if (element.type === 'field') {
                const fieldName = element.name;
                const fieldLength = parseInt(element.length) || 0;
                const fieldValue = dataToValidate[fieldName];
                
                if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                    const valueLength = String(fieldValue).length;
                    const fullFieldPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;
                    
                    if (valueLength > fieldLength) {
                        validationErrors.push({
                            field: fieldName,
                            path: fullFieldPath,
                            currentLength: valueLength,
                            maxLength: fieldLength,
                            value: String(fieldValue),
                            type: 'length_exceeded'
                        });
                    }
                }
            } else if (element.type === 'occurrence') {
                const occurrenceKey = element.id || element.name;
                const occurrenceData = dataToValidate[occurrenceKey];
                
                if (occurrenceData && Array.isArray(occurrenceData)) {
                    occurrenceData.forEach((instance, index) => {
                        const instancePath = parentPath ? `${parentPath}.${occurrenceKey}[${index}]` : `${occurrenceKey}[${index}]`;
                        
                        if (element.fields && Array.isArray(element.fields)) {
                            validateElementsRecursively(element.fields, instance, instancePath);
                        }
                    });
                }
            }
        });
    }
    
    // Validar parámetros principales
    if (serviceStructure.elements && Array.isArray(serviceStructure.elements)) {
        validateElementsRecursively(serviceStructure.elements, paramsData.parameters);
    }
    
    return validationErrors;
}

/**
 * Muestra un SweetAlert con los errores de validación de longitud de campos
 * @param {Array} validationErrors - Array de errores de validación
 */
function showFieldLengthValidationError(validationErrors) {
    if (!validationErrors || validationErrors.length === 0) return;
    
    // Obtener el tema actual
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 
                        document.body.classList.contains('amber-theme') ? 'amber' : 'light';
    
    // Definir colores según el tema
    const themeColors = {
        dark: {
            background: '#1a1a1a',
            surface: '#2d2d2d',
            primary: '#3b82f6',
            error: '#ef4444',
            warning: '#f59e0b',
            text: '#f3f4f6',
            border: '#374151',
            divider: '#374151',
            overlay: 'rgba(0, 0, 0, 0.8)'
        },
        light: {
            background: '#ffffff',
            surface: '#f9fafb',
            primary: '#2563eb',
            error: '#dc2626',
            warning: '#d97706',
            text: '#111827',
            border: '#e5e7eb',
            divider: '#e5e7eb',
            overlay: 'rgba(255, 255, 255, 0.8)'
        },
        amber: {
            background: '#fffbeb',
            surface: '#fef3c7',
            primary: '#d97706',
            error: '#dc2626',
            warning: '#b45309',
            text: '#1f2937',
            border: '#fbbf24',
            divider: '#fbbf24',
            overlay: 'rgba(254, 243, 199, 0.8)'
        }
    };
    
    const colors = themeColors[currentTheme];
    
    // Función para convertir texto a Proper Case
    const toProperCase = (text) => {
        return text.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };
    
    // Construir mensaje HTML con los errores de validación
    let errorHtml = `
    <div class="validation-error-container" style="
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        background: ${colors.background};
        color: ${colors.text};
        max-width: 800px;
        margin: 0 auto;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px ${colors.divider}, 0 2px 4px -2px ${colors.divider};">
        
        <div class="validation-error-header" style="
            background: ${colors.surface};
            padding: 20px;
            border-bottom: 1px solid ${colors.divider};
            display: flex;
            align-items: center;
            gap: 12px;">
            
            <div class="validation-error-icon" style="
                background: ${colors.error};
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 6v4m0 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            
            <div class="validation-error-title">
                <h3 style="
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: ${colors.text};">
                    ${toProperCase('Errores de Validación')}
                </h3>
                <p style="
                    margin: 4px 0 0 0;
                    font-size: 14px;
                    color: ${colors.text}80;">
                    Por favor, revise los siguientes campos
                </p>
            </div>
        </div>

        <div class="validation-error-content" style="padding: 20px;">`;
    
    validationErrors.forEach((error, index) => {
        const errorColor = error.type === 'invalid_type' ? colors.error : colors.warning;
        
        errorHtml += `
        <div class="validation-error-item" style="
            background: ${colors.surface};
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            border: 1px solid ${colors.border};">
            
            <div class="validation-error-item-header" style="
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;">
                
                <div class="validation-error-item-indicator" style="
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: ${errorColor};
                    flex-shrink: 0;">
                </div>
                
                <div class="validation-error-item-field" style="
                    font-weight: 500;
                    font-size: 14px;">
                    ${error.field}
                </div>
            </div>
            
            <div class="validation-error-item-details" style="
                padding-left: 20px;
                font-size: 13px;
                color: ${colors.text}99;">`;
        
        if (error.type === 'length_exceeded') {
            errorHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">`;
            errorHtml += `<span>${toProperCase('Longitud actual')}:</span>`;
            errorHtml += `<span>${error.currentLength} ${toProperCase('caracteres')}</span>`;
            errorHtml += '</div>';
            
            errorHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">`;
            errorHtml += `<span>${toProperCase('Longitud máxima')}:</span>`;
            errorHtml += `<span>${error.maxLength} ${toProperCase('caracteres')}</span>`;
            errorHtml += '</div>';
            
            errorHtml += `<div style="display: flex; justify-content: space-between; color: ${errorColor};">`;
            errorHtml += `<span>${toProperCase('Exceso')}:</span>`;
            errorHtml += `<span>${error.currentLength - error.maxLength} ${toProperCase('caracteres')}</span>`;
            errorHtml += '</div>';
        } else if (error.type === 'invalid_type') {
            const expectedTypeText = error.expectedType === 'numeric' ? toProperCase('Solo números') : toProperCase('Números y letras permitidos');
            const actualTypeText = error.expectedType === 'numeric' ? toProperCase('Texto con caracteres no numéricos') : toProperCase('Solo números');
            
            errorHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">`;
            errorHtml += `<span>${toProperCase('Tipo esperado')}:</span>`;
            errorHtml += `<span>${expectedTypeText}</span>`;
            errorHtml += '</div>';
            
            errorHtml += `<div style="display: flex; justify-content: space-between; color: ${errorColor};">`;
            errorHtml += `<span>${toProperCase('Tipo actual')}:</span>`;
            errorHtml += `<span>${actualTypeText}</span>`;
            errorHtml += '</div>';
        }
        
        if (error.value) {
            errorHtml += `<div style="margin-top: 8px; padding: 6px; background: ${colors.headerBg}; font-family: monospace; font-size: 11px;">`;
            errorHtml += error.value.length > 50 ? `"${error.value.substring(0, 50)}..."` : `"${error.value}"`;
            errorHtml += '</div>';
        }
        
        errorHtml += '</div>';
        errorHtml += '</div>';
    });
    
    errorHtml += '</div>';
    
    // Sección de acciones
    errorHtml += `
        </div>
        
        <div class="validation-error-actions" style="
            margin-top: 20px;
            padding: 16px;
            background: ${colors.surface};
            border-radius: 8px;
            border: 1px solid ${colors.border};">
            
            <div class="validation-error-actions-title" style="
                font-weight: 500;
                font-size: 14px;
                color:black;
                margin-bottom: 12px;">
                ${toProperCase('Correcciones necesarias')}
            </div>
            
            <div class="validation-error-actions-list" style="
                display: flex;
                flex-direction: column;
                gap: 8px;
                font-size: 13px;
                color: ${colors.text}99;">
                
                <div class="validation-error-action-item" style="
                    display: flex;
                    align-items: center;
                    gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 4v4m0 4h.01M15 8a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                    ${toProperCase('Reducir la longitud de los campos señalados')}
                </div>
                
                <div class="validation-error-action-item" style="
                    display: flex;
                    align-items: center;
                    gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 4v4m0 4h.01M15 8a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    ${toProperCase('Verificar que los valores se ajusten a la estructura del servicio')}
                </div>
                
                <div class="validation-error-action-item" style="
                    display: flex;
                    align-items: center;
                    gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 4v4m0 4h.01M15 8a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    ${toProperCase('Revisar la configuración del Excel si es necesario')}
                </div>
            </div>
        </div>
    </div>`;
    
    // Mostrar SweetAlert con errores de validación
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `<span style="color: ${colors.error};">${toProperCase('Errores de Validación')}</span>`,
            html: errorHtml,
            icon: 'warning',
            confirmButtonText: toProperCase('Entendido'),
            confirmButtonColor: colors.error,
            width: '900px',
            padding: '20px',
            background: colors.background
        });
    } else {
        // Fallback si SweetAlert no está disponible
        let alertMessage = 'Errores de validación de campos:\n\n';
        validationErrors.forEach(error => {
            alertMessage += `• Campo "${error.field}": ${error.currentLength}/${error.maxLength} caracteres (exceso: ${error.currentLength - error.maxLength})\n`;
        });
        alert(alertMessage);
    }
}
