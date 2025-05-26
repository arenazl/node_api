/**
 * Utilidades de configuración y notificaciones
 * Funciones compartidas para la interfaz de usuario
 */

// DEBUGGING: Log de carga del archivo
console.log('🔧 [ConfigUtils] Archivo cargado - ' + new Date().toISOString());

// DEBUGGING: Función de prueba que se ejecuta inmediatamente
(function testConfigUtils() {
    console.log('🧪 [ConfigUtils] Ejecutando test de carga...');
    
    // Test básico
    const testField = {
        name: 'test-field',
        type: 'alfanumerico',
        values: 'test value'
    };
    
    console.log('🧪 [ConfigUtils] Test field:', testField);
    
    // Esto debería disparar el debugger inmediatamente si está configurado
    debugger; // ⭐ BREAKPOINT FORZADO AQUÍ
    
    console.log('🧪 [ConfigUtils] Test completado');
})();

// Objeto global para utilidades de configuración
const ConfigUtils = {
    /**
     * Normaliza el tipo de campo para usarlo en validaciones
     * @param {Object} field - Definición del campo
     * @returns {string} - Tipo normalizado: 'numerico', 'alfanumerico', 'fecha'
     */
    normalizeFieldType: function(field) {
        // DEBUGGING: Añadir logs y breakpoint
        console.log('🔍 [normalizeFieldType] INICIO - Field:', field);
        debugger; // ⭐ BREAKPOINT EN NORMALIZE FIELD TYPE
        
        // Verificar si tiene lista de valores definidos (opciones)
        if (field.values && typeof field.values === 'string') {
            const valueStr = field.values.trim();
            
            // Detectar si es una lista genuina de opciones:
            // - Debe contener múltiples líneas o elementos separados por comas
            // - Debe tener formato de código + descripción (1-Opción, 2-Opción)
            const hasMultipleLines = valueStr.includes('\n');
            const hasMultipleOptions = valueStr.split(',').length > 1;
            const hasCodeFormat = valueStr.split(/\n/).filter(line => /^\d+[-=]/.test(line.trim())).length > 0;
            
            if ((hasMultipleLines || hasMultipleOptions) && hasCodeFormat) {
                console.log(`🎯 Campo detectado como lista de opciones: ${field.name}`);
                return 'lista';
            }
            
            // Los valores que no son listas genuinas se tratarán como descripciones/placeholders
        }
        
        // Verificar por formato de fecha en campo values o en el nombre
        if (field.values && typeof field.values === 'string') {
            const valueStr = field.values.trim();
            if (valueStr.includes('DD/MM') || 
                valueStr.includes('DD-MM') || 
                valueStr.includes('MM/DD') || 
                valueStr.includes('AAAA') || 
                valueStr.includes('MM/AAAA')) {
                console.log(`📅 Campo detectado como fecha por su formato: ${field.name}, formato: ${valueStr}`);
                return 'fecha';
            }
        }
        
        // Verificar primero por nombre del campo para detectar campos de fecha
        // aunque estén definidos como alfanumérico en la estructura
        if (field.name) {
            const name = field.name.toLowerCase();
            // Si contiene palabras clave de fecha, siempre tratarlo como fecha
            // independientemente de cómo esté definido en la estructura
            if (name.includes('fecha') || name.includes('date') || name.includes('fec-') || 
                name.includes('-fec') || name.includes('-fecha') || name.includes('fecha-')) {
                console.log(`📅 Campo detectado como fecha por su nombre: ${field.name}`);
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
            if (type.includes('num') || type.includes('int') || type === 'n') {
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
        console.log(`⚪ Campo por defecto como alfanumerico: ${field.name}`);
        return 'alfanumerico';
    },
    
    /**
     * Extrae el formato de fecha desde un string de formato
     * @param {string} formatStr - String con formato de fecha (ej: "DD/MM/AAAA")
     * @returns {Object} - Objeto con propiedades del formato
     */
    extractDateFormat: function(formatStr) {
        console.log('📅 [extractDateFormat] INICIO - formatStr:', formatStr);
        debugger; // ⭐ BREAKPOINT EN EXTRACT DATE FORMAT
        
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
            // Para DD/MM/AAAA el formato interno debería ser DDMMAAAA
            internalFormat = separator ? format.replace(/[^A-Za-z]/g, '') : 'DDMMAAAA';
        } else if (format.startsWith('MM') || format.startsWith('M')) {
            pattern = 'MDY';
            // Para MM/DD/AAAA el formato interno debería ser MMDDAAAA
            internalFormat = separator ? format.replace(/[^A-Za-z]/g, '') : 'MMDDAAAA';
        } else if (format.startsWith('AAAA') || format.startsWith('AA')) {
            pattern = 'YMD';
            // Para AAAA-MM-DD el formato interno debería ser AAAAMMDD
            internalFormat = separator ? format.replace(/[^A-Za-z]/g, '') : 'AAAAMMDD';
        } else {
            // Si no se puede determinar, usar el formato tal como viene o AAAAMMDD por defecto
            pattern = 'YMD';
            internalFormat = format.replace(/[^A-Za-z]/g, '') || 'AAAAMMDD';
        }
        
        const result = {
            format: format,
            separator: separator,
            pattern: pattern,
            internalFormat: internalFormat,
            displayFormat: format
        };
        
        console.log('📅 [extractDateFormat] RESULTADO:', result);
        return result;
    },
    
    /**
     * Parsea las opciones desde un string de valores
     * @param {string} valuesStr - String con opciones (ej: "1-Opción 1\n2-Opción 2")
     * @returns {Array} - Array de objetos {value, label}
     */
    parseOptionsList: function(valuesStr) {
        console.log('🎯 [parseOptionsList] INICIO - valuesStr:', valuesStr);
        debugger; // ⭐ BREAKPOINT EN PARSE OPTIONS LIST
        
        if (!valuesStr || typeof valuesStr !== 'string') {
            return [];
        }
        
        const options = [];
        
        // Dividir por líneas primero
        const lines = valuesStr.split(/\n|\r\n/).filter(line => line.trim() !== '');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Detectar formato: código seguido de separador y descripción
            const codeMatch = trimmedLine.match(/^([0-9a-zA-Z]+)[-=\s]+(.+)$/);
            
            if (codeMatch) {
                options.push({
                    value: codeMatch[1].trim(),
                    label: trimmedLine
                });
            } else {
                // Si no se puede parsear, usar la línea completa
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
                
                // Detectar formato: código seguido de separador y descripción
                const codeMatch = trimmedItem.match(/^([0-9a-zA-Z]+)[-=\s]+(.+)$/);
                
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
        
        console.log('🎯 [parseOptionsList] RESULTADO:', options);
        return options;
    },

    /**
     * Crea un elemento de entrada basado en las propiedades del campo
     * @param {Object} field - Definición del campo con propiedades
     * @returns {HTMLElement} - Elemento de entrada (input, select, etc)
     */
    createFieldInput: function(field) {
        console.log('🏗️ [createFieldInput] INICIO - Field:', field);
         
        // Crear un tipo de entrada adecuado basado en el tipo de campo
        let input;
        
        // Añadir clase común para todos los inputs de configuración
        const className = 'config-field-input';
        
        // Detectar el tipo de campo (normalizar)
        const fieldType = this.normalizeFieldType(field);
        console.log('🏗️ [createFieldInput] Tipo detectado:', fieldType);
        
        // Si es un campo de tipo lista (con opciones)
        if (fieldType === 'lista') {
            console.log('🎯 [createFieldInput] Creando SELECT para lista de opciones');
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
                // Guardar el valor completo como atributo de datos
                optionElement.dataset.fullValue = option.label;
                input.appendChild(optionElement);
            });
            
            // Guardar información adicional para procesar en submit
            input.dataset.isOptionsList = 'true';
        }
        // Compatibilidad con el formato antiguo de valores predefinidos
        else if (field.values && Array.isArray(field.values) && field.values.length > 0) {
            console.log('🎯 [createFieldInput] Creando SELECT para valores array');
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
            console.log('🔢 [createFieldInput] Creando INPUT numérico');
            input = document.createElement('input');
            input.type = 'text';
            input.pattern = '[0-9]*';
            input.inputMode = 'numeric'; // Muestra teclado numérico en móviles
            
            // Añadir validación en tiempo real
            input.addEventListener('input', function(e) {
                console.log('🔢 Validación numérica en tiempo real:', this.value);
                // Reemplazar caracteres no numéricos
                this.value = this.value.replace(/[^0-9]/g, '');
            });
            
            // Limitar longitud si está definida
            if (field.length) {
                input.maxLength = field.length;
            }
        } 
        // Campos de fecha
        else if (fieldType === 'fecha') {
            console.log('📅 [createFieldInput] Creando INPUT de fecha');
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
                input.placeholder = field.values.trim(); // Descripción completa del formato
            } else {
                input.placeholder = dateFormat.format || 'AAAAMMDD';
            }
            
            // Aplicar máscara de fecha basada en el formato
            input.addEventListener('input', function(e) {
                console.log('📅 Validación de fecha en tiempo real:', this.value);
                
                // Obtener datos del formato
                const format = this.dataset.dateFormat || 'AAAAMMDD';
                const separator = this.dataset.dateSeparator || '';
                const pattern = this.dataset.datePattern || 'YMD';
                
                // Almacenar valor original antes de aplicar formato
                const rawValue = this.value.replace(/[^0-9]/g, '');
                
                // Aplicar formato con separadores según el patrón
                let formattedValue = '';
                
                // Aplicar formato según el patrón detectado
                if (pattern === 'YMD') {
                    // Formato AAAA-MM-DD
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
                    // Formato MM/DD/AAAA
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
                    // Por defecto usar DMY (DD/MM/AAAA)
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
                
                // Actualizar el valor con el formato aplicado
                this.value = formattedValue;
            });
            
            // Limitar longitud según el formato
            if (field.length) {
                input.maxLength = field.length;
            } else {
                // Calcular longitud máxima basada en formato
                const baseLength = 8; // AAAAMMDD son 8 caracteres
                const dateFormat = this.extractDateFormat(field.values);
                const separators = dateFormat.separator ? 2 : 0; // DD/MM/AAAA tiene 2 separadores
                input.maxLength = baseLength + separators;
            }
        }
        // Campos alfanuméricos
        else if (fieldType === 'alfanumerico') {
            console.log('🔤 [createFieldInput] Creando INPUT alfanumérico');
            input = document.createElement('input');
            input.type = 'text';
            
            // Limitar longitud si está definida
            if (field.length) {
                input.maxLength = field.length;
            }
            
            // Por defecto los alfanuméricos permiten letras y números
            // pero podemos añadir validación si es necesario
            input.pattern = '[A-Za-z0-9 ]*';
            
            // Validar en tiempo real solo para longitudes cortas (para evitar lag)
            if (field.length && field.length <= 20) {
                input.addEventListener('input', function(e) {
                    console.log('🔤 Convertir a mayúsculas:', this.value);
                    // Convertir a mayúsculas automáticamente
                    this.value = this.value.toUpperCase();
                });
            }
        }
        // Campos por defecto (texto)
        else {
            console.log('📝 [createFieldInput] Creando INPUT por defecto');
            input = document.createElement('input');
            input.type = 'text';
            
            // Limitar longitud si está definida
            if (field.length) {
                input.maxLength = field.length;
            }
        }
        
        // Añadir clase común y clase específica por tipo
        input.className = className + ' ' + fieldType + '-input';
        
        // Añadir placeholder si existe - priorizar diferentes fuentes de placeholder
        // 1. Si hay descripción en field.description, usarla
        // 2. Si es campo alfanumérico y tiene valores en una sola línea, usar eso como placeholder
        if (field.description) {
            input.placeholder = field.description;
        } else if (field.values && typeof field.values === 'string' && !input.placeholder && 
                  fieldType === 'alfanumerico') {
            // Para campos que tienen un valor en la columna pero no son ni lista ni fecha
            // usar ese valor como placeholder descriptivo
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
        
        console.log('🏗️ [createFieldInput] INPUT CREADO:', input);
        return input;
    },

    /**
     * Aplica validaciones a campos existentes en el DOM
     * @param {string} containerSelector - Selector del contenedor donde buscar campos
     */
    applyValidationsToExistingFields: function() {
        console.log('🔧 [applyValidationsToExistingFields] INICIO');
        debugger; // ⭐ BREAKPOINT EN APPLY VALIDATIONS
        
        const self = this; // Referencia a ConfigUtils para usar dentro de callbacks
        
        // Buscar todos los inputs en los contenedores de configuración
        const inputs = document.querySelectorAll('#headerConfigTable .config-field-input, #requestConfigTable .config-field-input');
        console.log('🔧 [applyValidationsToExistingFields] Inputs encontrados:', inputs.length);
        
        inputs.forEach((input, index) => {
            console.log(`🔧 [applyValidationsToExistingFields] Procesando input ${index + 1}/${inputs.length}:`, input);
            
            // Obtener nombre del campo desde atributo data
            const fieldName = input.dataset.fieldName;
            if (!fieldName) {
                console.log('❌ Sin fieldName, omitiendo');
                return;
            }
            
            // Obtener información adicional del campo desde la estructura
            const rowElement = input.closest('tr');
            if (!rowElement) {
                console.log('❌ Sin rowElement, omitiendo');
                return;
            }
            
            // Obtener información de valores y tipo desde la fila
            const valuesCell = rowElement.querySelector('td:nth-child(6)'); // La celda de valores suele ser la 6ta
            const typeCell = rowElement.querySelector('td:nth-child(2)'); // La celda de tipo suele ser la 2da
            
            let fieldValues = '';
            let fieldType = 'alfanumerico'; // Tipo por defecto
            
            // Extraer valores si existen
            if (valuesCell) {
                fieldValues = valuesCell.textContent.trim();
            }
            
            // Extraer tipo si existe
            if (typeCell) {
                const typeCellText = typeCell.textContent.trim().toLowerCase();
                
                if (typeCellText.includes('num')) {
                    fieldType = 'numerico';
                } else if (typeCellText.includes('alfa')) {
                    fieldType = 'alfanumerico';
                }
            }
            
            // Crear objeto de campo para usar con nuestras funciones
            const fieldObject = {
                name: fieldName,
                values: fieldValues,
                type: fieldType
            };
            
            // Usar nuestra función normalizeFieldType para determinar el tipo real
            const normalizedType = self.normalizeFieldType(fieldObject);
            fieldType = normalizedType;
            
            console.log(`🎯 Campo ${fieldName}: tipo detectado ${fieldType}, valores: ${fieldValues ? 'sí' : 'no'}`);
            
            // Procesar según el tipo normalizado
            // Verificar si es un campo de lista (con opciones)
            if (fieldType === 'lista' && fieldValues) {
                console.log(`🎯 Aplicando validación de LISTA DE OPCIONES al campo existente: ${fieldName}`);
                
                // Extraer opciones
                const options = self.parseOptionsList(fieldValues);
                
                // Reemplazar input por select
                if (options.length > 0 && input.tagName !== 'SELECT') {
                    // Crear select
                    const select = document.createElement('select');
                    select.className = input.className;
                    select.id = input.id;
                    select.name = input.name;
                    select.required = input.required;
                    
                    // Copiar data attributes
                    for (const key in input.dataset) {
                        select.dataset[key] = input.dataset[key];
                    }
                    
                    // Añadir opción vacía
                    const emptyOption = document.createElement('option');
                    emptyOption.value = '';
                    emptyOption.textContent = '-- Seleccione --';
                    select.appendChild(emptyOption);
                    
                    // Añadir opciones
                    options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option.value;
                        optionElement.textContent = option.label;
                        optionElement.dataset.fullValue = option.label;
                        select.appendChild(optionElement);
                    });
                    
                    // Reemplazar input por select
                    input.replaceWith(select);
                    
                    // Marcar como lista de opciones
                    select.dataset.fieldType = 'lista';
                    select.dataset.isOptionsList = 'true';
                }
                
                return; // Continuar con el siguiente input
            }
            
            // Para campos alfanuméricos, convertir a mayúsculas
            if (fieldType === 'alfanumerico') {
                // Añadir clase visual
                input.classList.add('alfanumerico-input');
                
                // Solo convertir a mayúsculas si la longitud es manejable
                if (input.maxLength <= 20 || !input.maxLength) {
                    // Eliminar listeners existentes
                    input.replaceWith(input.cloneNode(true));
                    const newInput = document.querySelector(`[data-field-name="${fieldName}"]`);
                    
                    // Aplicar validación alfanumérica
                    newInput.addEventListener('input', function(e) {
                        console.log('🔤 Convertir a mayúsculas:', this.value);
                        this.value = this.value.toUpperCase();
                    });
                    
                    // Guardar el tipo detectado
                    newInput.dataset.fieldType = fieldType;
                }
            }
        });
        
        console.log('[ConfigUtils] Validaciones aplicadas correctamente');
    },
    
    /**
     * Muestra una notificación al usuario
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación: 'success', 'error', 'info', 'warning'
     * @param {boolean} useSwal - Si es true, intentará usar SweetAlert2 para notificaciones más complejas
     */
    showNotification: function(message, type = 'info', useSwal = false) {
        console.log(`[Notification ${type}]: ${message}`);
        
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
                timer: type === 'error' ? 5000 : 3000,
                timerProgressBar: true
            });
            
            Toast.fire({
                icon: this.mapNotificationType(type),
                title: message
            });
            
            return;
        }
        
        // Método tradicional con elemento notification
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        // Limpiar clases anteriores
        notification.className = 'notification';
        
        // Agregar clase según el tipo
        notification.classList.add(type);
        
        // Establecer mensaje (sanitizando HTML si es necesario)
        if (message.includes('<') && !useSwal) {
            // Si contiene HTML pero no usamos Swal, eliminar etiquetas
            notification.textContent = message.replace(/<[^>]*>/g, '');
        } else {
            notification.textContent = message;
        }
        
        // Mostrar notificación
        notification.style.display = 'block';
        
        // Ocultar después de un tiempo
        setTimeout(() => {
            notification.style.display = 'none';
        }, type === 'error' ? 8000 : 5000);
    },
    
    /**
     * Mapea tipos de notificación a íconos de SweetAlert
     * @param {string} type - Tipo de notificación
     * @returns {string} - Tipo de ícono para SweetAlert
     */
    mapNotificationType: function(type) {
        switch (type) {
            case 'success': return 'success';
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info':
            default: return 'info';
        }
    },
    
    /**
     * Obtiene el título según el tipo de notificación
     * @param {string} type - Tipo de notificación
     * @returns {string} - Título para la notificación
     */
    getNotificationTitle: function(type) {
        switch (type) {
            case 'success': return 'Éxito';
            case 'error': return 'Error';
            case 'warning': return 'Advertencia';
            case 'info':
            default: return 'Información';
        }
    }
};

// DEBUGGING: Función para probar manualmente las funciones
window.testConfigUtils = function() {
    console.log('🧪 [Manual Test] Iniciando pruebas manuales...');
    
    // Test normalizeFieldType
    const testFields = [
        { name: 'fecha-nacimiento', type: 'alfanumerico', values: '' },
        { name: 'edad', type: 'numerico', values: '' },
        { name: 'estado', type: 'alfanumerico', values: '1-Activo\n2-Inactivo' },
        { name: 'fecha-registro', type: 'alfanumerico', values: 'DD/MM/AAAA' }
    ];
    
    testFields.forEach(field => {
        const normalizedType = ConfigUtils.normalizeFieldType(field);
        console.log(`🧪 Campo: ${field.name}, Tipo detectado: ${normalizedType}`);
    });
    
    console.log('🧪 [Manual Test] Pruebas completadas');
};

// Hacer ConfigUtils disponible globalmente
window.ConfigUtils = ConfigUtils;

// Confirmar que el objeto está completo
console.log('✅ [ConfigUtils] Objeto ConfigUtils cargado correctamente:', Object.keys(ConfigUtils));
