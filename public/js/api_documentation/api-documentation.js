/**
 * Documentación de API - Archivo principal mejorado
 * 
 * Este archivo maneja la generación y visualización de la documentación de la API
 * en la pestaña de Documentación
 */

const ApiDocumentation = {
    // Configuración
    config: {
        debug: false, // Cambiar a true para activar logs de depuración
        animationDuration: 300
    },

    // Datos de la API
    apiData: null,
    
    // Servicio seleccionado actualmente
    selectedService: null,
    
    /**
     * Log condicional basado en la configuración de debug
     */
    log: function(...args) {
        if (this.config.debug) {
            console.log('[API Documentation]', ...args);
        }
    },

    /**
     * Log de error (siempre se muestra)
     */
    error: function(...args) {
        console.error('[API Documentation]', ...args);
    },
    
    /**
     * Inicializa la documentación de API
     */
    init: function() {
        this.log('========== INICIANDO INIT ==========');
        this.log('Inicializando documentación de API...');
        
        // Verificar si estamos en la pestaña de documentación
        const docContainer = document.getElementById('apiDocumentation');
        this.log('Buscando container apiDocumentation...');
        this.log('Container encontrado:', !!docContainer);
        
        if (!docContainer) {
            this.error('CRÍTICO: Container de documentación no encontrado');
            return;
        }
        
        this.log('Container encontrado, continuando...');
        
        // Cargar datos de la API desde el backend
        this.log('Llamando a loadApiData...');
        this.loadApiData();
        
        // Configurar eventos
        this.log('Llamando a setupEvents...');
        this.setupEvents();
        
        this.log('========== INIT COMPLETADO ==========');
    },
    
    /**
     * Carga los datos de la API desde el backend
     */
    loadApiData: function() {
        this.log('========== LOADAPIDATA ==========');
        this.log('Cargando datos de API...');
        
        try {
            // Directamente generar la documentación sin depender del backend
            // ya que tenemos toda la información necesaria
            this.log('Generando datos desde backend...');
            this.generateApiDataFromBackend({ message: "API de procesamiento de mensajes MQ" });
            
            this.log('ApiData generado:', this.apiData ? 'SÍ' : 'NO');
            if (this.apiData) {
                this.log('ApiData título:', this.apiData.title);
                this.log('ApiData grupos:', this.apiData.groups ? this.apiData.groups.length : 'NO');
            }
            
            this.log('Llamando renderApiDocumentation...');
            this.renderApiDocumentation();
            this.log('========== LOADAPIDATA COMPLETADO ==========');
        } catch (error) {
            this.error('ERROR EN LOADAPIDATA:', error);
            this.showError('Error al cargar los datos de la API: ' + error.message);
        }
    },
    
    /**
     * Genera los datos de API a partir de la respuesta del backend
     */
    generateApiDataFromBackend: function(backendData) {
        this.apiData = {
            version: "1.0",
            title: "API de Procesamiento de Mensajes",
            description: backendData.message || "API para procesar mensajes de servicios",
            
            groups: [
                {
                    name: "Servicios",
                    description: "Endpoints para trabajar con servicios de mensajería",
                    endpoints: [
                        {
                            id: "services-list",
                            path: "/api/services",
                            method: "GET",
                            summary: "Listar servicios",
                            description: "Obtiene la lista de servicios disponibles en el sistema.",
                            parameters: [],
                            responses: [
                                {
                                    code: "200 OK",
                                    description: "Lista de servicios obtenida exitosamente",
                                    example: JSON.stringify({
                                        "services": [
                                            {
                                                "service_number": "3088",
                                                "service_name": "Servicio de ejemplo",
                                                "timestamp": "2025-05-24T07:53:25.000Z"
                                            }
                                        ]
                                    }, null, 2)
                                }
                            ]
                        },
                        {
                            id: "sendmessage",
                            path: "/api/services/sendmessage",
                            method: "POST",
                            summary: "Servicio de Ida",
                            description: "Convierte un mensaje JSON a un formato de longitud fija según la estructura del servicio seleccionado.",
                            parameters: [
                                {
                                    name: "header",
                                    type: "object",
                                    required: true,
                                    description: "Cabecera del mensaje con serviceNumber y canal"
                                },
                                {
                                    name: "parameters",
                                    type: "object",
                                    required: false,
                                    description: "Parámetros del servicio en formato JSON"
                                }
                            ],
                            requestExample: JSON.stringify({
                                "header": {
                                    "serviceNumber": "3088",
                                    "canal": "API"
                                },
                                "parameters": {
                                    "CODIGO": "ABC123",
                                    "MONTO": 1500.50,
                                    "FECHA": "20250101"
                                }
                            }, null, 2),
                            responses: [
                                {
                                    code: "200 OK",
                                    description: "Conversión exitosa",
                                    example: JSON.stringify({
                                        "request": {
                                            "header": {
                                                "serviceNumber": "3088",
                                                "canal": "API"
                                            },
                                            "parameters": {
                                                "CODIGO": "ABC123",
                                                "MONTO": 1500.50,
                                                "FECHA": "20250101"
                                            }
                                        },
                                        "response": "APIABC123      000150050020250101...",
                                        "estructura": {},
                                        "estructuraCompleta": {}
                                    }, null, 2)
                                }
                            ]
                        },
                        {
                            id: "receivemessage",
                            path: "/api/services/receivemessage",
                            method: "POST",
                            summary: "Servicio de Vuelta",
                            description: "Convierte un mensaje de longitud fija a formato JSON según la estructura del servicio.",
                            parameters: [
                                {
                                    name: "header",
                                    type: "object",
                                    required: true,
                                    description: "Cabecera con serviceNumber"
                                },
                                {
                                    name: "parameters",
                                    type: "object",
                                    required: true,
                                    description: "Objeto con returnMsg (string de vuelta) o simulate (boolean)"
                                }
                            ],
                            requestExample: JSON.stringify({
                                "header": {
                                    "serviceNumber": "3088"
                                },
                                "parameters": {
                                    "returnMsg": "APIABC123      000150050020250101..."
                                }
                            }, null, 2),
                            responses: [
                                {
                                    code: "200 OK",
                                    description: "Conversión exitosa",
                                    example: JSON.stringify({
                                        "request": {
                                            "header": {
                                                "serviceNumber": "3088"
                                            },
                                            "parameters": {
                                                "returnMsg": "[string de longitud 150]"
                                            }
                                        },
                                        "response": {
                                            "CODIGO": "ABC123",
                                            "MONTO": 1500.50,
                                            "FECHA": "20250101",
                                            "randomNumber": 7
                                        }
                                    }, null, 2)
                                }
                            ]
                        },
                        {
                            id: "process-service",
                            path: "/api/services/process",
                            method: "POST",
                            summary: "Procesar Servicio",
                            description: "Procesa un servicio completo por número y stream opcional.",
                            parameters: [
                                {
                                    name: "service_number",
                                    type: "string",
                                    required: true,
                                    description: "Número del servicio a procesar"
                                },
                                {
                                    name: "stream",
                                    type: "string",
                                    required: false,
                                    description: "Stream de datos para procesar (opcional)"
                                }
                            ],
                            requestExample: JSON.stringify({
                                "service_number": "3088",
                                "stream": "APIABC123      000150050020250101..."
                            }, null, 2),
                            responses: [
                                {
                                    code: "200 OK",
                                    description: "Procesamiento exitoso",
                                    example: JSON.stringify({
                                        "result": {
                                            "header": {},
                                            "response": {}
                                        }
                                    }, null, 2)
                                }
                            ]
                        }
                    ]
                },
                {
                    name: "Configuraciones",
                    description: "Endpoints para gestionar configuraciones de servicios",
                    endpoints: [
                        {
                            id: "config-list",
                            path: "/service-config/list",
                            method: "GET",
                            summary: "Listar configuraciones",
                            description: "Obtiene la lista de configuraciones disponibles.",
                            parameters: [
                                {
                                    name: "serviceNumber",
                                    type: "string",
                                    required: false,
                                    description: "Número del servicio (opcional)"
                                }
                            ],
                            responses: [
                                {
                                    code: "200 OK",
                                    description: "Lista de configuraciones",
                                    example: JSON.stringify({
                                        "configs": [
                                            {
                                                "id": "1234",
                                                "serviceNumber": "3088",
                                                "canal": "API",
                                                "version": "v2"
                                            }
                                        ]
                                    }, null, 2)
                                }
                            ]
                        }
                    ]
                }
            ]
        };
    },
    
    /**
     * Renderiza la documentación de API
     */
    renderApiDocumentation: function() {
        this.log('========== RENDERAPI ==========');
        this.log('Renderizando documentación...');
        
        const container = document.getElementById('apiDocumentation');
        this.log('Container en render:', !!container);
        if (!container) {
            this.error('CRÍTICO: Container no encontrado en render');
            return;
        }
        
        this.log('Verificando apiData:', !!this.apiData);
        if (!this.apiData) {
            this.error('CRÍTICO: apiData es null');
            this.showError('No hay datos de API disponibles');
            return;
        }
        
        this.log('Generando HTML...');
        
        // AQUÍ ESTABA EL ERROR - HTML COMPLETO CORREGIDO
        let html = `
            <div class="api-doc-container">
                <div class="api-header">
                    <h1 class="api-title">${this.apiData.title}</h1>
                    <p class="api-description">${this.apiData.description}</p>
                    <div class="api-version">Versión: ${this.apiData.version}</div>
                </div>
                
                <div class="api-search">
                    <input type="text" id="apiSearchInput" placeholder="Buscar endpoints..." class="search-input">
                </div>
                
                <div class="api-content">
        `;
        
        // Renderizar grupos de endpoints
        this.apiData.groups.forEach(group => {
            html += this.renderGroup(group);
        });
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Configurar eventos después de renderizar
        this.setupDocumentationEvents();
        
        this.log('Documentación renderizada exitosamente');
    },
    
    /**
     * Renderiza un grupo de endpoints
     */
    renderGroup: function(group) {
        let html = `
            <div class="api-group" data-group="${group.name}">
                <div class="group-header" onclick="ApiDocumentation.toggleGroup(this.parentElement)">
                    <div>
                        <h2>${group.name}</h2>
                        <p class="group-description">${group.description}</p>
                    </div>
                    <button class="toggle-btn">▼</button>
                </div>
                <div class="group-content">
        `;
        
        // Renderizar endpoints del grupo
        if (group.endpoints && group.endpoints.length > 0) {
            group.endpoints.forEach(endpoint => {
                html += this.renderEndpoint(endpoint);
            });
        }
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    },
    
    /**
     * Renderiza un endpoint
     */
    renderEndpoint: function(endpoint) {
        let html = `
            <div class="api-endpoint" id="endpoint-${endpoint.id}" data-path="${endpoint.path}" data-method="${endpoint.method}">
                <div class="endpoint-header" onclick="ApiDocumentation.toggleEndpoint(this.parentElement)">
                    <span class="http-method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                    <span class="endpoint-path">${endpoint.path}</span>
                    <span class="endpoint-summary">${endpoint.summary || ''}</span>
                    <button class="toggle-btn">▼</button>
                </div>
                <div class="endpoint-content">
                    <div class="endpoint-description">${endpoint.description || ''}</div>
        `;
        
        // Parámetros
        if (endpoint.parameters && endpoint.parameters.length > 0) {
            html += `
                <div class="params-section">
                    <h4>Parámetros</h4>
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
                        <td class="param-required">${param.required ? 'Sí' : 'No'}</td>
                        <td class="param-description">${param.description || ''}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        // Ejemplo de solicitud
        if (endpoint.requestExample) {
            html += `
                <div class="example-section">
                    <h4>Ejemplo de solicitud</h4>
                    <pre class="code-example">${this.syntaxHighlight(endpoint.requestExample)}</pre>
                </div>
            `;
        }
        
        // Respuestas
        if (endpoint.responses && endpoint.responses.length > 0) {
            html += `
                <div class="responses-section">
                    <h4>Respuestas</h4>
            `;
            
            endpoint.responses.forEach(response => {
                const statusClass = response.code.startsWith('2') ? 'success' : 
                                   response.code.startsWith('4') ? 'client-error' : 
                                   response.code.startsWith('5') ? 'server-error' : 'info';
                
                html += `
                    <div class="response-item">
                        <div class="response-header">
                            <span class="response-code ${statusClass}">${response.code}</span>
                            <span class="response-description">${response.description}</span>
                        </div>
                `;
                
                if (response.example) {
                    html += `
                        <div class="response-example">
                            <h5>Ejemplo:</h5>
                            <pre class="code-example">${this.syntaxHighlight(response.example)}</pre>
                        </div>
                    `;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        }
        
        html += `
                    <div class="endpoint-actions">
                        <button class="try-btn" onclick="ApiDocumentation.tryEndpoint('${endpoint.id}')">
                            Probar Endpoint
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return html;
    },
    
    /**
     * Configura eventos de la documentación
     */
    setupEvents: function() {
        // Evento para cambio de pestaña a documentación
        document.addEventListener('tabChanged', (event) => {
            if (event.detail && event.detail.newTab === 'documentacion') {
                this.log('Pestaña de documentación activada');
                setTimeout(() => {
                    this.init();
                }, 100);
            }
        });
    },
    
    /**
     * Configura eventos específicos de la documentación
     */
    setupDocumentationEvents: function() {
        // Búsqueda
        const searchInput = document.getElementById('apiSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterEndpoints(e.target.value.toLowerCase());
            });
        }
    },
    
    /**
     * Alterna la expansión de un grupo
     */
    toggleGroup: function(group) {
        if (!group) return;
        
        group.classList.toggle('expanded');
        const button = group.querySelector('.toggle-btn');
        if (button) {
            button.textContent = group.classList.contains('expanded') ? '▲' : '▼';
        }
    },
    
    /**
     * Alterna la expansión de un endpoint
     */
    toggleEndpoint: function(endpoint) {
        if (!endpoint) return;
        
        endpoint.classList.toggle('expanded');
        const button = endpoint.querySelector('.endpoint-header .toggle-btn');
        if (button) {
            button.textContent = endpoint.classList.contains('expanded') ? '▲' : '▼';
        }
    },
    
    /**
     * Filtra endpoints según término de búsqueda
     */
    filterEndpoints: function(searchTerm) {
        if (!searchTerm) {
            // Mostrar todos
            document.querySelectorAll('.api-endpoint, .api-group').forEach(el => {
                el.style.display = '';
            });
            return;
        }
        
        // Filtrar endpoints
        document.querySelectorAll('.api-endpoint').forEach(endpoint => {
            const method = endpoint.getAttribute('data-method') || '';
            const path = endpoint.getAttribute('data-path') || '';
            const summary = endpoint.querySelector('.endpoint-summary')?.textContent || '';
            const description = endpoint.querySelector('.endpoint-description')?.textContent || '';
            
            const isMatch = (
                method.toLowerCase().includes(searchTerm) ||
                path.toLowerCase().includes(searchTerm) ||
                summary.toLowerCase().includes(searchTerm) ||
                description.toLowerCase().includes(searchTerm)
            );
            
            endpoint.style.display = isMatch ? '' : 'none';
        });
        
        // Mostrar/ocultar grupos según endpoints visibles
        document.querySelectorAll('.api-group').forEach(group => {
            const hasVisibleEndpoints = group.querySelector('.api-endpoint:not([style*="none"])') !== null;
            group.style.display = hasVisibleEndpoints ? '' : 'none';
        });
    },
    
    /**
     * Prueba un endpoint específico
     */
    tryEndpoint: function(endpointId) {
        this.log(`Probando endpoint: ${endpointId}`);
        
        // Mostrar notificación
        this.showNotification(`Funcionalidad de prueba para ${endpointId} próximamente`, 'info');
        
        // Expandir el endpoint si no está expandido
        const endpointElement = document.getElementById(`endpoint-${endpointId}`);
        if (endpointElement && !endpointElement.classList.contains('expanded')) {
            this.toggleEndpoint(endpointElement);
        }
    },
    
    /**
     * Realza la sintaxis JSON
     */
    syntaxHighlight: function(json) {
        if (typeof json !== 'string') {
            json = JSON.stringify(json, null, 2);
        }
        
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    },
    
    /**
     * Muestra una notificación
     */
    showNotification: function(message, type = 'info') {
        // Si existe ConfigUtils, usarlo
        if (typeof ConfigUtils !== 'undefined' && ConfigUtils.showNotification) {
            ConfigUtils.showNotification(message, type);
            return;
        }
        
        // De lo contrario, usar implementación propia
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 6px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            background: ${type === 'info' ? '#3b82f6' : '#ef4444'};
            color: white;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },
    
    /**
     * Muestra un error en el container
     */
    showError: function(message) {
        const container = document.getElementById('apiDocumentation');
        if (container) {
            container.innerHTML = `
                <div class="api-error">
                    <h3>Error al cargar documentación</h3>
                    <p>${message}</p>
                    <button onclick="ApiDocumentation.init()" class="retry-btn">Reintentar</button>
                </div>
            `;
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    ApiDocumentation.log('DOM listo, configurando eventos...');
    ApiDocumentation.log('Verificando elementos del DOM...');
    
    // Verificar si el container existe
    const docContainer = document.getElementById('apiDocumentation');
    ApiDocumentation.log('Container apiDocumentation encontrado:', !!docContainer);
    
    // Verificar si hay pestañas
    const docTab = document.querySelector('.services-tab-btn[data-service-tab="documentacion"]');
    ApiDocumentation.log('Tab documentacion encontrado:', !!docTab);
    if (docTab) {
        ApiDocumentation.log('Tab documentacion activo:', docTab.classList.contains('active'));
    }
    
    ApiDocumentation.setupEvents();
    
    // Si ya estamos en la pestaña de documentación, inicializar inmediatamente
    setTimeout(() => {
        ApiDocumentation.log('Verificando estado inicial de pestaña...');
        
        // Si no hay pestañas, inicializar directamente
        const currentDocTab = document.querySelector('.services-tab-btn[data-service-tab="documentacion"]');
        if (!currentDocTab || currentDocTab.classList.contains('active')) {
            ApiDocumentation.log('Inicializando documentación...');
            ApiDocumentation.init();
        } else {
            ApiDocumentation.log('Pestaña no activa, esperando activación...');
        }
    }, 100);
});

// Exponer globalmente
window.ApiDocumentation = ApiDocumentation;
ApiDocumentation.log('Objeto ApiDocumentation expuesto globalmente');