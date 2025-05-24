/**
 * Response Fields Display
 * 
 * Este módulo se encarga de la visualización y formato de campos de respuesta
 * para servicios de VUELTA, mostrando los datos procesados en un formato legible.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('[Services UI - VUELTA] Inicializando visualización de campos de respuesta...');
    
    // Evento para mostrar campos de respuesta según el servicio seleccionado
    const vueltaServiceSelect = document.getElementById('vueltaServiceSelect');
    if (vueltaServiceSelect) {
        vueltaServiceSelect.addEventListener('change', function() {
            const serviceNumber = this.value;
            if (serviceNumber) {
                loadResponseFieldsInfo(serviceNumber);
            }
        });
    }
});

/**
 * Carga la información de campos de respuesta para un servicio
 * @param {string} serviceNumber - Número de servicio
 */
function loadResponseFieldsInfo(serviceNumber) {
    console.log(`[Services UI - VUELTA] Cargando información de campos para servicio ${serviceNumber}`);
    
    const fieldsContainer = document.getElementById('responseFieldsInfo');
    if (!fieldsContainer) return;
    
    // Mostrar mensaje de carga
    fieldsContainer.innerHTML = '<div class="loading-spinner"></div><p>Cargando información de campos...</p>';
    
    // Obtener información de campos de respuesta
    getResponseFieldsInfo(serviceNumber)
        .then(fieldsInfo => {
            displayResponseFieldsInfo(fieldsInfo, fieldsContainer);
        })
        .catch(error => {
            console.error(`[Services UI - VUELTA] Error al cargar campos para ${serviceNumber}:`, error);
            fieldsContainer.innerHTML = `<p class="error-message">Error al cargar información de campos: ${error.message}</p>`;
        });
}

/**
 * Muestra la información de campos de respuesta
 * @param {Object} fieldsInfo - Información de campos
 * @param {HTMLElement} container - Contenedor donde mostrar la información
 */
function displayResponseFieldsInfo(fieldsInfo, container) {
    if (!container) return;
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    // Verificar si hay información de campos
    if (!fieldsInfo || !fieldsInfo.fields || fieldsInfo.fields.length === 0) {
        container.innerHTML = '<p>No hay información de campos disponible para este servicio</p>';
        return;
    }
    
    // Crear sección de información general
    const infoSection = document.createElement('div');
    infoSection.className = 'fields-section';
    
    // Título del servicio
    const title = document.createElement('h4');
    title.textContent = `Campos de respuesta - Servicio ${fieldsInfo.service_number}`;
    infoSection.appendChild(title);
    
    // Descripción si está disponible
    if (fieldsInfo.description) {
        const description = document.createElement('p');
        description.className = 'service-description';
        description.textContent = fieldsInfo.description;
        infoSection.appendChild(description);
    }
    
    // Agregar sección de información al contenedor
    container.appendChild(infoSection);
    
    // Crear tabla de campos
    const fieldsTable = createFieldsTable(fieldsInfo.fields);
    container.appendChild(fieldsTable);
}

/**
 * Crea una tabla para visualizar los campos de respuesta
 * @param {Array} fields - Array de objetos de campo
 * @return {HTMLTableElement} - Tabla HTML con los campos
 */
function createFieldsTable(fields) {
    const table = document.createElement('table');
    table.className = 'fields-table';
    
    // Crear encabezado
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Campo', 'Descripción', 'Tipo', 'Longitud', 'Ejemplo'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Crear cuerpo de la tabla
    const tbody = document.createElement('tbody');
    
    fields.forEach(field => {
        const row = document.createElement('tr');
        
        // Campo
        const nameCell = document.createElement('td');
        nameCell.textContent = field.name || '';
        row.appendChild(nameCell);
        
        // Descripción
        const descCell = document.createElement('td');
        descCell.textContent = field.description || '';
        row.appendChild(descCell);
        
        // Tipo
        const typeCell = document.createElement('td');
        typeCell.textContent = field.type || '';
        row.appendChild(typeCell);
        
        // Longitud
        const lengthCell = document.createElement('td');
        lengthCell.textContent = field.length || '';
        row.appendChild(lengthCell);
        
        // Ejemplo
        const exampleCell = document.createElement('td');
        exampleCell.textContent = field.example || '';
        row.appendChild(exampleCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    return table;
}

/**
 * Obtiene la información de campos de respuesta para un servicio
 * @param {string} serviceNumber - Número de servicio
 * @returns {Promise<Object>} - Promesa que resuelve con la información de campos
 */
function getResponseFieldsInfo(serviceNumber) {
    return new Promise((resolve, reject) => {
        // Esta función se expandirá en el futuro para obtener la información real de campos
        // a través de la API. Por ahora, devolvemos información simulada.
        
        setTimeout(() => {
            // Ejemplo de información de campos
            const exampleInfo = {
                service_number: serviceNumber,
                description: 'Información de campos de respuesta para el servicio',
                fields: [
                    {
                        name: 'campo_respuesta1',
                        description: 'Primer campo de respuesta',
                        type: 'String',
                        length: 50,
                        example: 'ABC12345'
                    },
                    {
                        name: 'campo_respuesta2',
                        description: 'Segundo campo de respuesta',
                        type: 'Number',
                        length: 10,
                        example: '12345'
                    },
                    {
                        name: 'campo_respuesta3',
                        description: 'Tercer campo de respuesta',
                        type: 'Date',
                        length: 8,
                        example: '20250518'
                    }
                ]
            };
            
            resolve(exampleInfo);
        }, 500);
    });
}
