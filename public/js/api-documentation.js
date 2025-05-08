/**
 * API Documentation Handler
 * 
 * Maneja la interactividad de la documentación de API estilo Swagger
 */

const ApiDocumentation = {
    // Datos de la API
    apiData: null,
    
    /**
     * Inicializa la documentación de la API
     */
    init: function() {
        console.log('Inicializando documentación de API');
        this.loadApiData();
        this.setupEventListeners();
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
        });
        
        // Manejar búsqueda/filtrado
        const searchInput = document.querySelector('.api-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', event => {
                this.filterEndpoints(event.target.value.trim().toLowerCase());
            });
        }
    },
    
    /**
     * Carga los datos de la API 
     */
    loadApiData: function() {
        // Datos de la API - en una aplicación real esto podría cargarse desde un archivo JSON
        this.apiData = {
            title: "API de Servicios y Excel",
            version: "1.0.0",
            description: "API para gestionar servicios y archivos Excel de estructuras de datos",
            groups: [
                {
                    name: "Servicios",
                    description: "Endpoints para gestionar y procesar servicios",
                    endpoints: [
                        {
                            id: "get-services",
                            method: "GET",
                            path: "/api/services",
                            summary: "Obtiene la lista de servicios disponibles",
                            description: "Devuelve todos los servicios disponibles en el sistema con sus detalles",
                            parameters: [],
                            responses: [
                                {
                                    code: "200",
                                    description: "Lista de servicios obtenida correctamente",
                                    example: `{
  "services": [
    {
      "service_number": "1083",
      "service_name": "Consulta de Impuestos",
      "structure_file": "20220515T120000_1083_structure.json",
      "excel_file": "20220515T120000_SVO1083_Consulta_Impuestos.xlsx",
      "timestamp": "2022-05-15T12:00:00.000Z"
    },
    {
      "service_number": "1010",
      "service_name": "Consulta de Cuentas",
      "structure_file": "20220510T090000_1010_structure.json",
      "excel_file": "20220510T090000_SVO1010_Consulta_Cuentas.xlsx",
      "timestamp": "2022-05-10T09:00:00.000Z"
    }
  ]
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al obtener la lista de servicios",
                                    example: `{
  "error": "Error al obtener la lista de servicios: Error de conexión con la base de datos"
}`
                                }
                            ]
                        },
                        {
                            id: "process-service",
                            method: "POST",
                            path: "/api/services/process",
                            summary: "Procesa un servicio",
                            description: "Procesa un servicio por número y opcionalmente con datos de stream",
                            parameters: [
                                {
                                    name: "service_number",
                                    type: "string",
                                    required: true,
                                    description: "Número de servicio a procesar"
                                },
                                {
                                    name: "stream",
                                    type: "string",
                                    required: false,
                                    description: "Stream de datos a procesar (opcional)"
                                }
                            ],
                            requestExample: `{
  "service_number": "1083",
  "stream": "API1083SISTEMA........"
}`,
                            responses: [
                                {
                                    code: "200",
                                    description: "Servicio procesado correctamente",
                                    example: `{
  "result": {
    "header": {
      "CANAL": "API",
      "SERVICIO": "1083",
      "USUARIO": "SISTEMA"
    },
    "response": {
      "IMPUESTO": "IVA",
      "MONTO": 1250.50
    }
  }
}`
                                },
                                {
                                    code: "400",
                                    description: "Error en los parámetros",
                                    example: `{
  "error": "Se requiere el número de servicio"
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al procesar el servicio",
                                    example: `{
  "error": "Error al procesar servicio: Servicio no encontrado"
}`
                                }
                            ]
                        },
                        {
                            id: "ida-service",
                            method: "POST",
                            path: "/api/services/ida",
                            summary: "Crea mensaje para servicio de ida",
                            description: "Crea un mensaje en formato de stream basado en un JSON para un servicio de ida",
                            parameters: [
                                {
                                    name: "service_number",
                                    type: "string",
                                    required: true,
                                    description: "Número de servicio"
                                },
                                {
                                    name: "CANAL",
                                    type: "string",
                                    required: false,
                                    description: "Canal de envío (por defecto: API)"
                                },
                                {
                                    name: "USUARIO",
                                    type: "string",
                                    required: false,
                                    description: "Usuario (por defecto: SISTEMA)"
                                },
                                {
                                    name: "data",
                                    type: "object",
                                    required: true,
                                    description: "Datos para el mensaje"
                                }
                            ],
                            requestExample: `{
  "service_number": "1083",
  "CANAL": "API",
  "USUARIO": "SISTEMA",
  "data": {
    "CUIT": "30123456789",
    "PERIODO": "202201"
  }
}`,
                            responses: [
                                {
                                    code: "200",
                                    description: "Mensaje creado correctamente",
                                    example: `{
  "service_number": "1083",
  "service_name": "Consulta de Impuestos",
  "message": "API1083SISTEMA30123456789202201",
  "status": "success"
}`
                                },
                                {
                                    code: "400",
                                    description: "Error en los parámetros",
                                    example: `{
  "error": "Se requiere un número de servicio en el campo service_number"
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al crear el mensaje",
                                    example: `{
  "error": "Error al crear mensaje: Estructura de servicio no encontrada"
}`
                                }
                            ]
                        },
                        {
                            id: "vuelta-service",
                            method: "POST",
                            path: "/api/services/vuelta",
                            summary: "Procesa respuesta de servicio",
                            description: "Procesa un stream de respuesta para un servicio de vuelta",
                            parameters: [
                                {
                                    name: "service_number",
                                    type: "string",
                                    required: true,
                                    description: "Número de servicio"
                                },
                                {
                                    name: "stream",
                                    type: "string",
                                    required: true,
                                    description: "Stream de respuesta a procesar"
                                }
                            ],
                            requestExample: `{
  "service_number": "1083",
  "stream": "API1083SISTEMA....RESPUESTA...."
}`,
                            responses: [
                                {
                                    code: "200",
                                    description: "Respuesta procesada correctamente",
                                    example: `{
  "IMPUESTO": "IVA",
  "MONTO": 1250.50,
  "ESTADO": "PAGADO"
}`
                                },
                                {
                                    code: "400",
                                    description: "Error en los parámetros o validación",
                                    example: `{
  "error": "Se requiere el stream de datos",
  "errorType": "VALIDATION_ERROR"
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al procesar la respuesta",
                                    example: `{
  "error": "Error al procesar el stream: Formato inválido",
  "errorType": "PROCESSING_ERROR"
}`
                                }
                            ]
                        },
                        {
                            id: "service-versions",
                            method: "GET",
                            path: "/api/services/versions",
                            summary: "Obtiene versiones de un servicio",
                            description: "Obtiene todas las versiones disponibles de un servicio específico",
                            parameters: [
                                {
                                    name: "serviceNumber",
                                    type: "string",
                                    required: true,
                                    description: "Número de servicio",
                                    location: "query"
                                }
                            ],
                            responses: [
                                {
                                    code: "200",
                                    description: "Versiones obtenidas correctamente",
                                    example: `{
  "serviceNumber": "1083",
  "versions": [
    {
      "service_number": "1083",
      "service_name": "Consulta de Impuestos",
      "excel_file": "20220515T120000_SVO1083_Consulta_Impuestos.xlsx",
      "timestamp": "2022-05-15T12:00:00.000Z"
    },
    {
      "service_number": "1083",
      "service_name": "Consulta de Impuestos",
      "excel_file": "20220420T140000_SVO1083_Consulta_Impuestos.xlsx",
      "timestamp": "2022-04-20T14:00:00.000Z"
    }
  ]
}`
                                },
                                {
                                    code: "400",
                                    description: "Error en los parámetros",
                                    example: `{
  "error": "Se requiere un número de servicio"
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al obtener las versiones",
                                    example: `{
  "error": "Error al obtener versiones del servicio: No se encontraron datos"
}`
                                }
                            ]
                        }
                    ]
                },
                {
                    name: "Excel",
                    description: "Endpoints para gestionar archivos Excel y sus estructuras",
                    endpoints: [
                        {
                            id: "upload-excel",
                            method: "POST",
                            path: "/excel/upload",
                            summary: "Sube y procesa un archivo Excel",
                            description: "Sube un archivo Excel con estructura de servicio y lo procesa",
                            parameters: [
                                {
                                    name: "file",
                                    type: "file",
                                    required: true,
                                    description: "Archivo Excel a subir"
                                },
                                {
                                    name: "update",
                                    type: "boolean",
                                    required: false,
                                    description: "Indica si es una actualización de un servicio existente"
                                }
                            ],
                            responses: [
                                {
                                    code: "200",
                                    description: "Archivo Excel procesado correctamente",
                                    example: `{
  "message": "Archivo Excel procesado correctamente",
  "service_number": "1083",
  "service_name": "Consulta de Impuestos",
  "structure_file": "20220515T120000_1083_structure.json"
}`
                                },
                                {
                                    code: "409",
                                    description: "Archivo duplicado",
                                    example: `{
  "error": "La versión que está intentando subir es idéntica a una ya existente",
  "message": "El sistema ha detectado que este archivo ya ha sido procesado anteriormente."
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al procesar el archivo",
                                    example: `{
  "error": "Error al procesar el archivo Excel: Formato incorrecto"
}`
                                }
                            ]
                        },
                        {
                            id: "excel-files",
                            method: "GET",
                            path: "/excel/files",
                            summary: "Obtiene la lista de archivos Excel",
                            description: "Obtiene todos los archivos Excel procesados en el sistema",
                            parameters: [],
                            responses: [
                                {
                                    code: "200",
                                    description: "Lista de archivos obtenida correctamente",
                                    example: `{
  "files": [
    {
      "filename": "20220515T120000_SVO1083_Consulta_Impuestos.xlsx",
      "service_name": "Consulta de Impuestos",
      "upload_date": "2022-05-15 12:00:00",
      "service_number": "1083"
    },
    {
      "filename": "20220510T090000_SVO1010_Consulta_Cuentas.xlsx",
      "service_name": "Consulta de Cuentas",
      "upload_date": "2022-05-10 09:00:00",
      "service_number": "1010"
    }
  ]
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al obtener la lista de archivos",
                                    example: `{
  "error": "Error al obtener la lista de archivos: Error al leer el directorio"
}`
                                }
                            ]
                        },
                        {
                            id: "get-structure",
                            method: "GET",
                            path: "/excel/structure",
                            summary: "Obtiene la estructura de un archivo",
                            description: "Obtiene la estructura completa de un archivo procesado",
                            parameters: [
                                {
                                    name: "structure_file",
                                    type: "string",
                                    required: true,
                                    description: "Nombre del archivo de estructura",
                                    location: "query"
                                }
                            ],
                            responses: [
                                {
                                    code: "200",
                                    description: "Estructura obtenida correctamente",
                                    example: `{
  "header_structure": {
    "fields": [
      {"name": "CANAL", "length": "3", "type": "string", "required": true},
      {"name": "SERVICIO", "length": "4", "type": "string", "required": true},
      {"name": "USUARIO", "length": "8", "type": "string", "required": true}
    ],
    "totalLength": 15
  },
  "service_structure": {
    "serviceName": "Consulta de Impuestos",
    "serviceNumber": "1083",
    "request": {
      "elements": [...]
    },
    "response": {
      "elements": [...]
    }
  }
}`
                                },
                                {
                                    code: "400",
                                    description: "Error en los parámetros",
                                    example: `{
  "error": "Archivo de estructura no especificado"
}`
                                },
                                {
                                    code: "404",
                                    description: "Estructura no encontrada",
                                    example: `{
  "error": "Estructura no encontrada: El archivo especificado no existe"
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al obtener la estructura",
                                    example: `{
  "error": "Error al cargar la estructura: Error al leer el archivo"
}`
                                }
                            ]
                        },
                        {
                            id: "structure-by-service",
                            method: "GET",
                            path: "/excel/structure-by-service",
                            summary: "Obtiene estructura por número de servicio",
                            description: "Obtiene la estructura más reciente para un número de servicio específico",
                            parameters: [
                                {
                                    name: "service_number",
                                    type: "string",
                                    required: true,
                                    description: "Número del servicio",
                                    location: "query"
                                }
                            ],
                            responses: [
                                {
                                    code: "200",
                                    description: "Estructura obtenida correctamente",
                                    example: `{
  "header_structure": {
    "fields": [
      {"name": "CANAL", "length": "3", "type": "string", "required": true},
      {"name": "SERVICIO", "length": "4", "type": "string", "required": true},
      {"name": "USUARIO", "length": "8", "type": "string", "required": true}
    ],
    "totalLength": 15
  },
  "service_structure": {
    "serviceName": "Consulta de Impuestos",
    "serviceNumber": "1083",
    "request": {
      "elements": [...]
    },
    "response": {
      "elements": [...]
    }
  }
}`
                                },
                                {
                                    code: "400",
                                    description: "Error en los parámetros",
                                    example: `{
  "error": "Se requiere el número de servicio"
}`
                                },
                                {
                                    code: "404",
                                    description: "Servicio no encontrado",
                                    example: `{
  "error": "No se encontró estructura para el servicio 9999"
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al obtener la estructura",
                                    example: `{
  "error": "Error al cargar la estructura: Error al leer el archivo"
}`
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
                            id: "save-config",
                            method: "POST",
                            path: "/service-config/save",
                            summary: "Guarda una configuración de servicio",
                            description: "Guarda una configuración para un servicio específico",
                            parameters: [
                                {
                                    name: "service_number",
                                    type: "string",
                                    required: true,
                                    description: "Número del servicio"
                                },
                                {
                                    name: "config_name",
                                    type: "string",
                                    required: true,
                                    description: "Nombre de la configuración"
                                },
                                {
                                    name: "canal",
                                    type: "string",
                                    required: true,
                                    description: "Canal para el servicio"
                                },
                                {
                                    name: "field_values",
                                    type: "object",
                                    required: true,
                                    description: "Valores de los campos configurados"
                                }
                            ],
                            requestExample: `{
  "service_number": "1083",
  "config_name": "Configuración IVA",
  "canal": "API",
  "field_values": {
    "CUIT": "30123456789",
    "PERIODO": "202201"
  }
}`,
                            responses: [
                                {
                                    code: "200",
                                    description: "Configuración guardada correctamente",
                                    example: `{
  "message": "Configuración guardada correctamente",
  "config_id": "1083_config_1651234567890",
  "timestamp": "2022-05-15T12:00:00.000Z"
}`
                                },
                                {
                                    code: "400",
                                    description: "Error en los parámetros",
                                    example: `{
  "error": "Se requiere un nombre para la configuración"
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al guardar la configuración",
                                    example: `{
  "error": "Error al guardar la configuración: Error al escribir el archivo"
}`
                                }
                            ]
                        },
                        {
                            id: "list-configs",
                            method: "GET",
                            path: "/service-config/list",
                            summary: "Lista configuraciones de servicios",
                            description: "Obtiene la lista de configuraciones guardadas, opcionalmente filtradas por servicio",
                            parameters: [
                                {
                                    name: "service_number",
                                    type: "string",
                                    required: false,
                                    description: "Número de servicio para filtrar (opcional)",
                                    location: "query"
                                }
                            ],
                            responses: [
                                {
                                    code: "200",
                                    description: "Lista de configuraciones obtenida correctamente",
                                    example: `{
  "configs": [
    {
      "config_id": "1083_config_1651234567890",
      "service_number": "1083",
      "config_name": "Configuración IVA",
      "canal": "API",
      "timestamp": "2022-05-15T12:00:00.000Z"
    },
    {
      "config_id": "1010_config_1651234567891",
      "service_number": "1010",
      "config_name": "Configuración Cuentas",
      "canal": "OT",
      "timestamp": "2022-05-10T09:00:00.000Z"
    }
  ]
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al obtener las configuraciones",
                                    example: `{
  "error": "Error al obtener configuraciones: Error al leer el directorio"
}`
                                }
                            ]
                        },
                        {
                            id: "get-config",
                            method: "GET",
                            path: "/service-config/get/:id",
                            summary: "Obtiene una configuración",
                            description: "Obtiene los detalles de una configuración específica por ID",
                            parameters: [
                                {
                                    name: "id",
                                    type: "string",
                                    required: true,
                                    description: "ID de la configuración",
                                    location: "path"
                                }
                            ],
                            responses: [
                                {
                                    code: "200",
                                    description: "Configuración obtenida correctamente",
                                    example: `{
  "config_id": "1083_config_1651234567890",
  "service_number": "1083",
  "service_name": "Consulta de Impuestos",
  "config_name": "Configuración IVA",
  "canal": "API",
  "field_values": {
    "CUIT": "30123456789",
    "PERIODO": "202201"
  },
  "timestamp": "2022-05-15T12:00:00.000Z"
}`
                                },
                                {
                                    code: "404",
                                    description: "Configuración no encontrada",
                                    example: `{
  "error": "Configuración no encontrada"
}`
                                },
                                {
                                    code: "500",
                                    description: "Error al obtener la configuración",
                                    example: `{
  "error": "Error al obtener la configuración: Error al leer el archivo"
}`
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        
        // Renderizar la documentación
        this.renderApiDocumentation();
    },
    
    /**
     * Renderiza la documentación de la API
     */
    renderApiDocumentation: function() {
        const apiContainer = document.getElementById('apiDocumentation');
        if (!apiContainer || !this.apiData) return;
        
        // Crear header de la documentación
        let html = `
            <div class="api-doc-container">
                <div class="api-doc-header">
                    <span class="api-version">v${this.apiData.version}</span>
                    <h1>${this.apiData.title}</h1>
                    <p>${this.apiData.description}</p>
                    
                    <div class="api-search-container">
                        <input type="text" class="api-search-input" placeholder="Buscar endpoints (método, ruta, descripción)...">
                    </div>
                </div>
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
        
        // Abrir el primer grupo por defecto
        const firstGroup = apiContainer.querySelector('.api-group');
        if (firstGroup) {
            this.toggleGroup(firstGroup);
        }
    },
    
    /**
     * Renderiza un endpoint individual
     * @param {Object} endpoint - Datos del endpoint
     * @returns {string} HTML del endpoint
     */
    renderEndpoint: function(endpoint) {
        let html = `
            <div class="api-endpoint" id="endpoint-${endpoint.id}" data-path="${endpoint.path}" data-method="${endpoint.method}">
                <div class="endpoint-header">
                    <span class="http-method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                    <span class="endpoint-path">${endpoint.path}</span>
                    <span class="endpoint-summary">${endpoint.summary}</span>
                </div>
                <div class="endpoint-content">
                    <div class="endpoint-description">${endpoint.description}</div>
        `;
        
        // Parámetros
        if (endpoint.parameters && endpoint.parameters.length > 0) {
            html += `
                <div class="params-section">
                    <div class="params-title">Parámetros</div>
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
                        <td class="param-type">${param.type}</td>
                        <td>${param.required ? '<span class="param-required">Sí</span>' : 'No'}</td>
                        <td>${param.description}</td>
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
                <div class="example-container">
                    <div class="example-title">Ejemplo de solicitud</div>
                    <pre class="code-example">${this.syntaxHighlight(endpoint.requestExample)}</pre>
                </div>
            `;
        }
        
        // Respuestas
        if (endpoint.responses && endpoint.responses.length > 0) {
            html += `
                <div class="response-section">
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
                                    response.code.startsWith('4') ? 'error' : 'warning';
                
                html += `
                    <tr>
                        <td><span class="response-code ${responseClass}">${response.code}</span></td>
                        <td>${response.description}</td>
                    </tr>
                `;
                
                // Ejemplo de respuesta si está disponible
                if (response.example) {
                    html += `
                        <tr>
                            <td colspan="2">
                                <div class="example-container">
                                    <div class="example-title">Ejemplo de respuesta (${response.code})</div>
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
                </div>
            `;
        }
        
        // Botón para probar el endpoint (solo para métodos POST)
        if (endpoint.method === 'POST') {
            html += `
                <button class="try-it-btn" data-endpoint="${endpoint.id}">Probar Este Endpoint</button>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        return html;
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
     * Expande/contrae un grupo de endpoints
     * @param {HTMLElement} group - El elemento del grupo
     */
    toggleGroup: function(group) {
        if (!group) return;
        
        const content = group.querySelector('.api-group-content');
        const toggleBtn = group.querySelector('.toggle-btn');
        
        if (group.classList.contains('expanded')) {
            group.classList.remove('expanded');
            if (toggleBtn) toggleBtn.textContent = '▼';
        } else {
            group.classList.add('expanded');
            if (toggleBtn) toggleBtn.textContent = '▲';
        }
    },
    
    /**
     * Expande/contrae un endpoint
     * @param {HTMLElement} endpoint - El elemento del endpoint
     */
    toggleEndpoint: function(endpoint) {
        if (!endpoint) return;
        
        if (endpoint.classList.contains('expanded')) {
            endpoint.classList.remove('expanded');
        } else {
            endpoint.classList.add('expanded');
        }
    },
    
    /**
     * Filtra los endpoints según el texto de búsqueda
     * @param {string} searchText - Texto a buscar
     */
    filterEndpoints: function(searchText) {
        const endpoints = document.querySelectorAll('.api-endpoint');
        
        if (!searchText) {
            // Si no hay texto de búsqueda, mostrar todos
            endpoints.forEach(endpoint => {
                endpoint.style.display = '';
            });
            
            // También mostrar todos los grupos
            document.querySelectorAll('.api-group').forEach(group => {
                group.style.display = '';
            });
            
            return;
        }
        
        // Ocultar todos los endpoints primero
        endpoints.forEach(endpoint => {
            endpoint.style.display = 'none';
        });
        
        // Mostrar solo los que coinciden con la búsqueda
        endpoints.forEach(endpoint => {
            const method = endpoint.getAttribute('data-method') || '';
            const path = endpoint.getAttribute('data-path') || '';
            const summary = endpoint.querySelector('.endpoint-summary')?.textContent || '';
            const description = endpoint.querySelector('.endpoint-description')?.textContent || '';
            
            if (method.toLowerCase().includes(searchText) || 
                path.toLowerCase().includes(searchText) || 
                summary.toLowerCase().includes(searchText) || 
                description.toLowerCase().includes(searchText)) {
                
                endpoint.style.display = '';
                
                // También mostrar el grupo padre
                const parentGroup = endpoint.closest('.api-group');
                if (parentGroup) {
                    parentGroup.style.display = '';
                    parentGroup.classList.add('expanded');
                    parentGroup.querySelector('.api-group-content').style.maxHeight = 'none';
                }
                
                // Expandir el endpoint para mostrar los detalles
                this.toggleEndpoint(endpoint);
            }
        });
        
        // Ocultar grupos sin endpoints visibles
        document.querySelectorAll('.api-group').forEach(group => {
            const visibleEndpoints = group.querySelectorAll('.api-endpoint[style=""]').length;
            if (visibleEndpoints === 0) {
                group.style.display = 'none';
            }
        });
    },
    
    /**
     * Implementación simple de prueba de un endpoint
     * @param {string} endpointId - ID del endpoint a probar
     */
    tryEndpoint: function(endpointId) {
        // Buscar datos del endpoint
        const endpoint = this.apiData.groups.flatMap(g => g.endpoints).find(e => e.id === endpointId);
        
        if (!endpoint) {
            // Usando el método showNotification de ConfigUtils para mantener consistencia
            ConfigUtils.showNotification(`Endpoint ${endpointId} no encontrado`, 'error');
            return;
        }
        
        // Mostrar diálogo de prueba usando showNotification de ConfigUtils
        ConfigUtils.showNotification(`Prueba del endpoint ${endpoint.method} ${endpoint.path}\n\nEn una implementación real, aquí habría un formulario para probar el endpoint.`, 'info', true);
    },
    
    /**
     * Convierte un string a formato slug (para IDs)
     * @param {string} text - Texto a convertir
     * @returns {string} Slug generado
     */
    slugify: function(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Reemplazar espacios con -
            .replace(/[^\w\-]+/g, '')       // Eliminar caracteres que no sean palabra
            .replace(/\-\-+/g, '-')         // Reemplazar múltiples - con uno solo
            .replace(/^-+/, '')             // Recortar - del inicio
            .replace(/-+$/, '');            // Recortar - del final
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    ApiDocumentation.init();
});
