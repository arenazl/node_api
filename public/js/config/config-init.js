/**
 * Configuration Initialization
 * 
 * Initializes configuration UI components and establishes connections between
 * UI elements and functionality
 */

const ConfigInit = {
/**
 * Initialize the configuration module
 */
initialize: function() {
    // console.log('Initializing Config Module...');
    
    // Initialize event listeners once DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit to ensure all scripts are fully loaded
        setTimeout(() => {
            // Initialize ConfigUIManager first
            this.initUIManager();
            
            // Then initialize event listeners
            this.initEventListeners();
            
            // Load services in the selector if it's empty
            const configServiceSelect = document.getElementById('configServiceSelect');
            if (configServiceSelect && configServiceSelect.options.length <= 1) {
                console.log('[ConfigInit] Cargando servicios disponibles al inicializar...');
                if (typeof ConfigServiceLoader !== 'undefined' && ConfigServiceLoader.loadAvailableServices) {
                    ConfigServiceLoader.loadAvailableServices(configServiceSelect);
                }
            }
        }, 100);
    });
    
    // Listen for service selection events
    window.addEventListener('fileUploaded', this.handleFileUploaded.bind(this));
    
    // Also listen via EventBus if available
    if (window.EventBus && window.AppEvents) {
        window.EventBus.subscribe(window.AppEvents.FILE_UPLOADED, this.handleFileUploaded.bind(this));
        console.log('[ConfigInit] Suscrito a eventos FILE_UPLOADED via EventBus');
    }
},

/**
 * Initialize ConfigUIManager with required DOM elements
 */
initUIManager: function() {
    // Get all required DOM elements
    const elements = {
        headerConfigTable: document.getElementById('headerConfigTable'),
        requestConfigTable: document.getElementById('requestConfigTable'),
        serviceSelect: document.getElementById('configServiceSelect'),
        canalInput: document.getElementById('canalInput'),
        versionInput: document.getElementById('versionInput'),
        versionDisplay: document.getElementById('versionDisplay'),
        saveButton: document.getElementById('saveConfigBtn'),
        autoFillBtn: document.getElementById('autoFillBtn')
    };
    
    // Initialize ConfigUIManager with these elements
    if (typeof ConfigUIManager !== 'undefined' && ConfigUIManager.initialize) {
        ConfigUIManager.initialize(elements);
        // console.log('ConfigUIManager initialized with DOM elements');
    } else {
        console.error('ConfigUIManager not available');
    }
    
    // Initialize ConfigDataHandler with DOM elements
    if (typeof window.ConfigDataHandler !== 'undefined' && window.ConfigDataHandler.initialize) {
        window.ConfigDataHandler.initialize(
            document.getElementById('headerConfigTable'),
            document.getElementById('requestConfigTable')
        );
        console.log('ConfigDataHandler initialized with table elements');
    } else {
        console.warn('ConfigDataHandler not available yet, retrying in 200ms...');
        // Retry after a short delay in case the script is still loading
        setTimeout(() => {
            if (typeof window.ConfigDataHandler !== 'undefined' && window.ConfigDataHandler.initialize) {
                window.ConfigDataHandler.initialize(
                    document.getElementById('headerConfigTable'),
                    document.getElementById('requestConfigTable')
                );
                console.log('ConfigDataHandler initialized with table elements (retry successful)');
            } else {
                console.error('ConfigDataHandler still not available after retry');
            }
        }, 200);
    }
},
    
    /**
     * Initialize all event listeners for configuration module
     */
    initEventListeners: function() {
        // Connect auto-fill button to its function
        //this.initAutoFillButton();
        
        // Connect service selector to loading functions
        this.initServiceSelector();
        
        // Connect save button
        this.initSaveButton();
        
        // Initialize canal propagation to header CANAL field
        this.initCanalPropagation();
        
        // Load saved configurations list
        this.loadSavedConfigurations();
        
        console.log('Config event listeners initialized');
    },
    
    /**
     * Initialize automatic propagation of canal value to CANAL field in header
     */
    initCanalPropagation: function() {
        const canalInput = document.getElementById('canalInput');
        if (!canalInput) {
            console.warn('Canal input not found in the DOM');
            return;
        }
        
        // Función para propagar el valor del canal
        const propagateCanalValue = function() {
            const canalValue = canalInput.value;
            
            // Use the exact selector for the CANAL field
            const canalFieldInput = document.querySelector('input[data-field-name="CANAL"][data-section="header"]');
            if (canalFieldInput) {
                canalFieldInput.value = canalValue;
                // Trigger change event to update any listeners
                const event = new Event('change');
                canalFieldInput.dispatchEvent(event);
                console.log(`Canal propagado: "${canalValue}" al campo CANAL de la cabecera`);
            } else {
                // Si no se encuentra aún, intentar de nuevo después de un delay
                setTimeout(() => {
                    const retryField = document.querySelector('input[data-field-name="CANAL"][data-section="header"]');
                    if (retryField) {
                        retryField.value = canalValue;
                        const event = new Event('change');
                        retryField.dispatchEvent(event);
                        console.log(`Canal propagado (retry): "${canalValue}" al campo CANAL de la cabecera`);
                    }
                }, 500);
            }
        };
        
        // Propagar cuando cambia el valor (blur)
        canalInput.addEventListener('blur', propagateCanalValue);
        
        // También propagar cuando cambia el valor (input)
        canalInput.addEventListener('input', propagateCanalValue);
        
        // Propagar el valor inicial si ya tiene uno
        if (canalInput.value) {
            setTimeout(propagateCanalValue, 100);
        }
        
        // Observer para detectar cuando se establece el valor programáticamente
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    propagateCanalValue();
                }
            });
        });
        
        // Observar cambios en el atributo value
        observer.observe(canalInput, {
            attributes: true,
            attributeFilter: ['value']
        });
        
        console.log('Canal propagation initialized (blur, input, initial value, and observer)');
    },
    
    /**
     * Load saved configurations list if available
     */
    loadSavedConfigurations: function() {
        if (typeof ConfigStorageManager !== 'undefined' &&
            ConfigStorageManager.loadSavedConfigurations &&
            ConfigUIManager.updateSavedConfigurationsList) {
            
            console.log('Cargando lista de configuraciones guardadas al iniciar...');
            
            // El primer parámetro es null para cargar todas las configuraciones
            ConfigStorageManager.loadSavedConfigurations(null, function(configs) {
                console.log(`Loaded ${configs.length} saved configurations on init`);
                ConfigUIManager.updateSavedConfigurationsList(configs);
            });
        } else {
            console.warn('No se pudo cargar la lista de configuraciones: componentes faltantes');
        }
    },
    
    /**
     * Initialize auto-fill button functionality
     */
    initAutoFillButton: function() {
        // Find auto-fill button in the DOM
        const autoFillBtn = document.getElementById('autoFillBtn');
        if (!autoFillBtn) {
            console.warn('Auto-fill button not found in the DOM');
            return;
        }
        
        // Get reference to service selector and canal input
        const serviceSelect = document.getElementById('configServiceSelect');
        const canalInput = document.getElementById('canalInput');
        
        // Attach click event handler
        autoFillBtn.addEventListener('click', function() {
            console.log('Auto-fill button clicked');
            
            // Get current service number
            const serviceNumber = serviceSelect ? serviceSelect.value : null;
            if (!serviceNumber) {
                ConfigUtils.showNotification('Seleccione un servicio primero', 'warning');
                return;
            }
            
            // Get current header structure from ConfigServiceLoader
            const headerStructure = ConfigServiceLoader.currentStructure ?
                ConfigServiceLoader.currentStructure.header_structure : null;
            
            // Call auto-fill function with current parameters
            window.ConfigDataHandler.autoFillFields(serviceNumber, headerStructure, canalInput);
        });
        
        console.log('Auto-fill button initialized');
    },
    
    /**
     * Initialize service selector functionality
     */
    initServiceSelector: function() {
        const serviceSelect = document.getElementById('configServiceSelect');
        if (!serviceSelect) {
            console.warn('Service selector not found in the DOM');
            return;
        }
        
        // Attach change event handler
        serviceSelect.addEventListener('change', function() {
            const serviceNumber = serviceSelect.value;
            if (serviceNumber) {
                // Show loading indicator in tables
                const headerTbody = document.querySelector('#headerConfigTable tbody');
                const requestTbody = document.querySelector('#requestConfigTable tbody');
                
                if (headerTbody) {
                    headerTbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando estructura de cabecera...</td></tr>';
                }
                if (requestTbody) {
                    requestTbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando estructura de requerimiento...</td></tr>';
                }
                
                // Load the service structure
                ConfigServiceLoader.loadServiceStructure(serviceNumber, function(structure) {
                    if (structure) {
                        console.log('Estructura cargada:', serviceNumber);
                        
                        // IMPORTANTE: Recuperar ExcelId (primero de sessionStorage, luego de la estructura)
                        let excelId = sessionStorage.getItem(`excelId_${serviceNumber}`);
                        
                        if (excelId) {
                            console.log(`📝 [CONFIG] ExcelId recuperado del sessionStorage: ${excelId} para servicio ${serviceNumber}`);
                        } else if (structure.excelId) {
                            // Si no está en sessionStorage, usar el que viene de la estructura (archivo de mapeo)
                            excelId = structure.excelId;
                            console.log(`📝 [CONFIG] ExcelId recuperado del servidor (mapeo): ${excelId} para servicio ${serviceNumber}`);
                            // Guardarlo en sessionStorage para futuras referencias en esta sesión
                            sessionStorage.setItem(`excelId_${serviceNumber}`, excelId);
                        } else {
                            console.warn(`⚠️ [CONFIG] No se encontró ExcelId para servicio ${serviceNumber} ni en sessionStorage ni en el servidor`);
                        }
                        
                        if (excelId) {
                            window.currentExcelInfo = {
                                excelId: parseInt(excelId),
                                serviceNumber: serviceNumber,
                                timestamp: new Date().toISOString()
                            };
                        } else {
                            window.currentExcelInfo = null;
                        }
                        
                        // Populate UI tables with structure (fields will be empty initially)
                        if (ConfigUIManager.populateHeaderConfigTable) {
                            ConfigUIManager.populateHeaderConfigTable(structure.header_structure);
                            console.log('Tabla de cabecera poblada con campos vacíos');
                        }
                        if (ConfigUIManager.populateRequestConfigTable) {
                            ConfigUIManager.populateRequestConfigTable(structure.service_structure);
                            console.log('Tabla de requerimiento poblada con campos vacíos');
                        }
                        
                        // Propagar el valor actual del canal a la tabla de cabecera
                        setTimeout(() => {
                            const canalValue = canalInput ? canalInput.value : 'SM';
                            const canalFieldInput = document.querySelector('input[data-field-name="CANAL"][data-section="header"]');
                            if (canalFieldInput && canalValue) {
                                canalFieldInput.value = canalValue;
                                const event = new Event('change');
                                canalFieldInput.dispatchEvent(event);
                                console.log(`Canal "${canalValue}" propagado automáticamente a la cabecera después de cargar estructura`);
                            }
                        }, 200);
                        
                        // Cargar versiones disponibles para este servicio
                        ConfigInit.loadServiceVersions(serviceNumber);
                        
                        // Auto-fill fields automatically when service is selected
                        const canalInput = document.getElementById('canalInput');
                        ConfigUtils.showNotification('Completando campos automáticamente...', 'info');
                        
                        // Add timing delay to ensure DOM elements are fully rendered
                        setTimeout(() => {
                            try {
                                // Verificar que ConfigDataHandler esté disponible
                                if (typeof window.ConfigDataHandler !== 'undefined' && window.ConfigDataHandler.autoFillFields) {
                                    window.ConfigDataHandler.autoFillFields(serviceNumber, structure.header_structure, canalInput);
                                    console.log('Campos auto-completados al seleccionar servicio');
                                } else {
                                    console.warn('ConfigDataHandler no está disponible, saltando auto-completado');
                                    ConfigUtils.showNotification('Estructura cargada correctamente', 'success');
                                }
                                
                                // Aplicar validaciones a los campos después de completarlos
                                setTimeout(() => {
                                    if (typeof ConfigUtils !== 'undefined' && ConfigUtils.applyValidationsToExistingFields) {
                                        ConfigUtils.applyValidationsToExistingFields();
                                        console.log('Validaciones aplicadas a campos existentes');
                                    }
                                }, 300);
                            } catch (err) {
                                console.error('Error al auto-completar campos:', err);
                                ConfigUtils.showNotification('Estructura cargada, pero hubo un error al auto-completar campos. Puede usar "Auto Llenar Campos" manualmente.', 'warning');
                            }
                        }, 500); // 500ms delay to ensure header table is fully rendered
                        
                        // Cargar las configuraciones guardadas para este servicio
                        if (typeof ConfigStorageManager !== 'undefined' &&
                            ConfigStorageManager.loadSavedConfigurations &&
                            ConfigUIManager.updateSavedConfigurationsList) {
                            
                            console.log(`Cargando configuraciones guardadas para el servicio ${serviceNumber}...`);
                            ConfigStorageManager.loadSavedConfigurations(serviceNumber, function(configs) {
                                ConfigUIManager.updateSavedConfigurationsList(configs);
                                console.log(`Se cargaron ${configs.length} configuraciones para el servicio ${serviceNumber}`);
                            });
                        }
                    } else {
                        ConfigUtils.showNotification('Error al cargar la estructura del servicio', 'error');
                    }
                });
            } else {
                // Clear tables when no service is selected
                if (ConfigUIManager.clearConfigTables) {
                    ConfigUIManager.clearConfigTables();
                }
            }
        });
        
        // console.log('Service selector initialized');
    },
    
    /**
     * Initialize save button functionality
     */
    initSaveButton: function() {
        const saveButton = document.getElementById('saveConfigBtn');
        if (!saveButton) {
            console.warn('Save button not found in the DOM');
            return;
        }
        
        // Get references to required inputs
        const serviceSelect = document.getElementById('configServiceSelect');
        const canalInput = document.getElementById('canalInput');
        const versionInput = document.getElementById('versionInput');
        const versionDisplay = document.getElementById('versionDisplay');
        
        // Attach click event handler
        saveButton.addEventListener('click', function() {
            const serviceNumber = serviceSelect ? serviceSelect.value : null;
            const serviceName = serviceSelect ?
                (serviceSelect.options[serviceSelect.selectedIndex] ?
                 serviceSelect.options[serviceSelect.selectedIndex].text : '') : '';
            const canal = canalInput ? canalInput.value : '';
            
            // Validate inputs
            if (window.ConfigDataHandler.validateInputs(canal, serviceNumber, canalInput, serviceSelect)) {
                // Disable save button while saving
                saveButton.disabled = true;
                saveButton.innerText = 'Guardando...';
                
                // Call save function with current parameters
                window.ConfigDataHandler.saveConfiguration(
                    serviceNumber,
                    serviceName,
                    canal,
                    // Success callback
                    function(config, filename) {
                        // Re-enable save button
                        saveButton.disabled = false;
                        saveButton.innerText = 'Guardar Configuración';
                        
                        // Update version display
                        if (versionDisplay && config.version) {
                            versionDisplay.textContent = config.version;
                        }
                        if (versionInput && config.version) {
                            versionInput.value = config.version;
                        }
                        
                        // Después de actualizar la UI y los campos, recargar la lista según el estado del toggle
                        if (ConfigStorageManager && ConfigStorageManager.loadSavedConfigurations) {
                            ConfigStorageManager.loadSavedConfigurations(
                                ConfigUIManager && ConfigUIManager.showAllConfigs ? null : serviceNumber,
                                function(configs) {
                                    if (ConfigUIManager && ConfigUIManager.updateSavedConfigurationsList) {
                                        ConfigUIManager.updateSavedConfigurationsList(configs);
                                    }
                                }
                            );
                        }
                    },
                    // Error callback
                    function(errorMsg) {
                        // Re-enable save button
                        saveButton.disabled = false;
                        saveButton.innerText = 'Guardar Configuración';
                    }
                );
            }
        });
        
        // console.log('Save button initialized');
    },
    
    /**
     * Handle file uploaded event
     * @param {Event} event - Custom event with file details
     */
    handleFileUploaded: function(eventOrData) {
        // Handle both DOM event and EventBus data formats
        let serviceNumber = null;
        
        if (eventOrData) {
            // Check if it's a DOM event (has detail property)
            if (eventOrData.detail && eventOrData.detail.serviceNumber) {
                serviceNumber = eventOrData.detail.serviceNumber;
            }
            // Or if it's direct data from EventBus
            else if (eventOrData.service_number) {
                serviceNumber = eventOrData.service_number;
            }
            
            // If service number is available, reload services and then select it
            if (serviceNumber) {
                const serviceSelect = document.getElementById('configServiceSelect');
                if (serviceSelect) {
                    console.log(`[ConfigInit] Nuevo Excel cargado. Recargando servicios para incluir: ${serviceNumber}`);
                    
                    // Reload services first to ensure the new one is in the list
                    ConfigServiceLoader.loadAvailableServices(serviceSelect, function(services) {
                        console.log(`[ConfigInit] Servicios recargados. Seleccionando servicio: ${serviceNumber}`);
                        
                        // After services are loaded, select the new service
                        setTimeout(() => {
                            for (let i = 0; i < serviceSelect.options.length; i++) {
                                if (serviceSelect.options[i].value === serviceNumber) {
                                    serviceSelect.selectedIndex = i;
                                    // Trigger change event to load structure
                                    serviceSelect.dispatchEvent(new Event('change'));
                                    console.log(`[ConfigInit] Servicio ${serviceNumber} seleccionado automáticamente`);
                                    break;
                                }
                            }
                        }, 100); // Small delay to ensure DOM is updated
                    });
                }
            }
        }
    },
    
    /**
     * Load available versions for a service and update the version UI
     * @param {string} serviceNumber - The service number to load versions for
     */
    loadServiceVersions: function(serviceNumber) {
        console.log(`[ConfigInit] Cargando versiones para servicio: ${serviceNumber}`);
        
        // Make request to get service versions
        fetch(`/api/services/versions?serviceNumber=${serviceNumber}`)
            .then(response => {
                console.log(`[ConfigInit] Response status: ${response.status}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`[ConfigInit] Respuesta completa del servidor:`, data);
                console.log(`[ConfigInit] Tipo de data.versions:`, typeof data.versions);
                console.log(`[ConfigInit] Longitud de data.versions:`, data.versions ? data.versions.length : 'N/A');
                
                if (data.versions && Array.isArray(data.versions)) {
                    console.log(`[ConfigInit] Versiones individuales:`, data.versions);
                    this.updateVersionUI(data.versions);
                } else {
                    console.warn(`[ConfigInit] No se encontraron versiones válidas para el servicio ${serviceNumber}`);
                    console.warn(`[ConfigInit] Estructura de datos recibida:`, data);
                    this.updateVersionUI([]);
                }
            })
            .catch(error => {
                console.error(`[ConfigInit] Error al cargar versiones para ${serviceNumber}:`, error);
                // En caso de error, mantener la versión por defecto
                this.updateVersionUI([]);
            });
    },
    
    /**
     * Load structure for a specific version
     * @param {string} serviceNumber - The service number
     * @param {Object} versionData - The version data object
     */
    loadVersionStructure: function(serviceNumber, versionData) {
        console.log(`[ConfigInit] Cargando estructura para versión: ${versionData.version}`);
        
        // Mostrar indicador de carga
        const headerTbody = document.querySelector('#headerConfigTable tbody');
        const requestTbody = document.querySelector('#requestConfigTable tbody');
        
        if (headerTbody) {
            headerTbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando estructura de cabecera...</td></tr>';
        }
        if (requestTbody) {
            requestTbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando estructura de requerimiento...</td></tr>';
        }
        
        // Crear URL para cargar estructura específica
        let structureUrl;
        
        // Si hay archivo de estructura específico, usarlo
        if (versionData.structure_file) {
            structureUrl = `/excel/structure/${versionData.structure_file}`;
            console.log(`[ConfigInit] Usando archivo de estructura específico: ${versionData.structure_file}`);
        } else {
            // Fallback a estructura por servicio (más reciente)
            structureUrl = `/excel/structure-by-service?service_number=${serviceNumber}`;
            console.log(`[ConfigInit] Usando estructura por servicio (fallback)`);
        }
        
        console.log(`[ConfigInit] URL de estructura: ${structureUrl}`);
        
        // Cargar la estructura específica
        fetch(structureUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(structure => {
                console.log(`[ConfigInit] Estructura cargada para versión ${versionData.version}:`, structure);
                
                // Actualizar las tablas con la nueva estructura
                if (ConfigUIManager.populateHeaderConfigTable) {
                    ConfigUIManager.populateHeaderConfigTable(structure.header_structure);
                    console.log('Tabla de cabecera actualizada para nueva versión');
                }
                if (ConfigUIManager.populateRequestConfigTable) {
                    ConfigUIManager.populateRequestConfigTable(structure.service_structure);
                    console.log('Tabla de requerimiento actualizada para nueva versión');
                }
                
                // Auto-completar campos para la nueva versión
                const canalInput = document.getElementById('canalInput');
                try {
                    window.ConfigDataHandler.autoFillFields(serviceNumber, structure.header_structure, canalInput);
                    console.log('Campos auto-completados para nueva versión');
                    
                    // Aplicar validaciones
                    setTimeout(() => {
                        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.applyValidationsToExistingFields) {
                            ConfigUtils.applyValidationsToExistingFields();
                        }
                    }, 300);
                } catch (err) {
                    console.error('Error al auto-completar campos para nueva versión:', err);
                }
                
                ConfigUtils.showNotification(`Estructura cargada para versión ${versionData.version}`, 'success');
            })
            .catch(error => {
                console.error(`[ConfigInit] Error al cargar estructura para versión ${versionData.version}:`, error);
                ConfigUtils.showNotification(`Error al cargar estructura para versión ${versionData.version}`, 'error');
            });
    },
    
    /**
     * Update the version UI based on available versions
     * @param {Array} versions - Array of version objects
     */
    updateVersionUI: function(versions) {
        // Buscar el contenedor del campo de versión
        let versionContainer = document.getElementById('versionDisplay');
        if (!versionContainer) {
            // Si no existe, buscar si hay un select previo
            versionContainer = document.getElementById('versionSelect');
        }
        if (!versionContainer) {
            // Si no existe ninguno, buscar el input oculto y su padre
            versionContainer = document.getElementById('versionInput');
            if (versionContainer) versionContainer = versionContainer.parentElement.querySelector('.version-display, #versionSelect');
        }
        if (!versionContainer) {
            // Si aún no existe, abortar
            console.error('[ConfigInit] No se encontró el contenedor de versión');
            return;
        }
        const parent = versionContainer.parentElement;

        // Eliminar cualquier select o div de versión previo
        const oldSelect = document.getElementById('versionSelect');
        if (oldSelect) parent.removeChild(oldSelect);
        const oldDiv = document.getElementById('versionDisplay');
        if (oldDiv) parent.removeChild(oldDiv);

        const versionInput = document.getElementById('versionInput');
        if (!versionInput) {
            console.error('[ConfigInit] No se encontró el input oculto de versión');
            return;
        }

        if (versions && Array.isArray(versions) && versions.length > 1) {
            // Crear combo
            const select = document.createElement('select');
            select.id = 'versionSelect';
            select.className = 'form-control';
            select.style.width = '100%';
            versions.forEach((version, index) => {
                const option = document.createElement('option');
                // Usar displayName si está disponible, sino usar filename sin extensión
                const displayText = version.displayName || version.filename?.replace('.json', '') || version.version || `v${index + 1}`;
                option.value = version.filename || `${version.version || `v${index + 1}`}.json`;
                option.textContent = displayText;
                if (version.timestamp) {
                    const date = new Date(version.timestamp);
                    option.textContent += ` (${date.toLocaleDateString('es-AR')})`;
                }
                if (index === 0) option.selected = true;
                select.appendChild(option);
            });
            select.addEventListener('change', function() {
                versionInput.value = this.value;
                
                // Recargar la estructura para la nueva versión seleccionada
                const serviceSelect = document.getElementById('configServiceSelect');
                const serviceNumber = serviceSelect ? serviceSelect.value : null;
                
                if (serviceNumber) {
                    console.log(`[ConfigInit] Cambiando a versión: ${this.value} para servicio: ${serviceNumber}`);
                    
                    // Buscar la versión seleccionada en el array de versiones
                    const selectedVersion = versions.find(v => v.version === this.value);
                    if (selectedVersion) {
                        console.log(`[ConfigInit] Cargando estructura para versión:`, selectedVersion);
                        
                        // Cargar la estructura específica de esta versión
                        ConfigInit.loadVersionStructure(serviceNumber, selectedVersion);
                    }
                }
            });
            parent.insertBefore(select, versionInput);
            versionInput.value = select.value;
        } else {
            // Crear input deshabilitado (div)
            let versionText = 'v1';
            if (versions && Array.isArray(versions) && versions.length === 1) {
                versionText = versions[0].version || 'v1';
            }
            const div = document.createElement('div');
            div.id = 'versionDisplay';
            div.className = 'version-display';
            div.textContent = versionText;
            parent.insertBefore(div, versionInput);
            versionInput.value = versionText;
        }
    }
};
    
// Auto-initialize the config module
ConfigInit.initialize();

// Al inicializar la pantalla de configuración o crear nueva configuración
const canalInput = document.getElementById('canalInput');
if (canalInput && !canalInput.value) {
    canalInput.value = 'SM';
    
    // Propagar el valor por defecto al campo CANAL de la cabecera
    setTimeout(() => {
        const canalFieldInput = document.querySelector('input[data-field-name="CANAL"][data-section="header"]');
        if (canalFieldInput) {
            canalFieldInput.value = 'SM';
            const event = new Event('change');
            canalFieldInput.dispatchEvent(event);
            console.log('Canal por defecto "SM" propagado a la cabecera');
        }
    }, 100);
}

// Al inicializar el panel, conectar el callback del toggle
if (ConfigUIManager && ConfigUIManager.onToggleShowAllConfigs === undefined) {
    ConfigUIManager.onToggleShowAllConfigs = (showAll) => {
        const serviceSelect = document.getElementById('configServiceSelect');
        const serviceNumber = serviceSelect ? serviceSelect.value : null;
        if (ConfigStorageManager && ConfigStorageManager.loadSavedConfigurations) {
            ConfigStorageManager.loadSavedConfigurations(showAll ? null : serviceNumber, function(configs) {
                if (ConfigUIManager && ConfigUIManager.updateSavedConfigurationsList) {
                    ConfigUIManager.updateSavedConfigurationsList(configs);
                }
            });
        }
    };
}

// Al cambiar de servicio, recargar según el estado del toggle
const serviceSelect = document.getElementById('configServiceSelect');
if (serviceSelect) {
    serviceSelect.addEventListener('change', function() {
        if (ConfigUIManager && typeof ConfigUIManager.showAllConfigs !== 'undefined' && ConfigUIManager.showAllConfigs) {
            // Si el toggle está activado, cargar todas
            ConfigStorageManager.loadSavedConfigurations(null, function(configs) {
                if (ConfigUIManager && ConfigUIManager.updateSavedConfigurationsList) {
                    ConfigUIManager.updateSavedConfigurationsList(configs);
                }
            });
        } else {
            // Si el toggle está desactivado, cargar solo las del servicio
            const serviceNumber = serviceSelect.value;
            ConfigStorageManager.loadSavedConfigurations(serviceNumber, function(configs) {
                if (ConfigUIManager && ConfigUIManager.updateSavedConfigurationsList) {
                    ConfigUIManager.updateSavedConfigurationsList(configs);
                }
            });
        }
    });
}
