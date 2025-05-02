/**
 * Configuration UI Manager
 * 
 * Handles UI interactions, tab switching, rendering, and visual elements
 */

const ConfigUIManager = {
    // DOM elements
    headerConfigTable: null,
    requestConfigTable: null,
    serviceSelect: null,
    canalInput: null,
    versionInput: null,
    versionDisplay: null,
    saveButton: null,
    autoFillBtn: null,
    
    /**
     * Initialize the UI manager
     * @param {Object} elements - Object with DOM elements
     */
    initialize: function(elements) {
        // Set DOM elements
        this.headerConfigTable = elements.headerConfigTable;
        this.requestConfigTable = elements.requestConfigTable;
        this.serviceSelect = elements.serviceSelect;
        this.canalInput = elements.canalInput;
        this.versionInput = elements.versionInput;
        this.versionDisplay = elements.versionDisplay;
        this.saveButton = elements.saveButton;
        this.autoFillBtn = elements.autoFillBtn;
        
        // Initialize config tabs
        this.initConfigTabs();
        
        // Create saved configurations panel
        this.createSavedConfigurationsPanel();
    },
    
    /**
     * Initialize config tab switching
     */
    initConfigTabs: function() {
        const configTabBtns = document.querySelectorAll('.config-tab-btn');
        
        configTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-config-tab');
                this.showConfigTab(tabName);
            });
        });
    },
    
    /**
     * Show a specific config tab
     * @param {string} tabName - Name of the tab to show
     */
    showConfigTab: function(tabName) {
        document.querySelectorAll('.config-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-config-tab') === tabName);
        });
        document.querySelectorAll('.config-tab-pane').forEach(tab => {
            tab.classList.toggle('active', tab.id === tabName);
        });
    },
    
    /**
     * Clear config tables and show "select service" message
     */
    clearConfigTables: function() {
        // Header table
        const headerTbody = this.headerConfigTable.querySelector('tbody');
        headerTbody.innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">Seleccione un servicio para cargar los campos de la cabecera</td></tr>';

        // Request table
        const requestTbody = this.requestConfigTable.querySelector('tbody');
        requestTbody.innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">Seleccione un servicio para cargar los campos del requerimiento</td></tr>';
    },
    
    /**
     * Populate header configuration table with fields from structure
     * @param {Object} headerStructure - Header structure definition
     */
    populateHeaderConfigTable: function(headerStructure) {
        if (!headerStructure || !headerStructure.fields) {
            console.warn("Invalid header structure or missing fields.");
            this.headerConfigTable.querySelector('tbody').innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">Estructura de cabecera inválida.</td></tr>';
            return;
        }

        const tbody = this.headerConfigTable.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous content

        headerStructure.fields.forEach(field => {
            // Skip placeholder/comment rows often found in structure definitions
            if (field.name && field.name !== '*' && field.name !== 'REQUERIMIENTO' && field.type !== 'Longitud del CAMPO') {
                const row = document.createElement('tr');

                // Field name cell
                const nameCell = document.createElement('td');
                nameCell.textContent = field.name;
                row.appendChild(nameCell);

                // Field type cell
                const typeCell = document.createElement('td');
                typeCell.textContent = field.type || '';
                row.appendChild(typeCell);

                // Field length cell
                const lengthCell = document.createElement('td');
                lengthCell.textContent = field.length || '';
                row.appendChild(lengthCell);

                // Field value cell with input
                const valueCell = document.createElement('td');
                const input = ConfigUtils.createFieldInput(field);
                input.dataset.fieldName = field.name; // Essential for saving
                input.dataset.section = 'header'; // Essential for saving
                valueCell.appendChild(input);
                row.appendChild(valueCell);

                tbody.appendChild(row);
            }
        });
        
        if (tbody.children.length === 0) {
            tbody.innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">No hay campos configurables en la cabecera.</td></tr>';
        }
    },
    
    /**
     * Populate request configuration table with fields from structure
     * @param {Object} serviceStructure - Service structure definition
     */
    populateRequestConfigTable: function(serviceStructure) {
        const tbody = this.requestConfigTable.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous content

        // Check for request structure and elements
        if (!serviceStructure || !serviceStructure.request || !Array.isArray(serviceStructure.request.elements)) {
            console.warn("Invalid request structure or missing elements.");
            tbody.innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">Estructura de requerimiento inválida o vacía.</td></tr>';
            return;
        }
        
        if (serviceStructure.request.elements.length === 0) {
            tbody.innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">El requerimiento no tiene campos definidos.</td></tr>';
            return;
        }

        // Process elements recursively starting at level 0
        ConfigOccurrenceHandler.processElements(serviceStructure.request.elements, tbody, 'request', 0);
    },
    
    /**
     * Create the saved configurations panel in the UI
     */
    createSavedConfigurationsPanel: function() {
        // Check if panel already exists
        if (document.getElementById('savedConfigurationsPanel')) {
            return;
        }

        // Find the configuration container to append our panel
        const configContainer = document.querySelector('.config-container');
        if (!configContainer) {
            console.warn("Configuration container not found");
            return;
        }

        // Create the panel container
        const panel = document.createElement('div');
        panel.id = 'savedConfigurationsPanel';
        panel.className = 'saved-configs-panel';
        panel.style.marginTop = '2rem';
        panel.style.padding = '1.5rem';
        panel.style.backgroundColor = '#f8fafc';
        panel.style.borderRadius = 'var(--radius)';
        panel.style.border = '1px solid var(--border-color)';

        // Create panel header
        const header = document.createElement('h3');
        header.textContent = 'Configuraciones Guardadas';
        header.style.marginBottom = '1rem';
        panel.appendChild(header);

        // Create search container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.style.marginBottom = '1rem';
        searchContainer.style.position = 'relative';

        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'configSearchInput';
        searchInput.className = 'form-control';
        searchInput.placeholder = 'Buscar configuración...';
        searchInput.style.padding = '0.625rem';
        searchInput.style.paddingRight = '2.5rem';
        searchInput.style.border = '1px solid var(--border-color)';
        searchInput.style.borderRadius = 'var(--radius)';
        searchInput.style.width = '100%';
        searchContainer.appendChild(searchInput);

        // Create search icon/button
        const searchIcon = document.createElement('span');
        searchIcon.innerHTML = '🔍';
        searchIcon.style.position = 'absolute';
        searchIcon.style.right = '0.75rem';
        searchIcon.style.top = '50%';
        searchIcon.style.transform = 'translateY(-50%)';
        searchIcon.style.pointerEvents = 'none';
        searchContainer.appendChild(searchIcon);

        panel.appendChild(searchContainer);

        // Create autocomplete results container
        const autoCompleteContainer = document.createElement('div');
        autoCompleteContainer.id = 'configAutocompleteResults';
        autoCompleteContainer.className = 'autocomplete-results';
        autoCompleteContainer.style.display = 'none';
        autoCompleteContainer.style.position = 'absolute';
        autoCompleteContainer.style.zIndex = '1000';
        autoCompleteContainer.style.width = '100%';
        autoCompleteContainer.style.maxHeight = '300px';
        autoCompleteContainer.style.overflowY = 'auto';
        autoCompleteContainer.style.backgroundColor = '#fff';
        autoCompleteContainer.style.border = '1px solid var(--border-color)';
        autoCompleteContainer.style.borderRadius = '0 0 var(--radius) var(--radius)';
        autoCompleteContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        searchContainer.appendChild(autoCompleteContainer);

        // Create configurations list container
        const configsList = document.createElement('div');
        configsList.id = 'savedConfigsList';
        configsList.className = 'saved-configs-list';
        configsList.style.maxHeight = '400px';
        configsList.style.overflowY = 'auto';
        panel.appendChild(configsList);

        // No configs placeholder
        const noConfigsMsg = document.createElement('p');
        noConfigsMsg.id = 'noConfigsMessage';
        noConfigsMsg.className = 'text-center';
        noConfigsMsg.style.fontStyle = 'italic';
        noConfigsMsg.style.color = 'var(--text-secondary)';
        noConfigsMsg.style.padding = '1.5rem 0';
        noConfigsMsg.textContent = 'No hay configuraciones guardadas.';
        configsList.appendChild(noConfigsMsg);

        // Add the panel to the config container
        configContainer.appendChild(panel);

        // Add event listener for the search input
        searchInput.addEventListener('input', this.handleConfigSearch.bind(this));
    },
    
    /**
     * Handle search input on the saved configurations panel
     * @param {Event} event - Input event
     */
    handleConfigSearch: function(event) {
        const searchTerm = event.target.value.trim().toLowerCase();
        const autocompleteContainer = document.getElementById('configAutocompleteResults');
        
        // Get all configurations from the data attributes on the list items
        const allConfigs = Array.from(document.querySelectorAll('#savedConfigsList .saved-config-item'))
            .map(item => {
                return {
                    element: item,
                    serviceNumber: item.dataset.serviceNumber,
                    serviceName: item.dataset.serviceName,
                    canal: item.dataset.canal,
                    version: item.dataset.version,
                    filename: item.dataset.filename
                };
            });

        if (searchTerm === '') {
            // Hide autocomplete when search is empty
            autocompleteContainer.style.display = 'none';
            
            // Show all configurations in the main list
            allConfigs.forEach(config => {
                config.element.style.display = 'flex';
            });
            
            // Show/hide the "no configs" message
            document.getElementById('noConfigsMessage').style.display = 
                allConfigs.length > 0 ? 'none' : 'block';
                
            return;
        }

        // Filter configurations by search term
        const matchingConfigs = allConfigs.filter(config => {
            return config.serviceNumber.toLowerCase().includes(searchTerm) ||
                   config.serviceName.toLowerCase().includes(searchTerm) ||
                   config.canal.toLowerCase().includes(searchTerm) ||
                   config.version.toLowerCase().includes(searchTerm) ||
                   config.filename.toLowerCase().includes(searchTerm);
        });

        // Populate autocomplete results
        autocompleteContainer.innerHTML = '';
        
        if (matchingConfigs.length > 0) {
            autocompleteContainer.style.display = 'block';
            
            matchingConfigs.forEach(config => {
                const resultItem = document.createElement('div');
                resultItem.className = 'autocomplete-item';
                resultItem.style.padding = '0.5rem 1rem';
                resultItem.style.cursor = 'pointer';
                resultItem.style.borderBottom = '1px solid #eee';
                
                // Highlight the matching part
                const displayText = `${config.serviceNumber} - ${config.serviceName} (${config.canal} ${config.version})`;
                resultItem.textContent = displayText;
                
                // Add hover effect
                resultItem.addEventListener('mouseover', () => {
                    resultItem.style.backgroundColor = '#f1f5f9';
                });
                
                resultItem.addEventListener('mouseout', () => {
                    resultItem.style.backgroundColor = '';
                });
                
                // Handle click on autocomplete item
                resultItem.addEventListener('click', () => {
                    // Trigger loading this configuration
                    ConfigStorageManager.loadSavedConfiguration(config.filename, (config) => {
                        this.applyConfigToForm(config);
                    });
                    
                    // Hide autocomplete and clear search
                    document.getElementById('configSearchInput').value = '';
                    autocompleteContainer.style.display = 'none';
                });
                
                autocompleteContainer.appendChild(resultItem);
            });
        } else {
            autocompleteContainer.style.display = 'block';
            
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.style.padding = '0.5rem 1rem';
            noResults.style.fontStyle = 'italic';
            noResults.style.color = 'var(--text-secondary)';
            noResults.textContent = 'No se encontraron configuraciones';
            
            autocompleteContainer.appendChild(noResults);
        }

        // Filter the main list as well
        allConfigs.forEach(config => {
            const matches = matchingConfigs.some(match => match.filename === config.filename);
            config.element.style.display = matches ? 'flex' : 'none';
        });
        
        // Show/hide the "no configs" message
        const visibleConfigs = allConfigs.filter(config => config.element.style.display !== 'none');
        document.getElementById('noConfigsMessage').style.display = 
            visibleConfigs.length > 0 ? 'none' : 'block';
    },
    
    /**
     * Add a configuration to the list of saved configurations
     * @param {Object} config - Configuration object
     */
    addConfigToList: function(config) {
        const configsList = document.getElementById('savedConfigsList');
        if (!configsList) return;
        
        // Create configuration item
        const item = document.createElement('div');
        item.className = 'saved-config-item';
        item.dataset.serviceNumber = config.serviceNumber || '';
        item.dataset.serviceName = config.serviceName || '';
        item.dataset.canal = config.canal || '';
        item.dataset.version = config.version || '';
        item.dataset.filename = config.filename || '';
        
        // Style the item
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '0.75rem 1rem';
        item.style.margin = '0.5rem 0';
        item.style.backgroundColor = '#fff';
        item.style.border = '1px solid #e2e8f0';
        item.style.borderRadius = 'var(--radius)';
        item.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
        
        // Create info section
        const infoSection = document.createElement('div');
        infoSection.className = 'config-info';
        
        // Add service info
        const serviceName = document.createElement('div');
        serviceName.className = 'service-name';
        serviceName.style.fontWeight = '600';
        serviceName.textContent = `${config.serviceNumber} - ${config.serviceName}`;
        infoSection.appendChild(serviceName);
        
        // Add details
        const details = document.createElement('div');
        details.className = 'config-details';
        details.style.fontSize = '0.875rem';
        details.style.color = 'var(--text-secondary)';
        
        // Format date if available
        let dateStr = '';
        if (config.timestamp) {
            const date = new Date(config.timestamp);
            dateStr = date.toLocaleDateString('es-AR') + ' ' + date.toLocaleTimeString('es-AR');
        }
        
        details.textContent = `Canal: ${config.canal} | Versión: ${config.version} | ${dateStr}`;
        infoSection.appendChild(details);
        
        item.appendChild(infoSection);
        
        // Create actions section
        const actionsSection = document.createElement('div');
        actionsSection.className = 'config-actions';
        actionsSection.style.display = 'flex';
        actionsSection.style.gap = '0.5rem';
        
        // Load button
        const loadBtn = document.createElement('button');
        loadBtn.className = 'action-btn secondary-btn';
        loadBtn.textContent = 'Cargar';
        loadBtn.style.padding = '0.375rem 0.75rem';
        loadBtn.style.fontSize = '0.875rem';
        
        // Set click handler
        const self = this;
        loadBtn.onclick = () => {
            ConfigStorageManager.loadSavedConfiguration(config.filename, (config) => {
                self.applyConfigToForm(config);
            });
        };
        
        actionsSection.appendChild(loadBtn);
        item.appendChild(actionsSection);
        
        // Add the item to the list
        configsList.appendChild(item);
        
        // Hide the "no configs" message if this is the first config
        document.getElementById('noConfigsMessage').style.display = 'none';
    },
    
    /**
     * Apply a loaded configuration to the form fields
     * @param {Object} config - Configuration object
     */
    applyConfigToForm: function(config) {
        // Ensure the service select has the right value
        if (config.serviceNumber) {
            // Find and select the service
            const serviceOption = Array.from(this.serviceSelect.options)
                .find(option => option.value === config.serviceNumber);
            
            if (serviceOption) {
                this.serviceSelect.value = config.serviceNumber;
                // Trigger change event to load structure
                this.serviceSelect.dispatchEvent(new Event('change'));
                
                // Wait for structure to load
                setTimeout(() => {
                    // Set canal value
                    this.canalInput.value = config.canal || '';
                    
                    // Set version
                    this.versionInput.value = config.version || '';
                    this.versionDisplay.textContent = config.version || '';
                    
                    // Fill header fields
                    if (config.header) {
                        Object.entries(config.header).forEach(([fieldName, value]) => {
                            const input = document.querySelector(`#headerConfigTable .config-field-input[data-field-name="${fieldName}"]`);
                            if (input) input.value = value;
                        });
                    }
                    
                    // TODO: Fill in occurrence data
                    
                }, 500);
            } else {
                console.warn(`Service ${config.serviceNumber} not found in select options`);
                ConfigUtils.showNotification(`El servicio ${config.serviceNumber} no está disponible`, 'error');
            }
        }
    },
    
    /**
     * Update the saved configurations panel
     * @param {Array} configs - Array of configuration objects
     */
    updateSavedConfigurationsList: function(configs) {
        const configsList = document.getElementById('savedConfigsList');
        const noConfigsMsg = document.getElementById('noConfigsMessage');
        
        if (!configsList) return;
        
        // Clear existing items except the "no configs" message
        Array.from(configsList.children).forEach(child => {
            if (child !== noConfigsMsg) {
                child.remove();
            }
        });
        
        if (configs && Array.isArray(configs) && configs.length > 0) {
            // Hide the "no configs" message
            if (noConfigsMsg) noConfigsMsg.style.display = 'none';
            
            // Add each configuration to the list
            configs.forEach(config => {
                this.addConfigToList(config);
            });
        } else {
            // Show the "no configs" message
            if (noConfigsMsg) noConfigsMsg.style.display = 'block';
        }
    }
};
