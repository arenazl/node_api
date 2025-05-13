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
                    <h2>Probar Servicios</h2>
                    
                    <div class="service-json-container">
                        <h3>Datos del servicio (JSON)</h3>
                        <pre id="service-json-editor" class="service-json-editor json-editor" contenteditable="true">{}</pre>
                        <div class="json-editor-tools">
                            <button id="format-json-btn" class="tool-btn">Formatear JSON</button>
                        </div>
                    </div>
                    
                    <div class="api-method-container">
                        <h3>Métodos disponibles</h3>
                        <div id="api-method-buttons" class="api-method-buttons">
                            <p class="text-center">Seleccione un servicio para ver métodos disponibles</p>
                        </div>
                    </div>
                    
                    <div id="api-call-results" class="api-call-results" style="display:none;">
                        <div class="results-header">
                            <h4>Resultado:</h4>
                        </div>
                        <pre class="results-json"></pre>
                    </div>
                </div>
                
                <h2>Documentación de endpoints</h2>
        `;
        
        // Crear grupos de endpoints
        this.apiData.groups.forEach(group => {
            html += `
                <div class="api-group" id="group-${this.slugify(group.name)}">
                    <div class="api-group-header">
                        <h2>${group.name}</h2>
                        <button class="toggle-btn">▼</button>
                    </div>
                    <div class="api-group-content">
                        <div class="group-description">${group.description}</div>
            `;
            
            // Crear endpoints para este grupo
            group.endpoints.forEach(endpoint => {
                html += this.renderEndpoint(endpoint);
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        
        // Insertar HTML en el contenedor
        apiContainer.innerHTML = html;
        
        // Ajustar estilos para la sección de selección de servicio y configuración
        const style = document.createElement('style');
        style.textContent = `
            .api-service-selector {
                margin-bottom: 20px;
                padding: 15px;
                background-color: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--radius);
            }
            .service-row {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
            }
            .service-col {
                flex: 1;
                min-width: 200px;
            }
            .service-col label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: var(--text-color);
            }
        `;
        document.head.appendChild(style);
        
        // Abrir el primer grupo por defecto
        const firstGroup = apiContainer.querySelector('.api-group');
        if (firstGroup) {
            this.toggleGroup(firstGroup);
        }
    },
    
    /**
     * Actualiza los botones de métodos API según el servicio seleccionado
     */
    updateApiMethodButtons: function() {
        const buttonsContainer = document.getElementById('api-method-buttons');
        if (!buttonsContainer) return;
        
        // Limpiar botones existentes
        buttonsContainer.innerHTML = '';
        
        // Si no hay servicio seleccionado, no mostrar botones
        if (!this.selectedService) {
            buttonsContainer.innerHTML = '<p class="text-center">Seleccione un servicio para ver métodos disponibles</p>';
            return;
        }
        
        // Crear botones para los métodos disponibles
        const methods = [
            { id: 'ida-service', name: 'Servicio de Ida', method: 'POST', path: '/api/services/ida' },
            { id: 'vuelta-service', name: 'Servicio de Vuelta', method: 'POST', path: '/api/services/vuelta' },
            { id: 'process-service', name: 'Procesar Servicio', method: 'POST', path: '/api/services/process' }
        ];
        
        methods.forEach(method => {
            const button = document.createElement('button');
            button.className = 'api-method-button';
            button.dataset.method = method.method;
            button.dataset.path = method.path;
            button.dataset.id = method.id;
            button.textContent = method.name;
            
            buttonsContainer.appendChild(button);
        });
    },
    
    /**
     * Crea un JSON de ejemplo según la estructura del servicio
     */
    createExampleJson: function(data) {
        // JSON base para el servicio de ida
        const exampleJson = {
            service_number: this.selectedService ? this.selectedService.number : '3088',
            CANAL: "API",
            USUARIO: "SISTEMA",
            data: {}
        };
        
        // Si hay estructura de servicio
        if (data && data.service_structure && data.service_structure.request 
            && data.service_structure.request.elements) {
            
            // Función recursiva para crear ejemplo basado en elementos
            const processElements = (elements, parentObj) => {
                elements.forEach(element => {
                    // Si el elemento tiene un nombre, agregarlo al objeto
                    if (element.name) {
                        // Crear valor según el tipo
                        let value = "";
                        
                        if (element.type === "string") {
                            value = element.example || "";
                        } else if (element.type === "numeric") {
                            value = element.example ? parseFloat(element.example) : 0;
                        } else if (element.type === "date") {
                            value = element.example || "20250101";
                        } else {
                            value = element.example || "";
                        }
                        
                        // Guardar en objeto
                        parentObj[element.name] = value;
                    }
                    
                    // Si tiene elementos anidados
                    if (element.elements && element.elements.length > 0) {
                        // Crear objeto o array según el caso
                        if (element.occurrence && (element.occurrence === "*" || parseInt(element.occurrence) > 1)) {
                            // Es una ocurrencia múltiple, crear array con un objeto de ejemplo
                            const childArray = [];
                            const childObj = {};
                            parentObj[element.name] = childArray;
                            childArray.push(childObj);
                            
                            // Procesar elementos anidados
                            processElements(element.elements, childObj);
                        } else {
                            // Es un objeto simple
                            const childObj = {};
                            if (element.name) {
                                parentObj[element.name] = childObj;
                                processElements(element.elements, childObj);
                            } else {
                                // Si no tiene nombre, agregar directamente al padre
                                processElements(element.elements, parentObj);
                            }
                        }
                    }
                });
            };
            
            // Procesar elementos de la solicitud
            processElements(data.service_structure.request.elements, exampleJson.data);
        }
        
        return exampleJson;
    },
    
    /**
     * Llama a un método API con los datos del servicio
     */
    callApiMethod: async function(methodInfo) {
        try {
            // Verificar que hay un servicio seleccionado
            if (!this.selectedService) {
                if (typeof ConfigUtils !== 'undefined') {
                    ConfigUtils.showNotification('Debe seleccionar un servicio', 'warning');
                }
                return;
            }
            
            // Obtener JSON del editor
            const jsonEditor = document.getElementById('service-json-editor');
            if (!jsonEditor) {
                if (typeof ConfigUtils !== 'undefined') {
                    ConfigUtils.showNotification('Editor de JSON no encontrado', 'error');
                }
                return;
            }
            
            // Parsear JSON del editor
            let requestData;
            try {
                requestData = JSON.parse(jsonEditor.textContent);
            } catch (error) {
                if (typeof ConfigUtils !== 'undefined') {
                    ConfigUtils.showNotification(`JSON inválido: ${error.message}`, 'error');
                }
                return;
            }
            
            // Verificar que el JSON tiene un service_number
            if (!requestData.service_number) {
                requestData.service_number = this.selectedService.number;
            }
            
            // Configurar opciones de fetch
            const fetchOptions = {
                method: methodInfo.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
            };
            
            // Mostrar indicador de carga
            const resultsContainer = document.getElementById('api-call-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = '<div class="loading">Procesando solicitud...</div>';
                resultsContainer.style.display = 'block';
            }
            
            // Realizar solicitud
            const response = await fetch(methodInfo.path, fetchOptions);
            const responseData = await response.json();
            
            // Mostrar resultado
            if (resultsContainer) {
                // Crear contenedor para mostrar el resultado
                resultsContainer.innerHTML = `
                    <div class="results-header">
                        <h4>Resultado: ${methodInfo.name}</h4>
                        <span class="response-code ${response.ok ? 'success' : 'error'}">
                            ${response.status} ${response.statusText}
                        </span>
                    </div>
                    <pre class="results-json">${JSON.stringify(responseData, null, 2)}</pre>
                `;
                
                // Resaltar sintaxis del JSON de respuesta
                const resultsJson = resultsContainer.querySelector('.results-json');
                resultsJson.innerHTML = this.syntaxHighlight(JSON.stringify(responseData, null, 2));
            }
            
            // Notificar resultado
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(
                    `${methodInfo.name}: ${response.ok ? 'Éxito' : 'Error ' + response.status}`, 
                    response.ok ? 'success' : 'error'
                );
            }
            
        } catch (error) {
            console.error(`Error al llamar al método ${methodInfo.name}:`, error);
            
            // Mostrar error en resultados
            const resultsContainer = document.getElementById('api-call-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="results-header">
                        <h4>Error: ${methodInfo.name}</h4>
                        <span class="response-code error">Error</span>
                    </div>
                    <pre class="results-json error-text">${error.message}</pre>
                `;
            }
            
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Error: ${error.message}`, 'error');
            }
        }
    },
    
    /**
     * Aplica resaltado de sintaxis al editor JSON activo
     */
    highlightJsonEditor: function() {
        if (!this.activeJsonEditor) return;
        
        try {
            // Obtener texto actual
            const text = this.activeJsonEditor.textContent;
            // Parsear y formatear JSON para verificar que es válido
            const formattedJson = JSON.stringify(JSON.parse(text), null, 2);
            // Resaltar sintaxis
            this.activeJsonEditor.innerHTML = this.syntaxHighlight(formattedJson);
        } catch (error) {
            // Si hay un error en el JSON, mantener el texto sin formato
            console.warn('Error al resaltar sintaxis JSON:', error);
        }
    },
    
    /**
     * Resalta la sintaxis de un string JSON
     * @param {string} json - String JSON a resaltar
     * @returns {string} HTML con sintaxis resaltada
     */
    syntaxHighlight: function(json) {
        if (!json) return '';
        
        // Escapar caracteres HTML
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Patrones para resaltar 
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                    match = match.replace(/"/g, '').replace(/:$/, '');
                    return '<span style="color: #7c9eb2;">"' + match + '"</span>:';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            
            // Colores según tipo
            const colorMap = {
                key: '#7c9eb2',
                string: '#24a35a',
                number: '#e2777a',
                boolean: '#6994bf',
                null: '#d2d2d2'
            };
            
            return '<span style="color: ' + colorMap[cls] + ';">' + match + '</span>';
        });
    },
    
/**
 * Renderiza un endpoint individual
 * @param {Object} endpoint - Datos del endpoint
 * @returns {string} HTML del endpoint
 */
    renderEndpoint: function(endpoint) {
        // Si el endpoint no tiene ID, usar el path como ID
        if (!endpoint.id) {
            endpoint.id = this.slugify(endpoint.path);
        }
        
        let html = `
            <div class="api-endpoint" id="endpoint-${endpoint.id}" data-path="${endpoint.path}" data-method="${endpoint.method}">
                <div class="endpoint-header">
                    <span class="http-method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                    <span class="endpoint-path">${endpoint.path}</span>
                    <span class="endpoint-summary">${endpoint.summary || ''}</span>
                    <button class="toggle-btn">▼</button>
                </div>
                <div class="endpoint-content">
                    <div class="endpoint-description">${endpoint.description || ''}</div>
        `;
        
        // Parámetros de la solicitud
        if (endpoint.parameters && endpoint.parameters.length > 0) {
            html += `
                <div class="params-title">Parámetros de solicitud</div>
                <table class="params-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th>Requerido</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            endpoint.parameters.forEach(param => {
                html += `
                    <tr>
                        <td class="param-name">${param.name}</td>
                        <td class="param-type">${param.type || ''}</td>
                        <td>${param.required ? '<span class="param-required">Sí</span>' : 'No'}</td>
                        <td>${param.description || ''}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
        }
        
        // Ejemplo de solicitud
        if (endpoint.requestExample) {
            html += `
                <div class="example-container">
                    <div class="example-title">Ejemplo de solicitud</div>
                    <pre class="code-example">${this.syntaxHighlight(endpoint.requestExample)}</pre>
                </div>
            `;
        }
        
        // Respuestas
        if (endpoint.responses && endpoint.responses.length > 0) {
            html += `
                <div class="response-title">Respuestas</div>
                <table class="response-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            endpoint.responses.forEach(response => {
                const responseClass = response.code.startsWith('2') ? 'success' : 
                                     (response.code.startsWith('4') || response.code.startsWith('5')) ? 'error' : 'warning';
                
                html += `
                    <tr>
                        <td><span class="response-code ${responseClass}">${response.code}</span></td>
                        <td>${response.description || ''}</td>
                    </tr>
                `;
                
                // Ejemplo de respuesta
                if (response.example) {
                    html += `
                        <tr>
                            <td colspan="2">
                                <div class="example-container">
                                    <pre class="code-example">${this.syntaxHighlight(response.example)}</pre>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            });
            
            html += `
                    </tbody>
                </table>
            `;
        }
        
        // Botón de prueba del endpoint
        html += `
                <button class="try-it-btn" data-endpoint="${endpoint.id}">Probar Endpoint</button>
            </div>
        </div>
        `;
        
        return html;
    },
    
    /**
     * Alterna la visibilidad de un grupo de endpoints
     */
    toggleGroup: function(group) {
        if (!group) return;
        
        // Alternar clase expanded
        group.classList.toggle('expanded');
        
        // Actualizar estado del botón
        const button = group.querySelector('.toggle-btn');
        if (button) {
            button.classList.toggle('expanded');
            // Cambiar ícono según estado
            button.textContent = group.classList.contains('expanded') ? '▲' : '▼';
        }
    },
    
    /**
     * Alterna la visibilidad de un endpoint
     */
    toggleEndpoint: function(endpoint) {
        if (!endpoint) return;
        
        // Alternar clase expanded
        endpoint.classList.toggle('expanded');
        
        // Actualizar estado del botón
        const button = endpoint.querySelector('.toggle-btn');
        if (button) {
            button.classList.toggle('expanded');
            // Cambiar ícono según estado
            button.textContent = endpoint.classList.contains('expanded') ? '▲' : '▼';
        }
    },
    
    /**
     * Convierte un texto en un slug (URL-friendly)
     */
    slugify: function(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Reemplazar espacios con guiones
            .replace(/[^\w\-]+/g, '')       // Eliminar caracteres no válidos
            .replace(/\-\-+/g, '-')         // Reemplazar múltiples guiones con uno solo
            .replace(/^-+/, '')             // Eliminar guiones al inicio
            .replace(/-+$/, '');            // Eliminar guiones al final
    },
    
    /**
     * Intenta un endpoint específico
     */
    tryEndpoint: function(endpointId) {
        // Buscar el endpoint en los datos cargados
        let targetEndpoint = null;
        
        if (this.apiData && this.apiData.groups) {
            for (const group of this.apiData.groups) {
                if (group.endpoints) {
                    targetEndpoint = group.endpoints.find(e => e.id === endpointId);
                    if (targetEndpoint) break;
                }
            }
        }
        
        if (!targetEndpoint) {
            console.error(`Endpoint with ID ${endpointId} not found`);
            return;
        }
        
        // Si estamos en la pestaña de servicios, usar la configuración seleccionada
        if (this.selectedService) {
            // Mostrar notificación
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(
                    `Probando endpoint ${targetEndpoint.method} ${targetEndpoint.path}...`,
                    'info'
                );
            } else {
                console.log(`Probando endpoint ${targetEndpoint.method} ${targetEndpoint.path}...`);
            }
            
            // Obtener JSON del editor
            const jsonEditor = document.getElementById('service-json-editor');
            let requestData = {};
            
            if (jsonEditor) {
                try {
                    requestData = JSON.parse(jsonEditor.textContent);
                } catch (error) {
                    console.warn("Error al parsear JSON del editor:", error);
                }
            }
            
            // Determinar el método a utilizar según el endpoint
            let methodInfo = {
                id: targetEndpoint.id,
                name: targetEndpoint.summary || targetEndpoint.path,
                method: targetEndpoint.method,
                path: targetEndpoint.path
            };
            
            // Llamar al método API
            this.callApiMethod(methodInfo);
        } else {
            // Notificar al usuario que debe seleccionar un servicio primero
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(
                    'Para probar los endpoints, seleccione primero un servicio en la parte superior.',
                    'warning',
                    5000
                );
            } else {
                console.warn('Para probar los endpoints, seleccione primero un servicio');
            }
            
            // Desplazarse hasta la sección de selección de servicio
            const serviceSelector = document.getElementById('main-service-selector');
            if (serviceSelector) {
                serviceSelector.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        // Hacer visible este endpoint en la documentación
        const endpointElement = document.getElementById(`endpoint-${endpointId}`);
        if (endpointElement && !endpointElement.classList.contains('expanded')) {
            this.toggleEndpoint(endpointElement);
        }
    },
    
    /**
     * Filtra endpoints según texto de búsqueda
     */
    filterEndpoints: function(searchText) {
        if (!searchText) {
            // Si no hay texto de búsqueda, mostrar todos
            document.querySelectorAll('.api-endpoint').forEach(endpoint => {
                endpoint.style.display = '';
            });
            
            document.querySelectorAll('.api-group').forEach(group => {
                group.style.display = '';
            });
            
            return;
        }
        
        // Ocultar todos los endpoints primero
        document.querySelectorAll('.api-endpoint').forEach(endpoint => {
            const method = endpoint.getAttribute('data-method') || '';
            const path = endpoint.getAttribute('data-path') || '';
            const summary = endpoint.querySelector('.endpoint-summary')?.textContent || '';
            const description = endpoint.querySelector('.endpoint-description')?.textContent || '';
            
            // Verificar si coincide con la búsqueda
            const isMatch = (
                method.toLowerCase().includes(searchText) || 
                path.toLowerCase().includes(searchText) || 
                summary.toLowerCase().includes(searchText) || 
                description.toLowerCase().includes(searchText)
            );
            
            // Mostrar u ocultar según coincidencia
            endpoint.style.display = isMatch ? '' : 'none';
            
            // Si coincide, asegurarse de que está expandido
            if (isMatch) {
                endpoint.classList.add('expanded');
            }
        });
        
        // Mostrar solo grupos con endpoints visibles
        document.querySelectorAll('.api-group').forEach(group => {
            const hasVisibleEndpoints = group.querySelector('.api-endpoint[style=""]') !== null;
            group.style.display = hasVisibleEndpoints ? '' : 'none';
            
            // Si hay endpoints visibles, expandir el grupo
            if (hasVisibleEndpoints) {
                group.classList.add('expanded');
            }
        });
    }
};

console.log('API Documentation System loaded');
