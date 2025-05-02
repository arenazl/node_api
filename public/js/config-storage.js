/**
 * Configuration Storage Manager
 * 
 * Handles saving, loading, and managing stored configurations
 */

const ConfigStorageManager = {
    /**
     * Save a configuration to the server
     * @param {string} serviceNumber - Service number
     * @param {string} serviceName - Service name
     * @param {string} canal - Canal value
     * @param {string} version - Version string
     * @param {Object} header - Header data
     * @param {Object} request - Request data
     * @param {Function} onSuccess - Callback on successful save
     * @param {Function} onError - Callback on error
     */
    saveConfiguration: function(serviceNumber, serviceName, canal, version, header, request, onSuccess, onError) {
        // Create configuration object
        const configuration = {
            serviceNumber: serviceNumber,
            serviceName: serviceName,
            canal: canal,
            version: version,
            timestamp: new Date().toISOString(),
            header: header || {},
            request: request || {}
        };

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
            
            // Return the saved configuration with the filename
            const savedConfig = {
                ...configuration,
                filename: data.filename
            };
            
            // Call success callback if provided
            if (typeof onSuccess === 'function') {
                onSuccess(savedConfig);
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
