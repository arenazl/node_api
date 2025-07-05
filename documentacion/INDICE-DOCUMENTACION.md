# Documentación - MQ Importer API

Documentación completa y consolidada de la API MQ Importer para Windows. Esta documentación proporciona todos los recursos necesarios para implementar, configurar y usar la API.

## 📋 Documentación Esencial

### 1. [**instalacion.md**](instalacion.md)
**Guía completa de instalación y configuración**
- Requisitos previos y descarga de Node.js
- Instalación paso a paso de la aplicación
- Configuración como servicio Windows (PM2/NSSM)
- Comandos útiles y solución de problemas
- Configuración avanzada y desinstalación

### 2. [**session.md**](session.md) 
**Documentación de sesiones de trabajo**
- Información del proyecto actual y estado
- Historial de sesiones y decisiones tomadas
- Estructura del proyecto y componentes
- Checklist de sesión y comandos útiles
- Notas de desarrollo y áreas de mejora

### 3. [**task.md**](task.md)
**Gestión y seguimiento de tareas**
- Tareas organizadas por prioridad (críticas, desarrollo, documentación)
- Sprint actual y métricas del proyecto
- Plantilla para nuevas tareas
- Proceso de actualización y seguimiento
- Backlog de ideas futuras

### 4. [**arquitectura.md**](arquitectura.md)
**Arquitectura del sistema**
- Descripción general del middleware MQ Importer
- Diagramas de arquitectura y flujo de trabajo
- Estructura de directorios y componentes principales
- Patrones de arquitectura implementados
- Servicios implementados y escalabilidad

### 5. [**componentes.md**](componentes.md)
**Componentes y tecnologías**
- Stack tecnológico completo (Node.js, Express, etc.)
- Arquitectura de componentes backend y frontend
- Sistema de almacenamiento y logging
- Middlewares y configuración
- Gestión de dependencias y monitoreo

### 6. [**ejemplos-api.md**](ejemplos-api.md)
**Ejemplos prácticos de uso**
- Endpoints principales (sendmessage, receivemessage)
- Endpoints de prueba (ping, echo)
- Ejemplos de integración en JavaScript, Python y C#
- Manejo de errores y mejores prácticas
- Clientes completos para diferentes lenguajes

---

## 🚀 Inicio Rápido

### Para nuevos desarrolladores:
1. **Instalar**: Seguir [instalacion.md](instalacion.md)
2. **Entender**: Revisar [arquitectura.md](arquitectura.md)
3. **Implementar**: Usar [ejemplos-api.md](ejemplos-api.md)

### Para desarrollo continuo:
1. **Organizar**: Actualizar [session.md](session.md) al inicio
2. **Planificar**: Revisar [task.md](task.md) para próximas tareas
3. **Implementar**: Usar [componentes.md](componentes.md) como referencia

---

## 🔧 Información Técnica

### Tecnologías Principales
- **Backend**: Node.js v16.x, Express.js v4.18.2
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Almacenamiento**: JSON estructurado
- **Servicio Windows**: PM2 o NSSM

### Endpoints Principales
- `POST /api/services/sendmessage` - Conversión JSON → String
- `POST /api/services/receivemessage` - Conversión String → JSON
- `GET /api/services` - Lista de servicios disponibles
- `GET /api-test/ping` - Health check

### Servicios Implementados
- **SVO1004**: Consulta Cliente por NIP
- **SVO1033**: Consulta Posición Préstamo por NIC
- **SVO1041**: Consulta Territorio
- **SVO1083**: Consulta de Impuestos
- **SVO1379**: Consulta Destinos de Financiación
- **SVO3088**: Imputador Genérico
- **SVO3147**: BM Contratos Relacionados

---

## 📁 Estructura del Proyecto

```
node_api/
├── server.js                    # Punto de entrada
├── routes/                      # Controladores API
│   ├── services.js             # ⭐ Endpoints principales
│   ├── ida-routes.js           # Rutas IDA
│   └── vuelta-routes.js        # Rutas VUELTA
├── utils/                       # Lógica de negocio
│   ├── message-creator.js      # JSON → String
│   ├── message-analyzer.js     # String → JSON
│   └── service-lookup.js       # Gestión servicios
├── public/                      # Frontend
│   ├── index.html              # Interfaz principal
│   └── js/api_client/          # Cliente API
├── JsonStorage/                 # Almacenamiento
│   ├── structures/             # Metadatos servicios
│   ├── settings/               # Configuraciones
│   └── uploads/                # Archivos Excel
└── documentacion/              # Esta documentación
```

---

## 🌐 Acceso a la Interfaz

### URLs Importantes
- **Interfaz Web**: `http://localhost:3000`
- **API Base**: `http://localhost:3000/api`
- **Health Check**: `http://localhost:3000/api-test/ping`
- **Logs Web**: `http://localhost:3000/logs.html`

### Funcionalidades Web
- **Tab CARGA**: Subida y procesamiento de archivos Excel
- **Tab CONFIGURACIÓN**: Setup por servicio y canal
- **Tab SERVICIOS**: Gestión de servicios y versiones

---

## 🔄 Flujo de Trabajo

### Operación Normal
1. **Cargar servicio**: Excel → Parser → Estructura JSON
2. **Configurar por canal**: Setup parámetros específicos
3. **Usar en aplicación**: Frontend consume vía API
4. **Integrar con mainframe**: Conversión automática

### Desarrollo
1. **Sesión**: Actualizar `session.md`
2. **Tareas**: Revisar `task.md`
3. **Implementar**: Seguir patrones en `componentes.md`
4. **Probar**: Usar ejemplos en `ejemplos-api.md`

---

## 📞 Soporte

### Para Problemas
1. Revisar [instalacion.md](instalacion.md) - Sección "Solución de Problemas"
2. Consultar logs: `pm2 logs mq-importer-api`
3. Verificar conectividad: `curl http://localhost:3000/api-test/ping`

### Para Desarrollo
1. Consultar [task.md](task.md) para tareas pendientes
2. Revisar [arquitectura.md](arquitectura.md) para entender el sistema
3. Usar [componentes.md](componentes.md) como referencia técnica

---

*© 2025 MQ Importer API Team*  
*Última actualización: 2025-01-11*
