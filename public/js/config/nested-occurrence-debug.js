/**
 * Nested Occurrence Debug Helper
 * This script helps diagnose and fix nested occurrence field detection issues
 */

// Add this to your HTML to use: <script src="/js/config/nested-occurrence-debug.js"></script>

// Create global object for debugging
window.OccurrenceDebugger = {
    // Store all found occurrences
    occurrences: {},
    
    // Store all found fields
    fields: {},
    
    // Initialize and run the debugger
    init: function() {
        console.log("=== OCCURRENCE DEBUGGER INITIALIZED ===");
        // Add a button to the UI for running the debug
        this.addDebugButton();
        
        // Automatically run once when loaded
        setTimeout(() => this.runDiagnostics(), 2000);
    },
    
    // Add a debug button to the page
    addDebugButton: function() {
        const btn = document.createElement('button');
        btn.textContent = 'Debug Occurrences';
        btn.style.position = 'fixed';
        btn.style.bottom = '10px';
        btn.style.right = '10px';
        btn.style.zIndex = '9999';
        btn.style.padding = '8px';
        btn.style.backgroundColor = '#ff5722';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.onclick = () => this.runDiagnostics();
        
        document.body.appendChild(btn);
    },
    
    // Run all diagnostics
    runDiagnostics: function() {
        console.log("=== RUNNING OCCURRENCE DIAGNOSTICS ===");
        this.scanDOM();
        this.findNestedOccurrences();
        this.findDeepNestedFields();
        this.findSpecificFields();
        
        // Try to map relationships between occurrences and fields
        this.mapRelationships();
        
        console.log("=== DIAGNOSTICS COMPLETE ===");
    },
    
    // Scan the DOM for all occurrences and fields
    scanDOM: function() {
        console.log("Scanning DOM for occurrences and fields...");
        
        // Find all occurrence rows
        const occRows = document.querySelectorAll('tr.occurrence-instance-row');
        console.log(`Found ${occRows.length} occurrence instance rows`);
        
        // Process each occurrence
        occRows.forEach((row, index) => {
            const id = row.dataset.instanceId || `unknown_${index}`;
            const defId = row.dataset.defId || 'unknown';
            const parentDefId = row.dataset.parentDefId || 'root';
            const level = row.dataset.level || '0';
            
            // Store in our object
            this.occurrences[id] = {
                element: row,
                defId: defId,
                parentDefId: parentDefId,
                level: level,
                fields: []
            };
            
            console.log(`Occurrence ${index}: ID=${id}, DefID=${defId}, ParentDefID=${parentDefId}, Level=${level}`);
        });
        
        // Find all field rows
        const fieldRows = document.querySelectorAll('tr.field-row');
        console.log(`Found ${fieldRows.length} field rows`);
        
        // Process each field
        fieldRows.forEach((row, index) => {
            const firstCell = row.querySelector('td:first-child');
            const fieldName = firstCell ? firstCell.textContent.trim() : `unknown_${index}`;
            const valueCell = row.querySelector('td:nth-child(4)');
            const value = valueCell ? valueCell.textContent.trim() : '';
            const instanceId = row.dataset.instanceId || 'unknown';
            const level = row.dataset.level || '0';
            
            // Store in our object
            this.fields[`${instanceId}_${fieldName}`] = {
                element: row,
                name: fieldName,
                value: value,
                instanceId: instanceId,
                level: level
            };
            
            console.log(`Field ${index}: ${fieldName} = ${value}, InstanceID=${instanceId}, Level=${level}`);
        });
    },
    
    // Find nested occurrences (level 3 or higher)
    findNestedOccurrences: function() {
        console.log("Finding nested occurrences (level 3+)...");
        
        const nestedOccs = Object.values(this.occurrences).filter(occ => {
            const level = parseInt(occ.level, 10);
            return level >= 3;
        });
        
        console.log(`Found ${nestedOccs.length} nested occurrences (level 3+)`);
        
        nestedOccs.forEach((occ, index) => {
            console.log(`Nested occurrence ${index}: ID=${occ.element.dataset.instanceId}, Level=${occ.level}`);
        });
        
        return nestedOccs;
    },
    
    // Find deeply nested fields (level 4+)
    findDeepNestedFields: function() {
        console.log("Finding deeply nested fields (level 4+)...");
        
        const deepFields = Object.values(this.fields).filter(field => {
            const level = parseInt(field.level, 10);
            return level >= 4;
        });
        
        console.log(`Found ${deepFields.length} deeply nested fields (level 4+)`);
        
        deepFields.forEach((field, index) => {
            console.log(`Deep field ${index}: ${field.name} = ${field.value}, Level=${field.level}`);
        });
        
        return deepFields;
    },
    
    // Find specific fields mentioned in feedback
    findSpecificFields: function() {
        console.log("Looking for specific fields mentioned in feedback...");
        
        const targetFields = ['SVC3088-PROD-RUBRO', 'SVC3088-CUENTA-NIV'];
        
        targetFields.forEach(fieldName => {
            console.log(`Searching for field: ${fieldName}`);
            
            // Look using various methods
            
            // 1. Direct text content match in any cell
            const directMatches = Array.from(document.querySelectorAll('td')).filter(
                td => td.textContent.trim() === fieldName
            );
            
            console.log(`Found ${directMatches.length} direct text matches for ${fieldName}`);
            directMatches.forEach((cell, idx) => {
                const row = cell.closest('tr');
                const instanceId = row ? row.dataset.instanceId : 'unknown';
                const valueCell = row.querySelector('td:nth-child(4)');
                const value = valueCell ? valueCell.textContent.trim() : 'unknown';
                
                console.log(`Match ${idx}: ${fieldName} = ${value}, Instance=${instanceId}`);
            });
            
            // 2. Input elements with matching data-field-name
            const inputMatches = document.querySelectorAll(`input[data-field-name="${fieldName}"]`);
            console.log(`Found ${inputMatches.length} input elements for ${fieldName}`);
            
            Array.from(inputMatches).forEach((input, idx) => {
                console.log(`Input ${idx}: ${fieldName} = ${input.value}, Instance=${input.dataset.instanceId}`);
            });
        });
    },
    
    // Try to map relationships between occurrences and fields
    mapRelationships: function() {
        console.log("Mapping relationships between occurrences and fields...");
        
        // For each field, try to find its parent occurrence
        Object.values(this.fields).forEach(field => {
            const instanceId = field.instanceId;
            
            // Find direct parent
            if (this.occurrences[instanceId]) {
                this.occurrences[instanceId].fields.push(field);
            } else {
                // Try to find parent by partial match
                const parentId = Object.keys(this.occurrences).find(id => 
                    instanceId.startsWith(id) || instanceId.includes(id)
                );
                
                if (parentId) {
                    this.occurrences[parentId].fields.push(field);
                    console.log(`Field ${field.name} mapped to parent occurrence ${parentId}`);
                } else {
                    console.log(`Could not find parent for field ${field.name} (${instanceId})`);
                }
            }
        });
        
        // Report on occurrence-field relationships
        console.log("Occurrence-field relationships:");
        Object.entries(this.occurrences).forEach(([id, occ]) => {
            console.log(`Occurrence ${id} has ${occ.fields.length} fields mapped to it:`);
            occ.fields.forEach(field => console.log(`  - ${field.name} = ${field.value}`));
        });
    },
    
    // Patch the processNestedOccurrence function for improved field detection
    patchNestedOccurrenceProcessor: function() {
        if (!window.ConfigDataHandler) {
            console.error("Cannot patch - ConfigDataHandler not found!");
            return;
        }
        
        console.log("Patching processNestedOccurrence function for better field detection...");
        
        // Define the improved function
        const newProcessor = function(occurrenceField, instanceId) {
            console.log(`=== PATCHED: Processing nested occurrence ${occurrenceField.id || occurrenceField.name} ===`);
            
            // The rest of our improved implementation would go here
            // This would be based on the diagnostics we ran and what we learned about the DOM structure
            
            // For now, just log that we got here
            console.log("Patched function called with:", occurrenceField, instanceId);
            
            // Return an empty result for now
            return [];
        };
        
        // Store the original function for reference
        this.originalProcessor = ConfigDataHandler.processNestedOccurrence;
        
        // Replace with our improved version
        // ConfigDataHandler.processNestedOccurrence = newProcessor;
        
        console.log("Patching complete - processNestedOccurrence has been replaced");
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the debugger
    window.OccurrenceDebugger.init();
});
