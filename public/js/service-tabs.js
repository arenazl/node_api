// Event listeners for various UI components
document.addEventListener('DOMContentLoaded', function() {
    // Refresh button for services
    const refreshServicesBtn = document.getElementById('refreshServicesBtn');
    if (refreshServicesBtn) {
        refreshServicesBtn.addEventListener('click', function() {
            refreshServices();
        });
    }

    // Service selection change handlers
    const idaServiceSelect = document.getElementById('idaServiceSelect');
    if (idaServiceSelect) {
        idaServiceSelect.addEventListener('change', function() {
            const serviceNumber = this.value;
            if (serviceNumber) {
                loadConfigurationsForService(serviceNumber);
            }
        });
    }

    // Configuration selection change handlers
    const idaConfigSelect = document.getElementById('idaConfigSelect');
    if (idaConfigSelect) {
        idaConfigSelect.addEventListener('change', function() {
            const configId = this.value;
            if (configId) {
                loadConfigurationData(configId);
            }
        });
    }

    // Service tab navigation buttons (ida/vuelta)
    const serviceTabs = document.querySelectorAll('.services-tab-btn');
    serviceTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remover clase 'active' de todos los tabs
            serviceTabs.forEach(t => t.classList.remove('active'));
            // Agregar clase 'active' al tab clickeado
            this.classList.add('active');
            
            // Mostrar el contenido correspondiente
            const tabName = this.getAttribute('data-service-tab');
            const tabContents = document.querySelectorAll('.service-tab-content');
            
            tabContents.forEach(content => {
                if (content.id === tabName + 'Service') {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });

    // Initial load of service selectors
    loadAllServiceSelectors();
});

// Refresh services function
function refreshServices() {
    // Show loading notification
    showNotification('Actualizando lista de servicios...', 'info');
    
    // Call the API to refresh services
    fetch('/api/services/refresh')
        .then(response => {
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            console.log('Servicios actualizados:', data);
            showNotification(`Servicios actualizados correctamente (${data.services_count} servicios)`, 'success');
            return fetch('/api/services'); // Get the updated list
        })
        .then(response => {
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            // Refresh service selectors and tables with the new data
            updateServiceSelectors(data.services || []);
            updateServicesTable(data.services || []);
        })
        .catch(error => {
            console.error('Error al actualizar servicios:', error);
            showNotification(`Error al actualizar servicios: ${error.message}`, 'error');
        });
}

/**
* Carga las configuraciones disponibles para un servicio específico en el select.
* @param {string} serviceNumber - Número del servicio seleccionado.
*/
function loadConfigurationsForService(serviceNumber) {
    const configSelect = document.getElementById('idaConfigSelect');
    if (!configSelect) { 
        console.warn("Elemento 'idaConfigSelect' no encontrado."); 
        return; 
    }

    // Limpiar opciones manteniendo la primera ("Seleccione...")
    while (configSelect.options.length > 1) { 
        configSelect.remove(1); 
    }
    configSelect.value = ""; // Reset selection

    if (!serviceNumber) {
        configSelect.disabled = true;
        configSelect.options[0].textContent = "Seleccione un servicio";
        return;
    }

    configSelect.disabled = true; // Deshabilitar mientras carga
    configSelect.options[0].textContent = "Cargando configs...";

    fetch(`/service-config/list?service_number=${serviceNumber}`)
        .then(response => {
            if (!response.ok) throw new Error('Error al listar configuraciones');
            return response.json();
        })
        .then(data => {
            configSelect.disabled = false;
            configSelect.options[0].textContent = "-- Seleccione una configuración --";

            if (data?.configs?.length > 0) {
                data.configs.forEach(config => {
                    const option = document.createElement('option');
                    option.value = config.id;
                    const shortId = config.id.substring(config.id.length - 8); // Últimos 8 chars del ID
                    option.textContent = `${config.name || `Config (${shortId})`} [${config.canal || 'N/C'}]`;
                    option.title = `ID: ${config.id}\nCreado: ${new Date(config.timestamp).toLocaleString()}`;
                    configSelect.appendChild(option);
                });
            } else {
                const noConfigOption = document.createElement('option');
                noConfigOption.textContent = "No hay configs guardadas";
                noConfigOption.disabled = true;
                configSelect.appendChild(noConfigOption);
            }
        })
        .catch(error => {
            console.error('Error al cargar configuraciones:', error);
            configSelect.options[0].textContent = "Error al cargar";
            configSelect.disabled = true;
            showNotification('Error al cargar lista de configuraciones.', 'error');
        });
}

// Helper function to update service selectors
function updateServiceSelectors(services) {
    const selectors = [
        document.getElementById('idaServiceSelect'),
        document.getElementById('vueltaServiceSelect')
    ];
    
    selectors.forEach(select => {
        if (!select) return;
        
        // Save current selection
        const currentValue = select.value;
        
        // Clear options
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Set default text
        if (select.options[0]) {
            select.options[0].textContent = "-- Seleccione un servicio --";
            select.options[0].disabled = true;
        }
        
        // Add new options
        if (services && services.length > 0) {
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.service_number;
                option.textContent = `${service.service_number} - ${service.service_name}`;
                select.appendChild(option);
            });
            
            // Restore previous selection if possible
            if (currentValue) {
                const exists = Array.from(select.options).some(opt => opt.value === currentValue);
                if (exists) {
                    select.value = currentValue;
                    
                    // If this is the service select for ida, trigger the change event to reload configs
                    if (select.id === 'idaServiceSelect') {
                        loadConfigurationsForService(currentValue);
                    }
                }
            }
        } else {
            const option = document.createElement('option');
            option.textContent = "No hay servicios disponibles";
            option.disabled = true;
            select.appendChild(option);
        }
    });
}

// Helper function to update services table
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
    
    services.forEach(service => {
        const row = tbody.insertRow();
        
        // Number cell
        const cellNumber = row.insertCell(0);
        cellNumber.textContent = service.service_number;
        
        // Name cell
        const cellName = row.insertCell(1);
        cellName.textContent = service.service_name;
        
        // Action cell
        const cellAction = row.insertCell(2);
        
        // View button
        const viewButton = document.createElement('button');
        viewButton.className = 'action-btn small';
        viewButton.textContent = 'Ver';
        viewButton.title = 'Ver detalles del servicio';
        viewButton.onclick = function() {
            // Select this service in tabs
            const selects = [
                document.getElementById('idaServiceSelect'),
                document.getElementById('vueltaServiceSelect')
            ];
            
            selects.forEach(select => {
                if (select) {
                    select.value = service.service_number;
                    // Trigger change event
                    const event = new Event('change');
                    select.dispatchEvent(event);
                }
            });
            
            // Show ida tab
            const idaTabBtn = document.querySelector('.services-tab-btn[data-service-tab="ida"]');
            if (idaTabBtn) {
                idaTabBtn.click();
            }
        };
        
        cellAction.appendChild(viewButton);
    });
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.warn("Elemento 'notification' no encontrado para mostrar:", message);
        alert(`${type.toUpperCase()}: ${message}`);
        return;
    }
    notification.textContent = message;
    notification.className = `notification alert alert-${type}`;
    notification.style.display = 'block';
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.right = '10px';
    notification.style.zIndex = '1050';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

/**
* Carga los datos de una configuración específica y los muestra en el editor JSON.
* @param {string} configId - ID de la configuración a cargar.
*/
function loadConfigurationData(configId) {
    if (!configId) return;

    // Mostrar indicador de carga
    const editorContainer = document.getElementById('idaJsonInput');
    if (editorContainer) {
        editorContainer.innerHTML = '<div class="loading-spinner">Cargando configuración...</div>';
    }

    // Obtener el servicio seleccionado
    const serviceNumber = document.getElementById('idaServiceSelect')?.value;
    if (!serviceNumber) {
        showNotification('Error: No se ha seleccionado un servicio', 'error');
        return;
    }

    // Cargar datos de configuración
    fetch(`/service-config/get/${configId}`)
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar la configuración');
            return response.json();
        })
        .then(data => {
            console.log('Configuración cargada:', data);
            
            // Determinar qué datos mostrar según la estructura de respuesta
            let configData = data;
            
            // Si la respuesta tiene un campo 'config', usar ese
            if (data && data.config) {
                configData = data.config;
            }
            
            // Mostrar los datos en el editor JSON
            const jsonContainer = document.getElementById('idaJsonInput');
            if (jsonContainer) {
                // El contenedor ya es un pre, así que simplemente actualizamos su contenido
                const jsonString = JSON.stringify(configData, null, 2);
                jsonContainer.textContent = jsonString;
                
                // Aplicar formato con JSON formatter si está disponible
                if (typeof formatJson === 'function') {
                    formatJson(jsonContainer);
                } else {
                    // Si no está disponible, al menos asegurarnos que sea editable
                    jsonContainer.setAttribute('contenteditable', 'true');
                }
            } else {
                console.warn('No se encontró el contenedor del editor JSON');
            }

            showNotification(`Configuración cargada correctamente`, 'success');
        })
        .catch(error => {
            console.error('Error al cargar la configuración:', error);
            
            // Mostrar mensaje de error en el contenedor
            const jsonContainer = document.getElementById('idaJsonInput');
            if (jsonContainer) {
                jsonContainer.textContent = `Error al cargar la configuración: ${error.message}`;
                jsonContainer.classList.add('json-error');
            }
            
            showNotification(`Error al cargar la configuración: ${error.message}`, 'error');
        });
}

// Helper function to load all service selectors initially
function loadAllServiceSelectors() {
    fetch('/api/services')
        .then(response => {
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            const services = data.services || [];
            console.log(`Cargados ${services.length} servicios`);
            updateServiceSelectors(services);
            updateServicesTable(services);
            
            // Check if idaServiceSelect has a value, and load configurations if it does
            const idaServiceSelect = document.getElementById('idaServiceSelect');
            if (idaServiceSelect && idaServiceSelect.value) {
                loadConfigurationsForService(idaServiceSelect.value);
            }
        })
        .catch(error => {
            console.error('Error al cargar servicios:', error);
            showNotification(`Error al cargar servicios: ${error.message}`, 'error');
        });
}
