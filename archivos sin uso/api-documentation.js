/**
 * API Documentation Handler
 * 
 * Maneja la interactividad de la documentación de API estilo Swagger
 */

const ApiDocumentation = {
    // Datos de la API
    apiData: null,
    
    // Variables para almacenar datos
    availableServices: [],
    availableConfigs: [],
    
    // Servicio y configuración seleccionados
    selectedService: null,
    selectedConfig: null,
    
    // Elemento JSON editor activo
    activeJsonEditor: null,
    
    /**
     * Inicializa la documentación de la API
     */
    init: function() {
        console.log('Inicializando documentación de API');
        this.setupEventListeners();
        this.loadServices();
        
        // Si ya tenemos datos, renderizar la documentación
        if (this.apiData) {
            this.renderApiDocumentation();
        }
    },
    
    /**
     * Configura event listeners para la documentación
     */
    setupEventListeners: function() {
        // Delegación de eventos para manejar clics en grupos y endpoints
        document.addEventListener('click', event => {
            // Manejar clics en encabezados de grupos
            if (event.target.closest('.api-group-header')) {
                const groupHeader = event.target.closest('.api-group-header');
                const group = groupHeader.closest('.api-group');
                this.toggleGroup(group);
            }
            
            // Manejar clics en encabezados de endpoints
            if (event.target.closest('.endpoint-header')) {
                const endpointHeader = event.target.closest('.endpoint-header');
                const endpoint = endpointHeader.closest('.api-endpoint');
                this.toggleEndpoint(endpoint);
            }
            
            // Manejar clics en botones de prueba de endpoints
            if (event.target.closest('.try-it-btn')) {
                const button = event.target.closest('.try-it-btn');
                const endpointId = button.getAttribute('data-endpoint');
                this.tryEndpoint(endpointId);
            }
            
            // Manejar clic en botón de formateo de JSON
            if (event.target.id === 'format-json-btn') {
                this.highlightJsonEditor();
            }
            
            // Botones de métodos API (ida, vuelta, process)
            if (event.target.closest('.api-method-button')) {
                const button = event.target.closest('.api-method-button');
                const methodId = button.dataset.id;
                const methodPath = button.dataset.path;
                const methodMethod = button.dataset.method;
                
                this.callApiMethod({
                    id: methodId,
                    name: button.textContent,
                    path: methodPath,
                    method: methodMethod
                });
            }
        });
        
        // Manejar búsqueda/filtrado
        const searchInput = document.querySelector('.api-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', event => {
                this.filterEndpoints(event.target.value.trim().toLowerCase());
            });
        }
        
        // Manejar cambios en el selector de servicios principal
        const serviceSelector = document.getElementById('main-service-selector');
        if (serviceSelector) {
            serviceSelector.addEventListener('change', async (event) => {
                const serviceNumber = event.target.value;
                if (serviceNumber) {
                    // Cargar datos del servicio
                    await this.loadServiceData(serviceNumber);
                    
                    // Cargar configuraciones para este servicio
                    await this.loadServiceConfigs(serviceNumber);
                } else {
                    this.clearServiceData();
                }
            });
        }
        
        // Manejar cambios en el selector de configuraciones
        const configSelector = document.getElementById('service-config-selector');
        if (configSelector) {
            configSelector.addEventListener('change', async (event) => {
                const configId = event.target.value;
                if (configId) {
                    await this.loadConfigData(configId);
                }
            });
        }
        
        // Manejar eventos de edición en el editor JSON
        const jsonEditor = document.getElementById('service-json-editor');
        if (jsonEditor) {
            // Guardar referencia al editor activo
            jsonEditor.addEventListener('focus', () => {
                this.activeJsonEditor = jsonEditor;
            });
            
            // Aplicar resaltado de sintaxis al perder el foco
            jsonEditor.addEventListener('blur', () => {
                this.highlightJsonEditor();
            });
            
            // También resaltar después de cambios
            jsonEditor.addEventListener('input', () => {
                // Usar un debounce para no resaltar constantemente mientras se escribe
                clearTimeout(this.jsonEditorTimeout);
                this.jsonEditorTimeout = setTimeout(() => {
                    this.highlightJsonEditor();
                }, 1000); // Esperar 1 segundo de inactividad
            });
        }
    },
    
    /**
     * Carga la lista de servicios disponibles
     */
    loadServices: async function() {
        try {
            const response = await fetch('/api/services');
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.availableServices = data.services || [];
            console.log('Servicios cargados:', this.availableServices.length);
            
            // Actualizar selector de servicios
            this.updateServiceSelector();
            
            return this.availableServices;
        } catch (error) {
            console.error('Error al cargar servicios:', error);
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Error al cargar servicios: ${error.message}`, 'error');
            }
            return [];
        }
    },
    
    /**
     * Actualiza el selector de servicios principal
     */
    updateServiceSelector: function() {
        const serviceSelector = document.getElementById('main-service-selector');
        if (!serviceSelector) return;
        
        // Limpiar selector actual
        serviceSelector.innerHTML = '<option value="">-- Seleccione un servicio --</option>';
        
        // Agregar servicios al selector
        if (this.availableServices && this.availableServices.length > 0) {
            // Filtrar servicios únicos por número
            const uniqueServices = [];
            const serviceNumbers = new Set();
            
            this.availableServices.forEach(service => {
                if (!serviceNumbers.has(service.service_number)) {
                    serviceNumbers.add(service.service_number);
                    uniqueServices.push(service);
                }
            });
            
            // Ordenar por número de servicio
            uniqueServices.sort((a, b) => {
                return a.service_number.localeCompare(b.service_number);
            });
            
            // Agregar opciones
            uniqueServices.forEach(service => {
                const option = document.createElement('option');
                option.value = service.service_number;
                option.textContent = `${service.service_number} - ${service.service_name}`;
                serviceSelector.appendChild(option);
            });
        }
    },
    
    /**
     * Carga las configuraciones disponibles para un servicio específico
     */
    loadServiceConfigs: async function(serviceNumber) {
        try {
            const response = await fetch(`/service-config/list?service_number=${serviceNumber}`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.availableConfigs = data.configs || [];
            console.log(`Configuraciones cargadas para servicio ${serviceNumber}:`, this.availableConfigs.length);
            
            // Actualizar selector de configuraciones
            this.updateConfigSelector();
            
            return this.availableConfigs;
        } catch (error) {
            console.error(`Error al cargar configuraciones para servicio ${serviceNumber}:`, error);
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Error al cargar configuraciones: ${error.message}`, 'error');
            }
            return [];
        }
    },
    
    /**
     * Actualiza el selector de configuraciones
     */
    updateConfigSelector: function() {
        const configSelector = document.getElementById('service-config-selector');
        if (!configSelector) return;
        
        // Limpiar selector actual
        configSelector.innerHTML = '<option value="">-- Seleccione una configuración --</option>';
        
        // Agregar configuraciones al selector
        if (this.availableConfigs && this.availableConfigs.length > 0) {
            this.availableConfigs.forEach(config => {
                const option = document.createElement('option');
                option.value = config.id;
                option.textContent = `${config.serviceNumber}-${config.canal}-${config.version}`;
                configSelector.appendChild(option);
            });
        } else {
            // Si no hay configuraciones, agregar opción deshabilitada
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = 'No hay configuraciones disponibles';
            configSelector.appendChild(option);
        }
    },
    
    /**
     * Carga los datos de un servicio específico
     */
    loadServiceData: async function(serviceNumber) {
        try {
            // Obtener estructura del servicio
            const response = await fetch(`/excel/structure-by-service?service_number=${serviceNumber}`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Guardar servicio seleccionado
            this.selectedService = {
                number: serviceNumber,
                structure: data
            };
            
            console.log(`Servicio ${serviceNumber} cargado:`, this.selectedService);
            
            // Mostrar JSON en editor
            this.updateServiceJsonEditor(data);
            
            // Actualizar botones de métodos API
            this.updateApiMethodButtons();
            
            return data;
        } catch (error) {
            console.error(`Error al cargar datos del servicio ${serviceNumber}:`, error);
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Error al cargar datos del servicio: ${error.message}`, 'error');
            }
            return null;
        }
    },
    
    /**
     * Carga los datos de una configuración específica
     */
    loadConfigData: async function(configId) {
        try {
            if (!configId) {
                return null;
            }
            
            const response = await fetch(`/service-config/get/${configId}`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const configData = await response.json();
            this.selectedConfig = configData;
            
            console.log(`Configuración ${configId} cargada:`, configData);
            
            // Aplicar datos de configuración al JSON en editor
            this.applyConfigToJsonEditor(configData);
            
            return configData;
        } catch (error) {
            console.error(`Error al cargar configuración ${configId}:`, error);
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Error al cargar configuración: ${error.message}`, 'error');
            }
            return null;
        }
    },
    
    /**
     * Aplica los datos de una configuración al editor JSON
     */
    applyConfigToJsonEditor: function(configData) {
        if (!this.selectedService || !configData) {
            return;
        }
        
        try {
            const jsonEditor = document.getElementById('service-json-editor');
            if (!jsonEditor) return;
            
            // Parsear JSON actual
            let currentJson;
            try {
                currentJson = JSON.parse(jsonEditor.textContent);
            } catch (e) {
                currentJson = {
                    service_number: this.selectedService.number,
                    CANAL: "API",
                    USUARIO: "SISTEMA",
                    data: {}
                };
            }
            
            // Aplicar valores de configuración
            currentJson.service_number = configData.serviceNumber;
            currentJson.CANAL = configData.canal;
            
            // Si hay valores de campos en la configuración, aplicarlos
            if (configData.header) {
                // Aplicar valores del encabezado
                Object.assign(currentJson, configData.header);
            }
            
            if (configData.request) {
                // Aplicar valores de la solicitud
                currentJson.data = configData.request;
            }
            
            // Actualizar editor JSON
            jsonEditor.textContent = JSON.stringify(currentJson, null, 2);
            this.highlightJsonEditor();
            
        } catch (error) {
            console.error('Error al aplicar configuración al editor JSON:', error);
        }
    },
    
    /**
     * Actualiza el editor de JSON con los datos del servicio
     */
    updateServiceJsonEditor: function(data) {
        const jsonEditor = document.getElementById('service-json-editor');
        if (!jsonEditor) return;
        
        // Crear objeto de ejemplo según la estructura del servicio
        const exampleJson = this.createExampleJson(data);
        
        // Mostrar JSON en editor
        jsonEditor.textContent = JSON.stringify(exampleJson, null, 2);
        
        // Resaltar sintaxis
        this.activeJsonEditor = jsonEditor;
        this.highlightJsonEditor();
        
        // Habilitar edición directa
        jsonEditor.contentEditable = "true";
    },
    
    /**
     * Limpia los datos del servicio y la configuración seleccionados
     */
    clearServiceData: function() {
        // Limpiar servicio y configuración seleccionados
        this.selectedService = null;
        this.selectedConfig = null;
        
        // Limpiar editor JSON
        const jsonEditor = document.getElementById('service-json-editor');
        if (jsonEditor) {
            jsonEditor.textContent = '{}';
            this.highlightJsonEditor();
        }
        
        // Limpiar selector de configuraciones
        const configSelector = document.getElementById('service-config-selector');
        if (configSelector) {
            configSelector.innerHTML = '<option value="">-- Seleccione una configuración --</option>';
        }
        
        // Actualizar botones de métodos
        this.updateApiMethodButtons();
        
        // Limpiar resultados
        const resultsContainer = document.getElementById('api-call-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    },
    
    /**
     * Renderiza la documentación de la API
     */
    renderApiDocumentation: function() {
        const apiContainer = document.getElementById('apiDocumentation');
        if (!apiContainer || !this.apiData) return;
        
        // Crear header de la documentación con selector de servicios Y configuraciones
        let html = `
            <div class="api-doc-container">
                <div class="api-doc-header">
                    <span class="api-version">v${this.apiData.version}</span>
                    <h1>${this.apiData.title}</h1>
                    <p>${this.apiData.description}</p>
                    
                    <!-- Sección de selección de servicio y configuración -->
                    <div class="api-service-selector">
                        <div class="service-row">
                            <div class="service-col">
                                <label for="main-service-selector">Servicio:</label>
                                <select id="main-service-selector" class="api-service-select">
                                    <option value="">-- Seleccione un servicio --</option>
                                </select>
                            </div>
                            <div class="service-col">
                                <label for="service-config-selector">Configuración:</label>
                                <select id="service-config-selector" class="api-service-select">
                                    <option value="">-- Seleccione una configuración --</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="api-search-container">
                        <input type="text" class="api-search-input" placeholder="Buscar endpoints (método, ruta, descripción)...">
                    </div>
                </div>
                
                <!-- Sección de prueba de servicios -->
                <div class="api-service-tester">
