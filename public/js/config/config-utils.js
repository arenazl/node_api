/**
 * Utilidades de configuración y notificaciones
 * Funciones compartidas para la interfaz de usuario
 */

// Objeto global para utilidades de configuración
const ConfigUtils = {
    /**
     * Crea un elemento de entrada basado en las propiedades del campo
     * @param {Object} field - Definición del campo con propiedades
     * @returns {HTMLElement} - Elemento de entrada (input, select, etc)
     */
    createFieldInput: function(field) {
        // Crear un tipo de entrada adecuado basado en el tipo de campo
        let input;
        
        // Añadir clase común para todos los inputs de configuración
        const className = 'config-field-input';
        
        // Si es un campo de selección con valores predefinidos
        if (field.values && Array.isArray(field.values) && field.values.length > 0) {
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
        else if (field.type && (field.type.toLowerCase().includes('num') || 
                 field.type.toLowerCase().includes('int') || 
                 field.type.toLowerCase() === 'n')) {
            input = document.createElement('input');
            input.type = 'text';
            input.pattern = '[0-9]*';
            
            // Limitar longitud si está definida
            if (field.length) {
                input.maxLength = field.length;
            }
        } 
        // Campos de fecha
        else if (field.name && field.name.toLowerCase().includes('fecha')) {
            input = document.createElement('input');
            input.type = 'text';
            
            // Establecer placeholder para indicar formato
            if (field.format) {
                input.placeholder = field.format;
            } else {
                input.placeholder = 'AAAAMMDD';
            }
            
            // Limitar longitud si está definida
            if (field.length) {
                input.maxLength = field.length;
            }
        }
        // Campos por defecto (texto)
        else {
            input = document.createElement('input');
            input.type = 'text';
            
            // Limitar longitud si está definida
            if (field.length) {
                input.maxLength = field.length;
            }
        }
        
        // Añadir clase común
        input.className = className;
        
        // Añadir placeholder si existe
        if (field.description) {
            input.placeholder = field.description;
        }
        
        // Marcar si es requerido
        if (field.required) {
            input.required = true;
        }
        
        return input;
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

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.ConfigUtils = ConfigUtils;
    console.log('[ConfigUtils] Exportado exitosamente al objeto window');
} else {
    console.warn('[ConfigUtils] No se pudo exportar al objeto window (entorno sin ventana)');
}
