/**
 * Configuration Utilities
 * 
 * Shared utility functions used across configuration modules
 */

const ConfigUtils = {
    // Normalize strings (remove accents and convert to lowercase)
    normalizeString: function(str) {
        if (!str) return '';
        
        // Convert to lowercase
        const lowerCase = str.toLowerCase();
        
        // Remove accents
        return lowerCase.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    },

    // Helper function for notifications using SweetAlert2 (preferido) o Toastr
    showNotification: function(message, type, useSweetAlert = false) {
        // Para errores, mostrar solo en consola
        if (type === 'error') {
            console.error(`Error: ${message}`);
            return;
        }
        
        // Si se solicita específicamente usar SweetAlert o es un warning sobre el Excel
        const forceSweetAlert = useSweetAlert || 
                               (type === 'warning' && (message.includes('tercera solapa') || 
                                                      message.includes('pestaña de cabecera') || 
                                                      message.includes('Excel no tiene') || 
                                                      message.includes('header sample') || 
                                                      message.includes('estructura vacía') || 
                                                      message.includes('estructura incompleta') ||
                                                      message.includes('Estructura de cabecera') ||
                                                      message.includes('Estructura de servicio')));
        
        // Usar SweetAlert2 si está disponible Y se solicita su uso O no está disponible Toastr
        if ((typeof Swal !== 'undefined' && forceSweetAlert) || 
            (typeof Swal !== 'undefined' && typeof toastr === 'undefined')) {
            // Asegurarse de que type sea un valor válido
            let iconType = type || 'info';
            // Mapear tipos a los iconos válidos de SweetAlert2
            if (iconType === 'success') iconType = 'success';
            else if (iconType === 'warning') iconType = 'warning';
            else iconType = 'info'; // Valor por defecto
            
            // Determinar título según el tipo
            let title = iconType.charAt(0).toUpperCase() + iconType.slice(1);
            if (iconType === 'warning' && message.includes('tercera solapa')) {
                title = 'Advertencia: Excel incompleto';
            }
            
            // Determinar si debemos usar HTML (para mensajes con formato)
            const useHtml = message.includes('<br>') || message.includes('<strong>') || 
                           message.includes('<u>') || message.includes('<li>');
            
            Swal.fire({
                title: title,
                [useHtml ? 'html' : 'text']: message,
                icon: iconType,
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#2563eb'
            });
            return;
        }
        
        // Usar Toastr si está disponible y no se ha forzado SweetAlert
        if (typeof toastr !== 'undefined' && !forceSweetAlert) {
            // Configuración de Toastr
            toastr.options = {
                closeButton: true,
                progressBar: true,
                positionClass: "toast-top-right",
                timeOut: 5000,
                extendedTimeOut: 2000,
                preventDuplicates: false,
                newestOnTop: true,
                showEasing: "swing",
                hideEasing: "linear",
                showMethod: "fadeIn",
                hideMethod: "fadeOut"
            };
            
            // Usar el método apropiado según el tipo (ya no incluimos error)
            switch (type) {
                case 'success':
                    toastr.success(message, 'Éxito');
                    break;
                case 'warning':
                    toastr.warning(message, 'Advertencia');
                    break;
                default:
                    toastr.info(message, 'Información');
            }
            return;
        }
        
        // Si no hay bibliotecas de notificación, usar el método original
        const notification = document.getElementById('notification');
        if (!notification) {
            console.warn("Notification element not found!");
            alert(`${type}: ${message}`); // Fallback a alert como último recurso
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
    },

    // Creates an appropriate input based on field type
    createFieldInput: function(field) {
        const fieldType = (field.fieldType || field.type || '').toLowerCase(); // Check both properties
        const fieldName = field.name;
        const fieldValues = field.values || '';
        const fieldDescription = field.description || '';

        // For fields with predefined values (select dropdown)
        if (fieldValues && typeof fieldValues === 'string' && fieldValues.includes('=')) {
            const select = document.createElement('select');
            select.classList.add('config-field-input', 'form-control', 'form-control-sm'); // Add Bootstrap classes

            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- Seleccione --';
            select.appendChild(emptyOption);

            const valueLines = fieldValues.split('\n');
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

        // Check if the field is a date field with DD.MM.YYYY format
        const isDDMMYYYYFormat = (fieldDescription && fieldDescription.includes('(DD.MM.YYYY)')) || 
                                (fieldValues && fieldValues.includes('(DD.MM.YYYY)'));
        
        // Check if the field is a date field with DD/MM/AAAA format
        const isDDMMAAAAFormat = (field.length === 10 && 
                                (fieldName.toUpperCase().includes('FECHA') || 
                                fieldDescription.includes('DD/MM/AAAA')));

        // Normalize field type for comparison (remove accents, convert to lowercase)
        const normalizedType = this.normalizeString(fieldType);
        
        // Exact matching for field types to avoid "alfanumerico" matching "numerico"
        const isNumeric = normalizedType === 'numerico' || normalizedType === 'numeric';
        
        // Determine if field is alphanumeric (exact matching)
        const isAlphanumeric = normalizedType === 'alfanumerico' || normalizedType === 'alphanumeric';
                
        // Set properties based on field type
        if (isNumeric) {
            input.setAttribute('data-field-type', 'numeric');
            input.placeholder = `Número (max ${field.length || 'N/A'} dígitos)`;
            input.pattern = '[0-9]*'; // HTML5 pattern for numeric validation
        } else if (isAlphanumeric) {
            input.setAttribute('data-field-type', 'alphanumeric');
            input.placeholder = `Texto (max ${field.length || 'N/A'} caracteres)`;
        } else if (isDDMMYYYYFormat) {
            input.setAttribute('data-field-type', 'date-dots');
            input.placeholder = 'DD.MM.YYYY';
            input.pattern = '\\d{2}\\.\\d{2}\\.\\d{4}';
        } else if (isDDMMAAAAFormat) {
            input.setAttribute('data-field-type', 'date-slashes');
            input.placeholder = 'DD/MM/AAAA';
            input.pattern = '\\d{2}/\\d{2}/\\d{4}';
        } else if (fieldName && fieldName.toUpperCase().includes('FECHA')) {
            input.setAttribute('data-field-type', 'date-compact');
            input.placeholder = 'AAAAMMDD';
        } else if (fieldName && fieldName.toUpperCase().includes('HORA')) {
            input.setAttribute('data-field-type', 'time');
            input.placeholder = 'HHMMSS';
        }

        // Handle date fields with different formats
        if (isDDMMYYYYFormat) {
            // Add input event listener to enforce DD.MM.YYYY format
            input.addEventListener('input', function(e) {
                let value = this.value.replace(/[^0-9.]/g, ''); // Allow only digits and dots
                
                // Auto-add dots after day and month
                if (value.length > 2 && value.charAt(2) !== '.') {
                    if (value.length === 3) {
                        value = value.substring(0, 2) + '.' + value.substring(2);
                    } else {
                        value = value.substring(0, 2) + '.' + value.substring(2).replace(/\./g, '');
                    }
                }
                if (value.length > 5 && value.charAt(5) !== '.') {
                    if (value.length === 6) {
                        value = value.substring(0, 5) + '.' + value.substring(5);
                    } else {
                        value = value.substring(0, 5) + '.' + value.substring(5).replace(/\./g, '');
                    }
                }

                // Enforce max length of 10 (DD.MM.YYYY)
                if (value.length > 10) {
                    value = value.substring(0, 10);
                }
                
                this.value = value;
            });
        }
        // Handle standard date formats
        else if (isDDMMAAAAFormat) {
            // Add input event listener to enforce DD/MM/AAAA format
            input.addEventListener('input', function(e) {
                let value = this.value.replace(/[^0-9/]/g, ''); // Allow only digits and slashes
                
                // Auto-add slashes after day and month
                if (value.length > 2 && value.charAt(2) !== '/') {
                    if (value.length === 3) {
                        value = value.substring(0, 2) + '/' + value.substring(2);
                    } else {
                        value = value.substring(0, 2) + '/' + value.substring(2).replace(/\//g, '');
                    }
                }
                if (value.length > 5 && value.charAt(5) !== '/') {
                    if (value.length === 6) {
                        value = value.substring(0, 5) + '/' + value.substring(5);
                    } else {
                        value = value.substring(0, 5) + '/' + value.substring(5).replace(/\//g, '');
                    }
                }

                // Enforce max length of 10 (DD/MM/AAAA)
                if (value.length > 10) {
                    value = value.substring(0, 10);
                }
                
                this.value = value;
            });
        }
        // Handle numeric fields 
        else if (isNumeric) {
            // Add input, change, and blur events to enforce numeric input
            input.addEventListener('input', function() {
                const originalValue = this.value;
                const numericValue = this.value.replace(/[^0-9]/g, '');
                
                if (originalValue !== numericValue) {
                    // If non-numeric characters were stripped, update the input
                    this.value = numericValue;
                    
                    // Alert the user
                    if (originalValue.length > 0) {
                        console.warn(`Valor no numérico detectado y corregido en campo: ${fieldName}`);
                    }
                }
            });
            
            // Also validate on blur for good measure
            input.addEventListener('blur', function() {
                if (!/^\d*$/.test(this.value)) {
                    this.value = this.value.replace(/[^0-9]/g, '');
                }
            });
        }

        return input;
    },

    /**
     * Checks if an instance is empty (all fields have no value)
     * @param {Object} instance - Instance to check
     * @returns {boolean} true if all fields are empty, false if at least one field has a value
     */
    isEmptyInstance: function(instance) {
        // If no instance or not an object, consider it empty
        if (!instance || typeof instance !== 'object') return true;
        
        // Check each field in the instance
        for (const key in instance) {
            const value = instance[key];
            
            // If it's an array (possible nested occurrence)
            if (Array.isArray(value)) {
                // If it has any non-empty item, the instance is not empty
                const hasNonEmptyItem = value.some(item => !this.isEmptyInstance(item));
                if (hasNonEmptyItem) return false;
            } 
            // If it's a simple value and not empty
            else if (value && typeof value === 'string' && value.trim() !== '') {
                return false;
            }
        }
        
        // If we didn't find any non-empty value, the instance is empty
        return true;
    },

    // Get today's date in YYYYMMDD format
    getTodayFormatted: function() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    },

    // Get current time in HHMMSS format
    getCurrentTimeFormatted: function() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${hours}${minutes}${seconds}`;
    }
};
