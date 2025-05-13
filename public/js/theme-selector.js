/**
 * Selector de Temas
 * 
 * Módulo para gestionar el cambio de temas en la aplicación
 * Permite alternar entre tema oscuro, claro, ámbar y verde-cyan
 */

// Configuración de temas disponibles
const ThemeManager = {
    // Variable para almacenar el tema actual
    currentTheme: 'dark',
    
    // Elementos DOM
    themeToggler: null,
    themeIcon: null,
    themeStylesheet: null,
    
    // Temas disponibles
    themes: {
        dark: {
            name: 'Oscuro',
            class: 'theme-dark',
            icon: 'moon',
            stylesheet: null // Tema por defecto, sin hoja de estilos adicional
        },
        light: {
            name: 'Claro',
            class: 'theme-light',
            icon: 'sun',
            stylesheet: '/css/light-theme.css'
        },
        amber: {
            name: 'Ámbar',
            class: 'theme-amber',
            icon: 'amber',
            stylesheet: '/css/amber-theme.css'
        }
    },
    
    // Inicializar el gestor de temas
    init: function() {
        console.log('Inicializando ThemeManager...');
        
        // Crear el elemento para la hoja de estilos del tema
        this.themeStylesheet = document.createElement('link');
        this.themeStylesheet.rel = 'stylesheet';
        document.head.appendChild(this.themeStylesheet);
        
        // Crear el botón del selector de tema
        this._createThemeToggler();
        
        // Cargar el tema guardado en localStorage o usar el tema por defecto
        this._loadSavedTheme();
        
        console.log('ThemeManager inicializado con tema:', this.currentTheme);
    },
    
    // Crear el botón de alternancia de temas
    _createThemeToggler: function() {
        // Crear el contenedor del selector de tema
        const container = document.createElement('div');
        container.className = 'theme-selector';
        
        // Crear el botón principal (icono de engranaje)
        const settingsButton = document.createElement('button');
        settingsButton.className = 'theme-settings-btn';
        settingsButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
        settingsButton.title = 'Configuración de tema';
        
        // Crear el menú de opciones de tema
        const themeMenu = document.createElement('div');
        themeMenu.className = 'theme-menu';
        
        // Añadir opciones para cada tema
        for (const [themeKey, theme] of Object.entries(this.themes)) {
            const themeOption = document.createElement('button');
            themeOption.className = 'theme-option';
            themeOption.dataset.theme = themeKey;
            themeOption.title = `Tema ${theme.name}`;
            
            // Definir el icono según el tema
            let iconSvg = '';
            if (themeKey === 'dark') {
                // Icono de luna para tema oscuro
                iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
            } else if (themeKey === 'light') {
                // Icono de sol para tema claro
                iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
            } else {
                // Icono para tema ámbar
                iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle></svg>';
            }
            
            themeOption.innerHTML = iconSvg + ' ' + theme.name;
            themeOption.addEventListener('click', () => {
                // Cambiar al tema seleccionado
                this.setTheme(themeKey);
                // Cerrar el menú
                themeMenu.classList.remove('active');
            });
            
            themeMenu.appendChild(themeOption);
        }
        
        // Evento para mostrar/ocultar el menú
        settingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            themeMenu.classList.toggle('active');
        });
        
        // Cerrar el menú al hacer clic fuera de él
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                themeMenu.classList.remove('active');
            }
        });
        
        // Añadir al DOM
        container.appendChild(settingsButton);
        container.appendChild(themeMenu);
        
        // Guardar referencia al botón para actualizar su estado
        this.themeToggler = container;
        
        // Insertar en el documento, después del selector de fuentes
        const fontSelector = document.querySelector('.font-selector-container');
        if (fontSelector) {
            fontSelector.parentNode.insertBefore(container, fontSelector.nextSibling);
        } else {
            // Si no hay selector de fuentes, insertar después del header
            const header = document.querySelector('.header');
            if (header) {
                header.after(container);
            } else {
                // Última opción: insertar al principio de la página
                document.body.prepend(container);
            }
        }
    },
    
    // Cargar el tema guardado o usar el por defecto
    _loadSavedTheme: function() {
        // Intentar obtener el tema guardado
        const savedTheme = localStorage.getItem('preferredTheme');
        
        // Si hay un tema guardado y es válido, usarlo
        if (savedTheme && this.themes[savedTheme]) {
            this.setTheme(savedTheme);
        } else {
            // De lo contrario, usar el tema oscuro por defecto
            this.setTheme('dark');
        }
    },
    
    // Cambiar al tema especificado
    setTheme: function(themeName) {
        // Verificar que el tema existe
        if (!this.themes[themeName]) {
            console.error('Tema no reconocido:', themeName);
            return;
        }
        
        console.log('Cambiando al tema:', themeName);
        
        // Actualizar el tema actual
        this.currentTheme = themeName;
        const theme = this.themes[themeName];
        
        // Eliminar todas las clases de tema del body
        document.body.classList.remove('theme-dark', 'theme-light', 'theme-amber', 'theme-green');
        
        // Añadir la nueva clase
        document.body.classList.add(theme.class);
        
        // Actualizar la hoja de estilos
        if (theme.stylesheet) {
            this.themeStylesheet.href = theme.stylesheet;
            this.themeStylesheet.disabled = false;
        } else {
            // Si no tiene hoja de estilos específica (tema por defecto), desactivar
            this.themeStylesheet.disabled = true;
        }
        
        // Guardar la preferencia
        localStorage.setItem('preferredTheme', themeName);
        
        // Actualizar estado del botón
        this._updateTogglerState();
        
        // Disparar eventos para notificar el cambio de tema
        this._triggerThemeChangeEvent(themeName);
    },
    
    // Actualizar la apariencia del botón según el tema actual
    _updateTogglerState: function() {
        if (!this.themeToggler) return;
        
        // Obtener los botones de opciones de tema
        const options = this.themeToggler.querySelectorAll('.theme-option');
        
        // Quitar la clase activa de todas las opciones
        options.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.theme === this.currentTheme) {
                option.classList.add('active');
            }
        });
    },
    
    // Disparar evento de cambio de tema
    _triggerThemeChangeEvent: function(themeName) {
        // Crear un evento personalizado
        const event = new CustomEvent('themeChanged', {
            detail: {
                theme: themeName,
                themeData: this.themes[themeName]
            },
            bubbles: true
        });
        
        // Disparar el evento
        document.dispatchEvent(event);
    }
};

// Inicializar el selector de temas cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    ThemeManager.init();
});
