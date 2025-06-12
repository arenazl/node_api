/**
 * Servicios Manager - Handles the services list tab functionality
 */

// Create fallback ConfigUtils if not defined
if (typeof ConfigUtils === 'undefined') {
    console.warn('[servicios-manager] ConfigUtils not found, creating fallback implementation');
    window.ConfigUtils = {
        showNotification: function(message, type) {
            console.log(`[Notification ${type}]: ${message}`);
        }
    };
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize versions modal
    const versionsModal = document.getElementById('versionsModal');
    const versionsModalClose = versionsModal.querySelector('.close');
    
    // Close modal when clicking the X
    versionsModalClose.addEventListener('click', function() {
        versionsModal.style.display = 'none';
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === versionsModal) {
            versionsModal.style.display = 'none';
        }
    });
    
    // Add event listener for the main tab button to load services when the tab is activated
    const serviciosTabBtn = document.querySelector('.main-tab-btn[data-tab="serviciosList"]');
    if (serviciosTabBtn) {
        serviciosTabBtn.addEventListener('click', function() {
            loadServicesList();
        });
    }
    
    // Add event listener for refresh button
    const refreshServicesBtn = document.getElementById('refreshServicesBtn');
    if (refreshServicesBtn) {
        refreshServicesBtn.addEventListener('click', function() {
            loadServicesList(true);
        });
    }
});

/**
 * Load the list of services using centralized API client
 * @param {boolean} forceRefresh - Whether to force refresh the services cache
 */
function loadServicesList(forceRefresh = false) {
    // Check if ConfigUtils is available
    if (typeof ConfigUtils !== 'undefined') {
        // Show notification
        ConfigUtils.showNotification('Cargando servicios...', 'info');
    } else {
        console.warn('[servicios-manager] ConfigUtils no está disponible');
    }
    
    // Check if ServiceApiClient is available
    if (typeof ServiceApiClient === 'undefined') {
        console.error('[servicios-manager] ServiceApiClient no está disponible');
        if (typeof ConfigUtils !== 'undefined') {
            ConfigUtils.showNotification('Error: API Client no disponible', 'error');
        }
        return;
    }
    
    // Use the API client to get services
    ServiceApiClient.getServices(forceRefresh)
        .then(services => {
            // Update the table with the services
            updateServicesTable(services);
            
            // Also update all select dropdowns with these services
            if (typeof loadServicesIntoSelect === 'function') {
                try {
                    console.log('Updating service selects with', services.length, 'services');
                    loadServicesIntoSelect('idaServiceSelect');
                    loadServicesIntoSelect('vueltaServiceSelect');
                    loadServicesIntoSelect('configServiceSelect');
                } catch (err) {
                    console.error('Error updating service selects:', err);
                }
            } else {
                console.warn('loadServicesIntoSelect function not available');
            }
            
            if (typeof ConfigUtils !== 'undefined') {
                if (forceRefresh) {
                    ConfigUtils.showNotification(`Servicios actualizados correctamente (${services.length} servicios)`, 'success');
                } else {
                    ConfigUtils.showNotification(`${services.length} servicios disponibles`, 'success');
                }
            }
        })
        .catch(error => {
            console.error('Error al cargar servicios:', error);
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Error al cargar servicios: ${error.message}`, 'error');
            }
        });
}

function updateServicesTable(services) {
    const table = document.getElementById('servicesTable');
    if (!table || !table.tBodies[0]) return;
    
    const tbody = table.tBodies[0];
    tbody.innerHTML = '';
    
    if (!services || services.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 3;
        cell.className = 'text-center';
        cell.textContent = 'No hay servicios disponibles';
        return;
    }
    
    // Filter out duplicate service numbers by keeping only the first occurrence
    const uniqueServices = [];
    const serviceNumbers = new Set();
    
    services.forEach(service => {
        if (!serviceNumbers.has(service.service_number)) {
            serviceNumbers.add(service.service_number);
            uniqueServices.push(service);
        }
    });
    
    // Use the unique services list instead of the original one
    uniqueServices.forEach(service => {
        const row = tbody.insertRow();
        
        // Number cell
        const cellNumber = row.insertCell(0);
        cellNumber.textContent = service.service_number;
        
        // Name cell
        const cellName = row.insertCell(1);
        cellName.textContent = service.service_name;
        
        // Action cell
        const cellAction = row.insertCell(2);
        
        // Actions container for buttons
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'action-buttons';
        
        // Probe button
        const probeButton = document.createElement('button');
        probeButton.className = 'action-btn small';
        probeButton.textContent = 'Probar';
        probeButton.title = 'Probar el servicio';
        probeButton.onclick = function() {
            // Select this service in the API tab
            const idaServiceSelect = document.getElementById('idaServiceSelect');
            if (idaServiceSelect) {
                idaServiceSelect.value = service.service_number;
                // Trigger change event
                const event = new Event('change');
                idaServiceSelect.dispatchEvent(event);
                
                // Switch to API tab
                const apiTabBtn = document.querySelector('.main-tab-btn[data-tab="servicios"]');
                if (apiTabBtn) {
                    apiTabBtn.click();
                }
            }
        };
        
        // Versions button
        const versionsButton = document.createElement('button');
        versionsButton.className = 'action-btn small secondary-btn';
        versionsButton.textContent = 'Versiones';
        versionsButton.title = 'Ver versiones disponibles';
        versionsButton.onclick = function() {
            showVersionsModal(service.service_number, service.service_name);
        };
        
        // Add buttons to container
        actionsContainer.appendChild(probeButton);
        actionsContainer.appendChild(versionsButton);
        
        // Add container to cell
        cellAction.appendChild(actionsContainer);
    });
}

/**
 * Show the versions modal for a specific service
 * @param {string} serviceNumber - The service number
 * @param {string} serviceName - The service name
 */
function showVersionsModal(serviceNumber, serviceName) {
    const modal = document.getElementById('versionsModal');
    const serviceNumberDisplay = document.getElementById('serviceNumberDisplay');
    
    if (!modal || !serviceNumberDisplay) return;
    
    // Set the service number in the modal title
    serviceNumberDisplay.textContent = `${serviceNumber} - ${serviceName}`;
    
    // Clear previous data
    const versionsTable = document.getElementById('versionsTable');
    if (versionsTable && versionsTable.tBodies[0]) {
        const tbody = versionsTable.tBodies[0];
        tbody.innerHTML = '';
        
        // Add loading row
        const loadingRow = tbody.insertRow();
        const loadingCell = loadingRow.insertCell(0);
        loadingCell.colSpan = 3;
        loadingCell.className = 'text-center';
        loadingCell.innerHTML = '<div class="loading-spinner"></div> Cargando versiones...';
    }
    
    // Show the modal
    modal.style.display = 'block';
    
    // Fetch the versions for this service
    fetchServiceVersions(serviceNumber);
}

/**
 * Fetch all versions of a specific service using the /api/services/versions endpoint
 * @param {string} serviceNumber - The service number
 */
async function fetchServiceVersions(serviceNumber) {
    try {
        console.log(`[servicios-manager] Cargando versiones para servicio ${serviceNumber}`);
        
        const response = await fetch(`/api/services/versions?serviceNumber=${serviceNumber}`);
        
        if (!response.ok) {
            throw new Error(`Error al cargar versiones: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[servicios-manager] Versiones recibidas para servicio ${serviceNumber}:`, data);
        
        // Update the versions table with the loaded versions
        updateVersionsTable(data.versions || []);
        
    } catch (error) {
        console.error('[servicios-manager] Error al cargar versiones:', error);
        
        if (typeof ConfigUtils !== 'undefined') {
            ConfigUtils.showNotification(`Error al cargar versiones: ${error.message}`, 'error');
        }
        
        // Update table with error
        const versionsTable = document.getElementById('versionsTable');
        if (versionsTable && versionsTable.tBodies[0]) {
            const tbody = versionsTable.tBodies[0];
            tbody.innerHTML = '';
            const errorRow = tbody.insertRow();
            const errorCell = errorRow.insertCell(0);
            errorCell.colSpan = 3;
            errorCell.className = 'text-center error-message';
            errorCell.textContent = `Error al cargar versiones: ${error.message}`;
        }
    }
}

/**
 * Update the versions table with the provided files
 * @param {Array} files - Array of file objects
 */
function updateVersionsTable(files) {
    const versionsTable = document.getElementById('versionsTable');
    if (!versionsTable || !versionsTable.tBodies[0]) return;
    
    const tbody = versionsTable.tBodies[0];
    tbody.innerHTML = '';
    
    console.log('[updateVersionsTable] Archivos recibidos:', files);
    
    if (!files || files.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 3;
        cell.className = 'text-center';
        cell.textContent = 'No hay versiones disponibles para este servicio';
        return;
    }
    
    // Sort files by date (most recent first) - usar timestamp, upload_date o created_date
    files.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.upload_date || a.created_date || 0);
        const dateB = new Date(b.timestamp || b.upload_date || b.created_date || 0);
        return dateB - dateA;
    });
    
    files.forEach(file => {
        const row = tbody.insertRow();
        
        // Date cell
        const cellDate = row.insertCell(0);
        
        // Formateo de fecha corregido para evitar "Invalid Date"
        let displayDate = 'Fecha no disponible';
        
        // Intentar con timestamp primero, luego upload_date, luego created_date
        const dateValue = file.timestamp || file.upload_date || file.created_date;
        
        if (dateValue) {
            try {
                const parsedDate = new Date(dateValue);
                console.log(`[updateVersionsTable] Parsing date ${dateValue}:`, parsedDate);
                
                if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
                    displayDate = parsedDate.toLocaleString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                } else {
                    console.warn('Invalid date value:', dateValue);
                    displayDate = dateValue; // Mostrar valor crudo si no se puede parsear
                }
            } catch (error) {
                console.error('Error parsing date:', error);
                displayDate = dateValue || 'Fecha no disponible';
            }
        }
        
        cellDate.textContent = displayDate;
        
        // Filename cell - mostrar nombre del archivo de configuración (settings) que es clave para ver el canal
        const cellFilename = row.insertCell(1);
        
        let displayName = file.filename || file.excel_file || file.service_name;
        let titleText = '';
        
        // Prioridad 1: Si es un archivo de configuración (settings), mostrarlo directamente
        if (file.settings_file && file.settings_file.endsWith('.json')) {
            displayName = file.settings_file;
            titleText = `Archivo de configuración: ${file.settings_file}`;
            if (file.excel_file) {
                titleText += ` | Excel: ${file.excel_file}`;
            }
        }
        // Prioridad 2: Si tiene archivo de configuración relacionado (desde backend)
        else if (file.filename && file.filename.endsWith('.json')) {
            displayName = file.filename;
            titleText = `Archivo de configuración: ${file.filename}`;
        }
        // Prioridad 3: Si es un archivo Excel, mostrar el archivo de configuración esperado
        else if (file.excel_file && file.excel_file.includes('.xls')) {
            const serviceMatch = file.excel_file.match(/SVO(\d+)/i);
            if (serviceMatch && serviceMatch[1]) {
                const serviceNum = serviceMatch[1];
                displayName = `${serviceNum}-[canal]-v[version].json`;
                titleText = `Excel: ${file.excel_file} | Config esperado: ${displayName}`;
            } else {
                displayName = file.excel_file;
                titleText = `Archivo Excel: ${file.excel_file}`;
            }
        }
        // Fallback: usar filename original
        else {
            titleText = `Archivo: ${displayName}`;
        }
        
        cellFilename.textContent = displayName;
        cellFilename.title = titleText;
        
        // Action cell
        const cellAction = row.insertCell(2);
        
        // Download button
        const downloadButton = document.createElement('button');
        downloadButton.className = 'action-btn small';
        downloadButton.innerHTML = '<span style="font-size: 1.2em;">⬇️</span>';
        downloadButton.title = 'Descargar archivo';
        downloadButton.onclick = function() {
            downloadExcelFile(file.filename);
        };
        
        cellAction.appendChild(downloadButton);
    });
}

/**
 * Download an Excel file
 * @param {string} filename - The filename to download
 */
function downloadExcelFile(filename) {
    if (!filename) {
        if (typeof ConfigUtils !== 'undefined') {
            ConfigUtils.showNotification('Nombre de archivo no válido', 'error');
        }
        return;
    }
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = `/excel/download/${filename}`;
    downloadLink.download = filename;
    
    // Append to body, click and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    if (typeof ConfigUtils !== 'undefined') {
        ConfigUtils.showNotification(`Descargando archivo: ${filename}`, 'info');
    }
}
