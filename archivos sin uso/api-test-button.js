/**
 * Complemento para api-documentation.js
 * Este archivo agrega las funciones necesarias para los botones de prueba de API
 */

// Verificar que el objeto ApiDocumentation esté definido
if (typeof ApiDocumentation !== 'undefined') {
    
    // Añadir métodos faltantes al objeto ApiDocumentation
    Object.assign(ApiDocumentation, {
        
        /**
         * Convierte un texto a formato slug (para usar en IDs)
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
         * Alternar mostrar/ocultar un grupo de endpoints
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
         * Alternar mostrar/ocultar detalles de un endpoint
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
         * Filtra los endpoints según el texto de búsqueda
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
        },
        
        /**
         * Abre el modal para probar un endpoint específico
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
                // Cargar los datos del servicio seleccionado
                let requestData = {};
                
                try {
                    // Intentar obtener datos del editor JSON
                    const jsonEditor = document.getElementById('service-json-editor');
                    if (jsonEditor) {
                        requestData = JSON.parse(jsonEditor.textContent);
                    }
                } catch (error) {
                    console.warn("Error al parsear JSON del editor:", error);
                }
                
                // Usar los datos JSON para la prueba del endpoint
                this.testEndpointWithData(targetEndpoint, requestData);
            } else {
                // De lo contrario, mostrar un formulario para introducir los datos manualmente
                this.showTestEndpointForm(targetEndpoint);
            }
            
            // Hacer visible este endpoint en la documentación
            const endpointElement = document.getElementById(`endpoint-${endpointId}`);
            if (endpointElement && !endpointElement.classList.contains('expanded')) {
                this.toggleEndpoint(endpointElement);
            }
        },
        
        /**
         * Testa un endpoint con los datos proporcionados directamente
         */
        testEndpointWithData: function(endpoint, data) {
            if (!endpoint) return;
            
            // Mostrar notificación de que estamos usando el endpoint
            ConfigUtils.showNotification(
                `Probando endpoint ${endpoint.method} ${endpoint.path} con el servicio seleccionado...`,
                'info'
            );
            
            // Determinar el método a utilizar según el endpoint
            let methodInfo;
            
            switch (endpoint.id) {
                case 'ida-service':
                    methodInfo = { 
                        id: 'ida-service', 
                        name: 'Servicio de Ida', 
                        method: 'POST', 
                        path: '/api/services/ida' 
                    };
                    break;
                    
                case 'vuelta-service':
                    methodInfo = { 
                        id: 'vuelta-service', 
                        name: 'Servicio de Vuelta', 
                        method: 'POST', 
                        path: '/api/services/vuelta' 
                    };
                    break;
                    
                case 'process-service':
                    methodInfo = { 
                        id: 'process-service', 
                        name: 'Procesar Servicio', 
                        method: 'POST', 
                        path: '/api/services/process' 
                    };
                    break;
                    
                default:
                    // Para otros endpoints, usar la información del propio endpoint
                    methodInfo = { 
                        id: endpoint.id, 
                        name: endpoint.summary || endpoint.path, 
                        method: endpoint.method, 
                        path: endpoint.path 
                    };
            }
            
            // Llamar al método API con los datos proporcionados
            this.callApiMethod(methodInfo);
        },
        
        /**
         * Muestra un formulario para probar un endpoint
         */
        showTestEndpointForm: function(endpoint) {
            // Notificar al usuario que debe seleccionar un servicio primero
            ConfigUtils.showNotification(
                'Para probar los endpoints, seleccione primero un servicio en la parte superior.',
                'warning',
                5000
            );
            
            // Desplazarse hasta la sección de selección de servicio
            const serviceSelector = document.getElementById('main-service-selector');
            if (serviceSelector) {
                serviceSelector.scrollIntoView({ behavior: 'smooth' });
                
                // Aplicar un efecto de destello al selector para llamar la atención
                serviceSelector.classList.add('highlight-effect');
                setTimeout(() => {
                    serviceSelector.classList.remove('highlight-effect');
                }, 2000);
            }
        },
        
        /**
         * Prueba el endpoint seleccionado actualmente
         */
        testSelectedEndpoint: function() {
            // Verificar que hay un servicio seleccionado
            if (!this.selectedService) {
                ConfigUtils.showNotification('Debe seleccionar un servicio', 'warning');
                return;
            }
        
            // Obtener JSON del editor
            const jsonEditor = document.getElementById('service-json-editor');
            if (!jsonEditor) {
                ConfigUtils.showNotification('Editor de JSON no encontrado', 'error');
                return;
            }
            
            // Obtener el servicio seleccionado y su información estructural
            const serviceNumber = this.selectedService.number;
            
            // Parsear JSON del editor
            let requestData;
            try {
                requestData = JSON.parse(jsonEditor.textContent);
            } catch (error) {
                ConfigUtils.showNotification(`JSON inválido: ${error.message}`, 'error');
                return;
            }
            
            // Puede iniciar con el endpoint de ida
            const idaEndpoint = {
                id: 'ida-service',
                method: 'POST',
                path: '/api/services/ida',
                summary: 'Crea mensaje para servicio de ida'
            };
            
            // Llamar al método para probar el endpoint
            this.testEndpointWithData(idaEndpoint, requestData);
        }
    });
    
    // Agregar estilos CSS para el efecto de destello
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .highlight-effect {
            animation: highlight-pulse 1s 2;
        }
        
        @keyframes highlight-pulse {
            0% { box-shadow: 0 0 0 0 rgba(var(--accent-color-rgb), 0.7); }
            50% { box-shadow: 0 0 0 10px rgba(var(--accent-color-rgb), 0); }
            100% { box-shadow: 0 0 0 0 rgba(var(--accent-color-rgb), 0); }
        }

        /* Estilos para el botón de prueba en cada endpoint */
        .try-it-btn {
            margin-top: 10px;
            margin-bottom: 5px;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: var(--radius);
            padding: 8px 16px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .try-it-btn:hover {
            background-color: var(--primary-hover);
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(styleElement);

    // Añadir botones "Probar" a cada endpoint al cargar la página
    document.addEventListener('DOMContentLoaded', function() {
        // Esperar un poco para asegurarse de que ApiDocumentation ha renderizado la documentación
        setTimeout(() => {
            // Añadir botones de prueba a todos los endpoints
            document.querySelectorAll('.api-endpoint').forEach(endpoint => {
                const endpointId = endpoint.id.replace('endpoint-', '');
                const endpointContent = endpoint.querySelector('.endpoint-content');
                
                if (endpointContent && !endpointContent.querySelector('.try-it-btn')) {
                    const button = document.createElement('button');
                    button.className = 'try-it-btn';
                    button.setAttribute('data-endpoint', endpointId);
                    button.textContent = 'Probar Endpoint';
                    
                    endpointContent.appendChild(button);
                }
            });
        }, 1000);
    });
}
