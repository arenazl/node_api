# MQ Importer API - Guía de Implementación en Windows

Este paquete de documentación proporciona todos los recursos necesarios para implementar, configurar y consumir la API MQ Importer en entornos Windows, permitiendo que otras aplicaciones se conecten a ella como un servicio REST estándar.

## Inicio Rápido

Si desea poner en marcha la API lo más rápido posible:

1. Asegúrese de tener Node.js 16.x o superior instalado
2. Siga la [Guía Rápida de Instalación](GUIA-RAPIDA-INSTALACION.md) (tiempo estimado: 15-25 minutos)
3. Una vez configurada, acceda a la API desde cualquier aplicación mediante peticiones HTTP estándar

## ¿Qué es MQ Importer API?

La API MQ Importer es una aplicación Node.js/Express que permite procesar y analizar mensajes en formato MQ. Incluye:

- API REST completa para integración con otras aplicaciones
- Interfaz web para gestión y visualización (accesible desde navegador)
- Capacidad para procesar archivos Excel con estructuras de mensajes
- Soporte para cabeceras y datos de servicio
- Manejo de ocurrencias y campos anidados

## Documentación Incluida

### Guías de Implementación

- [**GUIA-RAPIDA-INSTALACION.md**](GUIA-RAPIDA-INSTALACION.md) - Enfoque paso a paso para instalación rápida
- [**WINDOWS-DEPLOYMENT.md**](WINDOWS-DEPLOYMENT.md) - Guía completa de implementación en Windows
- [**API-COMO-SERVICIO.md**](API-COMO-SERVICIO.md) - Aclaración sobre consumo de la API desde otras aplicaciones
- [**ACCESO-INTERFAZ-WEB.md**](ACCESO-INTERFAZ-WEB.md) - Guía para acceder a la interfaz web
- [**COMANDOS-RAPIDOS.md**](COMANDOS-RAPIDOS.md) - Referencia rápida de comandos esenciales

### Ejemplos de Integración

En la carpeta `ejemplos-integracion` encontrará:

- [**ejemplo-cliente-rest.js**](ejemplos-integracion/ejemplo-cliente-rest.js) - Cliente JavaScript/Node.js
- [**ejemplo_cliente_rest.py**](ejemplos-integracion/ejemplo_cliente_rest.py) - Cliente Python
- [**iniciar-servicio.ps1**](ejemplos-integracion/iniciar-servicio.ps1) - Script PowerShell para instalación asistida

## Preguntas Frecuentes

### ¿Cómo puedo acceder a la API desde mis aplicaciones?

La API se ejecuta como un servidor HTTP estándar, por lo que puede acceder a ella mediante peticiones HTTP normales desde cualquier lenguaje o aplicación. Ejemplos:

```
GET http://[servidor]:3000/api/services
POST http://[servidor]:3000/api/services/process
```

Consulte [API-COMO-SERVICIO.md](API-COMO-SERVICIO.md) para más detalles y ejemplos de código.

### ¿Cómo puedo acceder a la interfaz web?

La interfaz web está disponible automáticamente en:

```
http://[servidor]:3000
```

Consulte [ACCESO-INTERFAZ-WEB.md](ACCESO-INTERFAZ-WEB.md) para más detalles.

### ¿Cuál es la mejor forma de ejecutar la API en producción?

Recomendamos ejecutar la API como un servicio Windows utilizando PM2, tal como se describe en la [Guía Rápida de Instalación](GUIA-RAPIDA-INSTALACION.md). Esto garantiza que:

- La API se ejecute en segundo plano
- Se inicie automáticamente al arrancar el servidor
- Se reinicie automáticamente en caso de fallo
- Mantenga logs centralizados

### ¿Dónde puedo encontrar más información?

Para una visión completa de toda la documentación disponible, consulte el [Índice de Documentación](INDICE-DOCUMENTACION.md).

## Índice Completo

Para una lista organizada de toda la documentación, consulte el [Índice de Documentación](INDICE-DOCUMENTACION.md).

---

*© 2025 MQ Importer API Team*
