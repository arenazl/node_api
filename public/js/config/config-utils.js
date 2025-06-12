/**
 * Utilidades de configuración y notificaciones
 * Funciones compartidas para la interfaz de usuario
 */

// ConfigUtils module loaded

// Sistema de deduplicación de notificaciones
const NotificationDeduplicator = {
    recentNotifications: new Map(),
    
    // Limpiar notificaciones antiguas cada 10 segundos
    cleanupInterval: setInterval(() => {
        const now = Date.now();
        const expireTime = 5000; // 5 segundos para considerar una notificación como antigua
        
        for (const [key, timestamp] of NotificationDeduplicator.recentNotifications.entries()) {
            if (now - timestamp > expireTime) {
                NotificationDeduplicator.recentNotifications.delete(key);
            }
        }
    }, 10000),
    
    isDuplicate: function(message, type) {
        const key = `${type}:${message}`;
        const now = Date.now();
        const lastShown = this.recentNotifications.get(key);
        
        // Si la misma notificación se mostró hace menos de 3 segundos, es duplicada
        if (lastShown && (now - lastShown) < 3000) {
            return true;
        }
        
        // Registrar esta notificación
        this.recentNotifications.set(key, now);
        return false;
    }
};

// Objeto global para utilidades de configuración
const ConfigUtils = {
    /**
     * Normaliza el tipo de campo para usarlo en validaciones
     * @param {Object|HTMLElement} field - Definición del campo o elemento DOM
     * @returns {string} - Tipo normalizado: 'numerico', 'alfanumerico', 'fecha', 'lista'
     */
    normalizeFieldType: function(field) {
        // Si es un elemento DOM, extraer información del DOM
        if (field instanceof HTMLElement) {
            const fieldName = field.dataset.fieldName || '';
            const rowElement = field.closest('tr');
            let fieldValues = '';
            let fieldType = '';

            if (rowElement) {
                const valuesCell = rowElement.querySelector('td:nth-child(6)');
                const typeCell = rowElement.querySelector('td:nth-child(2)');

                if (valuesCell) fieldValues = valuesCell.textContent.trim();
                if (typeCell) fieldType = typeCell.textContent.trim().toLowerCase();
            }

            // Crear objeto field para usar la lógica existente
            field = {
                name: fieldName,
                values: fieldValues,
                type: fieldType,
                pattern: field.pattern,
                inputMode: field.inputMode
            };
        }

        // También detectar desde propiedades del input DOM
        if (field.pattern === '[0-9]*' || field.inputMode === 'numeric') {
            return 'numerico';
        }
        // Verificar si tiene lista de valores definidos (opciones)
        if (field.values && Array.isArray(field.values)) {
            return 'lista';
        }

        // Verificar si tiene valores en formato string que parecen una lista
        if (field.values && typeof field.values === 'string') {
            const valueStr = field.values.trim();
            const hasMultipleLines = valueStr.includes('\n');
            const hasMultipleOptions = valueStr.split(',').length > 1;
            const hasCodeFormat = valueStr.split(/\n/).filter(line => /^\d+[-=]/.test(line.trim())).length > 0 ||
                                 valueStr.match(/\d+[-=]/) !== null;

            if (hasMultipleLines || hasMultipleOptions || hasCodeFormat) {
                return 'lista';
            }
        }

        // Verificar por formato de fecha en campo values o en el nombre
        if (field.values && typeof field.values === 'string') {
            const valueStr = field.values.trim();
            if (valueStr.includes('DD/MM') ||
                valueStr.includes('DD-MM') ||
                valueStr.includes('MM/DD') ||
                valueStr.includes('AAAA') ||
                valueStr.includes('MM/AAAA')) {
                return 'fecha';
            }
        }

        // Verificar por nombre del campo para detectar campos de fecha
        if (field.name) {
            const name = field.name.toLowerCase();
            if (name.includes('fecha') || name.includes('date') || name.includes('fec-') ||
                name.includes('-fec') || name.includes('-fecha') || name.includes('fecha-')) {
                return 'fecha';
            }
        }

        // Priorizar el tipo explícito si está definido
        if (field.fieldType) {
            const type = field.fieldType.toLowerCase();
            if (type === 'numerico' || type === 'numeric' || type === 'number') {
                return 'numerico';
            }
            if (type === 'alfanumerico' || type === 'alphanumeric' || type === 'string') {
                return 'alfanumerico';
            }
            if (type === 'fecha' || type === 'date') {
                return 'fecha';
            }
        }

        // Verificar por tipo (type)
        if (field.type) {
            const type = field.type.toLowerCase();
            if (type === 'numerico' || type === 'numérico' || type === 'numeric' || type.includes('int') || type === 'n') {
                return 'numerico';
            }
            if (type.includes('alfa') || type.includes('alpha') || type === 'a' || type === 'an') {
                return 'alfanumerico';
            }
            if (type.includes('fecha') || type.includes('date')) {
                return 'fecha';
            }
        }

        // Por defecto considerar alfanumérico
        return 'alfanumerico';
    },

    /**
     * Extrae el formato de fecha desde un string de formato
     * @param {string} formatStr - String con formato de fecha (ej: "DD/MM/AAAA")
     * @returns {Object} - Objeto con propiedades del formato
     */
    extractDateFormat: function(formatStr) {
        if (!formatStr || typeof formatStr !== 'string') {
            return { format: 'AAAAMMDD', separator: '', pattern: 'YMD', internalFormat: 'AAAAMMDD', displayFormat: 'AAAAMMDD' };
        }

        const format = formatStr.trim();
        let separator = '';
        let pattern = '';
        let internalFormat = '';

        // Detectar separador
        if (format.includes('/')) {
            separator = '/';
        } else if (format.includes('-')) {
            separator = '-';
        } else if (format.includes('.')) {
            separator = '.';
        }

        // Determinar patrón y formato interno basado en el formato de entrada
        if (format.startsWith('DD') || format.startsWith('D')) {
            pattern = 'DMY';
            internalFormat = 'DDMMAAAA';
        } else if (format.startsWith('MM') || format.startsWith('M')) {
            pattern = 'MDY';
            internalFormat = 'MMDDAAAA';
        } else if (format.startsWith('AAAA') || format.startsWith('AA')) {
            pattern = 'YMD';
            internalFormat = 'AAAAMMDD';
        } else {
            pattern = 'DMY';
            internalFormat = 'DDMMAAAA';
        }

        return {
            format: format,
            separator: separator,
            pattern: pattern,
            internalFormat: internalFormat,
            displayFormat: format
        };
    },

    /**
     * Parsea las opciones desde un string de valores o array
     * @param {string|Array} values - String con opciones (ej: "1-Opción 1\n2-Opción 2") o array de valores
     * @returns {Array} - Array de objetos {value, label}
     */
    parseOptionsList: function(values) {
        // Si es un array, procesarlo directamente
        if (Array.isArray(values)) {
            const options = [];

            for (const value of values) {
                const strValue = String(value).trim();
                const codeMatch = strValue.match(/^([0-9a-zA-Z]+)[-=\s]+(.+)$/);

                if (codeMatch) {
                    options.push({
                        value: codeMatch[1].trim(),
                        label: strValue
                    });
                } else {
                    options.push({
                        value: strValue,
                        label: strValue
                    });
                }
            }

            return options;
        }

        // Procesar como string
        const valuesStr = values;
        if (!valuesStr || typeof valuesStr !== 'string') {
            return [];
        }

        const options = [];
        const lines = valuesStr.split(/\n|\r\n/).filter(line => line.trim() !== '');

        for (const line of lines) {
            const trimmedLine = line.trim();
            const codeMatch = trimmedLine.match(/^([0-9a-zA-Z]+)[-=\s.]+(.+)$/);

            if (codeMatch) {
                options.push({
                    value: codeMatch[1].trim(),
                    label: trimmedLine
                });
            } else {
                options.push({
                    value: trimmedLine,
                    label: trimmedLine
                });
            }
        }

        // Si no encontró líneas, intentar separar por comas o punto y coma
        if (options.length === 0 && valuesStr.includes(',')) {
            const items = valuesStr.split(',');
            for (const item of items) {
                const trimmedItem = item.trim();
                const codeMatch = trimmedItem.match(/^([0-9a-zA-Z]+)[-=\s.]+(.+)$/);

                if (codeMatch) {
                    options.push({
                        value: codeMatch[1].trim(),
                        label: trimmedItem
                    });
                } else {
                    options.push({
                        value: trimmedItem,
                        label: trimmedItem
                    });
                }
            }
        }

        return options;
    },

    /**
     * Crea un elemento de entrada basado en las propiedades del campo
     * @param {Object} field - Definición del campo con propiedades
     * @returns {HTMLElement} - Elemento de entrada (input, select, etc)
     */
    createFieldInput: function(field) {
        let input;
        const className = 'config-field-input';
        const fieldType = this.normalizeFieldType(field);

        // Si es un campo de tipo lista (con opciones)
        if (fieldType === 'lista') {
            input = document.createElement('select');

            // Añadir opción vacía
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- Seleccione --';
            input.appendChild(emptyOption);

            // Obtener las opciones desde el campo values
            const options = this.parseOptionsList(field.values);

            // Añadir opciones al select
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                optionElement.dataset.fullValue = option.label;
                input.appendChild(optionElement);
            });

            input.dataset.isOptionsList = 'true';
        }
        // Compatibilidad con el formato antiguo de valores predefinidos
        else if (field.values && Array.isArray(field.values) && field.values.length > 0) {
            input = document.createElement('select');

            // Añadir opción vacía
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- Seleccione --';
            input.appendChild(emptyOption);

            // Añadir opciones basadas en los valores
            field.values.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                input.appendChild(option);
            });
        }
        // Campos numéricos
        else if (fieldType === 'numerico') {
            input = document.createElement('input');
            input.type = 'text';
            input.pattern = '[0-9]*';
            input.inputMode = 'numeric';

            // Añadir validación en tiempo real
            input.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^0-9]/g, '');
            });

            if (field.length) {
                input.maxLength = field.length;
            }
        }
        // Campos de fecha
        else if (fieldType === 'fecha') {
            input = document.createElement('input');
            input.type = 'text';
            input.classList.add('fecha-input');

            // Extraer formato de fecha desde el campo values
            const dateFormat = this.extractDateFormat(field.values);

            // Guardar información del formato como atributos de datos
            input.dataset.dateFormat = dateFormat.format || 'AAAAMMDD';
            input.dataset.dateSeparator = dateFormat.separator || '';
            input.dataset.datePattern = dateFormat.pattern || 'YMD';

            // Usar la descripción completa del values como placeholder si existe
            if (field.values && typeof field.values === 'string' && field.values.trim()) {
                input.placeholder = field.values.trim();
            } else {
                input.placeholder = dateFormat.format || 'AAAAMMDD';
            }

            // Aplicar máscara de fecha basada en el formato
            input.addEventListener('input', function(e) {
                const format = this.dataset.dateFormat || 'AAAAMMDD';
                const separator = this.dataset.dateSeparator || '';
                const pattern = this.dataset.datePattern || 'YMD';
                const rawValue = this.value.replace(/[^0-9]/g, '');
                let formattedValue = '';

                if (pattern === 'YMD') {
                    if (rawValue.length > 0) {
                        formattedValue = rawValue.substring(0, Math.min(4, rawValue.length));
                    }
                    if (rawValue.length > 4) {
                        formattedValue += separator + rawValue.substring(4, Math.min(6, rawValue.length));
                    }
                    if (rawValue.length > 6) {
                        formattedValue += separator + rawValue.substring(6, Math.min(8, rawValue.length));
                    }
                } else if (pattern === 'MDY') {
                    if (rawValue.length > 0) {
                        formattedValue = rawValue.substring(0, Math.min(2, rawValue.length));
                    }
                    if (rawValue.length > 2) {
                        formattedValue += separator + rawValue.substring(2, Math.min(4, rawValue.length));
                    }
                    if (rawValue.length > 4) {
                        formattedValue += separator + rawValue.substring(4, Math.min(8, rawValue.length));
                    }
                } else {
                    if (rawValue.length > 0) {
                        formattedValue = rawValue.substring(0, Math.min(2, rawValue.length));
                    }
                    if (rawValue.length > 2) {
                        formattedValue += separator + rawValue.substring(2, Math.min(4, rawValue.length));
                    }
                    if (rawValue.length > 4) {
                        formattedValue += separator + rawValue.substring(4, Math.min(8, rawValue.length));
                    }
                }

                this.value = formattedValue;
            });

            if (field.length) {
                input.maxLength = field.length;
            } else {
                const baseLength = 8;
                const dateFormat = this.extractDateFormat(field.values);
                const separators = dateFormat.separator ? 2 : 0;
                input.maxLength = baseLength + separators;
            }
        }
        // Campos alfanuméricos
        else if (fieldType === 'alfanumerico') {
            input = document.createElement('input');
            input.type = 'text';

            if (field.length) {
                input.maxLength = field.length;
            }

            input.pattern = '[A-Za-z0-9 ]*';

            // Validar en tiempo real solo para longitudes cortas
            if (field.length && field.length <= 20) {
                input.addEventListener('input', function(e) {
                    this.value = this.value.toUpperCase();
                });
            }
        }
        // Campos por defecto (texto)
        else {
            input = document.createElement('input');
            input.type = 'text';

            if (field.length) {
                input.maxLength = field.length;
            }
        }

        // Añadir clase común y clase específica por tipo
        input.className = className + ' ' + fieldType + '-input';

        // Añadir placeholder si existe
        if (field.description) {
            input.placeholder = field.description;
        } else if (field.values && typeof field.values === 'string' && !input.placeholder &&
                  fieldType === 'alfanumerico') {
            const valueTrimmed = field.values.trim();
            if (valueTrimmed && !valueTrimmed.includes('\n')) {
                input.placeholder = valueTrimmed;
            }
        }

        // Marcar si es requerido
        if (field.required) {
            input.required = true;
        }

        // Guardar el tipo de campo como atributo de datos
        input.dataset.fieldType = fieldType;

        return input;
    },

    /**
     * Aplica validaciones a campos existentes en el DOM
     * @param {string} containerSelector - Selector del contenedor donde buscar campos
     */
    applyValidationsToExistingFields: function() {
        const self = this;
        const inputs = document.querySelectorAll('#headerConfigTable .config-field-input, #requestConfigTable .config-field-input');

        inputs.forEach((input, index) => {
            const fieldName = input.dataset.fieldName;
            if (!fieldName) {
                return;
            }

            const rowElement = input.closest('tr');
            if (!rowElement) {
                return;
            }

            const valuesCell = rowElement.querySelector('td:nth-child(6)');
            const typeCell = rowElement.querySelector('td:nth-child(2)');

            let fieldValues = '';
            let fieldType = 'alfanumerico';

            if (valuesCell) {
                fieldValues = valuesCell.textContent.trim();
            }

            if (typeCell) {
                const typeCellText = typeCell.textContent.trim().toLowerCase();
                if (typeCellText === 'numerico' || typeCellText === 'numérico' || typeCellText === 'numeric') {
                    fieldType = 'numerico';
                } else if (typeCellText.includes('alfa') || typeCellText === 'alfanumerico' || typeCellText === 'alfanumérico') {
                    fieldType = 'alfanumerico';
                }
            }

            const fieldObject = {
                name: fieldName,
                values: fieldValues,
                type: fieldType
            };

            const normalizedType = self.normalizeFieldType(fieldObject);
            fieldType = normalizedType;

            // Procesar según el tipo normalizado
            if (fieldType === 'lista' && fieldValues) {
                const options = self.parseOptionsList(fieldValues);

                if (options.length > 0 && input.tagName !== 'SELECT') {
                    const select = document.createElement('select');
                    select.className = input.className;
                    select.id = input.id;
                    select.name = input.name;
                    select.required = input.required;

                    for (const key in input.dataset) {
                        select.dataset[key] = input.dataset[key];
                    }

                    const emptyOption = document.createElement('option');
                    emptyOption.value = '';
                    emptyOption.textContent = '-- Seleccione --';
                    select.appendChild(emptyOption);

                    options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option.value;
                        optionElement.textContent = option.label;
                        optionElement.dataset.fullValue = option.label;
                        select.appendChild(optionElement);
                    });

                    input.replaceWith(select);
                    select.dataset.fieldType = 'lista';
                    select.dataset.isOptionsList = 'true';
                }

                return;
            }

            // Para campos numéricos, aplicar validación de solo números
            if (fieldType === 'numerico') {
                input.classList.add('numerico-input');
                input.pattern = '[0-9]*';
                input.inputMode = 'numeric';

                // Clonar el input para agregar el event listener
                const newInput = input.cloneNode(true);
                newInput.addEventListener('input', function(e) {
                    this.value = this.value.replace(/[^0-9]/g, '');
                });
                newInput.dataset.fieldType = fieldType;
                
                input.replaceWith(newInput);
                console.log(`Campo numérico ${fieldName} configurado con validación`);
            }
            // Para campos alfanuméricos, convertir a mayúsculas
            else if (fieldType === 'alfanumerico') {
                input.classList.add('alfanumerico-input');

                if (input.maxLength <= 20 || !input.maxLength) {
                    const newInput = input.cloneNode(true);
                    newInput.addEventListener('input', function(e) {
                        this.value = this.value.toUpperCase();
                    });
                    newInput.dataset.fieldType = fieldType;
                    
                    input.replaceWith(newInput);
                }
            }
        });
    },

    /**
     * Muestra una notificación al usuario
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación: 'success', 'error', 'info', 'warning'
     * @param {boolean} useSwal - Si es true, intentará usar SweetAlert2 para notificaciones más complejas
     */
    showNotification: function(message, type = 'info', useSwal = false) {
        console.log(`[Notification ${type}]: ${message}`);

        // Verificar si es una notificación duplicada
        if (NotificationDeduplicator.isDuplicate(message, type)) {
            console.log(`[Notification ${type}] DUPLICADA, omitiendo: ${message}`);
            return;
        }

        // Automatically use SweetAlert for warnings and errors if available
        const shouldUseSwal = (useSwal || type === 'warning' || type === 'error') && typeof Swal !== 'undefined';

        // Si SweetAlert está disponible y debe usarse
        if (shouldUseSwal) {
            // Para mensajes con HTML, usar Swal directamente
            if (message.includes('<')) {
                Swal.fire({
                    title: this.getNotificationTitle(type),
                    html: message,
                    icon: this.mapNotificationType(type),
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#2563eb'
                });
                return;
            }

            // Para mensajes simples, usar toast
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: type === 'error' ? 5000 : 3000, // Default timer for non-error toasts
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });

            Toast.fire({
                icon: this.mapNotificationType(type),
                title: message
            });
            return;
        }

        // Si SweetAlert no está disponible o no debe usarse, usar Toastr
        if (typeof toastr !== 'undefined') {
            toastr.options = {
                "closeButton": true,
                "progressBar": true,
                "positionClass": "toast-top-right",
                "timeOut": type === 'error' ? "5000" : "3000", // Duración en milisegundos
                "extendedTimeOut": "1000",
                "showEasing": "swing",
                "hideEasing": "linear",
                "showMethod": "fadeIn",
                "hideMethod": "fadeOut"
            };

            switch (type) {
                case 'success':
                    toastr.success(message);
                    break;
                case 'error':
                    toastr.error(message);
                    break;
                case 'warning':
                    toastr.warning(message);
                    break;
                case 'info':
                default:
                    toastr.info(message);
                    break;
            }
        } else {
            // Fallback a console.log si Toastr tampoco está disponible
            console.warn("Toastr no está disponible. Mostrando notificación en consola.");
            console.log(`[Notification ${type}]: ${message}`);
        }
    },

    /**
     * Mapea el tipo de notificación a un ícono de SweetAlert2
     * @param {string} type - Tipo de notificación: 'success', 'error', 'info', 'warning'
     * @returns {string} - Nombre del ícono de SweetAlert2
     */
    mapNotificationType: function(type) {
        switch (type) {
            case 'success':
                return 'success';
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
            default:
                return 'info';
        }
    },

    /**
     * Obtiene el título para una notificación de SweetAlert2
     * @param {string} type - Tipo de notificación: 'success', 'error', 'info', 'warning'
     * @returns {string} - Título de la notificación
     */
    getNotificationTitle: function(type) {
        switch (type) {
            case 'success':
                return 'Éxito';
            case 'error':
                return 'Error';
            case 'warning':
                return 'Advertencia';
            case 'info':
            default:
                return 'Información';
        }
    },

    /**
     * Muestra un mensaje de error con SweetAlert2
     * @param {string} message - Mensaje de error a mostrar
     */
    showError: function(message) {
        this.showNotification(message, 'error', true);
    },

    /**
     * Muestra un mensaje de éxito con SweetAlert2
     * @param {string} message - Mensaje de éxito a mostrar
     */
    showSuccess: function(message) {
        this.showNotification(message, 'success', true);
    },

    /**
     * Muestra un mensaje de advertencia con SweetAlert2
     * @param {string} message - Mensaje de advertencia a mostrar
     */
    showWarning: function(message) {
        this.showNotification(message, 'warning', true);
    },

    /**
     * Muestra un mensaje de información con SweetAlert2
     * @param {string} message - Mensaje de información a mostrar
     */
    showInfo: function(message) {
        this.showNotification(message, 'info', true);
    },

    /**
     * Muestra un mensaje de confirmación con SweetAlert2
     * @param {string} title - Título de la confirmación
     * @param {string} text - Texto del mensaje
     * @param {function} onConfirm - Callback a ejecutar si el usuario confirma
     * @param {function} onCancel - Callback a ejecutar si el usuario cancela
     */
    showConfirmation: function(title, text, onConfirm, onCancel) {
        Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí',
            cancelButtonText: 'No'
        }).then((result) => {
            if (result.isConfirmed) {
                if (onConfirm && typeof onConfirm === 'function') {
                    onConfirm();
                }
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                if (onCancel && typeof onCancel === 'function') {
                    onCancel();
                }
            }
        });
    }
};

// Exponer ConfigUtils globalmente si es necesario (depende del patrón de módulos)
// window.ConfigUtils = ConfigUtils; // Descomentar si se usa en un entorno global
