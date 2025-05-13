# Acceso a la Interfaz Web de MQ Importer API

Este documento explica cómo acceder y utilizar la interfaz web incluida en la API MQ Importer, que se sirve desde la carpeta `public/` del proyecto.

## Introducción

La API MQ Importer incluye una interfaz web completa que permite interactuar con todas las funcionalidades del sistema a través de un navegador. Esta interfaz está construida con HTML, CSS y JavaScript y se sirve automáticamente por el servidor Express.

## Archivos de la Interfaz Web

La interfaz web está organizada en la carpeta `public/` con la siguiente estructura:

```
public/
├── index.html          # Página principal
├── css/                # Estilos CSS
│   ├── styles.css      # Estilos generales
│   ├── api-documentation.css
│   └── ...
├── js/                 # Scripts JavaScript
│   ├── main.js         # Funcionalidad principal
│   ├── api-documentation.js
│   └── ...
└── (otros recursos)
```

## Acceso a la Interfaz Web

### Acceso Local (mismo equipo donde se ejecuta el servidor)

1. Inicie el servidor MQ Importer API (ver [COMANDOS-RAPIDOS.md](COMANDOS-RAPIDOS.md))
2. Abra un navegador y acceda a:
   ```
   http://localhost:3000
   ```
3. La página principal (`index.html`) se cargará automáticamente

### Acceso Remoto (desde otro equipo)

1. Asegúrese de que el servidor MQ Importer API esté en ejecución
2. Desde cualquier equipo en la misma red, abra un navegador y acceda a:
   ```
   http://[HOSTNAME]:3000
   ```
   donde `[HOSTNAME]` es el nombre o dirección IP del servidor

### Acceso a Archivos Específicos

También puede acceder directamente a cualquier archivo en la carpeta `public/`:

- `http://[HOSTNAME]:3000/archivo.html` - Para acceder a un archivo HTML específico
- `http://[HOSTNAME]:3000/css/styles.css` - Para acceder a archivos en subcarpetas
- `http://[HOSTNAME]:3000/js/main.js` - Para acceder a archivos JavaScript

## Funcionalidades de la Interfaz Web

La interfaz web proporciona las siguientes funcionalidades:

1. **Página Principal**: Visión general del sistema y navegación a las diferentes secciones
2. **Documentación de la API**: Información detallada sobre los endpoints disponibles
3. **Gestión de Servicios**: Interfaz para buscar, visualizar y procesar servicios
4. **Carga de Excel**: Herramientas para cargar y procesar archivos Excel con estructuras
5. **Visualización de Estructuras**: Interfaz para ver y analizar las estructuras de mensajes

## Personalización de la Interfaz Web

Si necesita personalizar la interfaz web:

1. **Modificar archivos existentes**: Puede editar los archivos HTML, CSS y JavaScript en la carpeta `public/`
2. **Agregar nuevos archivos**: Simplemente coloque los nuevos archivos en la carpeta `public/` o sus subcarpetas
3. **Cambiar estilos**: Modifique los archivos CSS en `public/css/` según sus necesidades

## Configuración de Seguridad

Para proteger los recursos de la interfaz web:

1. **Firewall**: Configure el firewall de Windows para restringir el acceso al puerto 3000
2. **Acceso HTTPS**: Considere configurar un proxy inverso (NGINX, IIS) para gestionar HTTPS
3. **Autenticación**: Implemente un sistema de autenticación si necesita restringir el acceso a usuarios específicos

## Solución de Problemas

### La interfaz web no carga

1. Verifique que el servidor esté en ejecución: `pm2 status` o `nssm status MQImporterAPI`
2. Compruebe que puede acceder a `http://[HOSTNAME]:3000/health`
3. Verifique que el archivo `public/index.html` existe y es accesible

### Problemas con la visualización

1. Limpie la caché del navegador
2. Intente con otro navegador para descartar problemas específicos
3. Verifique que todos los archivos CSS y JavaScript se cargan correctamente (use las herramientas de desarrollo del navegador)

## Ejemplos de uso

### Acceder a la documentación de la API

```
http://[HOSTNAME]:3000/api
```

### Acceder directamente a un servicio específico

```
http://[HOSTNAME]:3000/#/services/3088
```

### Cargar un archivo Excel

```
http://[HOSTNAME]:3000/#/excel
```

## Integración con otras aplicaciones web

Si desea integrar la interfaz web en otras aplicaciones:

1. Puede incrustar la interfaz en un iframe
2. Puede vincular directamente a páginas específicas usando las URLs apropiadas
3. Las aplicaciones JavaScript pueden comunicarse con la API mediante fetch o XMLHttpRequest

Ejemplo de iframe:

```html
<iframe 
  src="http://[HOSTNAME]:3000" 
  width="100%" 
  height="600px"
  style="border: 1px solid #ccc;">
</iframe>
```
