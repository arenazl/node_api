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
        
        // Setup auto-fill functionality
        //this.setupAutoFill();
        
        // Make auto-fill button visible by removing d-none class
        /*
        if (this.autoFillBtn) {
            this.autoFillBtn.classList.remove('d-none');
        }*/
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
        console.log('Creating saved configurations panel');
        
        // Check if panel already exists
        if (document.getElementById('savedConfigurationsPanel')) {
            console.log('Panel already exists, skipping creation');
            return;
        }

        // Find the configuration container to append our panel
        const configContainer = document.querySelector('.config-container');
        if (!configContainer) {
            console.error("Configuration container not found. Cannot create saved configurations panel");
            return;
        }
        
        console.log('Found config container, creating panel');

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
        item.style.cursor = 'pointer'; // Add cursor pointer to indicate it's clickable
        
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
        
        // Set click handler for the button
        const self = this;
        loadBtn.onclick = function(e) {
            e.stopPropagation(); // Prevent triggering the parent item click
            ConfigStorageManager.loadSavedConfiguration(config.filename, (config) => {
                self.applyConfigToForm(config);
            });
        };
        
        actionsSection.appendChild(loadBtn);
        item.appendChild(actionsSection);
        
        // Also make the whole item clickable to load the configuration
        item.onclick = function() {
            ConfigStorageManager.loadSavedConfiguration(config.filename, (config) => {
                self.applyConfigToForm(config);
            });
        };
        
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
                // Solo cambiar si es diferente para evitar eventos duplicados
                const needsChange = this.serviceSelect.value !== config.serviceNumber;
                
                if (needsChange) {
                    this.serviceSelect.value = config.serviceNumber;
                    // Trigger change event to load structure
                    this.serviceSelect.dispatchEvent(new Event('change'));
                    
                    // Wait for structure to load before continuing
                    setTimeout(() => this.fillConfigData(config), 500);
                } else {
                    // Si ya está seleccionado el servicio correcto, llenar datos inmediatamente
                    this.fillConfigData(config);
                }
            } else {
                console.warn(`Service ${config.serviceNumber} not found in select options`);
                ConfigUtils.showNotification(`El servicio ${config.serviceNumber} no está disponible`, 'error');
            }
        }
    },
    
    /**
     * Completa el formulario con los datos de la configuración
     * @param {Object} config - Objeto de configuración 
     */
    fillConfigData: function(config) {
        console.log("Llenando datos de configuración:", config.canal, config.version);
        
        // Limpiar valores existentes primero para evitar duplicados
        const headerInputs = document.querySelectorAll('#headerConfigTable .config-field-input');
        headerInputs.forEach(input => {
            input.value = '';
        });
        
        // Establecer valores base
        this.canalInput.value = config.canal || '';
        this.versionInput.value = config.version || '';
        this.versionDisplay.textContent = config.version || '';
        
        // Completar campos de cabecera (header)
        if (config.header) {
            Object.entries(config.header).forEach(([fieldName, value]) => {
                // Buscar el input específico por nombre de campo
                const input = document.querySelector(`#headerConfigTable .config-field-input[data-field-name="${fieldName}"]`);
                if (input) {
                    input.value = value;
                    console.log(`Campo completado: ${fieldName} = ${value}`);
                }
            });
        }
        
        // IMPORTANTE: Completar campos de REQUEST (Ocurrencias)
        this.fillRequestData(config.request);
        
        // Aplicar validaciones a los campos después de cargar los datos
        setTimeout(() => {
            if (typeof ConfigUtils !== 'undefined' && ConfigUtils.applyValidationsToExistingFields) {
                ConfigUtils.applyValidationsToExistingFields();
                console.log('Validaciones aplicadas a campos después de cargar configuración');
            }
            
            // Notificar que se han cargado los datos
            if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
                ConfigUtils.showNotification('Configuración cargada correctamente', 'success', true);
            }
        }, 300);
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
    },
    
    /**
     * Setup auto-fill functionality for the auto-fill button
     */
    setupAutoFill: function() {
        if (!this.autoFillBtn) {
            console.warn("Auto-fill button not found");
            return;
        }
        
        this.autoFillBtn.addEventListener('click', () => {
            console.log("Auto-fill button clicked");
            
            // Get the current service number
            const serviceNumber = this.serviceSelect.value;
            if (!serviceNumber) {
                ConfigUtils.showNotification("Seleccione un servicio primero", "warning");
                return;
            }
            
            // Load the latest configuration for this service
            this.loadLatestConfigForService(serviceNumber);
        });
    },
    
    /**
     * Completa los campos del formulario de request con datos de ocurrencias
     * @param {Object} requestData - Datos del request de la configuración
     */
    fillRequestData: function(requestData) {
        console.log("Llenando datos de request:", requestData);
        
        if (!requestData || Object.keys(requestData).length === 0) {
            console.log("No hay datos de request para cargar");
            return;
        }
        
        // Obtener estructura del servicio actual
        const serviceStructure = ConfigServiceLoader?.currentStructure?.service_structure;
        if (!serviceStructure || !serviceStructure.request || !serviceStructure.request.elements) {
            console.warn("No hay estructura de servicio disponible para cargar datos");
            return;
        }
        
        // Esperar a que la estructura se haya cargado en la UI
        setTimeout(() => {
            try {
                // Recorrer los elementos de primer nivel
                serviceStructure.request.elements.forEach(element => {
                    if (element.type === 'field' && element.name) {
                        // Campo simple de primer nivel
                        const value = requestData[element.name];
                        if (value !== undefined) {
                            // Buscar el input en el DOM
                            const input = document.querySelector(`#requestConfigTable .config-field-input[data-field-name="${element.name}"]`);
                            if (input) {
                                input.value = value;
                                console.log(`Campo de request completado: ${element.name} = ${value}`);
                            }
                        }
                    } 
                    else if (element.type === 'occurrence') {
                        // Ocurrencia - necesitamos encontrar las instancias existentes o crear nuevas
                        const occName = element.name || element.id;
                        const occValues = requestData[occName];
                        
                        if (Array.isArray(occValues) && occValues.length > 0) {
                            console.log(`Procesando ocurrencia ${occName} con ${occValues.length} instancias`);
                            
                            // Obtener ID de definición de ocurrencia desde la estructura
                            const occDefId = element.id;
                            if (!occDefId) {
                                console.warn(`No se encontró ID para la ocurrencia ${occName}`);
                                return;
                            }
                            
                            // Encontrar el botón de agregar instancia para esta ocurrencia
                            const addButton = document.querySelector(`#requestConfigTable button[data-add-btn-for="${occDefId}"]`);
                            
                            // Para cada valor de ocurrencia, necesitamos una instancia
                            occValues.forEach((instanceData, instanceIndex) => {
                                // Si es la primera instancia, ya existe (el sistema la crea por defecto)
                                // Si es una instancia adicional, debemos crearla
                                if (instanceIndex > 0 && addButton) {
                                    console.log(`Creando instancia ${instanceIndex} para ocurrencia ${occName}`);
                                    // Simular clic en el botón para agregar instancia
                                    addButton.click();
                                }
                                
                                // Buscar la instancia recién creada o existente
                                // Este contador se usa para encontrar la instancia correcta
                                const instanceNumber = instanceIndex + 1;
                                
                                // Necesitamos esperar un poco para que la instancia esté disponible en el DOM
                                setTimeout(() => {
                                    // Buscar todas las instancias de esta ocurrencia
                                    const instanceRows = document.querySelectorAll(`#requestConfigTable tr[data-parent-def-id="${occDefId}"]`);
                                    
                                    // Obtener el instanceId de la instancia específica que necesitamos
                                    let targetInstanceId = null;
                                    let currentInstanceCount = 0;
                                    
                                    // Iterar por las instancias para encontrar la correcta por su número
                                    instanceRows.forEach(row => {
                                        if (row.classList.contains('occurrence-instance-row')) {
                                            currentInstanceCount++;
                                            if (currentInstanceCount === instanceNumber) {
                                                // Esta es la instancia que necesitamos
                                                targetInstanceId = row.dataset.instanceId;
                                            }
                                        }
                                    });
                                    
                                    if (targetInstanceId) {
                                        // Rellenar valores de campos en esta instancia específica
                                        this.fillOccurrenceInstance(targetInstanceId, instanceData, element);
                                    } else {
                                        console.warn(`No se pudo encontrar instancia ${instanceNumber} para ocurrencia ${occName}`);
                                    }
                                }, 100 * instanceIndex); // Dar tiempo para que el DOM se actualice
                            });
                        }
                    }
                });
            } catch (error) {
                console.error("Error al completar datos de request:", error);
            }
        }, 300); // Dar tiempo para que la estructura se renderice
    },
    
    /**
     * Rellena los campos de una instancia específica de ocurrencia
     * @param {string} instanceId - ID de la instancia en el DOM
     * @param {Object} instanceData - Datos para esta instancia
     * @param {Object} occDefinition - Definición de la ocurrencia desde la estructura
     */
    fillOccurrenceInstance: function(instanceId, instanceData, occDefinition) {
        console.log(`Rellenando instancia ${instanceId} con datos:`, instanceData);
        
        if (!instanceId || !instanceData || !occDefinition) return;
        
        // Iterar por los campos definidos en la estructura
        if (occDefinition.fields && Array.isArray(occDefinition.fields)) {
            occDefinition.fields.forEach(field => {
                if (field.type === 'field' && field.name) {
                    // Campo normal dentro de ocurrencia
                    const value = instanceData[field.name];
                    if (value !== undefined) {
                        // Buscar el input correspondiente a este campo en esta instancia específica
                        const input = document.querySelector(`#requestConfigTable tr[data-instance-id="${instanceId}"] .config-field-input[data-field-name="${field.name}"]`);
                        if (input) {
                            input.value = value;
                            console.log(`Campo en ocurrencia completado: ${field.name} = ${value}`);
                        }
                    }
                } 
                else if (field.type === 'occurrence') {
                    // Ocurrencia anidada
                    const nestedOccName = field.name || field.id;
                    const nestedValues = instanceData[nestedOccName];
                    
                    if (Array.isArray(nestedValues) && nestedValues.length > 0) {
                        console.log(`Procesando ocurrencia anidada ${nestedOccName} con ${nestedValues.length} instancias`);
                        
                        // Obtener ID de definición de ocurrencia anidada
                        const nestedOccDefId = field.id;
                        if (!nestedOccDefId) {
                            console.warn(`No se encontró ID para la ocurrencia anidada ${nestedOccName}`);
                            return;
                        }
                        
                        // Buscar el botón de agregar instancia anidada específico para esta instancia padre
                        const nestedAddButton = document.querySelector(`#requestConfigTable tr[data-instance-id="${instanceId}"] button[data-add-btn-for="${nestedOccDefId}"]`);
                        
                        // Para cada valor de ocurrencia anidada, necesitamos una instancia
                        nestedValues.forEach((nestedInstanceData, nestedIndex) => {
                            // Si es la primera instancia anidada, ya existe (el sistema la crea por defecto)
                            // Si es una instancia adicional, debemos crearla
                            if (nestedIndex > 0 && nestedAddButton) {
                                console.log(`Creando instancia anidada ${nestedIndex} para ocurrencia ${nestedOccName}`);
                                // Simular clic en el botón para agregar instancia anidada
                                nestedAddButton.click();
                            }
                            
                            // El proceso es similar al de las ocurrencias de primer nivel, pero debemos filtrar
                            // por las instancias anidadas que pertenecen a esta instancia padre específica
                            setTimeout(() => {
                                // Buscar instancias anidadas vinculadas a esta instancia padre
                                const nestedInstanceRows = document.querySelectorAll(`#requestConfigTable tr[data-parent-def-id="${nestedOccDefId}"][data-instance-id*="${instanceId}"]`);
                                
                                // Obtener la instancia anidada específica por su índice
                                if (nestedInstanceRows.length > nestedIndex) {
                                    const nestedInstanceId = nestedInstanceRows[nestedIndex].dataset.instanceId;
                                    
                                    // Rellenar valores de campos en la instancia anidada
                                    if (nestedInstanceId) {
                                        this.fillOccurrenceInstance(nestedInstanceId, nestedInstanceData, field);
                                    }
                                }
                            }, 150 * nestedIndex); // Dar tiempo para que el DOM se actualice
                        });
                    }
                }
            });
        }
    },
    
    /**
     * Load the most recent configuration for a service
     * @param {string} serviceNumber - Service number
     */
    loadLatestConfigForService: function(serviceNumber) {
        console.log(`Loading latest config for service ${serviceNumber}`);
        
        // Verificar si ConfigStorageManager está disponible
        if (typeof ConfigStorageManager === 'undefined') {
            console.error("ConfigStorageManager no está disponible para cargar configuraciones");
            ConfigUtils.showNotification("Error: Componente de almacenamiento no disponible", "error");
            return;
        }
        
        // Get all configurations for this service
        ConfigStorageManager.loadSavedConfigurations(serviceNumber, (configs) => {
            if (!configs || configs.length === 0) {
                ConfigUtils.showNotification(`No hay configuraciones guardadas para el servicio ${serviceNumber}`, "info");
                return;
            }
            
            // Find the most recent configuration (by timestamp)
            const sortedConfigs = [...configs].sort((a, b) => {
                if (!a.timestamp && !b.timestamp) return 0;
                if (!a.timestamp) return 1;
                if (!b.timestamp) return -1;
                
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
            
            const latestConfig = sortedConfigs[0];
            if (!latestConfig) {
                ConfigUtils.showNotification("No se pudo encontrar la configuración más reciente", "error");
                return;
            }
            
            // Load and apply the configuration
            ConfigStorageManager.loadSavedConfiguration(latestConfig.id, (config) => {
                if (!config) {
                    ConfigUtils.showNotification("Error al cargar la configuración", "error");
                    return;
                }
                
                this.applyConfigToForm(config);
                ConfigUtils.showNotification(`Configuración cargada: ${config.canal} - ${config.version}`, "success");
            });
        });
    }
};
