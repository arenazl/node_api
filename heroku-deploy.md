# Instrucciones de Despliegue en Heroku

## Preparación del Proyecto

El proyecto ya incluye todos los archivos necesarios para despliegues en Heroku:

- `Procfile`: Indica a Heroku cómo ejecutar la aplicación
- `app.json`: Configuración de la aplicación para Heroku
- Configuración de entorno a través de variables
- Directorios necesarios con archivos `.gitkeep` para garantizar que existan en Heroku

## Requisitos Previos

1. Cuenta en [Heroku](https://heroku.com)
2. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) instalado
3. Git instalado y configurado

## Pasos para el Despliegue

### 1. Iniciar sesión en Heroku desde la línea de comandos

```
heroku login
```

### 2. Crear una aplicación en Heroku

```
heroku create nombre-de-tu-app
```

Si no especificas un nombre, Heroku generará uno aleatorio.

### 3. Configurar variables de entorno (opcional)

```
heroku config:set NODE_ENV=production
heroku config:set FILE_UPLOAD_SIZE_LIMIT=50
heroku config:set REQUEST_TIMEOUT=120000
heroku config:set ALLOWED_ORIGINS="*"
```

### 4. Desplegar la aplicación

```
git push heroku main
```

O si estás en otra rama:

```
git push heroku tu-rama:main
```

### 5. Verificar el despliegue

```
heroku open
```

## Consideraciones Importantes

### Sistema de archivos efímero

Heroku utiliza un sistema de archivos efímero, lo que significa que los archivos subidos y las estructuras generadas se perderán cuando la dyno se reinicie (lo cual ocurre al menos una vez al día).

Para una solución permanente, considera:

1. Implementar almacenamiento persistente como AWS S3, Google Cloud Storage, etc.
2. Modificar el código para guardar los archivos en el almacenamiento persistente en lugar del sistema de archivos local.

### Escalamiento

Por defecto, la aplicación se configura con un dyno básico de tipo "eco". Si necesitas mayor capacidad, puedes escalar la aplicación:

```
heroku ps:scale web=1:standard-1x
```

### Monitoreo

Para monitorear la aplicación:

```
heroku logs --tail
```

### Verificación de salud

La aplicación incluye un endpoint `/health` para verificar su estado:

```
curl https://tu-app.herokuapp.com/health
```

## Solución de Problemas

### Error H10 - App crashed

Verifica los logs con `heroku logs --tail` para identificar el problema.

### Error H12 - Request timeout

Si las solicitudes tardan demasiado, considera aumentar el valor de la variable de entorno `REQUEST_TIMEOUT`.

### Error R14 - Memory quota exceeded

Actualiza a un tipo de dyno con mayor memoria:

```
heroku ps:scale web=1:standard-2x
```

### Error H13 - Connection closed without response

Puede indicar problemas con Socket.IO. Verifica la configuración de CORS.
