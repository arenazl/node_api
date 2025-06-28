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
    html += '<div class="log-detail-content">';
    html += `Timestamp: ${new Date(log.timestamp).toLocaleString('es-ES')}\n`;
    html += `Método: ${log.method}\n`;
    html += `Endpoint: ${log.endpoint}\n`;
    html += `IP: ${log.ip}\n`;
    html += `Usuario: ${log.user || 'anonymous'}\n`;
    html += '</div>';
    html += '</div>';
    
    // Headers de request
    if (log.headers && Object.keys(log.headers).length > 0) {
        html += '<div class="log-detail-section">';
        html += '<h4>Headers de Request</h4>';
        html += '<div class="log-detail-content">';
        html += JSON.stringify(log.headers, null, 2);
        html += '</div>';
        html += '</div>';
    }
    
    // Query parameters
    if (log.query && Object.keys(log.query).length > 0) {
        html += '<div class="log-detail-section">';
        html += '<h4>Query Parameters</h4>';
        html += '<div class="log-detail-content">';
        html += JSON.stringify(log.query, null, 2);
        html += '</div>';
        html += '</div>';
    }
    
    // Request body
    if (log.body && Object.keys(log.body).length > 0) {
        html += '<div class="log-detail-section">';
        html += '<h4>Request Body</h4>';
        html += '<div class="log-detail-content">';
        html += JSON.stringify(log.body, null, 2);
        html += '</div>';
        html += '</div>';
    }
    
    // Response
    if (log.response) {
        html += '<div class="log-detail-section">';
        html += '<h4>Response</h4>';
        html += '<div class="log-detail-content">';
        html += `Status: ${log.response.statusCode} ${log.response.statusMessage || ''}\n`;
        html += `Duración: ${log.response.duration}\n`;
        if (log.response.body) {
            html += '\nBody:\n';
            try {
                const body = typeof log.response.body === 'string' ? 
                    JSON.parse(log.response.body) : log.response.body;
                html += JSON.stringify(body, null, 2);
            } catch (e) {
                html += log.response.body;
            }
        }
        html += '</div>';
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