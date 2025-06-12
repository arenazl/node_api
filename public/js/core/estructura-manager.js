/**
 * Gestor de la pestaña Estructura
 * Maneja la carga y visualización de estructuras de servicios
 */

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏗️ [EstructuraManager] Inicializando...');
    EstructuraManager.init();
});

// Objeto principal para gestionar la pestaña Estructura
const EstructuraManager = {
    // Elementos del DOM
    elements: {
        serviceSelect: null,
        headerTable: null
    },

    // Estado actual
    state: {
        currentService: null,
        currentStructure: null
    },

    /**
     * Inicializa el gestor de estructura
     */
    init: function() {
        // Obtener referencias a elementos del DOM
        this.elements.serviceSelect = document.getElementById('estructuraServiceSelect');
        this.elements.headerTable = document.getElementById('estructuraHeaderTable');

        // Configurar event listeners
        this.setupEventListeners();

        // Cargar lista de servicios
        this.loadServicesList();

        console.log('✅ [EstructuraManager] Inicializado correctamente');
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners: function() {
        // Event listener para cambio de servicio
        if (this.elements.serviceSelect) {
            this.elements.serviceSelect.addEventListener('change', () => {
                const serviceNumber = this.elements.serviceSelect.value;
                if (serviceNumber) {
                    this.loadServiceStructure(serviceNumber);
                } else {
                    this.clearStructure();
                }
            });
        }

        // Event listener para cuando se carga un archivo Excel
        document.addEventListener('excelFileProcessed', (e) => {
            if (e.detail && e.detail.serviceNumber) {
                // Actualizar el selector de servicios para mostrar el servicio recién cargado
                this.updateServiceSelect(e.detail.serviceNumber);

                // Activar la pestaña Estructura automáticamente
                const estructuraTabBtn = document.querySelector('.main-tab-btn[data-tab="estructura"]');
                if (estructuraTabBtn) {
                    estructuraTabBtn.click();
                }
            }
        });
    },

    /**
     * Carga la lista de servicios disponibles
     */
    loadServicesList: function() {
        console.log('🔄 [EstructuraManager] Cargando lista de servicios...');

        // Limpiar selector
        if (this.elements.serviceSelect) {
            // Mantener solo la primera opción (placeholder)
            while (this.elements.serviceSelect.options.length > 1) {
                this.elements.serviceSelect.remove(1);
            }
        }

        // Obtener lista de servicios desde el servidor
        fetch('/services/list')
            .then(response => response.json())
            .then(data => {
                if (data && data.services && Array.isArray(data.services)) {
                    // Ordenar servicios por número
                    data.services.sort((a, b) => {
                        const numA = parseInt(a.serviceNumber);
                        const numB = parseInt(b.serviceNumber);
                        return numA - numB;
                    });

                    // Agregar opciones al selector
                    data.services.forEach(service => {
                        const option = document.createElement('option');
                        option.value = service.serviceNumber;
                        option.textContent = `${service.serviceNumber} - ${service.serviceName}`;
                        this.elements.serviceSelect.appendChild(option);
                    });

                    console.log(`✅ [EstructuraManager] ${data.services.length} servicios cargados`);
                } else {
                    console.warn('⚠️ [EstructuraManager] No se encontraron servicios');
                }
            })
            .catch(error => {
                console.error('❌ [EstructuraManager] Error al cargar servicios:', error);
            });
    },

    /**
     * Actualiza el selector de servicios para mostrar un servicio específico
     * @param {string} serviceNumber - Número de servicio a seleccionar
     */
    updateServiceSelect: function(serviceNumber) {
        if (this.elements.serviceSelect && serviceNumber) {
            // Verificar si el servicio ya existe en el selector
            let exists = false;
            for (let i = 0; i < this.elements.serviceSelect.options.length; i++) {
                if (this.elements.serviceSelect.options[i].value === serviceNumber) {
                    exists = true;
                    this.elements.serviceSelect.selectedIndex = i;
                    break;
                }
            }

            // Si no existe, recargar la lista de servicios
            if (!exists) {
                this.loadServicesList();
                // Después de recargar, intentar seleccionar el servicio
                setTimeout(() => {
                    for (let i = 0; i < this.elements.serviceSelect.options.length; i++) {
                        if (this.elements.serviceSelect.options[i].value === serviceNumber) {
                            this.elements.serviceSelect.selectedIndex = i;
                            this.loadServiceStructure(serviceNumber);
                            break;
                        }
                    }
                }, 500);
            } else {
                // Si existe, cargar su estructura
                this.loadServiceStructure(serviceNumber);
            }
        }
    },

    /**
     * Carga la estructura de un servicio
     * @param {string} serviceNumber - Número de servicio
     */
    loadServiceStructure: function(serviceNumber) {
        console.log(`🔄 [EstructuraManager] Cargando estructura del servicio ${serviceNumber}...`);

        // Guardar servicio actual
        this.state.currentService = serviceNumber;

        // Obtener estructura desde el servidor
        fetch(`/services/${serviceNumber}/structure`)
            .then(response => response.json())
            .then(data => {
                if (data && data.structure) {
                    // Guardar estructura
                    this.state.currentStructure = data.structure;

                    // Mostrar estructura en la tabla
                    this.displayStructure(data.structure);

                    console.log(`✅ [EstructuraManager] Estructura del servicio ${serviceNumber} cargada`);
                } else {
                    console.warn(`⚠️ [EstructuraManager] No se encontró estructura para el servicio ${serviceNumber}`);
                    this.clearStructure();
                }
            })
            .catch(error => {
                console.error(`❌ [EstructuraManager] Error al cargar estructura del servicio ${serviceNumber}:`, error);
                this.clearStructure();
            });
    },

    /**
     * Muestra la estructura completa en una sola tabla
     * @param {Object} structure - Estructura del servicio
     */
    displayStructure: function(structure) {
        if (!structure) return;

        const table = this.elements.headerTable;
        if (!table) return;

        // Limpiar tabla
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        // Verificar si hay estructura
        if (!structure) {
            const row = document.createElement('tr');
            row.className = 'empty-message';
            row.innerHTML = '<td colspan="6" class="text-center">No hay información de estructura disponible para este servicio.</td>';
            tbody.appendChild(row);
            return;
        }

        // Sección de cabecera
        if (structure.header && structure.header.fields && structure.header.fields.length > 0) {
            // Agregar título de sección
            const headerTitleRow = document.createElement('tr');
            headerTitleRow.className = 'section-title-row';
            const headerTitleCell = document.createElement('td');
            headerTitleCell.colSpan = 6;
            headerTitleCell.className = 'section-title-cell';
            headerTitleCell.textContent = 'CABECERA';
            headerTitleRow.appendChild(headerTitleCell);
            tbody.appendChild(headerTitleRow);

            // Agregar campos de cabecera
            structure.header.fields.forEach(field => {
                const row = document.createElement('tr');

                // Crear celdas
                const nameCell = document.createElement('td');
                nameCell.textContent = field.name || '';

                const lengthCell = document.createElement('td');
                lengthCell.textContent = field.length || '';

                const typeCell = document.createElement('td');
                typeCell.textContent = field.type || field.fieldType || '';

                const requiredCell = document.createElement('td');
                requiredCell.textContent = field.required || '';

                const valuesCell = document.createElement('td');
                valuesCell.textContent = field.values || '';

                const descCell = document.createElement('td');
                descCell.textContent = field.description || '';

                // Agregar celdas a la fila
                row.appendChild(nameCell);
                row.appendChild(lengthCell);
                row.appendChild(typeCell);
                row.appendChild(requiredCell);
                row.appendChild(valuesCell);
                row.appendChild(descCell);

                // Agregar fila a la tabla
                tbody.appendChild(row);
            });
        }

        // Sección de requerimiento
        if (structure.request && structure.request.elements && structure.request.elements.length > 0) {
            // Agregar título de sección
            const requestTitleRow = document.createElement('tr');
            requestTitleRow.className = 'section-title-row';
            const requestTitleCell = document.createElement('td');
            requestTitleCell.colSpan = 6;
            requestTitleCell.className = 'section-title-cell';
            requestTitleCell.textContent = 'REQUERIMIENTO';
            requestTitleRow.appendChild(requestTitleCell);
            tbody.appendChild(requestTitleRow);

            // Agregar elementos de requerimiento
            this.displayServiceElements(structure.request.elements, tbody);
        }

        // Sección de respuesta
        if (structure.response && structure.response.elements && structure.response.elements.length > 0) {
            // Agregar título de sección
            const responseTitleRow = document.createElement('tr');
            responseTitleRow.className = 'section-title-row';
            const responseTitleCell = document.createElement('td');
            responseTitleCell.colSpan = 6;
            responseTitleCell.className = 'section-title-cell';
            responseTitleCell.textContent = 'RESPUESTA';
            responseTitleRow.appendChild(responseTitleCell);
            tbody.appendChild(responseTitleRow);

            // Agregar elementos de respuesta
            this.displayServiceElements(structure.response.elements, tbody);
        }
    },

    /**
     * Muestra elementos de servicio (requerimiento o respuesta)
     * @param {Array} elements - Elementos del servicio
     * @param {HTMLElement} tbody - Elemento tbody donde agregar las filas
     */
    displayServiceElements: function(elements, tbody) {
        if (!elements || !elements.length || !tbody) return;

        elements.forEach(element => {
            if (element.type === 'field') {
                // Es un campo
                const row = document.createElement('tr');

                // Crear celdas
                const nameCell = document.createElement('td');
                nameCell.textContent = element.name || '';

                const lengthCell = document.createElement('td');
                lengthCell.textContent = element.length || '';

                const typeCell = document.createElement('td');
                typeCell.textContent = element.fieldType || '';

                const requiredCell = document.createElement('td');
                requiredCell.textContent = element.required || '';

                const valuesCell = document.createElement('td');
                valuesCell.textContent = element.values || '';

                const descCell = document.createElement('td');
                descCell.textContent = element.description || '';

                // Agregar celdas a la fila
                row.appendChild(nameCell);
                row.appendChild(lengthCell);
                row.appendChild(typeCell);
                row.appendChild(requiredCell);
                row.appendChild(valuesCell);
                row.appendChild(descCell);

                // Agregar fila a la tabla
                tbody.appendChild(row);
            } else if (element.type === 'occurrence') {
                // Es una ocurrencia
                const occRow = document.createElement('tr');
                occRow.className = 'occurrence-row';

                // Crear celda de ocurrencia
                const occCell = document.createElement('td');
                occCell.colSpan = 6;
                occCell.className = 'occurrence-cell';
                occCell.textContent = `Ocurrencia ${element.count} (${element.fields ? element.fields.length : 0} campos)`;

                // Agregar celda a la fila
                occRow.appendChild(occCell);

                // Agregar fila a la tabla
                tbody.appendChild(occRow);

                // Agregar campos de la ocurrencia
                if (element.fields && element.fields.length) {
                    element.fields.forEach(field => {
                        const fieldRow = document.createElement('tr');
                        fieldRow.className = 'occurrence-field-row';

                        // Crear celdas
                        const nameCell = document.createElement('td');
                        nameCell.textContent = field.name || '';
                        nameCell.className = 'occurrence-field-cell';

                        const lengthCell = document.createElement('td');
                        lengthCell.textContent = field.length || '';

                        const typeCell = document.createElement('td');
                        typeCell.textContent = field.fieldType || '';

                        const requiredCell = document.createElement('td');
                        requiredCell.textContent = field.required || '';

                        const valuesCell = document.createElement('td');
                        valuesCell.textContent = field.values || '';

                        const descCell = document.createElement('td');
                        descCell.textContent = field.description || '';

                        // Agregar celdas a la fila
                        fieldRow.appendChild(nameCell);
                        fieldRow.appendChild(lengthCell);
                        fieldRow.appendChild(typeCell);
                        fieldRow.appendChild(requiredCell);
                        fieldRow.appendChild(valuesCell);
                        fieldRow.appendChild(descCell);

                        // Agregar fila a la tabla
                        tbody.appendChild(fieldRow);
                    });
                }
            }
        });
    },

    /**
     * Limpia la estructura mostrada
     */
    clearStructure: function() {
        // Limpiar estado
        this.state.currentStructure = null;

        // Limpiar tabla
        const table = this.elements.headerTable;
        if (table) {
            const tbody = table.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = '';
                const row = document.createElement('tr');
                row.className = 'empty-message';
                row.innerHTML = '<td colspan="6" class="text-center">Seleccione un servicio para ver la estructura.</td>';
                tbody.appendChild(row);
            }
        }
    }
};
