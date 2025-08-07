/**
 * Configuration Data Handler
 * 
 * Handles data collection, validation, auto-filling, and saving of configuration data
 * with proper handling of nested occurrences
 */

const ConfigDataHandler = {
    versionCounter: 1,
    
    /**
     * Initialize key components of the data handler
     * @param {HTMLElement} headerTable - Header config table element
     * @param {HTMLElement} requestTable - Request config table element  
     */
    initialize: function(headerTable, requestTable) {
        this.headerConfigTable = headerTable;
        this.requestConfigTable = requestTable;
    },

    /**
     * Validate required inputs before saving
     * @param {string} canal - Canal value
     * @param {string} serviceNumber - Selected service number
     * @param {HTMLInputElement} canalInput - Canal input field for focus
     * @param {HTMLSelectElement} serviceSelect - Service select for focus
     * @returns {boolean} True if valid, false otherwise
     */
    validateInputs: function(canal, serviceNumber, canalInput, serviceSelect) {
        if (!canal) {
            ConfigUtils.showNotification('Debe ingresar el canal (obligatorio)', 'error');
            if (canalInput) canalInput.focus();
            return false;
        }

        if (!serviceNumber) {
            ConfigUtils.showNotification('Debe seleccionar un servicio', 'error');
            if (serviceSelect) serviceSelect.focus();
            return false;
        }
        
        return true;
    },

    /**
     * Auto-fill fields based on header sample or default values
     * @param {string} serviceNumber - The selected service number
     * @param {Object} headerStructure - Header structure definition
     * @param {HTMLInputElement} canalInput - Canal input field to use its value
     */
    autoFillFields: async function(serviceNumber, headerStructure, canalInput) {
        if (!serviceNumber || !headerStructure) {
            ConfigUtils.showNotification('Seleccione un servicio primero', 'error');
            return;
        }
        
        console.log(`Iniciando auto-llenado para servicio ${serviceNumber}`);
        
        // Try to get header sample
        ConfigUtils.showNotification('Buscando datos de muestra para cabecera...', 'info');
        const headerSample = await ConfigServiceLoader.fetchHeaderSample(serviceNumber);
        
        if (!headerSample) {
            console.warn("No se encontró header sample, usando valores por defecto");
            ConfigUtils.showNotification('No se encontró muestra de cabecera, usando valores por defecto', 'warning');
            
            // DEBUG: Verificar si los campos existen
            const headerInputs = document.querySelectorAll('#headerConfigTable .config-field-input');
            console.log(`🔧 [DEBUG] Encontrados ${headerInputs.length} campos de cabecera para llenar`);
            
            if (headerInputs.length === 0) {
                console.warn('⚠️ [DEBUG] No se encontraron campos de cabecera (.config-field-input)');
                const headerTable = document.getElementById('headerConfigTable');
                console.log('🔧 [DEBUG] headerConfigTable existe:', !!headerTable);
                if (headerTable) {
                    const allInputs = headerTable.querySelectorAll('input, select');
                    console.log(`🔧 [DEBUG] Total inputs en headerConfigTable: ${allInputs.length}`);
                    allInputs.forEach((input, index) => {
                        console.log(`🔧 [DEBUG] Input ${index}:`, input.className, input.dataset);
                    });
                }
            }
            
            // Fallback to default method if no sample is available
            headerInputs.forEach(input => {
                console.log(`🔧 [DEBUG] Auto-filling field: ${input.dataset.fieldName}`);
                this.autoFillInput(input, canalInput?.value);
            });
            
            // After filling with defaults, ensure SERVICIO field uses current service number
            const servicioInput = document.querySelector('#headerConfigTable .config-field-input[data-field-name="SERVICIO"]');
            if (servicioInput && ConfigServiceLoader.currentServiceNumber) {
                servicioInput.value = ConfigServiceLoader.currentServiceNumber;
                console.log(`SERVICIO field set to current service number: ${ConfigServiceLoader.currentServiceNumber}`);
            }
            
            if (headerInputs.length > 0) {
                ConfigUtils.showNotification(`Campos de cabecera llenados con valores por defecto (${headerInputs.length} campos)`, 'success');
            } else {
                ConfigUtils.showNotification('No se encontraron campos de cabecera para llenar', 'warning');
            }
        } else {
            // Extract values from the sample using the structure
            console.log("Parsing sample to extract values");
            const parsedValues = ConfigServiceLoader.parseHeaderSample(headerSample, headerStructure);
            console.log("Values extracted from header sample:", parsedValues);
            
            // Apply extracted values to form fields
            const headerInputs = document.querySelectorAll('#headerConfigTable .config-field-input');
            let fieldsPopulated = 0;
            
            headerInputs.forEach(input => {
                const fieldName = input.dataset.fieldName;
                if (fieldName && parsedValues[fieldName] !== undefined) {
                    input.value = parsedValues[fieldName];
                    fieldsPopulated++;
                    console.log(`Field ${fieldName} filled with value: ${parsedValues[fieldName]}`);
                } else if (fieldName) {
                    // If no value in the sample for this field, use the default method
                    this.autoFillInput(input, canalInput?.value);
                    console.log(`Field ${fieldName} filled with default value (not found in sample)`);
                }
            });
            
            // After filling from header sample, apply special logic for SERVICIO field
            const servicioInput = document.querySelector('#headerConfigTable .config-field-input[data-field-name="SERVICIO"]');
            if (servicioInput && ConfigServiceLoader.currentServiceNumber) {
                servicioInput.value = ConfigServiceLoader.currentServiceNumber;
                console.log(`SERVICIO field overridden with current service number: ${ConfigServiceLoader.currentServiceNumber}`);
            }
            
            ConfigUtils.showNotification(`Campos de cabecera llenados automáticamente. ${fieldsPopulated} campos desde muestra.`, 'success');
        }
        
        // Asegurar que el campo CANAL en la cabecera tenga el valor del canal principal
        setTimeout(() => {
            const canalFieldInput = document.querySelector('input[data-field-name="CANAL"][data-section="header"]');
            if (canalFieldInput && canalInput && canalInput.value) {
                canalFieldInput.value = canalInput.value;
                const event = new Event('change');
                canalFieldInput.dispatchEvent(event);
                console.log(`Canal "${canalInput.value}" propagado a la cabecera después del auto-fill`);
            }
        }, 100);
    },
    
    /**
     * Generate an appropriate value for a field based on its properties
     * @param {HTMLElement} input - The input element to fill
     * @param {string} canalValue - Value from the canal input field
     */
    autoFillInput: function(input, canalValue = '') {
        const fieldName = input.dataset.fieldName || '';
        const maxLength = input.maxLength || 10;
        
        // Don't auto-fill select elements that already have a value
        if (input.tagName.toLowerCase() === 'select') {
            if (!input.value && input.options.length > 1) {
                // Select the first non-empty option
                for (let i = 1; i < input.options.length; i++) {
                    if (input.options[i].value) {
                        input.selectedIndex = i;
                        break;
                    }
                }
            }
            return;
        }
        
        // Use centralized field type detection
        const fieldType = ConfigUtils.normalizeFieldType(input);
        
        // Generate value based on field name and type
        let value = '';
        
        // Use the canal value from the interface input
        if (fieldName.toUpperCase() === 'CANAL') {
            // Get canal value from the main interface input
            const mainCanalValue = canalValue?.trim().toUpperCase() || '';
            input.value = mainCanalValue;
            return;
        }
        
        // Use the selected service number for the SERVICIO field, overriding header sample
        if (fieldName.toUpperCase() === 'SERVICIO') {
            const currentServiceNumber = ConfigServiceLoader.currentServiceNumber;
            if (currentServiceNumber) {
                input.value = currentServiceNumber;
                return;
            }
        }
        
        // Handle different field types using centralized logic
        if (fieldType === 'fecha') {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            
            if (input.placeholder === 'DD/MM/AAAA') {
                value = `${day}/${month}/${year}`;
            } else if (input.placeholder === 'DD.MM.YYYY') {
                value = `${day}.${month}.${year}`;
            } else {
                value = `${year}${month}${day}`;
            }
        }
        // Handle time fields
        else if (fieldName.toUpperCase().includes('HORA')) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            value = `${hours}${minutes}${seconds}`;
        }
        // Handle numeric fields using centralized detection
        else if (fieldType === 'numerico') {
            // Generate a numeric value of appropriate length
            const numLength = Math.min(maxLength, 9); // Avoid huge numbers
            value = Math.floor(Math.pow(10, numLength - 1) + Math.random() * 9 * Math.pow(10, numLength - 1)).toString();
            
            // Ensure it's not longer than maxLength
            if (value.length > maxLength) {
                value = value.substring(0, maxLength);
            }
        }
        // Handle text fields - MAKING THESE DYNAMIC INSTEAD OF HARDCODED
        else {
            // Generate a dynamic text based on the field name
            const fieldNameFormatted = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).toLowerCase();
            const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            
            // Create a dynamic value that includes the field name and a random number
            value = `${fieldNameFormatted}_${randomSuffix}`;
            
            // Ensure it's not longer than maxLength
            if (maxLength > 0 && value.length > maxLength) {
                value = value.substring(0, maxLength);
            }
        }
        
        input.value = value;
    },

    /**
     * Collect and save configuration data
     * @param {string} serviceNumber - The service number
     * @param {string} serviceName - The service name
     * @param {string} canal - The canal value
     * @param {Function} onSuccess - Callback on successful save with data and filename
     * @param {Function} onError - Callback on error with error message
     */
    saveConfiguration: function(serviceNumber, serviceName, canal, onSuccess, onError) {
        // Intentar usar SweetAlert con un pequeño delay para asegurar que esté cargado
        const showDescriptionDialog = () => {
            if (typeof Swal !== 'undefined') {
                console.log('[ConfigDataHandler] SweetAlert disponible, mostrando diálogo elegante');
                this._showSweetAlertDialog(serviceNumber, serviceName, canal, onSuccess, onError);
            } else {
                console.log('[ConfigDataHandler] SweetAlert no disponible, usando prompt básico');
                this._showBasicDialog(serviceNumber, serviceName, canal, onSuccess, onError);
            }
        };
        
        // Intentar inmediatamente, si no funciona, intentar después de un pequeño delay
        if (typeof Swal !== 'undefined') {
            showDescriptionDialog();
        } else {
            // Esperar un poco para que SweetAlert se cargue
            setTimeout(showDescriptionDialog, 100);
        }
    },

    _showSweetAlertDialog: function(serviceNumber, serviceName, canal, onSuccess, onError) {
        Swal.fire({
            title: 'Descripción',
            html: `
                <p>Ingrese una descripción para identificar esta configuración:</p>
                <p class="text-sm text-gray-600 mb-3">
                    Formato: <strong>${serviceNumber}-SM-v${this.versionCounter + 1}-{descripción}.json</strong>
                </p>
            `,
            input: 'text',
            inputPlaceholder: 'Ej: test, produccion, desarrollo, etc.',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563eb',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'La descripción no puede estar vacía';
                }
                // Validar que la descripción solo contenga caracteres válidos para nombres de archivo
                if (!/^[a-zA-Z0-9_-]+$/.test(value.trim())) {
                    return 'La descripción solo puede contener letras, números, guiones y guiones bajos';
                }
                return null;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const suffix = result.value.trim();
                this._saveConfigurationWithSuffix(serviceNumber, serviceName, canal, suffix, onSuccess, onError);
            } else {
                // Usuario canceló, re-habilitar botón si hay callback de error
                if (typeof onError === 'function') {
                    onError('Guardado cancelado por el usuario');
                }
            }
        });
    },

    /**
     * Crea un JSON dinámico (el complemento) a partir del JSON completo y la estructura
     * Incluye SOLO los campos que están vacíos en la configuración (para que el usuario los complete)
     * Este es el mismo algoritmo que usa la solapa API para mostrar los parámetros dinámicos
     */
    createDynamicJsonFromComplete: function(completeJson) {
        // Obtener la estructura del servicio actual
        const serviceRequestStructure = ConfigServiceLoader.currentStructure?.service_structure?.request;
        
        if (!serviceRequestStructure || !serviceRequestStructure.elements) {
            console.warn('No hay estructura de servicio disponible para generar JSON dinámico');
            return { header: {}, parameters: {} };
        }
        
        // IMPORTANTE: Usar la misma estructura que la solapa API
        // La solapa API usa "parameters" en lugar de "request" para el JSON dinámico
        const dynamicJson = {
            header: {},
            parameters: {} // Usar "parameters" como en la solapa API
        };
        
        // El header dinámico solo incluye serviceNumber y canal
        const serviceNumber = ConfigServiceLoader.currentServiceNumber;
        const canal = document.getElementById('canalInput')?.value || '';
        
        dynamicJson.header = {
            serviceNumber: serviceNumber,
            canal: canal
        };
        
        // Procesar el request para incluir solo campos vacíos
        const requestData = completeJson.request || {};
        
        // Función para construir el objeto de parámetros dinámicos (campos vacíos)
        const buildParametersObject = (elements, currentConfigScope, isTopLevel = true) => {
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
        };
        
        // Construir los parámetros dinámicos usando la estructura del servicio
        if (serviceRequestStructure.elements && serviceRequestStructure.elements.length > 0) {
            dynamicJson.parameters = buildParametersObject(serviceRequestStructure.elements, requestData, true);
        }
        
        return dynamicJson;
    },

    _showBasicDialog: function(serviceNumber, serviceName, canal, onSuccess, onError) {
        // Fallback si SweetAlert no está disponible
        const suffix = prompt('Ingrese una descripción para identificar esta configuración:');
        if (suffix && suffix.trim() !== '') {
            this._saveConfigurationWithSuffix(serviceNumber, serviceName, canal, suffix.trim(), onSuccess, onError);
        } else {
            if (typeof onError === 'function') {
                onError('Guardado cancelado por el usuario');
            }
        }
    },

    _saveConfigurationWithSuffix: function(serviceNumber, serviceName, canal, suffix, onSuccess, onError) {
        // Update version counter and create version string
        this.versionCounter++;
        const versionStr = `v${this.versionCounter}`;
        
        // Create configuration object with suffix
        const configuration = {
            serviceNumber: ConfigServiceLoader.currentServiceNumber,
            serviceName: ConfigServiceLoader.currentServiceName,
            canal: canal,
            version: versionStr,
            suffix: suffix, // Agregar el sufijo al objeto de configuración
            timestamp: new Date().toISOString(),
            header: {},
            request: {}
        };

        // Collect header field values
        const headerInputs = document.querySelectorAll('#headerConfigTable .config-field-input');
        headerInputs.forEach(input => {
            const fieldName = input.dataset.fieldName;
            if (fieldName) {
                configuration.header[fieldName] = input.value || '';
            }
        });

        // Collect request data (handles nesting and occurrences)
        configuration.request = this.collectRequestData();

        // IMPORTANTE: Antes de tomar los JSONs de los textareas, necesitamos actualizarlos
        // con la configuración actual del formulario
        
        // Actualizar el JSON completo en el textarea (con valores)
        const completeJson = {
            header: configuration.header,
            request: configuration.request
        };
        
        // Crear el JSON dinámico (el complemento - solo campos vacíos)
        const dynamicJson = this.createDynamicJsonFromComplete(completeJson);
        
        // Actualizar los textareas con estos JSONs para que estén sincronizados
        try {
            const idaJsonElement = document.getElementById('idaJsonInput');
            if (idaJsonElement) {
                idaJsonElement.textContent = JSON.stringify(completeJson, null, 2);
                // Si existe la función de formateo, aplicarla
                if (typeof window.formatJsonElement === 'function') {
                    window.formatJsonElement(idaJsonElement, true);
                }
            }
            
            const idaDynamicElement = document.getElementById('idaDynamicParamsInput');
            if (idaDynamicElement) {
                idaDynamicElement.textContent = JSON.stringify(dynamicJson, null, 2);
                // Si existe la función de formateo, aplicarla
                if (typeof window.formatJsonElement === 'function') {
                    window.formatJsonElement(idaDynamicElement, true);
                }
            }
        } catch (e) {
            console.warn('Error actualizando los textareas con los JSONs:', e);
        }

        // Ahora usar estos JSONs actualizados
        const finalCompleteJson = completeJson;
        const finalDynamicJson = dynamicJson;

        // Optional: Log the collected data before sending
        console.log("JSON Completo (de la UI):", JSON.stringify(finalCompleteJson, null, 2));
        console.log("JSON Dinámico (de la UI):", JSON.stringify(finalDynamicJson, null, 2));

        // NUEVO: Enviar configuración usando el orchestrator (network visible)
        const useOrchestrator = window.currentExcelInfo && window.currentExcelInfo.excelId;
        
        const fetchPromise = useOrchestrator ? 
            (() => {
                console.log('🔧 [ConfigDataHandler] Usando orchestrator con ExcelId:', window.currentExcelInfo.excelId);
                // Usar nuevo endpoint del orchestrator para guardar en BD
                return fetch('/api-orchestrator/step3-save-settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        excelId: window.currentExcelInfo.excelId,
                        version: configuration.version,
                        settingName: `Config_${serviceNumber}_${canal}_${suffix}`,
                        completeSettingJson: finalCompleteJson,  // JSON completo tal cual está en la UI (solapa 1)
                        dynamicSettingJson: finalDynamicJson,    // JSON dinámico tal cual está en la UI (solapa 2)
                        serviceNumber: serviceNumber,
                        canalCode: canal,
                        suffix: suffix  // Agregar suffix explícitamente
                    }),
                });
            })() : 
            (() => {
                console.log('🔧 [ConfigDataHandler] ExcelId no disponible, usando método legacy');
                // Fallback al método original si no hay ExcelId
                return fetch('/service-config/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(configuration),
                });
            })();
        
        fetchPromise
        .then(response => {
            if (!response.ok) {
                // Try to get error message from response body
                return response.json().catch(() => ({ message: response.statusText })).then(errData => {
                    throw new Error(errData.message || `Error ${response.status} al guardar la configuración`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('[ConfigDataHandler] DEBUG - Respuesta del servidor:', data);
            
            // Manejar respuesta según el método usado
            if (useOrchestrator) {
                console.log('[ConfigDataHandler] DEBUG - Respuesta del orchestrator:', data);
                const settingName = data.settingName || `Config_${serviceNumber}_${canal}_${suffix}`;
                ConfigUtils.showNotification(`Configuración guardada en BD: ${settingName}`, 'success');
                
                // Para orchestrator, simular filename para compatibilidad
                const simulatedFilename = `${settingName}.json`;
                
                // Call success callback if provided
                if (typeof onSuccess === 'function') {
                    onSuccess(configuration, simulatedFilename);
                }
            } else {
                console.log('[ConfigDataHandler] DEBUG - Filename recibido:', data.filename);
                ConfigUtils.showNotification(`Configuración guardada correctamente como: ${data.filename}`, 'success');
                
                // Update the saved configurations list immediately
                if (ConfigStorageManager && ConfigStorageManager.loadSavedConfigurations) {
                    ConfigStorageManager.loadSavedConfigurations(null, function(configs) {
                        if (ConfigUIManager && ConfigUIManager.updateSavedConfigurationsList) {
                            ConfigUIManager.updateSavedConfigurationsList(configs);
                            console.log('Lista de configuraciones actualizada después de guardar:', configs.length);
                        }
                    });
                }
                
                // Call success callback if provided
                if (typeof onSuccess === 'function') {
                    onSuccess(configuration, data.filename);
                }
            }
        })
                .catch(err => {
                    console.error('Error saving configuration:', err);
                    ConfigUtils.showNotification(`Error al guardar configuración: ${err.message}`, 'error');
                    
                    // Call error callback if provided
                    if (typeof onError === 'function') {
                        onError(err.message);
                    }
                });
    },

    /**
     * Collect request data from the form
     * @returns {Object} Collected request data
     */
    collectRequestData: function() {
        if (!this.requestConfigTable) {
            console.error("Request config table not available");
            return {};
        }
        
        const requestTbody = this.requestConfigTable.querySelector('tbody');
        if (!requestTbody) return {};
        
        // Function to get field value from the DOM
        const getFieldValueFromDOM = (fieldName) => {
            const input = requestTbody.querySelector(`.config-field-input[data-field-name="${fieldName}"]`);
            
            // FIX: Si es un campo de tipo lista (select) y es numérico, devolver solo el valor numérico
            if (input && input.tagName === 'SELECT' && input.dataset.isOptionsList === 'true') {
                // Si el campo es una lista de opciones, solo devolver el valor numérico
                return input.value || "";
            }
            
            return input ? (input.value || "") : "";
        };
        
        // Function to get a field value from a specific instance
        const getInstanceFieldValue = (instanceId, fieldName) => {
            console.log(`Getting field value for ${fieldName} in instance ${instanceId}`);
            
            // Find the instance row first
            const instanceRow = requestTbody.querySelector(`tr.occurrence-instance-row[data-instance-id="${instanceId}"]`);
            if (!instanceRow) {
                console.warn(`Instance row with ID ${instanceId} not found`);
                return "";
            }
            
            // Get the level of this instance for finding the last field class
            const instanceLevel = parseInt(instanceRow.dataset.level, 10);
            
            // Start from the instance row and find the field row with matching field name
            let currentRow = instanceRow.nextElementSibling;
            let foundInput = null;
            
            // Process all rows until we find the field or the end of the instance
            while (currentRow && !foundInput) {
                // Check if this row belongs to our instance
                if (currentRow.dataset.instanceId === instanceId && currentRow.classList.contains('field-row')) {
                    // Check if this is the field we're looking for
                    const fieldNameCell = currentRow.querySelector('td:first-child');
                    if (fieldNameCell && fieldNameCell.textContent.trim() === fieldName) {
                        // Found the field row, get the input
                        foundInput = currentRow.querySelector('.config-field-input');
                        break;
                    }
                } 
                
                // Stop if we reach another instance or the end of our instance
                if (currentRow.classList.contains('occurrence-instance-row') || 
                    currentRow.classList.contains(`last-field-in-instance-${instanceLevel}`)) {
                    break;
                }
                
                // Move to the next row
                currentRow = currentRow.nextElementSibling;
            }
            
            // Fallback to attribute selector if we couldn't find by traversing
            if (!foundInput) {
                console.log(`Field ${fieldName} not found by traversal, trying attribute selector`);
                foundInput = requestTbody.querySelector(`tr[data-instance-id="${instanceId}"] .config-field-input[data-field-name="${fieldName}"]`);
            }
            
            // FIX: Si es un campo de tipo lista (select) y es numérico, devolver solo el valor numérico
            if (foundInput && foundInput.tagName === 'SELECT' && foundInput.dataset.isOptionsList === 'true') {
                // Si el campo es una lista de opciones, solo devolver el valor numérico
                return foundInput.value || "";
            }
            
            return foundInput ? (foundInput.value || "") : "";
        };
        
        // Function to recursively process nested occurrences
        // Function to recursively process nested occurrences
        const processNestedOccurrence = (occurrenceField, parentInstanceId) => {
            const nestedOccName = occurrenceField.id || occurrenceField.name;

            console.log(`Processing nested occurrence: ${nestedOccName}, parent instance: ${parentInstanceId}`);

            // Get all rows in the table body as an array for easier traversal
            const allRows = Array.from(requestTbody.querySelectorAll('tr'));

            // Array to hold all instances of this nested occurrence
            const nestedInstancesData = [];

            // Find the parent instance row to determine the search start index and level
            const parentRowIndex = allRows.findIndex(row => row.dataset.instanceId === parentInstanceId);
            if (parentRowIndex === -1) {
                console.warn(`Parent instance ${parentInstanceId} not found`);
                return []; // Return empty array if parent not found
            }
            const parentLevel = parseInt(allRows[parentRowIndex].dataset.level, 10);

            // Iterate through rows starting after the parent instance row
            let currentIndex = parentRowIndex + 1;
            while (currentIndex < allRows.length) {
                const currentRow = allRows[currentIndex];

                // Stop if we hit another instance at the same level as the parent or an end marker for the parent's level
                const currentRowLevel = parseInt(currentRow.dataset.level, 10);
                 if (currentRow.classList.contains('occurrence-instance-row') && currentRowLevel <= parentLevel) {
                    break;
                }
                 if (currentRow.classList.contains('occurrence-instance-end-marker') && parseInt(currentRow.dataset.level, 10) === parentLevel) {
                     break;
                 }


                // If this row is an instance of the nested occurrence we're looking for
                if (currentRow.classList.contains('occurrence-instance-row') && currentRow.dataset.parentDefId === nestedOccName) {
                    const nestedInstanceId = currentRow.dataset.instanceId;
                    console.log(`Processing nested instance (ID: ${nestedInstanceId}) of occurrence ${nestedOccName}`);

                    // Create data object for this instance
                    const instanceData = {};

                    // Process fields in this nested instance
                    if (occurrenceField.fields && Array.isArray(occurrenceField.fields)) {
                        occurrenceField.fields.forEach(field => {
                            if (field.type !== 'occurrence' && field.name) {
                                const fieldValue = getInstanceFieldValue(nestedInstanceId, field.name);
                                instanceData[field.name] = fieldValue;
                                console.log(`Nested instance field ${field.name} = "${fieldValue}"`);
                            } else if (field.type === 'occurrence') {
                                // Handle deeper nested occurrence within this instance
                                const subNestedOccName = field.id || field.name;
                                // Recursively process deeper nested occurrences and assign the resulting array
                                instanceData[subNestedOccName] = processNestedOccurrence(field, nestedInstanceId);
                                console.log(`Processed deeper nested occurrence ${subNestedOccName}`);
                            }
                        });
                    }

                    // Add instance data to the nested instances array
                    nestedInstancesData.push(instanceData);

                    // Skip rows belonging to this nested instance to avoid reprocessing
                    // Find the end marker for this nested instance or the next instance at the same level
                    let nextRowIndex = currentIndex + 1;
                    while(nextRowIndex < allRows.length) {
                         const nextRow = allRows[nextRowIndex];
                         if ((nextRow.classList.contains('occurrence-instance-end-marker') && nextRow.dataset.instanceId === nestedInstanceId) ||
                             (nextRow.classList.contains('occurrence-instance-row') && parseInt(nextRow.dataset.level, 10) <= parseInt(currentRow.dataset.level, 10))) {
                             currentIndex = nextRowIndex; // Move current index to the end of the processed instance
                             break;
                         }
                         nextRowIndex++;
                    }
                     if (nextRowIndex === allRows.length) {
                         currentIndex = allRows.length; // Reached end of file
                     }


                }

                currentIndex++;
            }

            return nestedInstancesData;
        };
        
        // Build a structured JSON object by directly scanning DOM for all occurrences and fields
        const buildStructuredJSON = () => {
            // Get the structure from ConfigServiceLoader
            const requestStructure = ConfigServiceLoader.currentStructure?.service_structure?.request;
            if (!requestStructure || !requestStructure.elements) {
                console.warn("No valid request structure available");
                return {};
            }
            
            // Final result
            const result = {};
            
            // Process each element in request structure
            for (const element of requestStructure.elements) {
                // Handle simple fields at top level
                if (element.type === 'field' && element.name) {
                    const fieldValue = getFieldValueFromDOM(element.name);
                    result[element.name] = fieldValue;
                    console.log(`Top-level field ${element.name} = "${fieldValue}"`);
                }
                // Handle occurrences
// Handle occurrences
else if (element.type === 'occurrence') {
    const occName = element.id || element.name;
    console.log(`Processing occurrence ${occName}`);
    
    // Initialize occurrence array
    result[occName] = [];
    
    // Find all instances of this occurrence
    const occInstanceRows = requestTbody.querySelectorAll(`tr.occurrence-instance-row[data-parent-def-id="${occName}"]`);
    console.log(`Found ${occInstanceRows.length} instances of occurrence ${occName}`);
    
    // Process each instance of the occurrence
    occInstanceRows.forEach((instanceRow, index) => {
        const instanceId = instanceRow.dataset.instanceId;
        console.log(`Processing instance ${index + 1} (ID: ${instanceId}) of occurrence ${occName}`);
        
        // Create data object for this instance
        const instanceData = {};
        
        // Process fields in this instance
        if (element.fields && Array.isArray(element.fields)) {
            for (const field of element.fields) {
                if (field.type !== 'occurrence' && field.name) {
                    const fieldValue = getInstanceFieldValue(instanceId, field.name);
                    instanceData[field.name] = fieldValue;
                    console.log(`Instance field ${field.name} = "${fieldValue}"`);
                }
                else if (field.type === 'occurrence') {
                    // Handle nested occurrence within this instance
                    const subNestedOccName = field.id || field.name;
                    instanceData[subNestedOccName] = processNestedOccurrence(field, instanceId);
                    console.log(`Processed deeper nested occurrence ${subNestedOccName}`);
                }
            }
        }
        
        // Add instance data to the occurrence array
        result[occName].push(instanceData);
    });
            }
        }

        return result;
        };
        
        // Build and return the request data object
        const result = buildStructuredJSON();
        console.log("Final request data:", result);
        return result;
    }
};


window.ConfigDataHandler = ConfigDataHandler;
