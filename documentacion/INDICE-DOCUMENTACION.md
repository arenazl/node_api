# Índice de Documentación - MQ Importer API para Windows

Esta documentación proporciona todos los recursos necesarios para implementar, configurar y consumir la API MQ Importer en entornos Windows.

## Documentación Principal

- [**GUIA-RAPIDA-INSTALACION.md**](GUIA-RAPIDA-INSTALACION.md): Enfoque recomendado paso a paso para instalar rápidamente
  - Instalación básica en 10-15 minutos
  - Configuración como servicio en 5-10 minutos
  - Solución a problemas comunes
  - Verificación post-instalación

- [**WINDOWS-DEPLOYMENT.md**](WINDOWS-DEPLOYMENT.md): Guía completa de implementación en Windows
  - Requisitos previos
  - Instalación
  - Configuración
  - Ejecución como servicio (PM2 y NSSM)
  - Integración con otras aplicaciones
  - Monitorización y mantenimiento
  - Solución de problemas
  - Consideraciones de seguridad

- [**COMANDOS-RAPIDOS.md**](COMANDOS-RAPIDOS.md): Referencia rápida de comandos
  - Instalación inicial
  - Ejecución manual
  - Comandos para PM2
  - Comandos para NSSM
  - URLs importantes
  - Endpoints principales

- [**COMANDOS-CONFIG-WINDOWS.md**](COMANDOS-CONFIG-WINDOWS.md): Comandos específicos para instalación y configuración
  - Requisitos previos
  - Instalación con PM2
  - Instalación alternativa con NSSM
  - Gestión del servicio
  - Verificación y pruebas
  - Configuraciones adicionales
  - Solución de problemas

- [**API-ENDPOINTS-PRUEBA.md**](API-ENDPOINTS-PRUEBA.md): Endpoints para verificar el funcionamiento de la API
  - Ping - Verificación del servicio
  - Echo con parámetro - Repetición de texto  
  - Echo con cuerpo - Repetición de JSON
  - Error simulado - Manejo de errores
  - Ejemplos de código para consumo en JavaScript y Python
  
- [**DEBUGGING-GUIDE.md**](DEBUGGING-GUIDE.md): Guía para desarrollo y solución de problemas
  - Ejecución en modo desarrollo (sin PM2)
  - Debugging con Inspector de Node.js
  - Monitoreo de logs con PM2
  - Debugging con variables de entorno
  - Prueba de endpoints durante desarrollo
  - Solución de problemas comunes

- [**ACCESO-INTERFAZ-WEB.md**](ACCESO-INTERFAZ-WEB.md): Guía detallada para acceder a la interfaz web
  - Acceso local y remoto
  - Estructura de archivos
  - Funcionalidades disponibles
  - Personalización
  - Integración con otras aplicaciones

- [**API-COMO-SERVICIO.md**](API-COMO-SERVICIO.md): Aclaración sobre consumo de la API desde otras aplicaciones
  - Funcionamiento como endpoint REST
  - Métodos HTTP soportados
  - Ejemplos de integración en JavaScript, Python y C#
  - Ventajas de ejecutar como servicio
  - Configuraciones importantes para conectividad

## Ejemplos de Integración

- [**ejemplo-cliente-rest.js**](ejemplos-integracion/ejemplo-cliente-rest.js): Cliente JavaScript/Node.js
  - Configuración del cliente
  - Métodos para interactuar con la API
  - Ejemplos de uso

- [**ejemplo_cliente_rest.py**](ejemplos-integracion/ejemplo_cliente_rest.py): Cliente Python
  - Clase client con métodos para todas las operaciones
  - Manejo de errores
  - Ejemplos de uso

- [**iniciar-servicio.ps1**](ejemplos-integracion/iniciar-servicio.ps1): Script PowerShell
  - Verificación de requisitos
  - Configuración automática
  - Múltiples opciones de inicio
  - Modo interactivo

## Documentación Original del Proyecto

- [**README.md**](README.md): Documentación general del proyecto
  - Descripción y características
  - Requisitos
  - Instalación
  - Endpoints
  - Flujo de trabajo

- [**heroku-deploy.md**](heroku-deploy.md): Guía de despliegue en Heroku

## Acceso a la Interfaz Web (Carpeta Public)

La API MQ Importer incluye una interfaz web completa que se sirve automáticamente desde la carpeta `public/` del proyecto. El servidor Express está configurado para servir estos archivos estáticos sin necesidad de configuración adicional.

- **Acceso estándar**: `http://[servidor]:3000` carga automáticamente el archivo `public/index.html`
- **Archivos específicos**: Acceda directamente a cualquier archivo en la carpeta public mediante la URL correspondiente:
  - `http://[servidor]:3000/archivo.html`
  - `http://[servidor]:3000/css/styles.css`
  - `http://[servidor]:3000/js/main.js`

Para más detalles sobre cómo gestionar y proteger estos recursos, consulte la sección correspondiente en **WINDOWS-DEPLOYMENT.md**.

## Cómo Utilizar Esta Documentación

1. Comience con **WINDOWS-DEPLOYMENT.md** para obtener una comprensión completa del proceso de implementación.
2. Utilice **COMANDOS-RAPIDOS.md** como referencia rápida durante la implementación y mantenimiento.
3. Consulte los ejemplos de integración según el lenguaje que utilice su aplicación cliente.
4. Use el script **iniciar-servicio.ps1** para una configuración rápida y guiada.

## Requisitos Mínimos

- **Node.js**: Versión 16.x o superior
- **npm**: Versión 8.x o superior
- Para ejecutar como servicio: PM2 o NSSM

## Soporte y Contribuciones

Para obtener ayuda adicional o reportar problemas, puede:

1. Revisar la documentación completa en este repositorio
2. Consultar los archivos de ejemplo en la carpeta `ejemplos-integracion`
3. Contactar al equipo de desarrollo mediante [contacto@ejemplo.com]

---

*© 2025 MQ Importer API Team*
