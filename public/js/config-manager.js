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
            this.saveButton.addEventListener('click', () => this._handleSave());
        }
        
        // Auto-fill button
        if (this.autoFillBtn) {
            this.autoFillBtn.addEventListener('click', () => this._handleAutoFill());
        }
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
    },
    
    // Load and display saved configurations
    _loadSavedConfigurations: function() {
        console.log("Loading saved configurations...");
        
        ConfigStorageManager.loadSavedConfigurations(null, (configs) => {
            console.log(`Loaded ${configs.length} configurations`);
            
            // Update the UI with the configurations
            ConfigUIManager.updateSavedConfigurationsList(configs);
        });
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    ConfigManager.init();
});
