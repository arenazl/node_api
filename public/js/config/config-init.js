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
    if (typeof ConfigDataHandler !== 'undefined' && ConfigDataHandler.initialize) {
        ConfigDataHandler.initialize(
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
            ConfigDataHandler.autoFillFields(serviceNumber, headerStructure, canalInput);
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
                        
                        // Auto-fill fields automatically when service is selected
                        const canalInput = document.getElementById('canalInput');
                        ConfigUtils.showNotification('Completando campos automáticamente...', 'info');
                        
                        // Fill fields with data from header sample
                        try {
                            ConfigDataHandler.autoFillFields(serviceNumber, structure.header_structure, canalInput);
                            console.log('Campos auto-completados al seleccionar servicio');
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
            if (ConfigDataHandler.validateInputs(canal, serviceNumber, canalInput, serviceSelect)) {
                // Disable save button while saving
                saveButton.disabled = true;
                saveButton.innerText = 'Guardando...';
                
                // Call save function with current parameters
                ConfigDataHandler.saveConfiguration(
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
    }
};

// Auto-initialize the config module
ConfigInit.initialize();
