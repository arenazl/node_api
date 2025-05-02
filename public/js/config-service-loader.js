/**
 * Configuration Service Loader
 * 
 * Handles loading service structures and configurations from the server
 */

const ConfigServiceLoader = {
    // Current selected service
    currentServiceNumber: null,
    currentServiceName: null,
    currentStructure: null,
    
    /**
     * Loads available services for dropdown
     * @param {HTMLSelectElement} serviceSelect - The service selection dropdown
     * @param {Function} onLoadCallback - Optional callback after loading services
     */
    loadAvailableServices: function(serviceSelect, onLoadCallback) {
        if (!serviceSelect) {
            console.error("Service select element is required");
            return;
        }

        fetch('/excel/files')
            .then(response => response.json())
            .then(data => {
                if (data.files && Array.isArray(data.files)) {
                    // Clear existing options except the default
                    while (serviceSelect.options.length > 1) {
                        serviceSelect.remove(1);
                    }

                    // Map of service numbers to avoid duplicates
                    const serviceMap = new Map();

                    // Add each service
                    data.files.forEach(file => {
                        if (file.service_number && !serviceMap.has(file.service_number)) {
                            serviceMap.set(file.service_number, true);

                            const option = document.createElement('option');
                            option.value = file.service_number;
                            option.textContent = `${file.service_number} - ${file.service_name || 'Servicio'}`;
                            serviceSelect.appendChild(option);
                        }
                    });
                    
                    // Call the callback if provided
                    if (typeof onLoadCallback === 'function') {
                        onLoadCallback(data.files);
                    }
                }
            })
            .catch(error => {
                console.error('Error loading services:', error);
                ConfigUtils.showNotification('Error al cargar servicios disponibles', 'error');
            });
    },

    /**
     * Load service structure by service number
     * @param {string} serviceNumber - The service number to load
     * @param {Function} onSuccessCallback - Callback for successful load with structure data
     * @param {Function} onErrorCallback - Callback for error with error message
     */
    loadServiceStructure: function(serviceNumber, onSuccessCallback, onErrorCallback) {
        if (!serviceNumber) {
            if (typeof onErrorCallback === 'function') {
                onErrorCallback("No se proporcionó número de servicio");
            }
            return;
        }

        // Load structure by service number
        fetch(`/excel/structure-by-service?service_number=${serviceNumber}`)
            .then(response => {
                if (!response.ok) {
                    // Try to get error message from response body if possible
                    return response.text().then(text => {
                         throw new Error(text || 'Estructura no encontrada para este servicio');
                    });
                }
                return response.json();
            })
            .then(structure => {
                if (!structure || !structure.header_structure || !structure.service_structure) {
                    throw new Error('Estructura incompleta o inválida recibida del servidor');
                }

                // Store current service info
                this.currentServiceNumber = serviceNumber;
                this.currentServiceName = structure.service_structure.serviceName || 
                                          structure.service_structure.serviceNumber || 
                                          serviceNumber; // Use serviceNumber as fallback
                this.currentStructure = structure;

                // Call success callback with structure
                if (typeof onSuccessCallback === 'function') {
                    onSuccessCallback(structure);
                }

                // Show notification
                ConfigUtils.showNotification(`Estructura del servicio ${serviceNumber} cargada correctamente`, 'success');
            })
            .catch(error => {
                console.error('Error loading service structure:', error);
                ConfigUtils.showNotification(`Error al cargar la estructura: ${error.message}`, 'error');
                
                // Call error callback
                if (typeof onErrorCallback === 'function') {
                    onErrorCallback(error.message);
                }
            });
    },

    /**
     * Fetch header sample from the server for a service
     * @param {string} serviceNumber - The service number
     * @returns {Promise<string|null>} Promise that resolves to the header sample string or null if not found
     */
    fetchHeaderSample: async function(serviceNumber) {
        if (!serviceNumber) {
            console.warn("No hay servicio seleccionado para obtener header sample");
            return null;
        }

        console.log(`Buscando header sample para servicio ${serviceNumber}`);
        
        try {
            const response = await fetch(`/excel/header-sample/${serviceNumber}`);
            
            if (!response.ok) {
                console.warn(`No se encontró header sample para el servicio ${serviceNumber}, código: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            
            if (data && data.value) {
                console.log(`Header sample obtenido del servidor para servicio ${serviceNumber}:`, data.value);
                return data.value;
            }
            
            return null;
        } catch (error) {
            console.error(`Error al obtener header sample para el servicio ${serviceNumber}:`, error);
            return null;
        }
    },
    
    /**
     * Parse the header sample string based on the header structure
     * @param {string} headerSample - Raw header sample string
     * @param {Object} headerStructure - Header structure object
     * @returns {Object} Object with field values extracted from the sample
     */
    parseHeaderSample: function(headerSample, headerStructure) {
        if (!headerSample || !headerStructure || !headerStructure.fields) {
            console.warn("No se puede parsear header sample: falta header sample o estructura");
            return {};
        }
        
        console.log("Parseando header sample:", headerSample);
        
        const headerFields = headerStructure.fields || [];
        const parsedValues = {};
        
        let position = 0;
        
        headerFields.forEach(field => {
            // Skip non-data fields (special markers, comments, placeholder fields)
            if (!field.name || field.name === '*' || field.name === 'REQUERIMIENTO' || field.type === 'Longitud del CAMPO') {
                return;
            }
            
            // Skip CANAL field since we want to use the input value from the form
            if (field.name.toUpperCase() === 'CANAL') {
                position += parseInt(field.length || '0');
                console.log(`Campo CANAL ignorado: usando valor del input del formulario en su lugar`);
                return;
            }
            
            const fieldLength = parseInt(field.length || '0');
            if (fieldLength <= 0) {
                return;
            }
            
            // Extract the value from the header sample at current position
            const fieldValue = headerSample.substring(position, position + fieldLength).trim();
            
            // Store the parsed value
            parsedValues[field.name] = fieldValue;
            
            // Log the extraction for debugging
            console.log(`Campo: ${field.name}, Posición: ${position}, Longitud: ${fieldLength}, Valor extraído: '${fieldValue}'`);
            
            // Move the position forward by field length
            position += fieldLength;
        });
        
        return parsedValues;
    },

    /**
     * Load saved configurations for a service
     * @param {string} serviceNumber - Optional service number to filter configurations
     * @param {Function} onLoadCallback - Callback with the loaded configurations
     */
    loadSavedConfigurations: function(serviceNumber, onLoadCallback) {
        const url = serviceNumber ? `/service-config/list?service_number=${serviceNumber}` : '/service-config/list';
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error ${response.status} al obtener configuraciones`);
                }
                return response.json();
            })
            .then(data => {
                if (typeof onLoadCallback === 'function') {
                    onLoadCallback(data.configs || []);
                }
            })
            .catch(error => {
                console.error('Error loading configurations:', error);
                ConfigUtils.showNotification(`Error al cargar configuraciones: ${error.message}`, 'error');
                
                // Call callback with empty array to handle the error state
                if (typeof onLoadCallback === 'function') {
                    onLoadCallback([]);
                }
            });
    },

    /**
     * Load a specific saved configuration by ID
     * @param {string} configId - Configuration ID to load
     * @param {Function} onLoadCallback - Callback with the loaded configuration
     */
    loadSavedConfiguration: function(configId, onLoadCallback) {
        if (!configId) {
            if (typeof onLoadCallback === 'function') {
                onLoadCallback(null, "No se proporcionó ID de configuración");
            }
            return;
        }

        fetch(`/service-config/get/${configId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error ${response.status} al obtener la configuración`);
                }
                return response.json();
            })
            .then(config => {
                // Call the callback with the loaded configuration
                if (typeof onLoadCallback === 'function') {
                    onLoadCallback(config);
                }
                
                // Show success notification
                ConfigUtils.showNotification(`Configuración ${configId} cargada correctamente`, 'success');
            })
            .catch(error => {
                console.error('Error loading configuration:', error);
                ConfigUtils.showNotification(`Error al cargar configuración: ${error.message}`, 'error');
                
                // Call callback with error
                if (typeof onLoadCallback === 'function') {
                    onLoadCallback(null, error.message);
                }
            });
    }
};
