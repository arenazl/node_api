# Instalación - MQ Importer API

## Requisitos Previos

- **Sistema Operativo**: Windows 10 o Windows Server 2016/2019/2022
- **Node.js**: Versión 16.0 o superior
- **npm**: Versión 8.0 o superior  
- **Permisos**: Cuenta con privilegios de administrador

## Instalación Rápida

### 1. Instalar Node.js
1. Descargar Node.js desde [nodejs.org](https://nodejs.org/)
2. Ejecutar instalador y seguir instrucciones
3. Verificar instalación:
   ```cmd
   node --version
   npm --version
   ```

### 2. Instalar la Aplicación
1. Descomprimir el paquete en `C:\Servicios\mq-importer-api\`
2. Abrir CMD como administrador
3. Navegar al directorio:
   ```cmd
   cd C:\Servicios\mq-importer-api\node_api
   ```
4. Instalar dependencias:
   ```cmd
   npm install
   ```

### 3. Configurar Variables de Entorno
1. Crear archivo `.env` (copiar de `.env.example` si existe):
   ```
   NODE_ENV=production
   PORT=3000
   LOG_LEVEL=info
   ```

### 4. Ejecutar como Servicio Windows

#### Opción A: Con PM2 (Recomendado)
```cmd
# Instalar PM2
npm install -g pm2
npm install -g pm2-windows-startup

# Configurar startup
pm2-startup install

# Iniciar aplicación
pm2 start server.js --name mq-importer-api

# Guardar configuración
pm2 save
```

#### Opción B: Con NSSM (Alternativa)
```cmd
# Usar NSSM incluido en instalacion/nssm/
cd instalacion

# Ejecutar script de instalación
.\instalar-servicio.ps1

# Iniciar servicio
.\iniciar-servicio.ps1
```

### 5. Verificar Instalación
- **Estado del servicio**: `pm2 status`
- **Prueba API**: `curl http://localhost:3000/api-test/ping`
- **Interfaz web**: `http://localhost:3000`

## Comandos Útiles

### Gestión del Servicio
```cmd
# PM2
pm2 start mq-importer-api     # Iniciar
pm2 stop mq-importer-api      # Detener
pm2 restart mq-importer-api   # Reiniciar
pm2 logs mq-importer-api      # Ver logs
pm2 delete mq-importer-api    # Eliminar

# NSSM
.\iniciar-servicio.ps1        # Iniciar
.\desinstalar-servicio.ps1    # Desinstalar
```

### Desarrollo
```cmd
npm run dev                   # Modo desarrollo
npm start                     # Producción
```

## Configuración Avanzada

### Firewall Windows
Para acceso remoto, abrir puerto 3000 en el firewall:
1. Panel de Control > Firewall de Windows
2. "Permitir una aplicación..."
3. Agregar puerto 3000

### Configuración de Memoria
```cmd
pm2 restart mq-importer-api --max-memory-restart 1024M
```

## Solución de Problemas

### Problemas Comunes
- **Puerto ocupado**: Cambiar PORT en `.env`
- **Permisos**: Ejecutar como administrador
- **Servicio no inicia**: Revisar logs con `pm2 logs`

### Verificar Logs
```cmd
# Logs PM2
pm2 logs mq-importer-api

# Logs aplicación
tail -f logs/app.log
```

## Desinstalación

### PM2
```cmd
pm2 delete mq-importer-api
pm2 kill
npm uninstall -g pm2
```

### NSSM
```cmd
cd instalacion
.\desinstalar-servicio.ps1
``` 