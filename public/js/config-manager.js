/**
 * Configuration Manager
 *
 * Handles configuration settings for services, allows users to set values
 * for header and request fields, and save configurations for later use.
 */

// Main configuration manager object
const ConfigManager = {
    // Current selected service
    currentServiceNumber: null,
    currentServiceName: null,
    currentStructure: null,
    occurrenceCounter: 0,
    versionCounter: 1,

    // Initialization
    init: function() {
        // DOM elements
        this.serviceSelect = document.getElementById('configServiceSelect');
        this.canalInput = document.getElementById('canalInput');
        this.versionInput = document.getElementById('versionInput');
        this.versionDisplay = document.getElementById('versionDisplay');
        this.saveButton = document.getElementById('saveConfigBtn');
        this.autoFillBtn = document.getElementById('autoFillBtn');
        this.headerConfigTable = document.getElementById('headerConfigTable');
        this.requestConfigTable = document.getElementById('requestConfigTable');
        
        // Create saved configurations panel container if it doesn't exist
        this.createSavedConfigurationsPanel();
        
        // Config tab buttons
        const configTabBtns = document.querySelectorAll('.config-tab-btn');

        // Event listeners
        this.serviceSelect.addEventListener('change', () => this.loadServiceStructure());
        this.saveButton.addEventListener('click', () => this.saveConfiguration());
        this.autoFillBtn.addEventListener('click', () => this.autoFillFields());
        
        // Config tab switching
        configTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-config-tab');
                this.showConfigTab(tabName);
            });
        });
        
        // Initialize by loading both available services and saved configurations
        this.loadAvailableServices();
        this.loadSavedConfigurations();
    },

    // Load available services for dropdown
    loadAvailableServices: function() {
        fetch('/excel/files')
            .then(response => response.json())
            .then(data => {
                if (data.files && Array.isArray(data.files)) {
                    // Clear existing options except the default
                    while (this.serviceSelect.options.length > 1) {
                        this.serviceSelect.remove(1);
                    }

                    // Map of service numbers to avoid duplicates
                    const serviceMap = new Map();

                    // Add each service
                    data.files.forEach(file => {
                        if (file.service_number && !serviceMap.has(file.service_number)) {
                            serviceMap.set(file.service_number, true);

                            const option = document.createElement('option');
                            option.value = file.service_number;
                            option.textContent = `${file.service_number} - ${file.service_name || 'Servicio'}`;
                            this.serviceSelect.appendChild(option);
                        }
                    });
                    
                    // Trigger change event on the service select if there are services available
                    // This will automatically load the latest service structure after upload
                    if (this.serviceSelect.options.length > 1 && !this.currentServiceNumber) {
                        this.serviceSelect.dispatchEvent(new Event('change'));
                    }
                }
            })
            .catch(error => {
                console.error('Error loading services:', error);
                showNotification('Error al cargar servicios disponibles', 'error');
            });
    },

    // Load service structure when selected from dropdown
    loadServiceStructure: function() {
        const serviceNumber = this.serviceSelect.value;

        // Corrected typo: serviceNumbeer -> serviceNumber
        if (!serviceNumber) {
            // Clear tables if no service selected
            this.clearConfigTables();
            return;
        }

        // Reset occurrence counter
        this.occurrenceCounter = 0;

        // Load structure by service number
        fetch(`/excel/structure-by-service?service_number=${serviceNumber}`)
            .then(response => {
                if (!response.ok) {
                    // Try to get error message from response body if possible
                    return response.text().then(text => {
                         throw new Error(text || 'Estructura no encontrada para este servicio');
                    });
                }
                return response.json();
            })
            .then(structure => {
                if (!structure || !structure.header_structure || !structure.service_structure) {
                    throw new Error('Estructura incompleta o inválida recibida del servidor');
                }

                // Store current service info
                this.currentServiceNumber = serviceNumber;
                this.currentServiceName = structure.service_structure.serviceName || structure.service_structure.serviceNumber || serviceNumber; // Use serviceNumber as fallback name
                this.currentStructure = structure;

                // Populate configuration tables
                this.populateHeaderConfigTable(structure.header_structure);
                this.populateRequestConfigTable(structure.service_structure);

                // Show notification
                showNotification(`Estructura del servicio ${serviceNumber} cargada correctamente`, 'success');
            })
            .catch(error => {
                console.error('Error loading service structure:', error);
                showNotification(`Error al cargar la estructura: ${error.message}`, 'error');
                this.clearConfigTables();
            });
    },

    // Clear config tables and show "select service" message
    clearConfigTables: function() {
        // Header table
        const headerTbody = this.headerConfigTable.querySelector('tbody');
        headerTbody.innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">Seleccione un servicio para cargar los campos de la cabecera</td></tr>';

        // Request table
        const requestTbody = this.requestConfigTable.querySelector('tbody');
        requestTbody.innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">Seleccione un servicio para cargar los campos del requerimiento</td></tr>';

        // Reset current service
        this.currentServiceNumber = null;
        this.currentServiceName = null;
        this.currentStructure = null;
        this.occurrenceCounter = 0; // Reset counter when clearing
    },

    // Populate header config table
    populateHeaderConfigTable: function(headerStructure) {
        if (!headerStructure || !headerStructure.fields) {
             console.warn("Estructura de cabecera inválida o sin campos.");
             this.headerConfigTable.querySelector('tbody').innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">Estructura de cabecera inválida.</td></tr>';
             return;
        }

        const tbody = this.headerConfigTable.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous content

        headerStructure.fields.forEach(field => {
            // Skip placeholder/comment rows often found in structure definitions
            if (field.name && field.name !== '*' && field.name !== 'REQUERIMIENTO' && field.type !== 'Longitud del CAMPO') {
                const row = document.createElement('tr');

                // Field name cell
                const nameCell = document.createElement('td');
                nameCell.textContent = field.name;
                row.appendChild(nameCell);

                // Field type cell
                const typeCell = document.createElement('td');
                typeCell.textContent = field.type || '';
                row.appendChild(typeCell);

                // Field length cell
                const lengthCell = document.createElement('td');
                lengthCell.textContent = field.length || '';
                row.appendChild(lengthCell);

                // Field value cell with input
                const valueCell = document.createElement('td');
                const input = this.createFieldInput(field);
                input.dataset.fieldName = field.name; // Essential for saving
                input.dataset.section = 'header'; // Essential for saving
                valueCell.appendChild(input);
                row.appendChild(valueCell);

                tbody.appendChild(row);
            }
        });
         if (tbody.children.length === 0) {
             tbody.innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">No hay campos configurables en la cabecera.</td></tr>';
         }
    },

    // Populate request config table
    populateRequestConfigTable: function(serviceStructure) {
        const tbody = this.requestConfigTable.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous content

        // Check for request structure and elements
        if (!serviceStructure || !serviceStructure.request || !Array.isArray(serviceStructure.request.elements)) {
             console.warn("Estructura de requerimiento inválida o sin elementos.");
             tbody.innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">Estructura de requerimiento inválida o vacía.</td></tr>';
             return;
        }
         if (serviceStructure.request.elements.length === 0) {
             tbody.innerHTML = '<tr class="empty-message"><td colspan="4" class="text-center">El requerimiento no tiene campos definidos.</td></tr>';
             return;
         }

        // Process elements recursively starting at level 0
        this.processElements(serviceStructure.request.elements, tbody, 'request', 0);
    },

    // Process elements recursively to handle occurrences and nested structures
    processElements: function(elements, tbody, section, level, parentId = '') {
        if (!elements || !Array.isArray(elements)) {
            console.warn("Intento de procesar elementos inválidos:", elements);
            return;
        }

        console.log(`Processing elements at level ${level}, parentId: ${parentId}`);

        // Sort elements by their index to ensure correct order from structure
        const sortedElements = [...elements].sort((a, b) => {
            // Robust sorting: handle undefined or non-numeric indices
            const indexA = typeof a.index === 'number' ? a.index : Infinity;
            const indexB = typeof b.index === 'number' ? b.index : Infinity;
            if (indexA !== indexB) {
                return indexA - indexB;
            }
            // Fallback if indices are the same or missing (shouldn't happen ideally)
            return 0;
        });

        console.log("Sorted elements by index:", sortedElements.map(e =>
            `${e.type}:${e.name || e.id || ''} (index: ${e.index ?? 'none'})`
        ));

        sortedElements.forEach((element, idx) => {
            // Use element.index if available and valid, otherwise fallback to loop index for unique ID part
            const indexPart = typeof element.index === 'number' ? element.index : idx;
            const elementId = parentId ? `${parentId}_${indexPart}` : `elem_${indexPart}`;

            if (element.type === 'field') {
                // Create a row for a field
                const row = document.createElement('tr');
                row.classList.add('field-row');
                row.dataset.level = level;
                row.dataset.elementId = elementId; // Unique ID for this element instance

                if (level > 0) {
                    row.classList.add(`level-${level}-field`);
                }

                // Field name cell with proper indentation
                const nameCell = document.createElement('td');
                nameCell.style.paddingLeft = `${level * 20}px`; // Indentation using padding
                nameCell.textContent = element.name;
                row.appendChild(nameCell);

                // Field type cell
                const typeCell = document.createElement('td');
                typeCell.textContent = element.fieldType || ''; // Use fieldType if available
                row.appendChild(typeCell);

                // Field length cell
                const lengthCell = document.createElement('td');
                lengthCell.textContent = element.length || '';
                row.appendChild(lengthCell);

                // Field value cell with input
                const valueCell = document.createElement('td');
                const input = this.createFieldInput(element);
                input.dataset.fieldName = element.name; // Critical for data collection
                input.dataset.section = section; // request or header
                input.dataset.elementId = elementId; // Link input to its definition row
                input.dataset.level = level; // Store level on input too if needed later
                valueCell.appendChild(input);
                row.appendChild(valueCell);

                tbody.appendChild(row);

            } else if (element.type === 'occurrence') {
                // Create a container row for the occurrence definition
                const occurrenceDefId = element.id || `occDef_${this.occurrenceCounter++}`; // Use ID from JSON or generate one
                const occRow = document.createElement('tr');
                occRow.classList.add('occurrence-row');

                // Use a meaningful name if possible, fallback to ID or index
                 const occName = element.name || element.id || `Ocurrencia ${typeof element.index === 'number' ? element.index : occurrenceDefId}`;
                 occRow.dataset.occurrenceName = occName; // Used for saving data
                 occRow.dataset.occurrenceDefId = occurrenceDefId; // Identifier for this *type* of occurrence
                 occRow.dataset.elementId = elementId;
                 occRow.dataset.level = level;

                 console.log(`Creating occurrence header for: ${occName} (ID: ${occurrenceDefId}) at level ${level}`);

                // Occurrence name cell with proper indentation and controls
                const occNameCell = document.createElement('td');
                occNameCell.colSpan = 4; // Span across all columns
                occNameCell.style.paddingLeft = `${level * 20}px`; // Indentation using padding
                occNameCell.classList.add('occurrence-header-cell'); // Add class for styling

                // Create collapse/expand button (optional enhancement)
                // ... (can be added here) ...

                // Display Name for the Occurrence Type
                 let displayName = occName;
                 if (element.count) { // Add count if specified in structure
                     displayName += ` (Máx: ${element.count})`;
                 }
                 const occTitle = document.createTextNode(` ${displayName}`);
                 occNameCell.appendChild(occTitle);


                 // Add "Add Instance" button specific to this occurrence definition
                 const addBtn = document.createElement('button');
                 addBtn.type = 'button';
                 addBtn.classList.add('action-btn', 'add-occurrence-btn');
                 addBtn.textContent = 'Agregar Instancia';
                 addBtn.style.marginLeft = '10px'; // Spacing

                 // Store necessary info on the button to add the correct instance type
                 addBtn.dataset.addBtnFor = occurrenceDefId; // Which occurrence definition this button adds
                 addBtn._occurrenceElement = element; // Keep reference to the original structure object

                 // Add click listener
                 const self = this; // Capture 'this' context
                 addBtn.addEventListener('click', function(e) {
                     e.preventDefault();
                     e.stopPropagation();

                     const targetElementDef = this._occurrenceElement;
                     const targetOccDefId = this.dataset.addBtnFor;

                     console.log(`Add button clicked for occurrence definition: ${targetOccDefId}`, targetElementDef);

                     // Find the row this button belongs to (the occurrence header row)
                     const headerRow = this.closest('tr');
                     if (!headerRow) {
                         console.error("Could not find header row for add button");
                         return;
                     }

                     // Find the last row associated with this occurrence definition
                     // This includes the header row itself, and all rows from all its instances
                     let lastRowOfOccurrence = headerRow;
                     const rows = tbody.querySelectorAll(`tr[data-occurrence-def-id="${targetOccDefId}"], tr[data-parent-def-id="${targetOccDefId}"]`);
                     if (rows.length > 0) {
                         lastRowOfOccurrence = rows[rows.length - 1];
                     }


                     // Add instance using the definition, inserting after the last known row
                     // Pass the definition object (deep cloned inside function if needed),
                     // the definition ID, the tbody, section, level, and the insertion anchor.
                     self.addOccurrenceInstance(targetElementDef, targetOccDefId, tbody, section, level, lastRowOfOccurrence);

                 });

                 occNameCell.appendChild(addBtn);
                 occRow.appendChild(occNameCell);
                 tbody.appendChild(occRow);

                 // Add the first instance of this occurrence automatically
                 console.log(`Adding first instance for ${occurrenceDefId} automatically.`);
                 this.addOccurrenceInstance(element, occurrenceDefId, tbody, section, level, occRow); // Insert after the header row

            } else {
                 console.warn(`Element type '${element.type}' not recognized.`, element);
            }
        });
    },

    /**
     * Adds a new instance of an occurrence to the table.
     * @param {object} occurrenceElement - The structure object defining the occurrence.
     * @param {string} occurrenceDefId - The ID defining the *type* of occurrence.
     * @param {HTMLTableSectionElement} tbody - The table body to add rows to.
     * @param {string} section - The section ('request').
     * @param {number} level - The nesting level of the occurrence definition row.
     * @param {HTMLTableRowElement} insertAfterRow - The row after which the new instance should be inserted.
     * @returns {HTMLTableRowElement | null} The last row element added by this function call (including recursive calls).
     */
    addOccurrenceInstance: function(occurrenceElement, occurrenceDefId, tbody, section, level, insertAfterRow) {

         console.log(`Adding instance for Occurrence Definition: ${occurrenceDefId} at level ${level + 1}`);

         // Generate a unique ID for this specific instance
         const instanceId = `inst_${occurrenceDefId}_${Date.now()}`;

         // --- Create the Instance Header Row ---
         const instanceRow = document.createElement('tr');
         instanceRow.classList.add('occurrence-instance-row');
         instanceRow.dataset.instanceId = instanceId; // Unique ID for this instance
         instanceRow.dataset.parentDefId = occurrenceDefId; // Link to the definition type
         instanceRow.dataset.level = level + 1; // Instance content is one level deeper

         const instanceCell = document.createElement('td');
         instanceCell.colSpan = 4;
         instanceCell.style.paddingLeft = `${(level + 1) * 20}px`; // Indent instance header
         instanceCell.classList.add('instance-header-cell'); // Add class for styling

         // Add instance label (e.g., "Instancia 1", "Instancia 2")
         // Count existing instances of this type to provide a sequence number
         const instanceCount = tbody.querySelectorAll(`tr.occurrence-instance-row[data-parent-def-id="${occurrenceDefId}"]`).length + 1;
         const instanceLabel = document.createTextNode(`Instancia ${instanceCount} `);
         instanceCell.appendChild(instanceLabel);

         // Add delete button for this instance
         const deleteBtn = document.createElement('button');
         deleteBtn.type = 'button';
         deleteBtn.classList.add('action-btn', 'delete-instance-btn');
         deleteBtn.textContent = 'Eliminar';
         deleteBtn.style.marginLeft = '10px';
         deleteBtn.onclick = () => {
             // Find all rows belonging to this instance and remove them
             const rowsToRemove = tbody.querySelectorAll(`tr[data-instance-id="${instanceId}"]`);
             rowsToRemove.forEach(row => row.remove());
             instanceRow.remove(); // Remove the instance header row itself
             // Optionally: Renumber subsequent instance labels if needed
         };
         instanceCell.appendChild(deleteBtn);
         instanceRow.appendChild(instanceCell);
         // --- End Instance Header Row ---


         // --- Insert Instance Header Row ---
         // Insert immediately after the designated anchor row
         if (insertAfterRow && insertAfterRow.parentNode === tbody) {
             if (insertAfterRow.nextSibling) {
                 tbody.insertBefore(instanceRow, insertAfterRow.nextSibling);
             } else {
                 tbody.appendChild(instanceRow);
             }
         } else {
             // Fallback: append to the end if anchor is invalid (should not happen ideally)
             console.warn("Invalid insertAfterRow provided to addOccurrenceInstance, appending to end.");
             tbody.appendChild(instanceRow);
         }
         // --- End Insertion ---


         // This instance header row is now our current insertion point for its children
         let currentRow = instanceRow;

         // --- Process Child Elements of the Occurrence ---
         let elementsToProcess = [];
         // Structure might have children under 'elements' or 'fields'
         if (occurrenceElement.elements && Array.isArray(occurrenceElement.elements)) {
             elementsToProcess = occurrenceElement.elements;
         } else if (occurrenceElement.fields && Array.isArray(occurrenceElement.fields)) {
             // If using 'fields', ensure they look like 'elements' (add type if missing)
             elementsToProcess = occurrenceElement.fields.map(f => ({ ...f, type: f.type || 'field' }));
         }

         console.log(`Adding instance ${instanceId} content. Children to process:`, elementsToProcess.length);

         if (elementsToProcess.length > 0) {
             // Clone and sort the child elements for this instance
             const instanceElements = JSON.parse(JSON.stringify(elementsToProcess)); // Deep clone
             const sortedElements = instanceElements.sort((a, b) => {
                 const indexA = typeof a.index === 'number' ? a.index : Infinity;
                 const indexB = typeof b.index === 'number' ? b.index : Infinity;
                 if (indexA !== indexB) return indexA - indexB;
                 return 0;
             });

             sortedElements.forEach((element, index) => {
                 let newRow = null; // Row for the current element (field or nested occurrence header)
                 let isNestedOccurrence = element.type === 'occurrence';
                 let nestedOccDefId = null; // Definition ID for nested occurrences

                 if (element.type === 'field') {
                     newRow = document.createElement('tr');
                     newRow.classList.add('field-row', `level-${level + 2}-field`);
                     newRow.dataset.instanceId = instanceId; // Belongs to this instance
                     newRow.dataset.parentDefId = occurrenceDefId; // Belongs to parent occurrence type
                     newRow.dataset.level = level + 2;

                     const nameCell = document.createElement('td');
                     nameCell.style.paddingLeft = `${(level + 2) * 20}px`; // Indent field
                     nameCell.textContent = element.name;
                     newRow.appendChild(nameCell);

                     const typeCell = document.createElement('td');
                     typeCell.textContent = element.fieldType || '';
                     newRow.appendChild(typeCell);

                     const lengthCell = document.createElement('td');
                     lengthCell.textContent = element.length || '';
                     newRow.appendChild(lengthCell);

                     const valueCell = document.createElement('td');
                     const input = this.createFieldInput(element);
                     input.dataset.fieldName = element.name;
                     input.dataset.section = section;
                     input.dataset.instanceId = instanceId; // Link input to instance
                     input.dataset.level = level + 2;
                     valueCell.appendChild(input);
                     newRow.appendChild(valueCell);

                 } else if (isNestedOccurrence) {
                     nestedOccDefId = element.id || `occDef_nested_${this.occurrenceCounter++}`;
                     newRow = document.createElement('tr');
                     newRow.classList.add('occurrence-row'); // It's a header for nested occurrences
                     newRow.dataset.occurrenceDefId = nestedOccDefId; // Its own definition ID
                     newRow.dataset.instanceId = instanceId; // Belongs to the parent instance
                     newRow.dataset.parentDefId = occurrenceDefId; // Link to parent definition type
                     newRow.dataset.level = level + 2; // Nested header is level + 2

                     const nestedCell = document.createElement('td');
                     nestedCell.colSpan = 4;
                     nestedCell.style.paddingLeft = `${(level + 2) * 20}px`; // Indent nested header
                     nestedCell.classList.add('occurrence-header-cell');


                     let nestedDisplayName = element.name || nestedOccDefId;
                     if (element.count) nestedDisplayName += ` (Máx: ${element.count})`;
                     nestedCell.appendChild(document.createTextNode(` ${nestedDisplayName}`));

                     const addNestedBtn = document.createElement('button');
                     addNestedBtn.type = 'button';
                     addNestedBtn.classList.add('action-btn', 'add-occurrence-btn');
                     addNestedBtn.textContent = 'Agregar'; // Shorter text for nested
                     addNestedBtn.style.marginLeft = '10px';
                     addNestedBtn.dataset.addBtnFor = nestedOccDefId;
                     addNestedBtn._occurrenceElement = element; // Store definition

                     const self = this; // Capture context
                     addNestedBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const targetElementDef = this._occurrenceElement;
                        const targetOccDefId = this.dataset.addBtnFor;
                        const headerRow = this.closest('tr');
                        if (!headerRow) return;

                        let lastRowOfNestedOccurrence = headerRow;
                        const nestedRows = tbody.querySelectorAll(`tr[data-occurrence-def-id="${targetOccDefId}"], tr[data-parent-def-id="${targetOccDefId}"]`);
                         if (nestedRows.length > 0) {
                             lastRowOfNestedOccurrence = nestedRows[nestedRows.length - 1];
                         }

                        self.addOccurrenceInstance(targetElementDef, targetOccDefId, tbody, section, level + 2, lastRowOfNestedOccurrence); // Note level + 2
                     });

                     nestedCell.appendChild(addNestedBtn);
                     newRow.appendChild(nestedCell);
                 }

                 // --- Insert the Child Row (Field or Nested Header) ---
                 if (newRow) {
                     // Insert after the current row marker
                     if (currentRow && currentRow.parentNode === tbody) {
                         if (currentRow.nextSibling) {
                             tbody.insertBefore(newRow, currentRow.nextSibling);
                         } else {
                             tbody.appendChild(newRow);
                         }
                     } else {
                         // Fallback if currentRow is somehow invalid
                         tbody.appendChild(newRow);
                     }
                     // Update currentRow to this newly added row
                     currentRow = newRow;
                 // --- End Child Row Insertion ---


                     // --- Add First Instance of Nested Occurrence ---
                     if (isNestedOccurrence) {
                         console.log(`Adding first instance for nested occurrence: ${nestedOccDefId}`);
                         const lastRowAddedByNested = this.addOccurrenceInstance(
                             element, // The definition object for the nested occurrence
                             nestedOccDefId, // The specific ID for this type of nested occurrence
                             tbody,
                             section,
                             level + 2, // The level for the nested instance's content
                             currentRow // Insert after the nested occurrence header row we just added
                         );

                         // Update currentRow to point to the absolute last row added by the recursive call
                         if (lastRowAddedByNested) {
                             currentRow = lastRowAddedByNested;
                             console.log(`Updated currentRow after nested instance to:`, currentRow);
                         }
                     }
                     // --- End Nested Instance Handling ---
                 }
             });
         }
         // --- End Processing Child Elements ---

         // --- Add class to the last field row for bottom border styling ---
         let lastFieldRowInInstance = null;
         // Find the last row within this instance that is a field row
         const instanceContentRows = tbody.querySelectorAll(`tr[data-instance-id="${instanceId}"]`);
         for (let i = instanceContentRows.length - 1; i >= 0; i--) {
             if (instanceContentRows[i].classList.contains('field-row')) {
                 lastFieldRowInInstance = instanceContentRows[i];
                 break; // Found the last field row
             }
             // Stop searching if we hit the instance header row or another instance's header
             if (instanceContentRows[i].classList.contains('occurrence-instance-row') || instanceContentRows[i].classList.contains('occurrence-row')) {
                 break;
             }
         }

         if (lastFieldRowInInstance) {
             // Remove class from any previous last row within this instance (if re-rendering/dynamic changes)
             const previousLast = tbody.querySelector(`.last-field-in-instance-${level + 1}[data-instance-id="${instanceId}"]`);
             if(previousLast) previousLast.classList.remove(`last-field-in-instance-${level + 1}`);

             // Add the level-specific class to the actual last field row
             lastFieldRowInInstance.classList.add(`last-field-in-instance-${level + 1}`);
             console.log(`Added last field class to row:`, lastFieldRowInInstance);
         }
         // --- End Adding Class ---


         // Return the last row added or managed by this call (could be a nested instance marker)
         // --- Add End Marker Row for the Instance ---
         const endMarkerRow = document.createElement('tr');
         endMarkerRow.classList.add('occurrence-instance-end-marker');
         endMarkerRow.dataset.instanceId = instanceId; // Link to the instance
         endMarkerRow.dataset.parentDefId = occurrenceDefId; // Link to parent definition type
         endMarkerRow.dataset.level = level + 1; // Same level as the instance header

         const endMarkerCell = document.createElement('td');
         endMarkerCell.colSpan = 4;
         endMarkerCell.style.paddingLeft = `${(level + 1) * 20}px`; // Indent like instance header
         endMarkerCell.style.height = '5px'; // Make it a thin line
         endMarkerCell.style.borderTop = '1px solid transparent'; // Add a thin top border
         // Background color will be set via CSS based on level

         endMarkerRow.appendChild(endMarkerCell);

         // Insert the end marker row after the last row of the instance content
         if (currentRow && currentRow.parentNode === tbody) {
             if (currentRow.nextSibling) {
                 tbody.insertBefore(endMarkerRow, currentRow.nextSibling);
             } else {
                 tbody.appendChild(endMarkerRow);
             }
         } else {
             // Fallback: append to the end if currentRow is invalid
             console.warn("Invalid currentRow for inserting end marker, appending to end.");
             tbody.appendChild(endMarkerRow);
         }
         // --- End Add End Marker Row ---


         // Return the end marker row as the absolute last row added by this call
         return endMarkerRow;
    },

    // Create appropriate input based on field type
    createFieldInput: function(field) {
        const fieldType = (field.fieldType || field.type || '').toLowerCase(); // Check both properties
        const fieldName = field.name;

        // For fields with predefined values (select dropdown)
        if (field.values && typeof field.values === 'string' && field.values.includes('=')) {
            const select = document.createElement('select');
            select.classList.add('config-field-input', 'form-control', 'form-control-sm'); // Add Bootstrap classes

            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- Seleccione --';
            select.appendChild(emptyOption);

            const valueLines = field.values.split('\n');
            valueLines.forEach(line => {
                const match = line.match(/([^\s=]+)\s*=\s*(.*)/); // More robust regex
                if (match) {
                    const value = match[1].trim();
                    const label = match[2].trim();
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = label ? `${value} - ${label}` : value; // Show value if label is empty
                    select.appendChild(option);
                }
            });
            return select;
        }

        // Default to text input
        const input = document.createElement('input');
        input.type = 'text';
        input.classList.add('config-field-input', 'form-control', 'form-control-sm'); // Add Bootstrap classes

        // Set maxLength if defined
        if (field.length) {
            input.maxLength = field.length;
        }

        // Basic placeholder
        input.placeholder = `Valor (max ${field.length || 'N/A'})`;

        // Specific handling for numeric types (using pattern for basic client-side hint)
        if (fieldType.includes('numerico') || fieldType.includes('numeric')) {
            input.pattern = '[0-9]*'; // Hint for numeric input
            input.placeholder = `Número (max ${field.length || 'N/A'} dígitos)`;
            // Add input event listener to strip non-numeric characters
            input.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        }

        // Special placeholders for date/time formats
        if (fieldName && fieldName.toUpperCase().includes('FECHA')) {
            input.placeholder = 'AAAAMMDD';
            if (field.length === 10 && field.fieldType === 'alfanumerico') { // Handle DD/MM/AAAA format if specified
                input.placeholder = 'DD/MM/AAAA';
                input.pattern = '\\d{2}/\\d{2}/\\d{4}'; // Basic pattern hint
            }
        } else if (fieldName && fieldName.toUpperCase().includes('HORA')) {
            input.placeholder = 'HHMMSS';
        }

        return input;
    },

    // Show selected config tab and hide others
    showConfigTab: function(tabName) {
        document.querySelectorAll('.config-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-config-tab') === tabName);
        });
        document.querySelectorAll('.config-tab-pane').forEach(tab => {
            tab.classList.toggle('active', tab.id === tabName);
        });
    },
    
    /**
     * Fetch header sample from the server for the current service
     * @returns {Promise<string|null>} Promise that resolves to the header sample string or null if not found
     */
    fetchHeaderSample: async function() {
        if (!this.currentServiceNumber) {
            console.warn("No hay servicio seleccionado para obtener header sample");
            return null;
        }

        console.log(`Buscando header sample para servicio ${this.currentServiceNumber}`);
        
        try {
            const response = await fetch(`/excel/header-sample/${this.currentServiceNumber}`);
            
            if (!response.ok) {
                console.warn(`No se encontró header sample para el servicio ${this.currentServiceNumber}, código: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            
            if (data && data.value) {
                console.log(`Header sample obtenido del servidor para servicio ${this.currentServiceNumber}:`, data.value);
                return data.value;
            }
            
            return null;
        } catch (error) {
            console.error(`Error al obtener header sample para el servicio ${this.currentServiceNumber}:`, error);
            return null;
        }
    },
    
    /**
     * Parse the header sample string based on the header structure
     * @param {string} headerSample - Raw header sample string
     * @returns {Object} Object with field values extracted from the sample
     */
    parseHeaderSample: function(headerSample) {
        if (!headerSample || !this.currentStructure || !this.currentStructure.header_structure) {
            console.warn("No se puede parsear header sample: falta header sample o estructura");
            return {};
        }
        
        console.log("Parseando header sample:", headerSample);
        
        const headerStructure = this.currentStructure.header_structure;
        const headerFields = headerStructure.fields || [];
        const parsedValues = {};
        
        let position = 0;
        
        headerFields.forEach(field => {
            // Skip non-data fields (special markers, comments, placeholder fields)
            if (!field.name || field.name === '*' || field.name === 'REQUERIMIENTO' || field.type === 'Longitud del CAMPO') {
                return;
            }
            
            // Skip CANAL field since we want to use the input value from the form
            if (field.name.toUpperCase() === 'CANAL') {
                position += parseInt(field.length || '0');
                console.log(`Campo CANAL ignorado: usando valor del input del formulario en su lugar`);
                return;
            }
            
            const fieldLength = parseInt(field.length || '0');
            if (fieldLength <= 0) {
                return;
            }
            
            // Extract the value from the header sample at current position
            const fieldValue = headerSample.substring(position, position + fieldLength).trim();
            
            // Store the parsed value
            parsedValues[field.name] = fieldValue;
            
            // Log the extraction for debugging
            console.log(`Campo: ${field.name}, Posición: ${position}, Longitud: ${fieldLength}, Valor extraído: '${fieldValue}'`);
            
            // Move the position forward by field length
            position += fieldLength;
        });
        
        return parsedValues;
    },

    // Auto-fill fields based on header sample data
    autoFillFields: async function() {
        if (!this.currentStructure) {
            showNotification('Seleccione un servicio primero', 'error');
            return;
        }
        
        console.log(`Iniciando auto-llenado para servicio ${this.currentServiceNumber}`);
        
        // Intentar obtener el header sample
        showNotification('Buscando datos de muestra para cabecera...', 'info');
        const headerSample = await this.fetchHeaderSample();
        
        if (!headerSample) {
            console.warn("No se encontró header sample, usando valores por defecto");
            showNotification('No se encontró muestra de cabecera, usando valores por defecto', 'warning');
            
            // Fallback al método anterior si no hay muestra disponible
            const headerInputs = document.querySelectorAll('#headerConfigTable .config-field-input');
            headerInputs.forEach(input => {
                this.autoFillInput(input);
            });
        } else {
            // Extraer valores de la muestra usando la estructura
            console.log("Parseando sample para extraer valores");
            const parsedValues = this.parseHeaderSample(headerSample);
            console.log("Valores extraídos del header sample:", parsedValues);
            
            // Aplicar los valores extraídos a los campos del formulario
            const headerInputs = document.querySelectorAll('#headerConfigTable .config-field-input');
            let fieldsPopulated = 0;
            
            headerInputs.forEach(input => {
                const fieldName = input.dataset.fieldName;
                if (fieldName && parsedValues[fieldName] !== undefined) {
                    input.value = parsedValues[fieldName];
                    fieldsPopulated++;
                    console.log(`Campo ${fieldName} llenado con valor: ${parsedValues[fieldName]}`);
                } else if (fieldName) {
                    // Si no hay valor en el sample para este campo, usar el método anterior
                    this.autoFillInput(input);
                    console.log(`Campo ${fieldName} llenado con valor por defecto (no encontrado en sample)`);
                }
            });
            
            showNotification(`Campos de cabecera llenados automáticamente. ${fieldsPopulated} campos desde muestra.`, 'success');
        }
    },
    
    // Generate an appropriate value for a field based on its properties
    autoFillInput: function(input) {
        const fieldName = input.dataset.fieldName || '';
        const fieldType = input.type;
        const maxLength = input.maxLength || 10;
        
        // Don't auto-fill select elements that already have a value
        if (input.tagName.toLowerCase() === 'select') {
            if (!input.value && input.options.length > 1) {
                // Select the first non-empty option
                for (let i = 1; i < input.options.length; i++) {
                    if (input.options[i].value) {
                        input.selectedIndex = i;
                        break;
                    }
                }
            }
            return;
        }
        
        // Generate value based on field name and type
        let value = '';
        
        // Use the canal value from the interface input
        if (fieldName.toUpperCase() === 'CANAL') {
            // Get canal value from the main interface input
            const mainCanalValue = this.canalInput.value.trim().toUpperCase() || 'ME';
            input.value = mainCanalValue;
            return;
        } else if (input.id === 'canalInput') {
            if (!input.value) {
                input.value = 'ME';
            }
            return;
        }
        
        // Handle date fields
        if (fieldName.toUpperCase().includes('FECHA')) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            
            if (input.placeholder === 'DD/MM/AAAA') {
                value = `${day}/${month}/${year}`;
            } else {
                value = `${year}${month}${day}`;
            }
        }
        // Handle time fields
        else if (fieldName.toUpperCase().includes('HORA')) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            value = `${hours}${minutes}${seconds}`;
        }
        // Handle numeric fields
        else if (input.pattern === '[0-9]*' || fieldType === 'number') {
            // Generate a numeric value of appropriate length
            const numLength = Math.min(maxLength, 9); // Avoid huge numbers
            value = Math.floor(Math.pow(10, numLength - 1) + Math.random() * 9 * Math.pow(10, numLength - 1)).toString();
            
            // Ensure it's not longer than maxLength
            if (value.length > maxLength) {
                value = value.substring(0, maxLength);
            }
        }
        // Handle text fields
        else {
            if (fieldName.toUpperCase().includes('NOMBRE')) {
                value = 'Pedro González';
            }
            else if (fieldName.toUpperCase().includes('APELLIDO')) {
                value = 'García';
            }
            else if (fieldName.toUpperCase().includes('DIRECC')) {
                value = 'Av. Corrientes 123';
            }
            else if (fieldName.toUpperCase().includes('MAIL')) {
                value = 'prueba@ejemplo.com';
            }
            else if (fieldName.toUpperCase().includes('TEL')) {
                value = '1123456789';
            }
            else {
                // Generic text field - use field name as a hint
                const fieldNameShort = fieldName.substring(0, Math.min(5, fieldName.length));
                value = `${fieldNameShort}_${Math.floor(Math.random() * 1000)}`;
            }
            
            // Ensure it's not longer than maxLength
            if (maxLength > 0 && value.length > maxLength) {
                value = value.substring(0, maxLength);
            }
        }
        
        input.value = value;
    },

    // Collect and save configuration
    saveConfiguration: function() {
        // Validate required inputs
        const canal = this.canalInput.value.trim().toUpperCase();
        if (!canal) {
            showNotification('Debe ingresar el canal (obligatorio)', 'error');
            this.canalInput.focus();
            return;
        }

        if (!this.currentServiceNumber) {
            showNotification('Debe seleccionar un servicio', 'error');
            this.serviceSelect.focus();
            return;
        }
        
        // Update version counter and display
        this.versionCounter++;
        const versionStr = `v${this.versionCounter}`;
        this.versionInput.value = versionStr;
        this.versionDisplay.textContent = versionStr;

        // Create configuration object
        const configuration = {
            serviceNumber: this.currentServiceNumber,
            serviceName: this.currentServiceName,
            canal: canal,
            version: versionStr,
            header: {},
            request: {}
        };

        // Collect header field values
        const headerInputs = document.querySelectorAll('#headerConfigTable .config-field-input');
        headerInputs.forEach(input => {
            const fieldName = input.dataset.fieldName;
            if (fieldName) {
                configuration.header[fieldName] = input.value || '';
            }
        });

        // Collect request data (handles nesting and occurrences)
        configuration.request = this.collectRequestData();

         // Optional: Log the collected data before sending
         console.log("Configuration to save:", JSON.stringify(configuration, null, 2));

        // Send configuration to server
        fetch('/service-config/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(configuration),
        })
        .then(response => {
            if (!response.ok) {
                 // Try to get error message from response body
                 return response.json().catch(() => ({ message: response.statusText })).then(errData => {
                     throw new Error(errData.message || `Error ${response.status} al guardar la configuración`);
                 });
            }
            return response.json();
        })
        .then(data => {
            showNotification(`Configuración guardada correctamente como: ${data.filename}`, 'success');
            // Refresh the saved configurations panel
            this.loadSavedConfigurations();
        })
        .catch(error => {
            console.error('Error saving configuration:', error);
            showNotification(`Error al guardar configuración: ${error.message}`, 'error');
        });
    },

    // Collect request data based on structure to preserve order
    // Create the saved configurations panel
    createSavedConfigurationsPanel: function() {
        // Check if panel already exists
        if (document.getElementById('savedConfigurationsPanel')) {
            return;
        }

        // Find the configuration container to append our panel
        const configContainer = document.querySelector('.config-container');
        if (!configContainer) {
            console.warn("No se encontró el contenedor de configuración");
            return;
        }

        // Create the panel container
        const panel = document.createElement('div');
        panel.id = 'savedConfigurationsPanel';
        panel.className = 'saved-configs-panel';
        panel.style.marginTop = '2rem';
        panel.style.padding = '1.5rem';
        panel.style.backgroundColor = '#f8fafc';
        panel.style.borderRadius = 'var(--radius)';
        panel.style.border = '1px solid var(--border-color)';

        // Create panel header
        const header = document.createElement('h3');
        header.textContent = 'Configuraciones Guardadas';
        header.style.marginBottom = '1rem';
        panel.appendChild(header);

        // Create search container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.style.marginBottom = '1rem';
        searchContainer.style.position = 'relative';

        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'configSearchInput';
        searchInput.className = 'form-control';
        searchInput.placeholder = 'Buscar configuración...';
        searchInput.style.padding = '0.625rem';
        searchInput.style.paddingRight = '2.5rem';
        searchInput.style.border = '1px solid var(--border-color)';
        searchInput.style.borderRadius = 'var(--radius)';
        searchInput.style.width = '100%';
        searchContainer.appendChild(searchInput);

        // Create search icon/button
        const searchIcon = document.createElement('span');
        searchIcon.innerHTML = '🔍';
        searchIcon.style.position = 'absolute';
        searchIcon.style.right = '0.75rem';
        searchIcon.style.top = '50%';
        searchIcon.style.transform = 'translateY(-50%)';
        searchIcon.style.pointerEvents = 'none';
        searchContainer.appendChild(searchIcon);

        panel.appendChild(searchContainer);

        // Create autocomplete results container
        const autoCompleteContainer = document.createElement('div');
        autoCompleteContainer.id = 'configAutocompleteResults';
        autoCompleteContainer.className = 'autocomplete-results';
        autoCompleteContainer.style.display = 'none';
        autoCompleteContainer.style.position = 'absolute';
        autoCompleteContainer.style.zIndex = '1000';
        autoCompleteContainer.style.width = '100%';
        autoCompleteContainer.style.maxHeight = '300px';
        autoCompleteContainer.style.overflowY = 'auto';
        autoCompleteContainer.style.backgroundColor = '#fff';
        autoCompleteContainer.style.border = '1px solid var(--border-color)';
        autoCompleteContainer.style.borderRadius = '0 0 var(--radius) var(--radius)';
        autoCompleteContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        searchContainer.appendChild(autoCompleteContainer);

        // Create configurations list container
        const configsList = document.createElement('div');
        configsList.id = 'savedConfigsList';
        configsList.className = 'saved-configs-list';
        configsList.style.maxHeight = '400px';
        configsList.style.overflowY = 'auto';
        panel.appendChild(configsList);

        // No configs placeholder
        const noConfigsMsg = document.createElement('p');
        noConfigsMsg.id = 'noConfigsMessage';
        noConfigsMsg.className = 'text-center';
        noConfigsMsg.style.fontStyle = 'italic';
        noConfigsMsg.style.color = 'var(--text-secondary)';
        noConfigsMsg.style.padding = '1.5rem 0';
        noConfigsMsg.textContent = 'No hay configuraciones guardadas.';
        configsList.appendChild(noConfigsMsg);

        // Add the panel to the config container
        configContainer.appendChild(panel);

        // Add event listener for the search input
        searchInput.addEventListener('input', this.handleConfigSearch.bind(this));
    },

    // Handle search input on the saved configurations panel
    handleConfigSearch: function(event) {
        const searchTerm = event.target.value.trim().toLowerCase();
        const autocompleteContainer = document.getElementById('configAutocompleteResults');
        
        // Get all configurations from the data attributes on the list items
        const allConfigs = Array.from(document.querySelectorAll('#savedConfigsList .saved-config-item'))
            .map(item => {
                return {
                    element: item,
                    serviceNumber: item.dataset.serviceNumber,
                    serviceName: item.dataset.serviceName,
                    canal: item.dataset.canal,
                    version: item.dataset.version,
                    filename: item.dataset.filename
                };
            });

        if (searchTerm === '') {
            // Hide autocomplete when search is empty
            autocompleteContainer.style.display = 'none';
            
            // Show all configurations in the main list
            allConfigs.forEach(config => {
                config.element.style.display = 'flex';
            });
            
            // Show/hide the "no configs" message
            document.getElementById('noConfigsMessage').style.display = 
                allConfigs.length > 0 ? 'none' : 'block';
                
            return;
        }

        // Filter configurations by search term
        const matchingConfigs = allConfigs.filter(config => {
            return config.serviceNumber.toLowerCase().includes(searchTerm) ||
                   config.serviceName.toLowerCase().includes(searchTerm) ||
                   config.canal.toLowerCase().includes(searchTerm) ||
                   config.version.toLowerCase().includes(searchTerm) ||
                   config.filename.toLowerCase().includes(searchTerm);
        });

        // Populate autocomplete results
        autocompleteContainer.innerHTML = '';
        
        if (matchingConfigs.length > 0) {
            autocompleteContainer.style.display = 'block';
            
            matchingConfigs.forEach(config => {
                const resultItem = document.createElement('div');
                resultItem.className = 'autocomplete-item';
                resultItem.style.padding = '0.5rem 1rem';
                resultItem.style.cursor = 'pointer';
                resultItem.style.borderBottom = '1px solid #eee';
                
                // Highlight the matching part
                const displayText = `${config.serviceNumber} - ${config.serviceName} (${config.canal} ${config.version})`;
                resultItem.textContent = displayText;
                
                // Add hover effect
                resultItem.addEventListener('mouseover', () => {
                    resultItem.style.backgroundColor = '#f1f5f9';
                });
                
                resultItem.addEventListener('mouseout', () => {
                    resultItem.style.backgroundColor = '';
                });
                
                // Handle click on autocomplete item
                resultItem.addEventListener('click', () => {
                    // Load this configuration
                    this.loadSavedConfiguration(config.filename);
                    
                    // Hide autocomplete and clear search
                    document.getElementById('configSearchInput').value = '';
                    autocompleteContainer.style.display = 'none';
                });
                
                autocompleteContainer.appendChild(resultItem);
            });
        } else {
            autocompleteContainer.style.display = 'block';
            
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.style.padding = '0.5rem 1rem';
            noResults.style.fontStyle = 'italic';
            noResults.style.color = 'var(--text-secondary)';
            noResults.textContent = 'No se encontraron configuraciones';
            
            autocompleteContainer.appendChild(noResults);
        }

        // Filter the main list as well
        allConfigs.forEach(config => {
            const matches = matchingConfigs.some(match => match.filename === config.filename);
            config.element.style.display = matches ? 'flex' : 'none';
        });
        
        // Show/hide the "no configs" message
        const visibleConfigs = allConfigs.filter(config => config.element.style.display !== 'none');
        document.getElementById('noConfigsMessage').style.display = 
            visibleConfigs.length > 0 ? 'none' : 'block';
    },

    // Load saved configurations and display them
    loadSavedConfigurations: function() {
        fetch('/service-config/list')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error ${response.status} al obtener configuraciones`);
                }
                return response.json();
            })
            .then(data => {
                const configsList = document.getElementById('savedConfigsList');
                const noConfigsMsg = document.getElementById('noConfigsMessage');
                
                if (!configsList) return;
                
                // Clear existing items except the "no configs" message
                Array.from(configsList.children).forEach(child => {
                    if (child !== noConfigsMsg) {
                        child.remove();
                    }
                });
                
                if (data.configs && Array.isArray(data.configs) && data.configs.length > 0) {
                    // Hide the "no configs" message
                    if (noConfigsMsg) noConfigsMsg.style.display = 'none';
                    
                    // Add each configuration to the list
                    data.configs.forEach(config => {
                        this.addConfigToList(config);
                    });
                } else {
                    // Show the "no configs" message
                    if (noConfigsMsg) noConfigsMsg.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error loading configurations:', error);
                showNotification(`Error al cargar configuraciones: ${error.message}`, 'error');
            });
    },

    // Add a configuration to the list
    addConfigToList: function(config) {
        const configsList = document.getElementById('savedConfigsList');
        if (!configsList) return;
        
        // Create configuration item
        const item = document.createElement('div');
        item.className = 'saved-config-item';
        item.dataset.serviceNumber = config.serviceNumber || '';
        item.dataset.serviceName = config.serviceName || '';
        item.dataset.canal = config.canal || '';
        item.dataset.version = config.version || '';
        item.dataset.filename = config.filename || '';
        
        // Style the item
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '0.75rem 1rem';
        item.style.margin = '0.5rem 0';
        item.style.backgroundColor = '#fff';
        item.style.border = '1px solid #e2e8f0';
        item.style.borderRadius = 'var(--radius)';
        item.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
        
        // Create info section
        const infoSection = document.createElement('div');
        infoSection.className = 'config-info';
        
        // Add service info
        const serviceName = document.createElement('div');
        serviceName.className = 'service-name';
        serviceName.style.fontWeight = '600';
        serviceName.textContent = `${config.serviceNumber} - ${config.serviceName}`;
        infoSection.appendChild(serviceName);
        
        // Add details
        const details = document.createElement('div');
        details.className = 'config-details';
        details.style.fontSize = '0.875rem';
        details.style.color = 'var(--text-secondary)';
        
        // Format date if available
        let dateStr = '';
        if (config.timestamp) {
            const date = new Date(config.timestamp);
            dateStr = date.toLocaleDateString('es-AR') + ' ' + date.toLocaleTimeString('es-AR');
        }
        
        details.textContent = `Canal: ${config.canal} | Versión: ${config.version} | ${dateStr}`;
        infoSection.appendChild(details);
        
        item.appendChild(infoSection);
        
        // Create actions section
        const actionsSection = document.createElement('div');
        actionsSection.className = 'config-actions';
        actionsSection.style.display = 'flex';
        actionsSection.style.gap = '0.5rem';
        
        // Load button
        const loadBtn = document.createElement('button');
        loadBtn.className = 'action-btn secondary-btn';
        loadBtn.textContent = 'Cargar';
        loadBtn.style.padding = '0.375rem 0.75rem';
        loadBtn.style.fontSize = '0.875rem';
        loadBtn.onclick = () => this.loadSavedConfiguration(config.filename);
        actionsSection.appendChild(loadBtn);
        
        item.appendChild(actionsSection);
        
        // Add the item to the list
        configsList.appendChild(item);
    },

    // Load a saved configuration
    loadSavedConfiguration: function(filename) {
        fetch(`/service-config/get/${filename}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error ${response.status} al obtener la configuración`);
                }
                return response.json();
            })
            .then(config => {
                // Show notification
                showNotification(`Configuración ${filename} cargada correctamente`, 'success');
                
                // TODO: Implement loading configuration into the form
                console.log("Configuración cargada:", config);
                
                // Find and select the service
                const serviceOption = Array.from(this.serviceSelect.options)
                    .find(option => option.value === config.serviceNumber);
                
                if (serviceOption) {
                    this.serviceSelect.value = config.serviceNumber;
                    // Trigger the change event to load the structure
                    this.serviceSelect.dispatchEvent(new Event('change'));
                    
                    // Wait a bit for the structure to load before filling values
                    setTimeout(() => {
                        // Set canal value
                        this.canalInput.value = config.canal || '';
                        
                        // Set version
                        this.versionInput.value = config.version || '';
                        this.versionDisplay.textContent = config.version || '';
                        
                        // Fill header fields if available
                        if (config.header) {
                            Object.entries(config.header).forEach(([fieldName, value]) => {
                                const input = document.querySelector(`#headerConfigTable .config-field-input[data-field-name="${fieldName}"]`);
                                if (input) input.value = value;
                            });
                        }
                        
                        // TODO: Fill request fields (more complex due to occurrences)
                        
                    }, 500); // Delay to ensure structure is loaded
                } else {
                    console.warn(`Servicio ${config.serviceNumber} no encontrado en la lista`);
                    showNotification(`El servicio ${config.serviceNumber} no está disponible`, 'error');
                }
            })
            .catch(error => {
                console.error('Error loading configuration:', error);
                showNotification(`Error al cargar configuración: ${error.message}`, 'error');
            });
    },

    collectRequestData: function() {
        if (!this.currentStructure || !this.currentStructure.service_structure || !this.currentStructure.service_structure.request) {
            console.error("No hay estructura válida para recolectar datos");
            return {};
        }
        
        const requestStructure = this.currentStructure.service_structure.request;
        const requestTbody = document.getElementById('requestConfigTable')?.querySelector('tbody');
        if (!requestTbody) return {};
        
        // Función para recolectar los valores de los campos del DOM
        const getFieldValueFromDOM = (fieldName) => {
            const input = requestTbody.querySelector(`.config-field-input[data-field-name="${fieldName}"]`);
            return input ? (input.value || "") : "";
        };
        
        // Función para obtener datos de una instancia específica
        const getInstanceFieldValue = (instanceId, fieldName) => {
            const input = requestTbody.querySelector(`tr[data-instance-id="${instanceId}"] .config-field-input[data-field-name="${fieldName}"]`);
            return input ? (input.value || "") : "";
        };
        
        // Función recursiva para procesar ocurrencias anidadas
        const processNestedOccurrence = (occurrenceField, instanceId) => {
            const nestedOccName = occurrenceField.id || occurrenceField.name;
            const result = [];
            
            // Buscar instancias de esta ocurrencia anidada
            const nestedInstanceRows = requestTbody.querySelectorAll(`tr.occurrence-instance-row[data-parent-def-id="${nestedOccName}"][data-instance-id*="${instanceId}"]`);
            
            if (nestedInstanceRows && nestedInstanceRows.length > 0) {
                // Procesar cada instancia anidada
                nestedInstanceRows.forEach(nestedInstanceRow => {
                    const nestedInstanceId = nestedInstanceRow.dataset.instanceId;
                    if (!nestedInstanceId) return;
                    
                    const nestedInstanceData = {};
                    
                    // Procesar campos de la instancia anidada
                    if (occurrenceField.fields && Array.isArray(occurrenceField.fields)) {
                        occurrenceField.fields.forEach(field => {
                            if (field.type !== 'occurrence' && field.name) {
                                nestedInstanceData[field.name] = getInstanceFieldValue(nestedInstanceId, field.name);
                            } else if (field.type === 'occurrence') {
                                // Procesar ocurrencias en un nivel más profundo (recursivo)
                                nestedInstanceData[field.id || field.name] = processNestedOccurrence(field, nestedInstanceId);
                            }
                        });
                    }
                    
                    result.push(nestedInstanceData);
                });
            } else {
                // No hay instancias, crear una vacía
                const emptyNestedInstance = {};
                
                if (occurrenceField.fields && Array.isArray(occurrenceField.fields)) {
                    occurrenceField.fields.forEach(field => {
                        if (field.type !== 'occurrence' && field.name) {
                            emptyNestedInstance[field.name] = "";
                        } else if (field.type === 'occurrence') {
                            // Incluir ocurrencia anidada vacía
                            emptyNestedInstance[field.id || field.name] = [];
                        }
                    });
                }
                
                // Solo agregar la instancia vacía si tiene al menos un campo
                if (Object.keys(emptyNestedInstance).length > 0) {
                    result.push(emptyNestedInstance);
                }
            }
            
            return result;
        };
        
        // Preservamos la estructura original del JSON
        const buildStructuredJSON = () => {
            // Resultado final en el orden exacto definido por los índices
            const result = {};
            
            // Primero obtenemos todos los elementos en un arreglo y los ordenamos por índice
            const elements = requestStructure.elements || [];
            
            // Ordenar elementos por índice para mantener el orden original
            const sortedElements = [...elements].sort((a, b) => {
                const indexA = typeof a.index === 'number' ? a.index : Infinity;
                const indexB = typeof b.index === 'number' ? b.index : Infinity;
                return indexA - indexB;
            });
            
            // Procesamos cada elemento (campos y ocurrencias de primer nivel)
            sortedElements.forEach(element => {
                // Para campos simples de primer nivel
                if (element.type === 'field' && element.name) {
                    result[element.name] = getFieldValueFromDOM(element.name);
                }
                // Para ocurrencias de primer nivel
                else if (element.type === 'occurrence') {
                    const occName = element.name || element.id || `occurrence_${element.index}`;
                    
                    // Almacenar el contador de ocurrencias si existe
                    if (element.countField) {
                        // Buscar el campo de contador en el DOM
                        const countFieldValue = getFieldValueFromDOM(element.countField);
                        // Si existe, guardarlo antes de la ocurrencia
                        if (countFieldValue) {
                            result[element.countField] = countFieldValue;
                        }
                    }
                    
                    // Inicializar el array para esta ocurrencia
                    result[occName] = [];
                    
                    // Buscar instancias de esta ocurrencia
                    const occDefId = element.id;
                    const instanceRows = requestTbody.querySelectorAll(`tr.occurrence-instance-row[data-parent-def-id="${occDefId}"]`);
                    
                    // Si hay instancias, procesarlas
                    if (instanceRows && instanceRows.length > 0) {
                        instanceRows.forEach(instanceRow => {
                            const instanceId = instanceRow.dataset.instanceId;
                            if (!instanceId) return;
                            
                            // Creamos la instancia
                            const instanceData = {};
                            
                            // Procesamos los campos de la instancia ordenados por índice
                            if (element.fields && Array.isArray(element.fields)) {
                                // Ordenar campos por índice
                                const sortedFields = [...element.fields].sort((a, b) => {
                                    const indexA = typeof a.index === 'number' ? a.index : Infinity;
                                    const indexB = typeof b.index === 'number' ? b.index : Infinity;
                                    return indexA - indexB;
                                });
                                
                                // Iteramos sobre los campos en el orden original según índice
                                sortedFields.forEach(field => {
                                    // Para campos normales
                                    if (field.type !== 'occurrence' && field.name) {
                                        instanceData[field.name] = getInstanceFieldValue(instanceId, field.name);
                                    }
                                    // Para ocurrencias anidadas
                                    else if (field.type === 'occurrence') {
                                        const nestedOccName = field.name || field.id || `nested_${field.index}`;
                                        // Usar la función recursiva para procesar ocurrencias anidadas
                                        instanceData[nestedOccName] = processNestedOccurrence(field, instanceId);
                                    }
                                });
                            }
                            
                            result[occName].push(instanceData);
                        });
                    } 
                    // Si no hay instancias y es obligatorio tener al menos una, crear una vacía
                    else if (element.required || element.count > 0) {
                        const emptyInstance = {};
                        
                        // Procesamos los campos de la instancia ordenados por índice
                        if (element.fields && Array.isArray(element.fields)) {
                            // Ordenar campos por índice
                            const sortedFields = [...element.fields].sort((a, b) => {
                                const indexA = typeof a.index === 'number' ? a.index : Infinity;
                                const indexB = typeof b.index === 'number' ? b.index : Infinity;
                                return indexA - indexB;
                            });
                            
                            // Iteramos sobre los campos en el orden original según índice
                            sortedFields.forEach(field => {
                                // Para campos normales
                                if (field.type !== 'occurrence' && field.name) {
                                    emptyInstance[field.name] = "";
                                }
                                // Para ocurrencias anidadas
                                else if (field.type === 'occurrence') {
                                    const nestedOccName = field.name || field.id || `nested_${field.index}`;
                                    // Crear lista vacía para ocurrencia anidada
                                    emptyInstance[nestedOccName] = [];
                                    
                                    // Si la ocurrencia anidada es obligatoria, crear una instancia vacía
                                    if (field.required || field.count > 0) {
                                        const emptyNestedInstance = {};
                                        
                                        // Procesar los campos de la ocurrencia anidada
                                        if (field.fields && Array.isArray(field.fields)) {
                                            field.fields.forEach(nestedField => {
                                                if (nestedField.name) {
                                                    emptyNestedInstance[nestedField.name] = "";
                                                }
                                            });
                                        }
                                        
                                        // Solo agregar si tiene al menos un campo
                                        if (Object.keys(emptyNestedInstance).length > 0) {
                                            emptyInstance[nestedOccName].push(emptyNestedInstance);
                                        }
                                    }
                                }
                            });
                        }
                        
                        // Solo agregar la instancia vacía si tiene al menos un campo
                        if (Object.keys(emptyInstance).length > 0) {
                            result[occName].push(emptyInstance);
                        }
                    }
                }
            });
            
            return result;
        };
        
        // Construir un objeto con el orden exacto de los elementos en la estructura
        const result = buildStructuredJSON();
        console.log("Collected request data:", result);
        return result;
    }


};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    ConfigManager.init();
});

// Helper function for notifications (assuming you have an element with id="notification")
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.warn("Notification element not found!");
        alert(`${type}: ${message}`); // Fallback to alert
        return;
    }
    notification.textContent = message;
    // Use class names for styling (e.g., Bootstrap alert classes)
    notification.className = `notification alert alert-${type || 'success'}`;
    notification.style.display = 'block';
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.right = '10px';
    notification.style.zIndex = '1050'; // Ensure visibility

    // Hide notification after 5 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}
