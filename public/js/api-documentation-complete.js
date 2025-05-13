/**
 * Complemento para completar el archivo api-documentation.js
 * 
 * Este archivo agrega las funciones faltantes en api-documentation.js
 * para garantizar que la documentación de API funcione correctamente
 */

// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el objeto ApiDocumentation existe
    if (typeof ApiDocumentation === 'undefined') {
        console.error('Error: ApiDocumentation no está definido');
        return;
    }
    
    // Añadir métodos necesarios si no existen
    if (!ApiDocumentation.renderEndpoint) {
        ApiDocumentation.renderEndpoint = function(endpoint) {
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
        };
    }
    
    // Añadir método toggleGroup si no existe
    if (!ApiDocumentation.toggleGroup) {
        ApiDocumentation.toggleGroup = function(group) {
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
        };
    }
    
    // Añadir método toggleEndpoint si no existe
    if (!ApiDocumentation.toggleEndpoint) {
        ApiDocumentation.toggleEndpoint = function(endpoint) {
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
        };
    }
    
    // Añadir método slugify si no existe
    if (!ApiDocumentation.slugify) {
        ApiDocumentation.slugify = function(text) {
            return text.toString().toLowerCase()
                .replace(/\s+/g, '-')           // Reemplazar espacios con guiones
                .replace(/[^\w\-]+/g, '')       // Eliminar caracteres no válidos
                .replace(/\-\-+/g, '-')         // Reemplazar múltiples guiones con uno solo
                .replace(/^-+/, '')             // Eliminar guiones al inicio
                .replace(/-+$/, '');            // Eliminar guiones al final
        };
    }
    
    // Añadir método tryEndpoint si no existe
    if (!ApiDocumentation.tryEndpoint) {
        ApiDocumentation.tryEndpoint = function(endpointId) {
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
        };
    }
    
    // Añadir método filterEndpoints si no existe
    if (!ApiDocumentation.filterEndpoints) {
        ApiDocumentation.filterEndpoints = function(searchText) {
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
        };
    }
    
    console.log('Complemento para api-documentation.js cargado correctamente');
});
