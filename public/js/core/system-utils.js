/**
 * Utilidades del sistema
 *
 * Módulo para funcionalidades de mantenimiento y limpieza
 */

const SystemUtils = {
    // Elemento DOM del botón de limpieza
    cleanButton: null,

    // Inicializar el módulo
    init: function() {
        // console.log('Inicializando SystemUtils...');

        // Crear el botón de limpieza
        this._createCleanButton();

        // Los eventos se manejan via EventBus local

        console.log('SystemUtils inicializado');
    },

    // Crear el botón de limpieza
    _createCleanButton: function() {
        // Crear el botón
        const button = document.createElement('button');
        button.className = 'system-utils-button';
        button.title = 'Limpiar directorios de trabajo';
        button.innerHTML = `🗑️`; // Emoji de tacho de basura

        // Agregar evento de clic
        button.addEventListener('click', () => {
            this._showConfirmDialog();
        });

        // Guardar referencia
        this.cleanButton = button;

        // Agregar al DOM
        document.body.appendChild(button);
    },

    // Mostrar diálogo de confirmación
    _showConfirmDialog: function() {
        Swal.fire({
            title: '¿Limpiar directorios?',
            html: `
                <p>Esta acción eliminará todos los archivos de los siguientes directorios:</p>
                <ul style="text-align: left; display: inline-block;">
                    <li><strong>structures</strong>: Estructuras de servicios</li>
                    <li><strong>uploads</strong>: Archivos Excel cargados</li>
                    <li><strong>settings</strong>: Configuraciones de servicios</li>
                    <li><strong>Encabezados</strong>: Ejemplos de encabezados</li>
                </ul>
                <p>Esta acción no puede deshacerse.</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, limpiar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._clearDirectories();
            }
        });
    },

    // Ejecutar limpieza de directorios
    _clearDirectories: function() {
        // Mostrar estado de carga
        this.cleanButton.classList.add('loading');

        // Realizar solicitud DELETE para limpiar directorios
        fetch('/system-maintenance/clear-dirs', {
            method: 'DELETE',
        })
        .then(response => response.json())
        .then(data => {
            // Quitar estado de carga
            this.cleanButton.classList.remove('loading');

            if (data.success) {
                // Mostrar estado de éxito
                this.cleanButton.classList.add('success');

                // Mostrar notificación de éxito
                toastr.success('Directorios limpiados correctamente');

                // Mostrar detalles
                this._showResultsDialog(data.results);

                // Volver al estado normal después de un tiempo
                setTimeout(() => {
                    this.cleanButton.classList.remove('success');
                }, 2000);

                // Actualizar servicios en la interfaz (si existe la función)
                if (typeof updateServicesList === 'function') {
                    updateServicesList();
                }
            } else {
                // Mostrar estado de error
                this.cleanButton.classList.add('error');

                // Mostrar notificación de error
                toastr.error('Error al limpiar directorios');

                // Volver al estado normal después de un tiempo
                setTimeout(() => {
                    this.cleanButton.classList.remove('error');
                }, 2000);
            }
        })
        .catch(error => {
            console.error('Error al limpiar directorios:', error);

            // Quitar estado de carga
            this.cleanButton.classList.remove('loading');

            // Mostrar estado de error
            this.cleanButton.classList.add('error');

            // Mostrar notificación de error
            toastr.error('Error al limpiar directorios: ' + error.message);

            // Volver al estado normal después de un tiempo
            setTimeout(() => {
                this.cleanButton.classList.remove('error');
            }, 2000);
        });
    },

    // Mostrar diálogo con resultados detallados
    _showResultsDialog: function(results) {
        // Crear tabla HTML con resultados
        let resultsHtml = `
            <table class="results-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Directorio</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Estado</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Mensaje</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Agregar fila para cada resultado
        results.forEach(result => {
            const status = result.cleared
                ? '<span style="color: #10b981;">✓ Limpiado</span>'
                : '<span style="color: #ef4444;">✗ Error</span>';

            resultsHtml += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${result.directory}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${status}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${result.message || result.error || ''}</td>
                </tr>
            `;
        });

        resultsHtml += `
                </tbody>
            </table>
        `;

        // Mostrar diálogo con resultados
        Swal.fire({
            title: 'Resultado de limpieza',
            html: resultsHtml,
            icon: 'info',
            confirmButtonText: 'Aceptar'
        });
    },

    // Los eventos se manejan via EventBus local
};

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    SystemUtils.init();
});
