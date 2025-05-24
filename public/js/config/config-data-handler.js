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
    autoFillInput: function(input, canalValue = '') {
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
            const mainCanalValue = canalValue?.trim().toUpperCase() || '';
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
            
            return foundInput ? (foundInput.value || "") : "";
        };
        
        // Function to recursively process nested occurrences
        const processNestedOccurrence = (occurrenceField, parentInstanceId) => {
            const nestedOccName = occurrenceField.id || occurrenceField.name;
            
            console.log(`Processing nested occurrence: ${nestedOccName}, parent instance: ${parentInstanceId}`);
            
            // Get all rows in the table body as an array for easier traversal
            const allRows = Array.from(requestTbody.querySelectorAll('tr'));
            
            // Find the row that corresponds to the nested occurrence under the parent instance
            let nestedInstanceRow = null;
            let startSearchIndex = 0;
            
            // First, find the parent instance row
            const parentRow = allRows.find((row, index) => {
                if (row.dataset.instanceId === parentInstanceId) {
                    startSearchIndex = index;
                    return true;
                }
                return false;
            });
            
            if (!parentRow) {
                console.warn(`Parent instance ${parentInstanceId} not found`);
                return {};
            }
            
            console.log(`Parent instance found at index ${startSearchIndex}, looking for nested occurrence ${nestedOccName}`);
            
            // Now search for the nested occurrence instance row after the parent row
            for (let i = startSearchIndex; i < allRows.length; i++) {
                const row = allRows[i];
                if (row.classList.contains('occurrence-instance-row') && 
                    row.dataset.parentDefId === nestedOccName) {
                    nestedInstanceRow = row;
                    console.log(`Found nested instance row at index ${i}`);
                    break;
                }
            }
            
            if (!nestedInstanceRow) {
                console.warn(`No nested occurrence instance found for ${nestedOccName}`);
                return {};
            }
            
            // Get the nested instance ID
            const nestedInstanceId = nestedInstanceRow.dataset.instanceId;
            
            // Create object to hold the nested occurrence data
            const nestedData = {};
            
            // Get the index of the nested instance row
            const nestedInstanceIndex = allRows.indexOf(nestedInstanceRow);
            let currentIndex = nestedInstanceIndex + 1; // Start with the row after the instance row
            
            console.log(`Starting to process fields from row index ${currentIndex}`);
            
            // Process all rows until we find an end marker
            while (currentIndex < allRows.length) {
                const currentRow = allRows[currentIndex];
                
                // Debug what we're looking at
                console.log(`Checking row ${currentIndex}: ${currentRow.className}`);
                
                // If we hit another occurrence instance or an end marker, stop
                if (currentRow.classList.contains('occurrence-instance-row') || 
                    currentRow.classList.contains('occurrence-instance-end-marker')) {
                    console.log('Reached end of this nested occurrence section');
                    break;
                }
                
                // If this is a field row, extract its value
                if (currentRow.classList.contains('field-row')) {
                    // Find field name from the first cell
                    const fieldNameCell = currentRow.querySelector('td:first-child');
                    if (fieldNameCell) {
                        const fieldName = fieldNameCell.textContent.trim();
                        const input = currentRow.querySelector('.config-field-input');
                        
                        if (fieldName && input) {
                            nestedData[fieldName] = input.value || '';
                            console.log(`Collected nested field: ${fieldName} = "${nestedData[fieldName]}"`);
                        }
                    }
                }
                
                // Check if this is the last field (any class that starts with last-field-in-instance)
                const hasLastFieldClass = Array.from(currentRow.classList).some(cls => 
                    cls.startsWith('last-field-in-instance-')
                );
                
                if (hasLastFieldClass) {
                    console.log('Found row with last-field class, stopping collection');
                    break;
                }
                
                currentIndex++;
            }
            
            // Now process any deeper nested occurrences
            if (occurrenceField.fields && Array.isArray(occurrenceField.fields)) {
                occurrenceField.fields.forEach(field => {
                    if (field.type === 'occurrence') {
                        const subNestedOccName = field.id || field.name;
                        nestedData[subNestedOccName] = processNestedOccurrence(field, nestedInstanceId);
                        console.log(`Processed deeper nested occurrence ${subNestedOccName}`);
                    }
                });
            }
            
            return nestedData;
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
                                    const nestedOccName = field.id || field.name;
                                    instanceData[nestedOccName] = processNestedOccurrence(field, instanceId);
                                    console.log(`Processed nested occurrence ${nestedOccName}`);
                                }
                            }
                        }
                        
                        // Add this instance to the occurrence array
                        result[occName].push(instanceData);
                    });
                    
                    // If no instances found, add a default instance object
                    if (occInstanceRows.length === 0) {
                        console.log(`No instances found for occurrence ${occName}, adding default instance`);
                        const defaultInstance = {};
                        
                        // Add default fields
                        if (element.fields && Array.isArray(element.fields)) {
                            for (const field of element.fields) {
                                if (field.type !== 'occurrence' && field.name) {
                                    defaultInstance[field.name] = "";
                                }
                                else if (field.type === 'occurrence') {
                                    const nestedOccName = field.id || field.name;
                                    defaultInstance[nestedOccName] = {};
                                }
                            }
                        }
                        
                        result[occName].push(defaultInstance);
                    }
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
