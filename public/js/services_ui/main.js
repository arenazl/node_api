/**
 * Main - Services UI Module Loader
 * 
 * Este archivo es el punto de entrada principal para los scripts de la UI de servicios.
 * Se encarga de cargar todos los módulos necesarios en el orden correcto, asegurando
 * que las dependencias estén disponibles cuando se necesiten.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('[Services UI] Inicializando módulos de servicios...');
    
    // Cargar el estado de inicialización compartido si no está disponible
    if (typeof window.ServiceInitializationState === 'undefined') {
        // Crear un elemento script para cargar el archivo
        const script = document.createElement('script');
        script.src = '/js/services_ui/common/service-initialization-state.js';
        document.head.appendChild(script);
        console.log('[Services UI - Main] Cargando módulo de estado de inicialización compartido');
    }
    
    // Función de carga de script con mayor seguridad
    function loadScript(src, callback) {
        // Verificar si el script ya está cargado para evitar duplicados
        const existingScripts = document.querySelectorAll('script[src="' + src + '"]');
        if (existingScripts && existingScripts.length > 0) {
            console.log(`Script ${src} ya está cargado, evitando duplicado`);
            if (callback) callback();
            return;
        }
        
        // Verificar que document y document.head existan
        if (!document || !document.head) {
            console.error('[Services UI] Documento o head no disponible');
            if (callback) callback();
            return;
        }
        
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        script.onload = function() {
            console.log(`Script ${src} cargado exitosamente`);
            if (callback) callback();
        };
        script.onerror = function() {
            console.error('[Services UI] Error al cargar el script:', src);
            // Continuamos con el siguiente script para no bloquear toda la carga
            if (callback) callback();
        };
        document.head.appendChild(script);
    }
    
    // Primero cargamos las dependencias externas (API client)
    loadScript('/js/api_client/service-api-client.js', function() {
        console.log('[Services UI] API Client cargado');
        
        // Verificar si todas las APIs de configuración ya están disponibles (cargadas desde el HTML)
        if (typeof ConfigUtils !== 'undefined' && 
            typeof ConfigManager !== 'undefined' && 
            typeof ConfigServiceLoader !== 'undefined') {
            
            console.log('[Services UI] Módulos de configuración ya cargados desde HTML');
            loadModulesAfterConfig();
        } else {
            // En caso de que no estén cargados, cargar solo los que faltan
            console.log('[Services UI] Cargando módulos de configuración faltantes');
            // Verificar y cargar ConfigUtils si no existe
            if (typeof ConfigUtils === 'undefined') {
                loadScript('/js/config/config-utils.js', continueConfigLoad);
            } else {
                continueConfigLoad();
            }
        }
    });
    
    // Función para cargar el siguiente módulo de configuración si es necesario
    function continueConfigLoad() {
        // Cascade load config modules in correct order
        if (typeof ConfigUtils === 'undefined') {
            loadScript('/js/config/config-utils.js', function() {
                console.log('[Services UI] ConfigUtils cargado');
                // After ConfigUtils is loaded, load ConfigManager if needed
                if (typeof ConfigManager === 'undefined') {
                    loadScript('/js/config/config-manager.js', loadModulesAfterConfig);
                } else {
                    loadModulesAfterConfig();
                }
            });
        } else if (typeof ConfigManager === 'undefined') {
            // ConfigUtils already loaded, load ConfigManager
            loadScript('/js/config/config-manager.js', loadModulesAfterConfig);
        } else {
            loadModulesAfterConfig();
        }
    }
    
    // Después de cargar las configuraciones, cargamos los módulos de servicios
    function loadModulesAfterConfig() {
        console.log('[Services UI] Cargando módulos de servicios UI');
        
        // Configurar WebSocket para actualizaciones en tiempo real
        setupRealTimeUpdates();
        
        // Una vez cargadas las configuraciones, cargamos los módulos comunes
        // Nota: service-tabs.js ya se inicializa por sí mismo, solo verificamos que esté cargado
        if (typeof initializeTabs === 'function') {
            console.log('[Services UI] Módulo de pestañas ya cargado, continuando con otros módulos');
            loadServiceModules();
        } else {
            loadScript('/js/services_ui/common/service-tabs.js', function() {
                console.log('[Services UI] Módulo de pestañas cargado');
                loadServiceModules();
            });
        }
    }
    
    // Configurar WebSocket para actualizaciones en tiempo real
    function setupRealTimeUpdates() {
        // Verificar si Socket.IO ya está disponible
        if (typeof io === 'undefined') {
            console.warn('[Services UI] Socket.IO no está disponible para actualizaciones en tiempo real');
            return;
        }
        
        try {
            // Conectar al servidor WebSocket
            const socket = io();
            
            // Manejar evento de conexión
            socket.on('connect', function() {
                console.log('[WebSocket] Conexión establecida con ID:', socket.id);
            });
            
            // Manejar evento de configuración guardada
            socket.on('config:saved', function(data) {
                console.log('[WebSocket] Nueva configuración guardada:', data);
                
                // Forzar actualización de la lista de servicios
                if (typeof ServiceApiClient !== 'undefined') {
                    ServiceApiClient.getServices(true)
                        .then(() => {
                            console.log('[WebSocket] Lista de servicios actualizada después de guardar configuración');
                        })
                        .catch(error => {
                            console.error('[WebSocket] Error al actualizar servicios:', error);
                        });
                }
                
                // Si estamos en la pestaña API, actualizar las configuraciones para el servicio actual
                const apiTab = document.querySelector('.services-tab-content[data-tab="ida"], .services-tab-content[data-tab="vuelta"]');
                if (apiTab && apiTab.classList.contains('active')) {
                    // Identificar qué selector de servicio está activo (IDA o VUELTA)
                    const serviceSelect = apiTab.querySelector('#idaServiceSelect, #vueltaServiceSelect');
                    const configSelect = apiTab.querySelector('#idaConfigSelect, #vueltaConfigSelect');
                    
                    if (serviceSelect && configSelect && serviceSelect.value === data.serviceNumber) {
                        console.log('[WebSocket] Actualizando configuraciones para el servicio actual:', data.serviceNumber);
                        
                        // Guardar la selección actual
                        const currentConfigId = configSelect.value;
                        
                        // Determinar qué función de carga usar basado en el módulo activado
                        if (apiTab.id === 'idaService' && typeof loadConfigsForService === 'function') {
                            loadConfigsForService(data.serviceNumber, configSelect);
                        } else if (apiTab.id === 'vueltaService' && typeof loadConfigsForService === 'function') {
                            loadConfigsForService(data.serviceNumber, configSelect);
                        }
                    }
                }
            });
            
            // Manejar evento de desconexión
            socket.on('disconnect', function() {
                console.log('[WebSocket] Desconectado del servidor');
            });
            
            // Manejar errores
            socket.on('error', function(error) {
                console.error('[WebSocket] Error:', error);
            });
            
            console.log('[Services UI] Configuración de WebSocket completada');
        } catch (error) {
            console.error('[Services UI] Error al configurar WebSocket:', error);
        }
    }
    
    // Función para cargar los módulos de servicio después de verificar las pestañas
    function loadServiceModules() {
        // Luego cargamos los módulos de servicio
        loadScript('/js/services_ui/common/servicios-manager.js', function() {
            console.log('[Services UI] Módulo de gestión de servicios cargado');
            
            loadScript('/js/services_ui/common/simple-example-generator.js', function() {
                console.log('[Services UI] Módulo de ejemplos cargado');
                
                                // Cargamos los módulos IDA
                                loadScript('/js/services_ui/ida/ida-service-handlers.js', function() {
                                    console.log('[Services UI] Módulo de manejadores IDA cargado');
                                    
                                    loadScript('/js/services_ui/ida/request-structure-display.js', function() {
                                        console.log('[Services UI] Módulo de visualización de estructura de solicitud cargado');
                                        
                                        // Finalmente cargamos los módulos VUELTA
                                        loadScript('/js/services_ui/vuelta/vuelta-service-handlers.js', function() {
                                            console.log('[Services UI] Módulo de manejadores VUELTA cargado');
                            
                                            loadScript('/js/services_ui/vuelta/response-fields-display.js', function() {
                                                console.log('[Services UI] Módulo de visualización de campos de respuesta cargado');
                                                
                                                // Cargar el nuevo formateador de datos de respuesta
                                                loadScript('/js/services_ui/vuelta/response-data-formatter.js', function() {
                                                    console.log('[Services UI] Módulo de formato de datos de respuesta cargado');
                                                    
                                                    // Cargar el analizador de respuestas
                                                    loadScript('/js/services_ui/vuelta/vuelta-response-analyzer.js', function() {
                                                        console.log('[Services UI] Módulo de análisis de respuestas cargado');
                                        
                                                        // Verificamos si los manejadores de servicios ya han sido inicializados
                                                        if (window.ServiceInitializationState) {
                                                            // Inicializar IDA handlers si es necesario
                                                            if (!window.ServiceInitializationState.isIdaInitialized() && 
                                                                typeof initializeIdaServiceHandlers === 'function') {
                                                                console.log('[Services UI] Inicializando manejadores IDA desde main.js');
                                                                initializeIdaServiceHandlers();
                                                                window.ServiceInitializationState.setIdaInitialized();
                                                            }
                                                            
                                                            // Inicializar VUELTA handlers si es necesario
                                                            if (!window.ServiceInitializationState.isVueltaInitialized() && 
                                                                typeof initializeVueltaServiceHandlers === 'function') {
                                                                console.log('[Services UI] Inicializando manejadores VUELTA desde main.js');
                                                                initializeVueltaServiceHandlers();
                                                                window.ServiceInitializationState.setVueltaInitialized();
                                                            }
                                                        }
                                                        
                                                        // Verificar si las pestañas ya están inicializadas
                                                        if (typeof switchToServiceTab === 'function') {
                                                            console.log('[Services UI] Las pestañas ya están inicializadas, no es necesario reinicializar');
                                                            // Forzar la activación de la primera pestaña para garantizar la carga correcta
                                                            setTimeout(function() {
                                                                const firstTabBtn = document.querySelector('.services-tab-btn');
                                                                if (firstTabBtn) firstTabBtn.click();
                                                            }, 100);
                                                        } else {
                                                            // Como respaldo, inicializar con reintentos
                                                            initializeServicesWithRetry();
                                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    // Función de inicialización con reintentos
    function initializeServicesWithRetry(attempts = 3) {
        console.log(`[Services UI] Intentando inicializar servicios (intentos restantes: ${attempts})...`);

        // Buscar contenedor de servicios de manera más flexible
        const servicesContainer = document.querySelector('.services-tabs') || 
                                   document.querySelector('#servicios') || 
                                   document.body;
        
        // Verificación de seguridad adicional
        if (!servicesContainer) {
            console.warn('[Services UI] No se encontró ningún contenedor de servicios');
            if (attempts > 0) {
                setTimeout(() => {
                    initializeServicesWithRetry(attempts - 1);
                }, 500);
            }
            return;
        }
        
        // Buscar botones de servicios de manera más flexible
        const serviceNavBtns = servicesContainer.querySelectorAll('.services-tab-btn, .services-nav button') || [];
        
        if (serviceNavBtns.length === 0) {
            console.warn('[Services UI] No se encontraron botones de servicio');
            
            // Reintentar si quedan intentos
            if (attempts > 0) {
                setTimeout(() => {
                    initializeServicesWithRetry(attempts - 1);
                }, 500);
            }
            return;
        }

        // Añadir event listeners de manera segura
        serviceNavBtns.forEach(function(btn) {
            // Verificación adicional de seguridad
            if (!btn || typeof btn.addEventListener !== 'function') {
                console.warn('[Services UI] Botón de servicio no válido', btn);
                return;
            }

            btn.addEventListener('click', function() {
                // Obtener el ID del servicio de manera segura
                const tabId = this.getAttribute('data-service-tab') || 
                              this.getAttribute('data-tab');
                
                if (!tabId) {
                    console.warn('[Services UI] Botón de servicio sin identificador de tab');
                    return;
                }
                
                // Desactivar todos los botones
                serviceNavBtns.forEach(function(b) {
                    if (b) {
                        b.classList.remove('active');
                        // Usar data-service-tab o data-tab
                        const currentTabId = b.getAttribute('data-service-tab') || 
                                             b.getAttribute('data-tab');
                        if (currentTabId) {
                            const content = document.getElementById(`${currentTabId}Service`) || 
                                            document.querySelector(`.service-tab-content[data-tab="${currentTabId}"]`);
                            if (content) content.classList.remove('active');
                        }
                    }
                });
                
                // Activar el botón actual
                this.classList.add('active');
                
                // Buscar y activar el contenido correspondiente
                const content = document.getElementById(`${tabId}Service`) || 
                                document.querySelector(`.service-tab-content[data-tab="${tabId}"]`);
                
                if (content) {
                    content.classList.add('active');
                }
            });
        });

        console.log('[Services UI] Inicialización de servicios completada');
    }
});
