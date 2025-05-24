/**
 * Datos para la documentación de la API
 * 
 * Este archivo carga los datos de ejemplo para la documentación de la API
 */

// Cargar datos de documentación de API cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Datos de la API para la documentación
    const apiData = {
        version: "1.0",
        title: "API de Procesamiento de Mensajes",
        description: "API para procesar mensajes de servicios en formatos de longitud fija y JSON",
        
        // Grupos de endpoints
        groups: [
            {
                name: "Servicios",
                description: "Endpoints para trabajar con servicios de mensajería",
                endpoints: [
                    {
                        id: "ida-service",
                        path: "/api/services/ida",
                        method: "POST",
                        summary: "Servicio de Ida",
                        description: "Convierte un mensaje JSON a un formato de longitud fija según la estructura del servicio seleccionado.",
                        parameters: [
                            {
                                name: "service_number",
                                type: "string",
                                required: true,
                                description: "Número del servicio"
                            },
                            {
                                name: "data",
                                type: "object",
                                required: true,
                                description: "Datos del servicio en formato JSON"
                            }
                        ],
                        requestExample: JSON.stringify({
                            "service_number": "3088",
                            "CANAL": "API",
                            "USUARIO": "SISTEMA",
                            "data": {
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
                                    "success": true,
                                    "fixedWidthString": "ABC123      000150050020250101",
                                    "length": 30
                                }, null, 2)
                            },
                            {
                                code: "400 Bad Request",
                                description: "Error en los parámetros",
                                example: JSON.stringify({
                                    "success": false,
                                    "error": "Servicio no encontrado o parámetros inválidos"
                                }, null, 2)
                            }
                        ]
                    },
                    {
                        id: "vuelta-service",
                        path: "/api/services/vuelta",
                        method: "POST",
                        summary: "Servicio de Vuelta",
                        description: "Convierte un mensaje de longitud fija a formato JSON según la estructura del servicio.",
                        parameters: [
                            {
                                name: "service_number",
                                type: "string",
                                required: true,
                                description: "Número del servicio"
                            },
                            {
                                name: "fixedWidthString",
                                type: "string",
                                required: true,
                                description: "Cadena de texto de longitud fija a convertir"
                            }
                        ],
                        requestExample: JSON.stringify({
                            "service_number": "3088",
                            "fixedWidthString": "ABC123      000150050020250101"
                        }, null, 2),
                        responses: [
                            {
                                code: "200 OK",
                                description: "Conversión exitosa",
                                example: JSON.stringify({
                                    "success": true,
                                    "data": {
                                        "CODIGO": "ABC123",
                                        "MONTO": 1500.50,
                                        "FECHA": "20250101"
                                    }
                                }, null, 2)
                            },
                            {
                                code: "400 Bad Request",
                                description: "Error en los parámetros",
                                example: JSON.stringify({
                                    "success": false,
                                    "error": "Servicio no encontrado o parámetros inválidos"
                                }, null, 2)
                            }
                        ]
                    },
                    {
                        id: "process-service",
                        path: "/api/services/process",
                        method: "POST",
                        summary: "Procesar Servicio",
                        description: "Procesa un servicio completo, aplicando tanto la transformación de ida como cualquier lógica de negocio requerida.",
                        parameters: [
                            {
                                name: "service_number",
                                type: "string",
                                required: true,
                                description: "Número del servicio a procesar"
                            },
                            {
                                name: "data",
                                type: "object",
                                required: true,
                                description: "Datos para el procesamiento del servicio"
                            }
                        ],
                        requestExample: JSON.stringify({
                            "service_number": "3088",
                            "CANAL": "API",
                            "USUARIO": "SISTEMA",
                            "data": {
                                "CODIGO": "ABC123",
                                "MONTO": 1500.50,
                                "FECHA": "20250101"
                            }
                        }, null, 2),
                        responses: [
                            {
                                code: "200 OK",
                                description: "Procesamiento exitoso",
                                example: JSON.stringify({
                                    "success": true,
                                    "processedData": {
                                        "request": {
                                            "fixedWidthString": "ABC123      000150050020250101",
                                            "length": 30
                                        },
                                        "response": {
                                            "RESULTADO": "APROBADO",
                                            "CODIGO_AUTORIZACION": "XYZ987",
                                            "TIMESTAMP": "20250101120000"
                                        }
                                    }
                                }, null, 2)
                            },
                            {
                                code: "400 Bad Request",
                                description: "Error en los parámetros",
                                example: JSON.stringify({
                                    "success": false,
                                    "error": "Servicio no encontrado o parámetros inválidos"
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
                        description: "Obtiene la lista de configuraciones disponibles para un servicio específico.",
                        parameters: [
                            {
                                name: "service_number",
                                type: "string",
                                required: false,
                                description: "Número del servicio (opcional, para filtrar por servicio)"
                            }
                        ],
                        responses: [
                            {
                                code: "200 OK",
                                description: "Lista de configuraciones",
                                example: JSON.stringify({
                                    "success": true,
                                    "configs": [
                                        {
                                            "id": "1234",
                                            "serviceNumber": "3088",
                                            "canal": "API",
                                            "version": "v2"
                                        },
                                        {
                                            "id": "5678",
                                            "serviceNumber": "3088",
                                            "canal": "WEB",
                                            "version": "v1"
                                        }
                                    ]
                                }, null, 2)
                            }
                        ]
                    },
                    {
                        id: "config-get",
                        path: "/service-config/get/:id",
                        method: "GET",
                        summary: "Obtener configuración",
                        description: "Obtiene los detalles de una configuración específica por su ID.",
                        parameters: [
                            {
                                name: "id",
                                type: "string",
                                required: true,
                                description: "ID de la configuración"
                            }
                        ],
                        responses: [
                            {
                                code: "200 OK",
                                description: "Detalles de la configuración",
                                example: JSON.stringify({
                                    "id": "1234",
                                    "serviceNumber": "3088",
                                    "canal": "API",
                                    "version": "v2",
                                    "header": {
                                        "USUARIO": "SISTEMA"
                                    },
                                    "request": {
                                        "CODIGO": "EJEMPLO",
                                        "MONTO": 0,
                                        "FECHA": "20250101"
                                    }
                                }, null, 2)
                            },
                            {
                                code: "404 Not Found",
                                description: "Configuración no encontrada",
                                example: JSON.stringify({
                                    "success": false,
                                    "error": "Configuración no encontrada"
                                }, null, 2)
                            }
                        ]
                    },
                    {
                        id: "config-save",
                        path: "/service-config/save",
                        method: "POST",
                        summary: "Guardar configuración",
                        description: "Guarda una nueva configuración o actualiza una existente.",
                        parameters: [
                            {
                                name: "serviceNumber",
                                type: "string",
                                required: true,
                                description: "Número del servicio"
                            },
                            {
                                name: "canal",
                                type: "string",
                                required: true,
                                description: "Canal (máximo 3 caracteres)"
                            },
                            {
                                name: "header",
                                type: "object",
                                required: false,
                                description: "Configuración de campos de cabecera"
                            },
                            {
                                name: "request",
                                type: "object",
                                required: false,
                                description: "Configuración de campos de solicitud"
                            }
                        ],
                        requestExample: JSON.stringify({
                            "serviceNumber": "3088",
                            "canal": "API",
                            "header": {
                                "USUARIO": "SISTEMA"
                            },
                            "request": {
                                "CODIGO": "EJEMPLO",
                                "MONTO": 0,
                                "FECHA": "20250101"
                            }
                        }, null, 2),
                        responses: [
                            {
                                code: "200 OK",
                                description: "Configuración guardada exitosamente",
                                example: JSON.stringify({
                                    "success": true,
                                    "id": "1234",
                                    "message": "Configuración guardada correctamente"
                                }, null, 2)
                            },
                            {
                                code: "400 Bad Request",
                                description: "Error en los parámetros",
                                example: JSON.stringify({
                                    "success": false,
                                    "error": "Parámetros inválidos"
                                }, null, 2)
                            }
                        ]
                    }
                ]
            },
            {
                name: "Estructuras",
                description: "Endpoints para acceder a estructuras de servicios",
                endpoints: [
                    {
                        id: "structure-list",
                        path: "/excel/structures",
                        method: "GET",
                        summary: "Listar estructuras",
                        description: "Obtiene la lista de estructuras disponibles.",
                        responses: [
                            {
                                code: "200 OK",
                                description: "Lista de estructuras",
                                example: JSON.stringify({
                                    "success": true,
                                    "structures": [
                                        {
                                            "id": "20250507T143117_3088_structure",
                                            "service_number": "3088",
                                            "date": "2025-05-07T14:31:17"
                                        },
                                        {
                                            "id": "20250507T144414_3147_structure",
                                            "service_number": "3147",
                                            "date": "2025-05-07T14:44:14"
                                        }
                                    ]
                                }, null, 2)
                            }
                        ]
                    },
                    {
                        id: "structure-get",
                        path: "/excel/structure/:id",
                        method: "GET",
                        summary: "Obtener estructura",
                        description: "Obtiene los detalles de una estructura específica por su ID.",
                        parameters: [
                            {
                                name: "id",
                                type: "string",
                                required: true,
                                description: "ID de la estructura"
                            }
                        ],
                        responses: [
                            {
                                code: "200 OK",
                                description: "Detalles de la estructura",
                                example: JSON.stringify({
                                    "success": true,
                                    "structure": {
                                        "service_number": "3088",
                                        "service_name": "Consulta de saldo",
                                        "service_structure": {
                                            "header": {
                                                "elements": []
                                            },
                                            "request": {
                                                "elements": []
                                            },
                                            "response": {
                                                "elements": []
                                            }
                                        }
                                    }
                                }, null, 2)
                            },
                            {
                                code: "404 Not Found",
                                description: "Estructura no encontrada",
                                example: JSON.stringify({
                                    "success": false,
                                    "error": "Estructura no encontrada"
                                }, null, 2)
                            }
                        ]
                    },
                    {
                        id: "structure-by-service",
                        path: "/excel/structure-by-service",
                        method: "GET",
                        summary: "Obtener estructura por servicio",
                        description: "Obtiene la estructura más reciente para un servicio específico.",
                        parameters: [
                            {
                                name: "service_number",
                                type: "string",
                                required: true,
                                description: "Número del servicio"
                            }
                        ],
                        responses: [
                            {
                                code: "200 OK",
                                description: "Estructura del servicio",
                                example: JSON.stringify({
                                    "success": true,
                                    "service_number": "3088",
                                    "service_name": "Consulta de saldo",
                                    "service_structure": {
                                        "header": {
                                            "elements": []
                                        },
                                        "request": {
                                            "elements": []
                                        },
                                        "response": {
                                            "elements": []
                                        }
                                    }
                                }, null, 2)
                            },
                            {
                                code: "404 Not Found",
                                description: "Servicio no encontrado",
                                example: JSON.stringify({
                                    "success": false,
                                    "error": "No se encontraron estructuras para el servicio"
                                }, null, 2)
                            }
                        ]
                    }
                ]
            }
        ]
    };
    
    // Si ApiDocumentation existe, cargar los datos
    if (typeof ApiDocumentation !== 'undefined') {
        ApiDocumentation.apiData = apiData;
        
        // Llamar a renderApiDocumentation si está disponible
        if (typeof ApiDocumentation.renderApiDocumentation === 'function') {
            ApiDocumentation.renderApiDocumentation();
        } else {
            console.warn('Función renderApiDocumentation no disponible');
            
            // Asignar método para cargar los datos cuando esté disponible
            const originalInit = ApiDocumentation.init;
            ApiDocumentation.init = function() {
                // Llamar al método original
                if (typeof originalInit === 'function') {
                    originalInit.call(this);
                }
                
                // Asegurarse de que los datos estén cargados
                this.apiData = apiData;
                
                // Renderizar la documentación
                if (typeof this.renderApiDocumentation === 'function') {
                    this.renderApiDocumentation();
                }
            };
        }
    } else {
        console.error('Objeto ApiDocumentation no disponible');
    }
});

console.log('Datos de API cargados correctamente');
