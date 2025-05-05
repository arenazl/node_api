/**
 * File Manager Module
 * Handles the display and management of service files in the "Archivos" tab
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize by loading services
    loadServiceFiles();
    
    // Setup event listeners for modals
    setupModalListeners();
});

/**
 * Load all available service files, grouped by service number
 */
function loadServiceFiles() {
    // Show loading indicator
    const serviceFilesTable = document.getElementById('serviceFilesTable');
    const tbody = serviceFilesTable.querySelector('tbody');
    
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando servicios...</td></tr>';
    }
    
    // Fetch all services
    fetch('/api/services')
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener servicios');
            return response.json();
        })
        .then(data => {
            displayServiceFiles(data.services || []);
        })
        .catch(error => {
            console.error('Error al cargar servicios:', error);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center">Error al cargar servicios: ${error.message}</td></tr>`;
            }
        });
}

/**
 * Display services in the table
 * @param {Array} services - List of services from API
 */
function displayServiceFiles(services) {
    const serviceFilesTable = document.getElementById('serviceFilesTable');
    const tbody = serviceFilesTable.querySelector('tbody');
    
    if (!tbody) return;
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Group by service number to eliminate duplicates - direct use of services array
    const serviceGroups = {};
    
    // Ensure we have valid services to work with
    if (!Array.isArray(services)) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Error: Formato de datos de servicios inválido</td></tr>';
        return;
    }
    
    // Filter out any invalid services
    const validServices = services.filter(service => 
        service && service.service_number && typeof service.service_number === 'string');
    
    validServices.forEach(service => {
        const serviceNum = service.service_number;
        
        // Initialize group if not exists
        if (!serviceGroups[serviceNum]) {
            serviceGroups[serviceNum] = {
                service_number: serviceNum,
                service_name: service.service_name || `Servicio ${serviceNum}`,
                versions: []
            };
        }
        
        // Add this service to versions array
        serviceGroups[serviceNum].versions.push({
            timestamp: service.timestamp || new Date().toISOString(),
            excel_file: service.excel_file || 'Sin archivo',
            structure_file: service.structure_file
        });
    });
    
    // Sort versions by timestamp (newest first) for each service
    Object.values(serviceGroups).forEach(group => {
        group.versions.sort((a, b) => {
            // Handle invalid dates
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            
            return dateB - dateA;
        });
    });
    
    // Convert to array and sort by service number
    const uniqueServices = Object.values(serviceGroups)
        .sort((a, b) => a.service_number.localeCompare(b.service_number));
    
    // Display unique services
    if (uniqueServices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay servicios disponibles</td></tr>';
        return;
    }
    
    uniqueServices.forEach(service => {
        const latestVersion = service.versions[0];
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(latestVersion.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        // Set row content
        row.innerHTML = `
            <td>${service.service_number}</td>
            <td>${service.service_name}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="version-btn" 
                data-service-number="${service.service_number}" 
                data-service-name="${service.service_name}">
                    Versiones (${service.versions.length})
                </button>
            </td>
        `;
        
        // Add event listener for the versions button
        const versionBtn = row.querySelector('.version-btn');
        versionBtn.addEventListener('click', function() {
            showVersionsModal(service);
        });
        
        tbody.appendChild(row);
    });
}

/**
 * Show modal with versions for a specific service
 * @param {Object} service - Service object with versions
 */
function showVersionsModal(service) {
    const modal = document.getElementById('versionsModal');
    const serviceVersionTitle = document.getElementById('serviceVersionTitle');
    const versionsTable = document.getElementById('serviceVersionsTable');
    const tbody = versionsTable.querySelector('tbody');
    
    // Set modal title
    serviceVersionTitle.textContent = `${service.service_number} - ${service.service_name}`;
    
    // Ensure close button is visible
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.style.display = 'block';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '15px';
        closeBtn.style.top = '10px';
        closeBtn.style.cursor = 'pointer';
    }
    
    // Clear previous content
    tbody.innerHTML = '';
    
    // Add each version to the table
    service.versions.forEach((version, index) => {
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(version.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        // Set row content
        row.innerHTML = `
            <td>v${index + 1}</td>
            <td>${formattedDate}</td>
            <td>${version.excel_file}</td>
            <td>
                <button class="excel-btn" 
                data-file="${version.excel_file}">
                    Abrir Excel
                </button>
            </td>
        `;
        
        // Add event listener for the open Excel button
        const excelBtn = row.querySelector('.excel-btn');
        excelBtn.addEventListener('click', function() {
            openExcelFile(version.excel_file);
        });
        
        tbody.appendChild(row);
    });
    
    // Show the modal
    modal.style.display = 'block';
}

/**
 * Open an Excel file
 * @param {string} filename - Excel filename
 */
function openExcelFile(filename) {
    // Show loading indicator using SweetAlert if available
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Abriendo archivo',
            text: 'Por favor espere mientras se abre el archivo Excel...',
            icon: 'info',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });
    }
    
    // Request to open the Excel file
    fetch(`/excel/open?filename=${encodeURIComponent(filename)}`)
        .then(response => {
            if (!response.ok) throw new Error('Error al abrir el archivo Excel');
            return response.json();
        })
        .then(data => {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Archivo abierto',
                    text: data.message || 'El archivo Excel se ha abierto correctamente',
                    icon: 'success',
                    timer: 2000
                });
            } else {
                alert(`Archivo abierto: ${filename}`);
            }
        })
        .catch(error => {
            console.error('Error al abrir archivo Excel:', error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Error',
                    text: `No se pudo abrir el archivo Excel: ${error.message}`,
                    icon: 'error'
                });
            } else {
                alert(`Error al abrir el archivo Excel: ${error.message}`);
            }
        });
}

/**
 * Setup event listeners for modals
 */
function setupModalListeners() {
    const modal = document.getElementById('versionsModal');
    const closeBtn = modal.querySelector('.close');
    
    // Close button event listener
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Close modal when pressing Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
}

// Add a refresh button event listener if it exists
document.addEventListener('DOMContentLoaded', function() {
    // Add listener for the Archivos tab to refresh files when activated
    const archivosTabBtn = document.querySelector('.main-tab-btn[data-tab="archivos"]');
    if (archivosTabBtn) {
        archivosTabBtn.addEventListener('click', function() {
            loadServiceFiles();
        });
    }
});
