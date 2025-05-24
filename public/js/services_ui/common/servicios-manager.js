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

/**
 * Update the services table with the provided services
 * @param {Array} services - Array of service objects
 */
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
 * Fetch all versions of a specific service using the centralized API client
 * @param {string} serviceNumber - The service number
 */
function fetchServiceVersions(serviceNumber) {
    // Get the Excel files for this service using the API client
    ServiceApiClient.getServiceFiles(serviceNumber)
        .then(files => {
            // Update the versions table
            updateVersionsTable(files);
        })
        .catch(error => {
            console.error('Error al cargar versiones:', error);
            
            // Update table with error
            const versionsTable = document.getElementById('versionsTable');
            if (versionsTable && versionsTable.tBodies[0]) {
                const tbody = versionsTable.tBodies[0];
                tbody.innerHTML = '';
                
                // Add error row
                const errorRow = tbody.insertRow();
                const errorCell = errorRow.insertCell(0);
                errorCell.colSpan = 3;
                errorCell.className = 'text-center error-message';
                errorCell.textContent = `Error al cargar versiones: ${error.message}`;
            }
            
            if (typeof ConfigUtils !== 'undefined') {
                ConfigUtils.showNotification(`Error al cargar versiones: ${error.message}`, 'error');
            }
        });
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
    
    if (!files || files.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 3;
        cell.className = 'text-center';
        cell.textContent = 'No hay versiones disponibles para este servicio';
        return;
    }
    
    // Sort files by date (most recent first)
    files.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
    
    files.forEach(file => {
        const row = tbody.insertRow();
        
        // Date cell
        const cellDate = row.insertCell(0);
        const uploadDate = new Date(file.upload_date);
        cellDate.textContent = uploadDate.toLocaleString();
        
        // Filename cell
        const cellFilename = row.insertCell(1);
        cellFilename.textContent = file.service_name || file.filename;
        cellFilename.title = file.filename;
        
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
