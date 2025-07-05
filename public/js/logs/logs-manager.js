// Gestión de logs del sistema

let currentLogsView = 'details';
let currentLogs = [];

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    // Establecer fecha por defecto (últimas 24 horas)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    document.getElementById('logsStartDate').value = formatDateTimeLocal(yesterday);
    document.getElementById('logsEndDate').value = formatDateTimeLocal(now);
});

// Formatear fecha para input datetime-local
function formatDateTimeLocal(date) {
    const pad = (num) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Cargar logs
async function loadLogs() {
    try {
        showLoading('Cargando logs...');
        
        const params = new URLSearchParams();
        
        const startDate = document.getElementById('logsStartDate').value;
        const endDate = document.getElementById('logsEndDate').value;
        const method = document.getElementById('logsMethod').value;
        const endpointCombo = document.getElementById('logsEndpoint');
        let endpoint = '';
        let selectedMethod = method;
        if (endpointCombo && endpointCombo.value) {
            const [comboMethod, ...comboPathParts] = endpointCombo.value.split(' ');
            const comboPath = comboPathParts.join(' ');
            endpoint = comboPath;
            selectedMethod = comboMethod;
        } else {
            endpoint = document.getElementById('logsEndpoint').value;
        }
        const status = document.getElementById('logsStatus').value;
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (selectedMethod) params.append('method', selectedMethod);
        if (status) params.append('statusCode', status);
        if (endpoint) params.append('endpoint', endpoint);
        params.append('limit', '500');
        
        const response = await fetch(`/logs/requests?${params}`);
        const data = await response.json();
        
        if (data.success) {
            currentLogs = data.logs;
            displayLogs(data.logs);
            document.getElementById('logsCount').textContent = `${data.count} registros encontrados`;
        } else {
            showError('Error al cargar logs: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar logs');
    } finally {
        hideLoading();
    }
}

// Mostrar logs en la tabla
function displayLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No se encontraron logs</td></tr>';
        return;
    }
    
    logs.forEach((log, index) => {
        const row = document.createElement('tr');
        
        // Fecha/Hora
        const date = new Date(log.timestamp);
        const dateStr = date.toLocaleString('es-ES');
        
        // Status badge
        let statusClass = 'status-success';
        if (log.response?.statusCode >= 400) {
            statusClass = 'status-error';
        } else if (log.response?.statusCode >= 300) {
            statusClass = 'status-warning';
        }
        
        row.innerHTML = `
            <td>${dateStr}</td>
            <td><strong>${log.method || '-'}</strong></td>
            <td>${log.endpoint || '-'}</td>
            <td><span class="status-badge ${statusClass}">${log.response?.statusCode || '-'}</span></td>
            <td>${log.response?.duration || '-'}</td>
            <td>${log.ip || '-'}</td>
            <td>
                <button class="view-details-btn" onclick="viewLogDetails(${index})">
                    Ver detalles
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Función auxiliar para escapar HTML
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Función para formatear JSON con colores (usa las clases CSS existentes)
function formatJsonWithColors(obj, title) {
    try {
        let jsonStr;
        let objectToFormat = obj;
        
        // Si es un string, verificar si ya es JSON formateado o necesita ser parseado
        if (typeof obj === 'string') {
            let trimmed = obj.trim();
            
            
            // Verificar si es un JSON string que necesita ser parseado
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try {
                    objectToFormat = JSON.parse(trimmed);
                } catch (e) {
                    // No se pudo parsear, mostrar como texto plano
                    return `<pre class="log-detail-content">${escapeHtml(obj)}</pre>`;
                }
            } else {
                // No parece ser JSON, mostrar como texto plano
                return `<pre class="log-detail-content">${escapeHtml(obj)}</pre>`;
            }
        }
        
        // Formatear como JSON con indentación
        jsonStr = JSON.stringify(objectToFormat, null, 2);
        
        // Aplicar colores similar a como lo hace el json-formatter.js
        let formatted = escapeHtml(jsonStr);
        
        // Colorear las claves (propiedades)
        formatted = formatted.replace(/&quot;([^&]+?)&quot;:/g, '<span class="json-key">&quot;$1&quot;</span>:');
        
        // Colorear strings (mejorado para manejar strings con comillas escapadas)
        formatted = formatted.replace(/:( *)&quot;((?:[^&]|&(?!quot;))*)&quot;/g, ':$1<span class="json-string">&quot;$2&quot;</span>');
        
        // Colorear números (mejorado para incluir negativos y notación científica)
        formatted = formatted.replace(/:( *)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, ':$1<span class="json-number">$2</span>');
        
        // Colorear booleanos
        formatted = formatted.replace(/:( *)(true|false)/g, ':$1<span class="json-boolean">$2</span>');
        
        // Colorear null
        formatted = formatted.replace(/:( *)(null)/g, ':$1<span class="json-null">$2</span>');
        
        // Colorear valores en arrays (que no están precedidos por ':')
        formatted = formatted.replace(/([\[,]\s*)&quot;((?:[^&]|&(?!quot;))*)&quot;/g, '$1<span class="json-string">&quot;$2&quot;</span>');
        formatted = formatted.replace(/([\[,]\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, '$1<span class="json-number">$2</span>');
        formatted = formatted.replace(/([\[,]\s*)(true|false)/g, '$1<span class="json-boolean">$2</span>');
        formatted = formatted.replace(/([\[,]\s*)(null)/g, '$1<span class="json-null">$2</span>');
        
        return `<pre class="json-editor">${formatted}</pre>`;
    } catch (error) {
        console.error('Error formateando JSON:', error);
        return `<pre class="log-detail-content">${escapeHtml(String(obj))}</pre>`;
    }
}

// Ver detalles de un log
function viewLogDetails(index) {
    const log = currentLogs[index];
    if (!log) return;
    
    const modal = document.getElementById('logDetailModal');
    const content = document.getElementById('logDetailContent');
    
    let html = '';
    
    // Información general
    html += '<div class="log-detail-section">';
    html += '<h4>Información General</h4>';
    html += '<pre class="log-detail-content">';
    html += escapeHtml(`Timestamp: ${new Date(log.timestamp).toLocaleString('es-ES')}\n`);
    html += escapeHtml(`Método: ${log.method}\n`);
    html += escapeHtml(`Endpoint: ${log.endpoint}\n`);
    html += escapeHtml(`IP: ${log.ip}\n`);
    html += escapeHtml(`Usuario: ${log.user || 'anonymous'}\n`);
    html += '</pre>';
    html += '</div>';
    
    // Headers de request
    if (log.headers && Object.keys(log.headers).length > 0) {
        html += '<div class="log-detail-section">';
        html += '<h4>Headers de Request</h4>';
        html += formatJsonWithColors(log.headers);
        html += '</div>';
    }
    
    // Query parameters
    if (log.query && Object.keys(log.query).length > 0) {
        html += '<div class="log-detail-section">';
        html += '<h4>Query Parameters</h4>';
        html += formatJsonWithColors(log.query);
        html += '</div>';
    }
    
    // Request body
    if (log.body && Object.keys(log.body).length > 0) {
        html += '<div class="log-detail-section">';
        html += '<h4>Request Body</h4>';
        const formattedBody = formatJsonWithColors(log.body);
        console.log('Request Body formatted:', formattedBody.substring(0, 200));
        html += formattedBody;
        html += '</div>';
    }
    
    // Response
    if (log.response) {
        html += '<div class="log-detail-section">';
        html += '<h4>Response</h4>';
        
        // Información de status y duración
        html += '<pre class="log-detail-content">';
        html += escapeHtml(`Status: ${log.response.statusCode} ${log.response.statusMessage || ''}\n`);
        html += escapeHtml(`Duración: ${log.response.duration}`);
        html += '</pre>';
        
        // Response body
        if (log.response.body) {
            html += '<h5>Response Body:</h5>';
            
            try {
                let bodyContent = log.response.body;
                
                // Debug: mostrar el tipo y una muestra del contenido
                console.log('Response body type:', typeof bodyContent);
                console.log('Response body sample:', typeof bodyContent === 'string' ? bodyContent.substring(0, 100) : bodyContent);
                
                // Verificar si fue truncado
                if (typeof bodyContent === 'string' && bodyContent.includes('[truncado en servidor')) {
                    html += '<div class="alert alert-warning" style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; margin: 10px 0; border-radius: 4px;">';
                    html += '⚠️ <strong>Nota:</strong> El contenido fue truncado en el servidor para evitar problemas de memoria. ';
                    
                    // Extraer el tamaño total si está disponible
                    const sizeMatch = bodyContent.match(/(\d+) caracteres totales/);
                    if (sizeMatch) {
                        html += `El contenido original tenía ${sizeMatch[1]} caracteres.`;
                    }
                    html += '</div>';
                }
                
                // Procesar el contenido
                if (typeof bodyContent === 'string') {
                    // Es un string, necesitamos determinar qué tipo de string es
                    let processedContent = bodyContent;
                    
                    // Caso 1: String JSON escapado (comienza y termina con comillas)
                    if (processedContent.startsWith('"') && processedContent.endsWith('"')) {
                        try {
                            // Quitar las comillas externas
                            processedContent = JSON.parse(processedContent);
                            console.log('Contenido después de quitar comillas externas:', processedContent.substring(0, 100));
                        } catch (e) {
                            console.log('No se pudieron quitar las comillas externas:', e);
                        }
                    }
                    
                    // Caso 2: Ahora verificar si el contenido es JSON
                    if (typeof processedContent === 'string' && 
                        (processedContent.trim().startsWith('{') || processedContent.trim().startsWith('['))) {
                        
                        // Manejar truncamiento si existe
                        let jsonToParse = processedContent;
                        if (processedContent.includes('[truncado en servidor')) {
                            jsonToParse = processedContent.substring(0, processedContent.indexOf('[truncado en servidor'));
                        }
                        
                        try {
                            // Intentar parsear como JSON
                            const parsed = JSON.parse(jsonToParse);
                            console.log('JSON parseado exitosamente');
                            html += formatJsonWithColors(parsed);
                        } catch (parseError) {
                            console.log('Error al parsear JSON:', parseError);
                            // Si no se puede parsear, intentar formatear y colorear manualmente
                            console.log('Intentando formatear y colorear JSON manualmente');
                            
                            // Primero, intentar formatear el JSON agregando saltos de línea e indentación
                            let formattedJson = processedContent;
                            try {
                                // Agregar saltos de línea después de { [ , ]
                                formattedJson = formattedJson
                                    .replace(/([{\[])/g, '$1\n')
                                    .replace(/([}\]])/g, '\n$1')
                                    .replace(/,/g, ',\n');
                                
                                // Agregar indentación básica
                                let indentLevel = 0;
                                const lines = formattedJson.split('\n');
                                const indentedLines = lines.map(line => {
                                    const trimmedLine = line.trim();
                                    if (trimmedLine === '') return '';
                                    
                                    // Reducir indentación antes de } o ]
                                    if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']')) {
                                        indentLevel = Math.max(0, indentLevel - 1);
                                    }
                                    
                                    const indentedLine = '  '.repeat(indentLevel) + trimmedLine;
                                    
                                    // Aumentar indentación después de { o [
                                    if (trimmedLine.endsWith('{') || trimmedLine.endsWith('[')) {
                                        indentLevel++;
                                    }
                                    
                                    return indentedLine;
                                });
                                
                                formattedJson = indentedLines.filter(line => line !== '').join('\n');
                            } catch (e) {
                                console.log('Error al formatear JSON:', e);
                                // Si falla el formateo, usar el original
                                formattedJson = processedContent;
                            }
                            
                            // Ahora colorear el JSON formateado
                            let coloredJson = escapeHtml(formattedJson);
                            
                            // Aplicar colores manualmente al JSON string
                            // Colorear claves
                            coloredJson = coloredJson.replace(/&quot;([^&]+?)&quot;\s*:/g, '<span class="json-key">&quot;$1&quot;</span>:');
                            
                            // Colorear strings (valores) - mejorado para manejar strings con caracteres especiales
                            coloredJson = coloredJson.replace(/:( *)&quot;((?:[^&]|&(?!quot;))*)&quot;/g, ':$1<span class="json-string">&quot;$2&quot;</span>');
                            
                            // Colorear strings en arrays
                            coloredJson = coloredJson.replace(/([\[,]\s*)&quot;((?:[^&]|&(?!quot;))*)&quot;/g, '$1<span class="json-string">&quot;$2&quot;</span>');
                            
                            // Colorear números
                            coloredJson = coloredJson.replace(/:( *)(-?\d+(?:\.\d+)?)/g, ':$1<span class="json-number">$2</span>');
                            coloredJson = coloredJson.replace(/([\[,]\s*)(-?\d+(?:\.\d+)?)/g, '$1<span class="json-number">$2</span>');
                            
                            // Colorear booleanos
                            coloredJson = coloredJson.replace(/:( *)(true|false)/g, ':$1<span class="json-boolean">$2</span>');
                            coloredJson = coloredJson.replace(/([\[,]\s*)(true|false)/g, '$1<span class="json-boolean">$2</span>');
                            
                            // Colorear null
                            coloredJson = coloredJson.replace(/:( *)(null)/g, ':$1<span class="json-null">$2</span>');
                            coloredJson = coloredJson.replace(/([\[,]\s*)(null)/g, '$1<span class="json-null">$2</span>');
                            
                            html += `<pre class="log-json-content">${coloredJson}</pre>`;
                        }
                    } else {
                        // No es JSON, mostrar como texto plano
                        html += `<pre class="log-detail-content">${escapeHtml(processedContent)}</pre>`;
                    }
                }
                // Si ya es un objeto, formatearlo directamente
                else if (typeof bodyContent === 'object') {
                    //console.log('El body ya es un objeto, formateando directamente');
                    html += formatJsonWithColors(bodyContent);
                } else {
                    // Cualquier otro tipo
                    html += `<pre class="log-detail-content">${escapeHtml(String(bodyContent))}</pre>`;
                }
            } catch (e) {
                console.error('Error procesando response body:', e);
                html += '<div class="alert alert-danger" style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 10px; margin: 10px 0; border-radius: 4px;">';
                html += `❌ <strong>Error al procesar body:</strong> ${escapeHtml(e.message)}`;
                html += '</div>';
                html += `<pre class="log-detail-content">${escapeHtml(String(log.response.body || ''))}</pre>`;
            }
        }
        
        html += '</div>';
    }
    
    content.innerHTML = html;
    modal.style.display = 'block';
}

// Cerrar modal de detalles
function closeLogDetail() {
    document.getElementById('logDetailModal').style.display = 'none';
}

// Cargar resumen de logs
async function loadLogsSummary() {
    try {
        showLoading('Cargando resumen...');
        
        const response = await fetch('/logs/summary');
        const data = await response.json();
        
        if (data.success) {
            displaySummary(data);
        } else {
            showError('Error al cargar resumen: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar resumen');
    } finally {
        hideLoading();
    }
}

// Mostrar resumen
function displaySummary(data) {
    // Valores generales
    document.getElementById('totalRequests').textContent = data.summary.totalRequests;
    document.getElementById('errorRate').textContent = data.summary.errorRate;
    document.getElementById('avgResponseTime').textContent = data.summary.avgResponseTime;
    
    // Top endpoints
    const topEndpointsDiv = document.getElementById('topEndpointsList');
    topEndpointsDiv.innerHTML = '';
    
    data.topEndpoints.forEach(endpoint => {
        const item = document.createElement('div');
        item.className = 'endpoint-item';
        item.innerHTML = `
            <div class="endpoint-name">${endpoint.endpoint}</div>
            <div class="endpoint-stats">
                <span class="stat-label">Peticiones:</span>
                <span class="stat-value">${endpoint.count}</span>
                <span class="stat-label">Tiempo promedio:</span>
                <span class="stat-value">${endpoint.avgDuration}</span>
                <span class="stat-label">Errores:</span>
                <span class="stat-value">${endpoint.errors}</span>
            </div>
        `;
        topEndpointsDiv.appendChild(item);
    });
    
    // Distribución de métodos
    const methodDiv = document.getElementById('methodDistribution');
    methodDiv.innerHTML = '<div class="distribution-grid">';
    
    Object.entries(data.methodDistribution).forEach(([method, count]) => {
        methodDiv.innerHTML += `
            <div class="distribution-item">
                <div class="distribution-label">${method}</div>
                <div class="distribution-value">${count}</div>
            </div>
        `;
    });
    methodDiv.innerHTML += '</div>';
    
    // Distribución de errores
    const errorDiv = document.getElementById('errorDistribution');
    errorDiv.innerHTML = '<div class="distribution-grid">';
    
    Object.entries(data.errorDistribution).forEach(([code, info]) => {
        errorDiv.innerHTML += `
            <div class="distribution-item">
                <div class="distribution-label">Error ${code}</div>
                <div class="distribution-value">${info.count}</div>
            </div>
        `;
    });
    errorDiv.innerHTML += '</div>';
}

// Cambiar vista de logs
function showLogsView(view) {
    currentLogsView = view;
    
    // Actualizar botones
    document.querySelectorAll('.logs-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Encontrar el botón correcto y activarlo
    const activeButton = document.querySelector(`[onclick="showLogsView('${view}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Mostrar/ocultar vistas
    if (view === 'details') {
        document.getElementById('logsDetailsView').style.display = 'block';
        document.getElementById('logsSummaryView').style.display = 'none';
        loadLogs();
    } else if (view === 'summary') {
        document.getElementById('logsDetailsView').style.display = 'none';
        document.getElementById('logsSummaryView').style.display = 'block';
        loadLogsSummary();
    }
}

// Funciones auxiliares
function showLoading(message = 'Cargando...') {
    // Usar el sistema de loading existente si está disponible
    if (typeof showProgress === 'function') {
        showProgress(message);
    }
}

function hideLoading() {
    if (typeof hideProgress === 'function') {
        hideProgress();
    }
}

function showError(message) {
    if (typeof toastr !== 'undefined') {
        toastr.error(message);
    } else {
        alert(message);
    }
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('logDetailModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Llenar el combo de endpoints con método y ruta de services.js
async function populateEndpointSelect() {
    const endpointSelect = document.getElementById('logsEndpoint');
    const methodSelect = document.getElementById('logsMethod');
    if (!endpointSelect) return;
    try {
        const response = await fetch('/logs/services-endpoints');
        const data = await response.json();
        if (!data.endpoints) return;
        // Limpiar opciones actuales
        endpointSelect.innerHTML = '';
        // Opción 'Todos'
        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'Todos';
        endpointSelect.appendChild(allOpt);
        // Agregar combinaciones método + ruta
        data.endpoints.forEach(e => {
            const opt = document.createElement('option');
            opt.value = `${e.method} ${e.path}`;
            opt.textContent = `${e.method} ${e.path}`;
            endpointSelect.appendChild(opt);
        });
        // Sincronizar método y endpoint al seleccionar
        endpointSelect.addEventListener('change', function() {
            if (this.value === '') {
                if (methodSelect) methodSelect.value = '';
                return;
            }
            const [method, ...pathParts] = this.value.split(' ');
            const path = pathParts.join(' ');
            if (methodSelect) methodSelect.value = method;
        });
    } catch (err) {
        console.warn('No se pudieron cargar los endpoints de services:', err);
    }
}

// Llamar al cargar la pantalla
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateEndpointSelect);
} else {
    populateEndpointSelect();
}
