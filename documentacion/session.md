# Sessions de Trabajo - MQ Importer API

## Información del Proyecto
- **Nombre**: MQ Importer API
- **Versión**: 1.0.0
- **Rama actual**: main_v6
- **Tecnologías**: Node.js, Express, Excel Processing, JSON Storage
- **Último commit**: [Pendiente - archivos modificados sin commit]

## Sesión Actual
**Fecha**: 2025-01-11  
**Objetivo**: Organización y documentación del código  
**Estado**: En progreso

### Archivos Modificados (Sin Commit)
- `instalacion/desinstalar-servicio.ps1`
- `instalacion/iniciar-servicio.ps1` 
- `instalacion/instalar-servicio.ps1`
- `routes/services.js`

### Archivos Nuevos (Sin Seguimiento)
- `JsonStorage/headers/3088_header_sample.json`
- `JsonStorage/structures/20250703T183546_3088_structure.json`
- `JsonStorage/uploads/20250703T18354_SVO3088 - Imputador Generico para varias operaciones.xls`

---

## Historial de Sesiones

### Sesión 2025-01-11
**Objetivo**: Organización y documentación del código
**Actividades**:
- [ ] Revisión de estructura del proyecto
- [ ] Creación de documentación organizacional (session.md, task.md)
- [ ] Identificación de áreas de mejora
- [ ] Planificación de refactoring

**Decisiones tomadas**:
- Crear sistema de documentación organizacional
- Priorizar organización del código antes de nuevas features

**Próximos pasos**:
- Completar documentación organizacional
- Definir tasks prioritarias
- Hacer commit de cambios pendientes

---

## Estructura del Proyecto

### Componentes Principales
```
node_api/
├── server.js                 # Servidor principal
├── routes/                   # Rutas de la API
│   ├── api.js               # Rutas principales API
│   ├── excel.js             # Procesamiento Excel
│   ├── services.js          # Servicios MQ
│   └── ...
├── utils/                    # Utilidades
│   ├── excel-parser.js      # Parser de Excel
│   ├── message-creator.js   # Creador de mensajes
│   └── ...
├── public/                   # Interfaz web
│   ├── index.html
│   ├── css/
│   └── js/
├── JsonStorage/             # Almacenamiento JSON
│   ├── structures/          # Estructuras de servicios
│   ├── headers/            # Headers de ejemplo
│   └── uploads/            # Archivos subidos
└── documentacion/          # Documentación
```

### Servicios Implementados
- **SVO1004**: Consulta Cliente por NIP
- **SVO1033**: Consulta Posición Préstamo por NIC
- **SVO1041**: Consulta Territorio
- **SVO1083**: Consulta de Impuestos
- **SVO1379**: Consulta Destinos de Financiación
- **SVO3088**: Imputador Genérico (recién agregado)
- **SVO3147**: BM Contratos Relacionados

---

## Configuración del Entorno

### Variables de Entorno
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

### Dependencias Clave
- **Express**: Framework web
- **XLSX**: Procesamiento de Excel
- **Winston**: Logging
- **Morgan**: Request logging
- **CORS**: Cross-origin requests

---

## Notas de Desarrollo

### Patrones de Código
- Rutas organizadas por funcionalidad
- Utilidades separadas por responsabilidad
- Almacenamiento JSON estructurado por servicio
- Interfaz web modular con CSS y JS separados

### Áreas de Mejora Identificadas
1. **Organización de rutas**: Consolidar y mejorar estructura
2. **Manejo de errores**: Estandarizar respuestas de error
3. **Validación**: Implementar validación consistente
4. **Tests**: Agregar suite de tests
5. **Documentación**: Completar documentación técnica

### Convenciones
- Nombres de archivos en kebab-case
- Comentarios en español
- Estructura JSON consistente para servicios
- Logging estructurado con Winston

---

## Checklist de Sesión

### Pre-sesión
- [ ] Revisar git status
- [ ] Verificar que el servidor funciona
- [ ] Revisar logs recientes

### Durante la sesión
- [ ] Documentar cambios realizados
- [ ] Actualizar task.md con nuevas tareas
- [ ] Hacer commits frecuentes con mensajes descriptivos

### Post-sesión
- [ ] Commit final de cambios
- [ ] Actualizar documentación si es necesario
- [ ] Planificar próxima sesión

---

## Comandos Útiles

### Desarrollo
```bash
# Iniciar en modo desarrollo
npm run dev

# Iniciar en producción
npm start

# Ver logs
tail -f logs/app.log
```

### Git
```bash
# Ver estado
git status

# Agregar cambios
git add .

# Commit con formato
git commit -m "feat(componente): descripción del cambio"

# Push
git push origin main_v6
```

### Servicio Windows
```bash
# Instalar servicio
.\instalacion\instalar-servicio.ps1

# Iniciar servicio
.\instalacion\iniciar-servicio.ps1

# Desinstalar servicio
.\instalacion\desinstalar-servicio.ps1
```

---

## Contactos y Referencias

### URLs Importantes
- **Interfaz Web**: http://localhost:3000
- **API Base**: http://localhost:3000/api
- **Logs Web**: http://localhost:3000/logs.html

### Documentación Relacionada
- [README Principal](README.md)
- [Guía de Instalación](GUIA-RAPIDA-INSTALACION.md)
- [Arquitectura](ARQUITECTURA-APLICACION.md)
- [Tasks](task.md) 