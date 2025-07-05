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
    console.log('Initializing Config Module...');
    
    // Initialize event listeners once DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize ConfigUIManager first
        this.initUIManager();
        
        // Then initialize event listeners
        this.initEventListeners();
    });
    
    // Listen for service selection events
    window.addEventListener('fileUploaded', this.handleFileUploaded.bind(this));
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
        console.log('ConfigUIManager initialized with DOM elements');
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
        console.error('ConfigDataHandler not available or initialize method missing');
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
        
        // Add event to propagate canal value using blur instead of input
        canalInput.addEventListener('blur', function() {
            const canalValue = this.value;
            
            // Use the exact selector for the CANAL field
            const canalFieldInput = document.querySelector('input[data-field-name="CANAL"][data-section="header"]');
            if (canalFieldInput) {
                canalFieldInput.value = canalValue;
                // Trigger change event to update any listeners
                const event = new Event('change');
                canalFieldInput.dispatchEvent(event);
                console.log(`Canal propagado: "${canalValue}" al campo CANAL de la cabecera`);
            } else {
                console.log('No se encontró el campo CANAL en la cabecera');
            }
        });
        
        console.log('Canal propagation event initialized (onblur)');
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
                        
                        // Populate UI tables with structure (fields will be empty initially)
                        if (ConfigUIManager.populateHeaderConfigTable) {
                            ConfigUIManager.populateHeaderConfigTable(structure.header_structure);
                            console.log('Tabla de cabecera poblada con campos vacíos');
                        }
                        if (ConfigUIManager.populateRequestConfigTable) {
                            ConfigUIManager.populateRequestConfigTable(structure.service_structure);
                            console.log('Tabla de requerimiento poblada con campos vacíos');
                        }
                        
                        // Cargar versiones disponibles para este servicio
                        ConfigInit.loadServiceVersions(serviceNumber);
                        
                        // Auto-fill fields automatically when service is selected
                        const canalInput = document.getElementById('canalInput');
                        ConfigUtils.showNotification('Completando campos automáticamente...', 'info');
                        
                        // Fill fields with data from header sample
                        try {
                            window.ConfigDataHandler.autoFillFields(serviceNumber, structure.header_structure, canalInput);
                            console.log('Campos auto-completados al seleccionar servicio');
                            
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
        
        console.log('Service selector initialized');
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
                        
                        // Reload saved configurations list if available
                        if (ConfigStorageManager && ConfigStorageManager.loadSavedConfigurations) {
                            // Pasar null como primer parámetro para cargar todas las configuraciones
                            ConfigStorageManager.loadSavedConfigurations(null, function(configs) {
                                if (ConfigUIManager && ConfigUIManager.updateSavedConfigurationsList) {
                                    console.log(`Actualizando lista de configuraciones después de guardar: ${configs.length} configs`);
                                    ConfigUIManager.updateSavedConfigurationsList(configs);

                                    // Emitir evento de que la lista de configuraciones ha cambiado
                                    if (window.EventBus && window.AppEvents && window.AppEvents.CONFIG_LIST_CHANGED) {
                                        window.EventBus.publish(window.AppEvents.CONFIG_LIST_CHANGED, {
                                            serviceNumber: serviceNumber // Opcional: pasar el número de servicio afectado
                                        });
                                    }
                                }
                            });
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
        
        console.log('Save button initialized');
    },
    
    /**
     * Handle file uploaded event
     * @param {Event} event - Custom event with file details
     */
    handleFileUploaded: function(event) {
        if (event && event.detail) {
            const serviceNumber = event.detail.serviceNumber;
            
            // If service number is available, select it in the config service selector
            if (serviceNumber) {
                const serviceSelect = document.getElementById('configServiceSelect');
                if (serviceSelect) {
                    for (let i = 0; i < serviceSelect.options.length; i++) {
                        if (serviceSelect.options[i].value === serviceNumber) {
                            serviceSelect.selectedIndex = i;
                            // Trigger change event to load structure
                            serviceSelect.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
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
                option.value = version.version || `v${index + 1}`;
                option.textContent = version.version || `v${index + 1}`;
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
}
