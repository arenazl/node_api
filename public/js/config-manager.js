/**
 * Configuration Manager
 *
 * Main entry point for the configuration system.
 * This module orchestrates all the other modules.
 */

const ConfigManager = {
    // Version counter used for configuration versioning
    versionCounter: 1,
    
    // Initialize the configuration manager and all sub-modules
    init: function() {
        console.log("Initializing ConfigManager...");
        
        // DOM elements
        this.serviceSelect = document.getElementById('configServiceSelect');
        this.canalInput = document.getElementById('canalInput');
        this.versionInput = document.getElementById('versionInput');
        this.versionDisplay = document.getElementById('versionDisplay');
        this.saveButton = document.getElementById('saveConfigBtn');
        this.autoFillBtn = document.getElementById('autoFillBtn');
        this.headerConfigTable = document.getElementById('headerConfigTable');
        this.requestConfigTable = document.getElementById('requestConfigTable');
        
        // Initialize components
        this._initializeSubmodules();
        this._setupEventListeners();
        
        // Load available services
        this._loadServices();
        
        // Suscribirse a eventos del bus para actualizaciones automáticas
        this._setupEventBusListeners();
    },
    
    // Initialize all submodules with necessary references
    _initializeSubmodules: function() {
        // Initialize UI Manager
        ConfigUIManager.initialize({
            headerConfigTable: this.headerConfigTable,
            requestConfigTable: this.requestConfigTable,
            serviceSelect: this.serviceSelect,
            canalInput: this.canalInput,
            versionInput: this.versionInput,
            versionDisplay: this.versionDisplay,
            saveButton: this.saveButton,
            autoFillBtn: this.autoFillBtn
        });
        
        // Initialize Data Handler
        ConfigDataHandler.initialize(
            this.headerConfigTable,
            this.requestConfigTable
        );
    },
    
    // Set up event listeners
    _setupEventListeners: function() {
        // Service selection change
        this.serviceSelect.addEventListener('change', () => this._handleServiceChange());
        
        // Save button
        if (this.saveButton) {
            // Hide save button initially
            this.saveButton.style.display = 'none';
            this.saveButton.addEventListener('click', () => this._handleSave());
        }
        
        // Auto-fill button
        if (this.autoFillBtn) {
            this.autoFillBtn.addEventListener('click', () => this._handleAutoFill());
        }
        
        // Add event listeners for field changes to show save button
        this._setupFieldChangeListeners();
    },
    
    // Set up listeners for field changes to show save button
    _setupFieldChangeListeners: function() {
        // Add mutation observer to watch for when fields are added to the tables
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    this._addFieldChangeListeners();
                }
            });
        });
        
        // Observe both tables for changes
        if (this.headerConfigTable) {
            observer.observe(this.headerConfigTable, { childList: true, subtree: true });
        }
        
        if (this.requestConfigTable) {
            observer.observe(this.requestConfigTable, { childList: true, subtree: true });
        }
        
        // Add listener to canal input
        if (this.canalInput) {
            this.canalInput.addEventListener('input', () => {
                this._checkAndToggleSaveButton();
            });
        }
    },
    
    // Add change listeners to all input fields
    _addFieldChangeListeners: function() {
        // Collect all input fields from both tables
        const allInputs = document.querySelectorAll('#headerConfigTable .config-field-input, #requestConfigTable .config-field-input');
        
        // Add change listener to each input
        allInputs.forEach(input => {
            if (!input.dataset.hasChangeListener) {
                input.addEventListener('input', () => {
                    this._checkAndToggleSaveButton();
                });
                input.dataset.hasChangeListener = 'true';
            }
        });
    },
    
    // Check conditions and toggle save button
    _checkAndToggleSaveButton: function() {
        if (this.saveButton && this.serviceSelect.value) {
            // If service is selected and at least one field is modified, show save button
            const hasFieldModified = this._hasFieldModified();
            this.saveButton.style.display = hasFieldModified ? 'inline-block' : 'none';
        }
    },
    
    // Check if any field is modified
    _hasFieldModified: function() {
        // Check if canal input has a value
        if (this.canalInput && this.canalInput.value.trim()) {
            return true;
        }
        
        // Check if any field in header config table has a value
        const headerInputs = document.querySelectorAll('#headerConfigTable .config-field-input');
        for (let i = 0; i < headerInputs.length; i++) {
            if (headerInputs[i].value.trim()) {
                return true;
            }
        }
        
        // Check if any field in request config table has a value
        const requestInputs = document.querySelectorAll('#requestConfigTable .config-field-input');
        for (let i = 0; i < requestInputs.length; i++) {
            if (requestInputs[i].value.trim()) {
                return true;
            }
        }
        
        return false;
    },
    
    // Load available services for the dropdown
    _loadServices: function() {
        console.log("Loading available services...");
        
        ConfigServiceLoader.loadAvailableServices(this.serviceSelect, (services) => {
            console.log(`Loaded ${services.length} services`);
            
            // Load saved configurations for listing
            this._loadSavedConfigurations();
        });
    },
    
    // Handle service selection change
    _handleServiceChange: function() {
        const serviceNumber = this.serviceSelect.value;
        
        // Hide save button when service changes
        if (this.saveButton) {
            this.saveButton.style.display = 'none';
        }
        
        // Clear tables if no service selected
        if (!serviceNumber) {
            ConfigUIManager.clearConfigTables();
            ConfigServiceLoader.currentServiceNumber = null;
            ConfigServiceLoader.currentServiceName = null;
            ConfigServiceLoader.currentStructure = null;
            return;
        }
        
        // Load service structure
        ConfigServiceLoader.loadServiceStructure(
            serviceNumber,
            (structure) => {
                // Success callback
                console.log("Service structure loaded successfully");
                
                // Populate configuration tables
                ConfigUIManager.populateHeaderConfigTable(structure.header_structure);
                ConfigUIManager.populateRequestConfigTable(structure.service_structure);
            },
            (errorMessage) => {
                // Error callback
                console.error("Error loading service structure:", errorMessage);
                ConfigUIManager.clearConfigTables();
            }
        );
    },
    
    // Handle save button click
    _handleSave: function() {
        const canal = this.canalInput?.value?.trim().toUpperCase();
        const serviceNumber = ConfigServiceLoader.currentServiceNumber;
        const serviceName = ConfigServiceLoader.currentServiceName;
        
        // Validate inputs
        if (!ConfigDataHandler.validateInputs(canal, serviceNumber, this.canalInput, this.serviceSelect)) {
            return;
        }
        
        // Increment version counter
        this.versionCounter++;
        
        // Update version display
        const versionStr = `v${this.versionCounter}`;
        if (this.versionInput) this.versionInput.value = versionStr;
        if (this.versionDisplay) this.versionDisplay.textContent = versionStr;
        
        // Collect header field values
        const headerInputs = document.querySelectorAll('#headerConfigTable .config-field-input');
        const headerData = {};
        
        headerInputs.forEach(input => {
            const fieldName = input.dataset.fieldName;
            if (fieldName) {
                headerData[fieldName] = input.value || '';
            }
        });
        
        // Collect request data
        const requestData = ConfigDataHandler.collectRequestData();
        
        // Save configuration
        ConfigStorageManager.saveConfiguration(
            serviceNumber,
            serviceName,
            canal,
            versionStr,
            headerData,
            requestData,
            (savedConfig) => {
                // Success callback - reload saved configs
                this._loadSavedConfigurations();
                
                // Publicar evento para que otros componentes puedan reaccionar
                if (window.EventBus && window.AppEvents) {
                    console.log("Publicando evento CONFIG_SAVED con datos:", { 
                        serviceNumber, 
                        canal, 
                        version: versionStr 
                    });
                    window.EventBus.publish(window.AppEvents.CONFIG_SAVED, {
                        serviceNumber,
                        serviceName,
                        canal,
                        version: versionStr
                    });
                }
            },
            (errorMessage) => {
                // Error callback
                console.error("Error saving configuration:", errorMessage);
            }
        );
    },
    
    // Handle auto-fill button click
    _handleAutoFill: function() {
        if (!ConfigServiceLoader.currentStructure) {
            ConfigUtils.showNotification('Seleccione un servicio primero', 'error');
            return;
        }
        
        // Auto-fill fields
        ConfigDataHandler.autoFillFields(
            ConfigServiceLoader.currentServiceNumber,
            ConfigServiceLoader.currentStructure.header_structure,
            this.canalInput
        );
        
        // After auto-fill, check and show save button
        setTimeout(() => {
            this._checkAndToggleSaveButton();
        }, 100);
    },
    
    // Load and display saved configurations
    _loadSavedConfigurations: function() {
        console.log("Loading saved configurations...");
        
        ConfigStorageManager.loadSavedConfigurations(null, (configs) => {
            console.log(`Loaded ${configs.length} configurations`);
            
            // Update the UI with the configurations
            ConfigUIManager.updateSavedConfigurationsList(configs);
        });
    },
    
    // Set up event bus listeners for automatic updates
    _setupEventBusListeners: function() {
        // Si EventBus está disponible, suscribirse a eventos relevantes
        if (window.EventBus && window.AppEvents) {
            console.log("ConfigManager: Configurando escuchadores de eventos");
            
            // Cuando se carga un nuevo archivo Excel
            window.EventBus.subscribe(window.AppEvents.FILE_UPLOADED, (data) => {
                console.log("ConfigManager: Evento FILE_UPLOADED recibido", data);
                
                // Recargar la lista de servicios
                this._loadServices();
                
                // Si se especificó un número de servicio, seleccionarlo automáticamente
                if (data && data.service_number && this.serviceSelect) {
                    setTimeout(() => {
                        // Verificar si el servicio existe en las opciones
                        const options = Array.from(this.serviceSelect.options);
                        const serviceOption = options.find(option => option.value === data.service_number);
                        
                        if (serviceOption) {
                            console.log(`ConfigManager: Seleccionando automáticamente el servicio recién cargado: ${data.service_number}`);
                            
                            // Seleccionar el servicio
                            this.serviceSelect.value = data.service_number;
                            
                            // Disparar el evento change para cargar la estructura
                            this.serviceSelect.dispatchEvent(new Event('change'));
                            
                            // Mostrar notificación
                            ConfigUtils.showNotification(`Servicio ${data.service_number} seleccionado en configuración`, 'success');
                        }
                    }, 500); // Pequeño retraso para asegurar que los servicios se hayan cargado
                }
            });
            
            // Cuando se actualizan los servicios
            window.EventBus.subscribe(window.AppEvents.SERVICES_REFRESHED, (data) => {
                console.log("ConfigManager: Evento SERVICES_REFRESHED recibido", data);
                
                // Recargar la lista de servicios
                this._loadServices();
            });
        } else {
            console.warn("ConfigManager: EventBus no está disponible, no se configurarán actualizaciones automáticas");
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    ConfigManager.init();
});
