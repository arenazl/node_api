# Guía de Debugging para MQ Importer API

Este documento proporciona instrucciones detalladas para ejecutar la API MQ Importer en modo de debugging y solucionar problemas comunes.

## 1. Ejecutar en Modo Desarrollo (sin PM2)

Para desarrollo y debugging, es recomendable ejecutar la API directamente con Node.js:

```bash
# Detener el servicio de PM2 primero (si está ejecutándose)
pm2 stop mq-importer-api

# Ejecutar directamente con Node.js
node server.js
```

Esto ejecutará la API y mostrará todos los logs directamente en la consola, lo que facilita el debugging.

## 2. Debugging con Inspect

Para un debugging más avanzado, puede utilizar el inspector de Node.js:

```bash
# Debugging básico
node --inspect server.js

# Debugging con pausa al inicio (útil para investigar problemas de inicio)
node --inspect-brk server.js
```

Luego puede conectarse al debugger utilizando:
- Chrome/Edge: Navegue a `chrome://inspect`
- VS Code: Configure un lanzamiento de debugging para Node.js

## 3. Monitoreo de Logs en PM2

Si prefiere mantener PM2 activo mientras realiza debugging:

```bash
# Ver logs en tiempo real
pm2 logs mq-importer-api --lines 100

# Ver solo errores
pm2 logs mq-importer-api --err --lines 100

# Guardar logs en un archivo
pm2 logs mq-importer-api --lines 1000 > debug-logs.txt
```

## 4. Debugging con Variables de Entorno

Puede activar diferentes niveles de logs y comportamientos de debugging utilizando variables de entorno:

```bash
# Modo desarrollo con más logs
NODE_ENV=development node server.js

# Logs de debug detallados
DEBUG=express:* node server.js

# Combinación de variables
NODE_ENV=development DEBUG=express:*,api:* node server.js
```

## 5. Prueba de Endpoints Específicos

Para probar endpoints específicos durante el debugging:

```bash
# Usando curl para pruebas rápidas  
curl http://localhost:3000/api-test/ping

# Para endpoints que requieren datos JSON
curl -X POST http://localhost:3000/api-test/echo \
  -H "Content-Type: application/json" \
  -d '{"test": "valor"}'
```

## 6. Solución de Problemas Comunes

### Problemas de conexión o puerto

Si hay problemas con el puerto 3000 ya en uso:

```bash
# En Windows, encontrar proceso usando el puerto
netstat -ano | findstr :3000
# Identificar el PID y terminarlo si es necesario
taskkill /PID [numero_pid] /F

# Alternativamente, cambiar el puerto en .env
echo PORT=3001 >> .env
```

### Problemas de dependencias

Si hay errores relacionados con dependencias:

```bash
# Reinstalar dependencias desde cero
rm -rf node_modules package-lock.json
npm install

# Si hay problemas específicos con una dependencia
npm install [nombre-dependencia]@latest
```

### Reinicio limpio

Para un reinicio limpio del servicio:

```bash
# Detener y eliminar de PM2
pm2 delete mq-importer-api

# Iniciar de nuevo con logs completos
pm2 start server.js --name "mq-importer-api" --log logs/app.log
```

## 7. Monitoreo Avanzado con PM2

PM2 ofrece herramientas de monitoreo que son útiles durante el debugging:

```bash
# Monitoreo en tiempo real (CPU, memoria, etc.)
pm2 monit

# Estado detallado
pm2 show mq-importer-api

# Detalles de rendimiento
pm2 describe mq-importer-api
```

## 8. Desarrollo y Demonio Concurrentes

Para desarrollo activo, puede ser útil usar nodemon para recargar automáticamente:

```bash
# Instalar nodemon globalmente si no está instalado
npm install -g nodemon

# Ejecutar con nodemon para recarga automática
nodemon server.js
```

## 9. Errores Comunes y Soluciones

### Error: Cannot find module 'X'

```bash
npm install X
```

### Error: EADDRINUSE (puerto en uso)

Cambie el puerto en el archivo .env o libere el puerto mediante la terminación del proceso que lo está utilizando.

### Error en la inicialización de Socket.IO

Es posible que necesite instalar o actualizar socket.io:

```bash
npm install socket.io@latest
```

### Errores de CORS

Si hay errores de CORS durante el debugging con clientes externos:

1. Verifique la configuración de CORS en server.js
2. Para debugging, puede temporalmente permitir todos los orígenes

## 10. Uso de las Herramientas de Desarrollo del Navegador

Para debugging del lado del cliente:

1. Abra la interfaz de MQ Importer API en su navegador (http://localhost:3000)
2. Abra las Herramientas de Desarrollo (F12)
3. Vaya a la pestaña "Console" para ver los logs del cliente
4. Use la pestaña "Network" para monitorear las solicitudes HTTP/XHR
5. En la pestaña "Application", puede examinar cookies, almacenamiento local, etc.

---

Recuerde volver a iniciar el servicio con PM2 después de concluir el debugging:

```bash
pm2 start mq-importer-api
pm2 save
