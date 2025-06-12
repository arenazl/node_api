# Implementación de MQ Importer API como Servicio de Windows

## Resumen

Este documento describe cómo convertir la aplicación Node.js MQ Importer API en un servicio de Windows que se ejecute de forma autónoma usando NSSM (Non-Sucking Service Manager).

## ¿Por qué NSSM en lugar de PM2?

Durante la implementación se identificó que PM2 tiene problemas de compatibilidad en este sistema Windows:
- **Error `spawn wmic ENOENT`**: PM2 no puede acceder a `wmic.exe` (deprecado en Windows modernos)
- **Error `process.getuid is not a function`**: PM2 intenta usar funciones de sistemas Unix en Windows
- **Reinicios constantes**: La aplicación se reiniciaba continuamente (179+ veces) debido a estos problemas

NSSM es la solución más robusta y confiable para crear servicios de Windows con aplicaciones Node.js.

## Archivos Incluidos

En el directorio `C:\Code\mq importer-api\node_api` encontrarás:

- **`nssm.exe`**: Ejecutable de NSSM (versión 2.24, 64-bit)
- **`instalar-servicio.ps1`**: Script para instalar y configurar el servicio
- **`iniciar-servicio.ps1`**: Script para iniciar el servicio
- **`desinstalar-servicio.ps1`**: Script para desinstalar el servicio
- **`nssm-2.24.zip`**: Archivo original de NSSM (puede eliminarse después de la instalación)
- **`nssm/`**: Carpeta con archivos extraídos (puede eliminarse después de la instalación)

## Instrucciones de Instalación

### Paso 1: Ejecutar el Script de Instalación

1. **Abrir PowerShell como Administrador**:
   - Haz clic derecho en el botón de Windows
   - Selecciona "Windows PowerShell (Administrador)" o "Terminal (Administrador)"
   - Si aparece UAC (Control de Cuentas de Usuario), haz clic en "Sí"

2. **Navegar al directorio del proyecto**:
   ```powershell
   cd "C:\Code\mq importer-api\node_api"
   ```

3. **Ejecutar el script de instalación**:
   ```powershell
   .\instalar-servicio.ps1
   ```

   El script realizará automáticamente:
   - Verificación de archivos necesarios
   - Instalación del servicio "MQImporterAPI"
   - Configuración del directorio de trabajo
   - Configuración de inicio automático
   - Configuración de reinicio automático en caso de fallo
   - Configuración de logs en la carpeta `logs/`

### Paso 2: Iniciar el Servicio

Una vez instalado, ejecuta:
```powershell
.\iniciar-servicio.ps1
```

O manualmente:
```powershell
.\nssm.exe start MQImporterAPI
```

## Verificación del Servicio

### Verificar Estado
```powershell
.\nssm.exe status MQImporterAPI
```

### Verificar que la API Responde
- **Interfaz web**: http://localhost:3000
- **Estado de salud**: http://localhost:3000/health
- **Documentación API**: http://localhost:3000/api

### Verificar en el Administrador de Servicios de Windows
1. Presiona `Win + R`
2. Escribe `services.msc` y presiona Enter
3. Busca "MQImporterAPI" en la lista

## Gestión del Servicio

### Comandos Básicos

```powershell
# Iniciar servicio
.\nssm.exe start MQImporterAPI

# Detener servicio
.\nssm.exe stop MQImporterAPI

# Reiniciar servicio
.\nssm.exe restart MQImporterAPI

# Ver estado
.\nssm.exe status MQImporterAPI

# Desinstalar servicio
.\nssm.exe remove MQImporterAPI confirm
```

### Scripts Automatizados

- **Iniciar**: `.\iniciar-servicio.ps1`
- **Desinstalar**: `.\desinstalar-servicio.ps1`

### Gestión desde Windows

También puedes gestionar el servicio desde:
- **Administrador de Servicios**: `services.msc`
- **Administrador de Tareas**: Pestaña "Servicios"

## Logs y Monitoreo

### Ubicación de Logs
- **Salida estándar**: `logs/service-output.log`
- **Errores**: `logs/service-error.log`

### Monitoreo
El servicio está configurado para:
- **Inicio automático** con Windows
- **Reinicio automático** en caso de fallo (5 segundos de espera)
- **Logging** de salida y errores

## Configuración del Servicio

### Detalles de la Configuración
- **Nombre del servicio**: MQImporterAPI
- **Descripción**: MQ Importer API - Servicio para procesamiento de mensajes MQ
- **Ejecutable**: `C:\Program Files\nodejs\node.exe`
- **Argumentos**: `server.js`
- **Directorio de trabajo**: `C:\Code\mq importer-api\node_api`
- **Tipo de inicio**: Automático
- **Usuario**: Sistema Local

### Modificar Configuración
Para modificar la configuración del servicio:
```powershell
# Ver configuración actual
.\nssm.exe get MQImporterAPI

# Modificar parámetros específicos
.\nssm.exe set MQImporterAPI <parámetro> <valor>
```

## Solución de Problemas

### El servicio no inicia
1. Verificar logs en `logs/service-error.log`
2. Verificar que Node.js está instalado: `node --version`
3. Verificar que el puerto 3000 no está en uso
4. Verificar permisos del directorio

### El servicio se detiene inesperadamente
1. Revisar `logs/service-error.log`
2. Verificar que no hay errores en la aplicación
3. Verificar que las dependencias están instaladas: `npm install`

### No se puede acceder a la API
1. Verificar que el servicio está corriendo: `.\nssm.exe status MQImporterAPI`
2. Verificar firewall de Windows
3. Probar localmente: http://localhost:3000/health

## Desinstalación

Para desinstalar completamente el servicio:

1. **Ejecutar script de desinstalación**:
   ```powershell
   .\desinstalar-servicio.ps1
   ```

2. **O manualmente**:
   ```powershell
   .\nssm.exe stop MQImporterAPI
   .\nssm.exe remove MQImporterAPI confirm
   ```

## Ventajas de esta Implementación

✅ **Servicio nativo de Windows**: Integración completa con el sistema operativo
✅ **Inicio automático**: Se inicia automáticamente con Windows
✅ **Reinicio automático**: Se reinicia automáticamente en caso de fallo
✅ **Gestión centralizada**: Se puede gestionar desde services.msc
✅ **Logs estructurados**: Salida y errores en archivos separados
✅ **Estabilidad**: No depende de herramientas que tienen problemas de compatibilidad
✅ **Facilidad de uso**: Scripts automatizados para todas las operaciones

## Contacto y Soporte

Para problemas o consultas adicionales, revisa:
- Los logs en la carpeta `logs/`
- La documentación en `documentacion/`
- Los archivos de configuración en `settings/`

---

**Nota**: Esta implementación reemplaza la configuración anterior de PM2 debido a problemas de compatibilidad identificados durante la instalación.
