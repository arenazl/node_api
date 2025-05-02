/**
 * Configuration Occurrence Handler
 * 
 * Handles the creation, rendering, and management of occurrences and their instances
 */

const ConfigOccurrenceHandler = {
    occurrenceCounter: 0,
    
    /**
     * Process elements recursively to handle occurrences and nested structures
     * @param {Array} elements - Array of structure elements to process
     * @param {HTMLElement} tbody - Table body to add rows to
     * @param {string} section - Section identifier ('request')
     * @param {number} level - Nesting level (0 for top level)
     * @param {string} parentId - Optional parent ID for nested elements
     */
    processElements: function(elements, tbody, section, level, parentId = '') {
        if (!elements || !Array.isArray(elements)) {
            console.warn("Attempting to process invalid elements:", elements);
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
            // Fallback if indices are the same or missing
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
                this._createFieldRow(element, tbody, level, elementId, section);
            } else if (element.type === 'occurrence') {
                this._createOccurrenceRow(element, tbody, section, level, elementId);
            } else {
                console.warn(`Element type '${element.type}' not recognized.`, element);
            }
        });
    },

    /**
     * Creates a row for a field
     * @param {Object} element - Field element from structure
     * @param {HTMLElement} tbody - Table body to add row to
     * @param {number} level - Nesting level 
     * @param {string} elementId - Unique element ID
     * @param {string} section - Section identifier ('request')
     * @private
     */
    _createFieldRow: function(element, tbody, level, elementId, section) {
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
        const input = ConfigUtils.createFieldInput(element);
        input.dataset.fieldName = element.name; // Critical for data collection
        input.dataset.section = section; // request or header
        input.dataset.elementId = elementId; // Link input to its definition row
        input.dataset.level = level; // Store level on input too if needed later
        valueCell.appendChild(input);
        row.appendChild(valueCell);

        tbody.appendChild(row);
    },

    /**
     * Creates a header row for an occurrence
     * @param {Object} element - Occurrence element from structure
     * @param {HTMLElement} tbody - Table body to add row to
     * @param {string} section - Section identifier ('request')
     * @param {number} level - Nesting level
     * @param {string} elementId - Unique element ID
     * @private
     */
    _createOccurrenceRow: function(element, tbody, section, level, elementId) {
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
            self.addOccurrenceInstance(targetElementDef, targetOccDefId, tbody, section, level, lastRowOfOccurrence);
        });

        occNameCell.appendChild(addBtn);
        occRow.appendChild(occNameCell);
        tbody.appendChild(occRow);

        // Add the first instance of this occurrence automatically
        console.log(`Adding first instance for ${occurrenceDefId} automatically.`);
        this.addOccurrenceInstance(element, occurrenceDefId, tbody, section, level, occRow); // Insert after the header row
    },

    /**
     * Adds a new instance of an occurrence to the table
     * @param {object} occurrenceElement - Structure object defining the occurrence
     * @param {string} occurrenceDefId - ID defining the *type* of occurrence
     * @param {HTMLTableSectionElement} tbody - Table body to add rows to
     * @param {string} section - Section identifier ('request')
     * @param {number} level - Nesting level of the occurrence definition row
     * @param {HTMLTableRowElement} insertAfterRow - Row after which the new instance should be inserted
     * @returns {HTMLTableRowElement|null} Last row element added by this function
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
            // Fallback: append to the end if anchor is invalid
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
                    const input = ConfigUtils.createFieldInput(element);
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
    }
};
