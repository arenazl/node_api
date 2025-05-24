/**
 * Service Tabs Module
 * 
 * Este módulo gestiona la navegación entre pestañas de servicios,
 * proporcionando funcionalidad para cambiar entre las vistas de IDA y VUELTA.
 */

// Cargar el estado de inicialización compartido si no está disponible
if (typeof window.ServiceInitializationState === 'undefined') {
    // Crear un elemento script para cargar el archivo
    const script = document.createElement('script');
    script.src = '/js/services_ui/common/service-initialization-state.js';
    document.head.appendChild(script);
    console.log('[Services UI - Tabs] Cargando módulo de estado de inicialización compartido');
}

// Ejecutar inicialización cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Services UI - Tabs] DOM cargado, iniciando inicialización de pestañas...');
    initializeTabs();
});

// Inicializar tabs de servicios
function initializeTabs() {
    console.log('[Services UI - Tabs] Inicializando pestañas de servicios...');
    
    try {
        // Obtener referencias a los elementos de las pestañas
        const serviceNavBtns = document.querySelectorAll('.services-tab-btn');
        const serviceTabContents = document.querySelectorAll('.service-tab-content');
        
        if (!serviceNavBtns.length || !serviceTabContents.length) {
            console.log('[Services UI - Tabs] No se encontraron elementos de pestañas');
            return;
        }
        
        // Agregar evento click a cada botón de pestaña
        serviceNavBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Obtener el id de la pestaña a mostrar
                const tabId = this.getAttribute('data-service-tab');
                
                // Desactivar todas las pestañas
                serviceNavBtns.forEach(navBtn => {
                    navBtn.classList.remove('active');
                });
                
                serviceTabContents.forEach(content => {
                    content.classList.remove('active');
                });
                
                // Activar la pestaña seleccionada
                this.classList.add('active');
                
                const selectedTab = document.getElementById(tabId + 'Service');
                if (selectedTab) {
                    selectedTab.classList.add('active');
                }
                
                // Activar contenido específico para cada pestaña
                if (tabId === 'ida') {
                    activateIdaTab();
                } else if (tabId === 'vuelta') {
                    activateVueltaTab();
                }
            });
        });
        
        // Activar la primera pestaña por defecto
        const defaultTab = serviceNavBtns[0];
        if (defaultTab) {
            defaultTab.click();
        }
        
        console.log('[Services UI - Tabs] Pestañas inicializadas correctamente');
    } catch (error) {
        console.error('[Services UI - Tabs] Error al inicializar pestañas:', error);
    }
}

/**
 * Activa la pestaña de IDA y realiza acciones específicas
 */
function activateIdaTab() {
    console.log('[Services UI - Tabs] Activando pestaña IDA');
    
    // Acciones específicas para la pestaña de IDA
    // Por ejemplo, cargar configuraciones o formatear elementos
    
    // Si hay un select de servicios IDA, aseguramos que esté actualizado
    const idaServiceSelect = document.getElementById('idaServiceSelect');
    if (idaServiceSelect && typeof loadServicesInSelect === 'function') {
        if (idaServiceSelect.options.length <= 1) {
            loadServicesInSelect(idaServiceSelect);
        }
    }
    
    // Inicializar los manejadores de IDA solo si no han sido inicializados previamente
    if (typeof initializeIdaServiceHandlers === 'function' && 
        window.ServiceInitializationState && 
        !window.ServiceInitializationState.isIdaInitialized()) {
        
        console.log('[Services UI - Tabs] Inicializando manejadores de servicios IDA...');
        initializeIdaServiceHandlers();
        window.ServiceInitializationState.setIdaInitialized();
    } else if (window.ServiceInitializationState && window.ServiceInitializationState.isIdaInitialized()) {
        console.log('[Services UI - Tabs] Manejadores de servicios IDA ya inicializados, omitiendo inicialización');
    } else {
        console.warn('[Services UI - Tabs] La función initializeIdaServiceHandlers no está disponible');
    }
}

/**
 * Activa la pestaña de VUELTA y realiza acciones específicas
 */
function activateVueltaTab() {
    console.log('[Services UI - Tabs] Activando pestaña VUELTA');
    
    // Acciones específicas para la pestaña de VUELTA
    
    // Si hay un select de servicios VUELTA, aseguramos que esté actualizado
    const vueltaServiceSelect = document.getElementById('vueltaServiceSelect');
    if (vueltaServiceSelect && typeof loadServicesInSelect === 'function') {
        if (vueltaServiceSelect.options.length <= 1) {
            loadServicesInSelect(vueltaServiceSelect);
        }
    }
    
    // Inicializar los manejadores de VUELTA solo si no han sido inicializados previamente
    if (typeof initializeVueltaServiceHandlers === 'function' && 
        window.ServiceInitializationState && 
        !window.ServiceInitializationState.isVueltaInitialized()) {
        
        console.log('[Services UI - Tabs] Inicializando manejadores de servicios VUELTA...');
        initializeVueltaServiceHandlers();
        window.ServiceInitializationState.setVueltaInitialized();
    } else if (window.ServiceInitializationState && window.ServiceInitializationState.isVueltaInitialized()) {
        console.log('[Services UI - Tabs] Manejadores de servicios VUELTA ya inicializados, omitiendo inicialización');
    } else {
        console.warn('[Services UI - Tabs] La función initializeVueltaServiceHandlers no está disponible');
    }
}

// Función para cambiar a una pestaña específica programáticamente
function switchToServiceTab(tabId) {
    const tabBtn = document.querySelector(`.services-tab-btn[data-service-tab="${tabId}"]`);
    if (tabBtn) {
        tabBtn.click();
        return true;
    }
    return false;
}
