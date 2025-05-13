/**
 * Complemento para mejorar la renderización de endpoints en api-documentation.js
 * 
 * Este archivo garantiza que los endpoints se rendericen correctamente con la estructura completa
 * requerida para que los botones de prueba funcionen adecuadamente.
 */

// Verificar que el objeto ApiDocumentation esté definido
if (typeof ApiDocumentation !== 'undefined') {
    
    // Guardar referencia al método original si existe
    const originalRenderEndpoint = ApiDocumentation.renderEndpoint;
    
    // Reemplazar el método renderEndpoint con una versión completa
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
        
        // Botón de prueba
        html += `
                <button class="try-it-btn" data-endpoint="${endpoint.id}">Probar Endpoint</button>
            </div>
        </div>
        `;
        
        return html;
    };

    // Garantizar que el método syntaxHighlight esté disponible
    if (!ApiDocumentation.syntaxHighlight) {
        ApiDocumentation.syntaxHighlight = function(json) {
            if (typeof json !== 'string') {
                json = JSON.stringify(json, null, 2);
            }
            
            // Escapar caracteres HTML
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
                let cls = 'number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'key';
                        match = match.replace(/"/g, '').replace(/:$/, '');
                        return '<span class="json-' + cls + '">"' + match + '"</span>:';
                    } else {
                        cls = 'string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'boolean';
                } else if (/null/.test(match)) {
                    cls = 'null';
                }
                
                return '<span class="json-' + cls + '">' + match + '</span>';
            });
        };
    }
    
    // Garantizar que también existe el método slugify
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
}

console.log('API Endpoint Renderer extendido cargado correctamente');
