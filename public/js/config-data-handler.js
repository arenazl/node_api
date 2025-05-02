/**
 * Configuration Data Handler
 * 
 * Handles data collection, validation, auto-filling, and saving of configuration data
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
            
            // Fallback to default method if no sample is available
            const headerInputs = document.querySelectorAll('#headerConfigTable .config-field-input');
            headerInputs.forEach(input => {
                this.autoFillInput(input, canalInput?.value);
            });
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
            
            ConfigUtils.showNotification(`Campos de cabecera llenados automáticamente. ${fieldsPopulated} campos desde muestra.`, 'success');
        }
    },
    
    /**
     * Generate an appropriate value for a field based on its properties
     * @param {HTMLElement} input - The input element to fill
     * @param {string} canalValue - Value from the canal input field
     */
    autoFillInput: function(input, canalValue = 'ME') {
        const fieldName = input.dataset.fieldName || '';
        const fieldType = input.type;
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
        
        // Generate value based on field name and type
        let value = '';
        
        // Use the canal value from the interface input
        if (fieldName.toUpperCase() === 'CANAL') {
            // Get canal value from the main interface input
            const mainCanalValue = canalValue?.trim().toUpperCase() || 'ME';
            input.value = mainCanalValue;
            return;
        }
        
        // Handle date fields
        if (fieldName.toUpperCase().includes('FECHA')) {
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
        // Handle numeric fields
        else if (input.pattern === '[0-9]*' || fieldType === 'number') {
            // Generate a numeric value of appropriate length
            const numLength = Math.min(maxLength, 9); // Avoid huge numbers
            value = Math.floor(Math.pow(10, numLength - 1) + Math.random() * 9 * Math.pow(10, numLength - 1)).toString();
            
            // Ensure it's not longer than maxLength
            if (value.length > maxLength) {
                value = value.substring(0, maxLength);
            }
        }
        // Handle text fields
        else {
            if (fieldName.toUpperCase().includes('NOMBRE')) {
                value = 'Pedro González';
            }
            else if (fieldName.toUpperCase().includes('APELLIDO')) {
                value = 'García';
            }
            else if (fieldName.toUpperCase().includes('DIRECC')) {
                value = 'Av. Corrientes 123';
            }
            else if (fieldName.toUpperCase().includes('MAIL')) {
                value = 'prueba@ejemplo.com';
            }
            else if (fieldName.toUpperCase().includes('TEL')) {
                value = '1123456789';
            }
            else {
                // Generic text field - use field name as a hint
                const fieldNameShort = fieldName.substring(0, Math.min(5, fieldName.length));
                value = `${fieldNameShort}_${Math.floor(Math.random() * 1000)}`;
            }
            
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
        // Update version counter and create version string
        this.versionCounter++;
        const versionStr = `v${this.versionCounter}`;
        
        // Create configuration object
        const configuration = {
            serviceNumber: serviceNumber,
            serviceName: serviceName,
            canal: canal,
            version: versionStr,
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

        // Optional: Log the collected data before sending
        console.log("Configuration to save:", JSON.stringify(configuration, null, 2));

        // Send configuration to server
        fetch('/service-config/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(configuration),
        })
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
            ConfigUtils.showNotification(`Configuración guardada correctamente como: ${data.filename}`, 'success');
            
            // Call success callback if provided
            if (typeof onSuccess === 'function') {
                onSuccess(configuration, data.filename);
            }
        })
        .catch(error => {
            console.error('Error saving configuration:', error);
            ConfigUtils.showNotification(`Error al guardar configuración: ${error.message}`, 'error');
            
            // Call error callback if provided
            if (typeof onError === 'function') {
                onError(error.message);
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
            return input ? (input.value || "") : "";
        };
        
        // Function to get a field value from a specific instance
        const getInstanceFieldValue = (instanceId, fieldName) => {
            const input = requestTbody.querySelector(`tr[data-instance-id="${instanceId}"] .config-field-input[data-field-name="${fieldName}"]`);
            return input ? (input.value || "") : "";
        };
        
        // Function to recursively process nested occurrences
        const processNestedOccurrence = (occurrenceField, instanceId) => {
            const nestedOccName = occurrenceField.id || occurrenceField.name;
            const result = [];
            
            // Find instances of this nested occurrence
            const nestedInstanceRows = requestTbody.querySelectorAll(`tr.occurrence-instance-row[data-parent-def-id="${nestedOccName}"][data-instance-id*="${instanceId}"]`);
            
            if (nestedInstanceRows && nestedInstanceRows.length > 0) {
                // Process each nested instance
                nestedInstanceRows.forEach(nestedInstanceRow => {
                    const nestedInstanceId = nestedInstanceRow.dataset.instanceId;
                    if (!nestedInstanceId) return;
                    
                    const nestedInstanceData = {};
                    
                    // Process fields of the nested instance
                    if (occurrenceField.fields && Array.isArray(occurrenceField.fields)) {
                        occurrenceField.fields.forEach(field => {
                            if (field.type !== 'occurrence' && field.name) {
                                nestedInstanceData[field.name] = getInstanceFieldValue(nestedInstanceId, field.name);
                            } else if (field.type === 'occurrence') {
                                // Process deeper nested occurrences (recursive)
                                nestedInstanceData[field.id || field.name] = processNestedOccurrence(field, nestedInstanceId);
                            }
                        });
                    }
                    
                    // Only add the instance if it's not empty
                    if (!ConfigUtils.isEmptyInstance(nestedInstanceData)) {
                        result.push(nestedInstanceData);
                    }
                });
            }
            
            // Return the nested occurrence data array
            return result;
        };
        
        // Build a structured JSON object with the exact order defined by indices
        const buildStructuredJSON = () => {
            // Get the structure from ConfigServiceLoader
            const requestStructure = ConfigServiceLoader.currentStructure?.service_structure?.request;
            if (!requestStructure || !requestStructure.elements) {
                console.warn("No valid request structure available");
                return {};
            }
            
            // Final result with exact element order by index
            const result = {};
            
            // First get all elements in an array and sort them by index
            const elements = requestStructure.elements || [];
            
            // Sort elements by index to maintain the original order
            const sortedElements = [...elements].sort((a, b) => {
                const indexA = typeof a.index === 'number' ? a.index : Infinity;
                const indexB = typeof b.index === 'number' ? b.index : Infinity;
                return indexA - indexB;
            });
            
            // Process each element (fields and first-level occurrences)
            sortedElements.forEach(element => {
                // For simple fields at first level
                if (element.type === 'field' && element.name) {
                    result[element.name] = getFieldValueFromDOM(element.name);
                }
                // For first-level occurrences
                else if (element.type === 'occurrence') {
                    const occName = element.name || element.id || `occurrence_${element.index}`;
                    
                    // Store occurrence counter if it exists
                    if (element.countField) {
                        // Find the counter field in DOM
                        const countFieldValue = getFieldValueFromDOM(element.countField);
                        // If it exists, save it before the occurrence
                        if (countFieldValue) {
                            result[element.countField] = countFieldValue;
                        }
                    }
                    
                    // Initialize array for this occurrence
                    result[occName] = [];
                    
                    // Find instances of this occurrence
                    const occDefId = element.id;
                    const instanceRows = requestTbody.querySelectorAll(`tr.occurrence-instance-row[data-parent-def-id="${occDefId}"]`);
                    
                    // If instances exist, process them
                    if (instanceRows && instanceRows.length > 0) {
                        instanceRows.forEach(instanceRow => {
                            const instanceId = instanceRow.dataset.instanceId;
                            if (!instanceId) return;
                            
                            // Create the instance object
                            const instanceData = {};
                            
                            // Process instance fields ordered by index
                            if (element.fields && Array.isArray(element.fields)) {
                                // Sort fields by index
                                const sortedFields = [...element.fields].sort((a, b) => {
                                    const indexA = typeof a.index === 'number' ? a.index : Infinity;
                                    const indexB = typeof b.index === 'number' ? b.index : Infinity;
                                    return indexA - indexB;
                                });
                                
                                // Iterate over fields in original order by index
                                sortedFields.forEach(field => {
                                    // For normal fields
                                    if (field.type !== 'occurrence' && field.name) {
                                        instanceData[field.name] = getInstanceFieldValue(instanceId, field.name);
                                    }
                                    // For nested occurrences
                                    else if (field.type === 'occurrence') {
                                        const nestedOccName = field.name || field.id || `nested_${field.index}`;
                                        // Use recursive function to process nested occurrences
                                        instanceData[nestedOccName] = processNestedOccurrence(field, instanceId);
                                    }
                                });
                            }
                            
                            // Add the instance to its occurrence array
                            result[occName].push(instanceData);
                        });
                    } 
                    // If no instances and it's required to have at least one, create an empty one
                    else if (element.required || element.count > 0) {
                        const emptyInstance = {};
                        
                        // Process fields ordered by index
                        if (element.fields && Array.isArray(element.fields)) {
                            // Sort fields by index
                            const sortedFields = [...element.fields].sort((a, b) => {
                                const indexA = typeof a.index === 'number' ? a.index : Infinity;
                                const indexB = typeof b.index === 'number' ? b.index : Infinity;
                                return indexA - indexB;
                            });
                            
                            // Iterate over fields in original order by index
                            sortedFields.forEach(field => {
                                // For normal fields
                                if (field.type !== 'occurrence' && field.name) {
                                    emptyInstance[field.name] = "";
                                }
                                // For nested occurrences
                                else if (field.type === 'occurrence') {
                                    const nestedOccName = field.name || field.id || `nested_${field.index}`;
                                    // Create empty array for nested occurrence
                                    emptyInstance[nestedOccName] = [];
                                    
                                    // If nested occurrence is required, create an empty instance
                                    if (field.required || field.count > 0) {
                                        const emptyNestedInstance = {};
                                        
                                        // Process nested occurrence fields
                                        if (field.fields && Array.isArray(field.fields)) {
                                            field.fields.forEach(nestedField => {
                                                if (nestedField.name) {
                                                    emptyNestedInstance[nestedField.name] = "";
                                                }
                                            });
                                        }
                                        
                                        // Only add if it has at least one field
                                        if (Object.keys(emptyNestedInstance).length > 0) {
                                            emptyInstance[nestedOccName].push(emptyNestedInstance);
                                        }
                                    }
                                }
                            });
                        }
                        
                        // Only add the empty instance if it has at least one field
                        if (Object.keys(emptyInstance).length > 0) {
                            result[occName].push(emptyInstance);
                        }
                    }
                }
            });
            
            return result;
        };
        
        // Build object with exact order of elements in the structure
        const result = buildStructuredJSON();
        console.log("Collected request data:", result);
        return result;
    }
};
