/**
 * Configuration Storage Manager
 * 
 * Handles saving, loading, and managing stored configurations
 */

// Exportar como ConfigStorage para mantener compatibilidad con cambios futuros
// También se proporciona como ConfigStorageManager mediante el archivo de compatibilidad
const ConfigStorage = {
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
     * @param {boolean} forceRefresh - If true, forces a refresh of the service cache on the server
     */
    loadSavedConfigurations: function(serviceNumber, onLoadCallback, forceRefresh = false) {
        console.log(`[ConfigStorage] Cargando configuraciones guardadas${serviceNumber ? ` para servicio ${serviceNumber}` : ''}${forceRefresh ? ' (forzando recarga)' : ''}...`);
        
        // Add refresh parameter to force server cache refresh if needed
        let url = serviceNumber ? `/service-config/list?service_number=${serviceNumber}` : '/service-config/list';
        if (forceRefresh) {
            url += (url.includes('?') ? '&' : '?') + 'refresh=true';
        }
        
        // Mostrar notificación de carga para el usuario
        //console.time('⏱️ loadSavedConfigurations');
        
        fetch(url)
            .then(response => {
                console.log(`[ConfigStorage] Respuesta recibida: ${response.status} ${response.statusText}`);
                if (!response.ok) {
                    throw new Error(`Error ${response.status} al obtener configuraciones`);
                }
                return response.json();
            })
            .then(data => {
                //console.timeEnd('⏱️ loadSavedConfigurations');
                
                const configCount = data.configs ? data.configs.length : 0;
                console.log(`[ConfigStorage] Se cargaron ${configCount} configuraciones guardadas:`, data);
                
                if (typeof onLoadCallback === 'function') {
                    console.log(`[ConfigStorage] Ejecutando callback con ${configCount} configuraciones`);
                    onLoadCallback(data.configs || []);
                } else {
                    console.warn('[ConfigStorage] No se proporcionó callback para procesar las configuraciones cargadas');
                }
                
                // Si no se encontraron configuraciones para este servicio, mostrar mensaje
                if (serviceNumber && (!data.configs || data.configs.length === 0)) {
                    console.log(`[ConfigStorage] No se encontraron configuraciones guardadas para el servicio ${serviceNumber}`);
                }
            })
            .catch(error => {
                //console.timeEnd('⏱️ loadSavedConfigurations');
                console.error('[ConfigStorage] Error cargando configuraciones:', error);
                ConfigUtils.showNotification(`Error al cargar configuraciones: ${error.message}`, 'error');
                
                // Call callback with empty array to handle the error state
                if (typeof onLoadCallback === 'function') {
                    console.log('[ConfigStorage] Ejecutando callback con array vacío debido a error');
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
