# MQ Importer API (Node.js Version)

API para importación y procesamiento de mensajes MQ implementada en Node.js con Express.

## Descripción

Esta API permite procesar y analizar mensajes en formato MQ. Incluye una interfaz web para cargar archivos Excel, extraer la estructura de mensajes y guardar la metadata para su uso posterior.

## Características

- Procesamiento de mensajes MQ
- Análisis de mensajes según estructuras definidas
- Soporte para cabeceras y datos de servicio
- Manejo de ocurrencias y campos anidados
- Interfaz web para cargar y procesar archivos Excel
- Extracción automática de estructuras desde archivos Excel
- Almacenamiento de metadata para uso posterior
- Búsqueda de servicios por número
- Procesamiento de streams de datos
- Soporte para CORS (Cross-Origin Resource Sharing)

## Requisitos

- Node.js 16.x o superior
- npm 8.x o superior

## Instalación

1. Clonar el repositorio
2. Instalar las dependencias:

```bash
cd node_api
npm install
```

## Despliegue en Heroku

### Requisitos para Heroku
- Cuenta en [Heroku](https://www.heroku.com/)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) instalado

### Pasos para el despliegue
1. Iniciar sesión en Heroku desde la terminal:
   ```bash
   heroku login
   ```

2. Crear una nueva aplicación en Heroku:
   ```bash
   heroku create nombre-de-tu-app
   ```

3. Añadir el repositorio remoto de Heroku (si no se añadió automáticamente):
   ```bash
   heroku git:remote -a nombre-de-tu-app
   ```

4. Subir el código a Heroku:
   ```bash
   git push heroku main
   ```
   o si estás en la rama master:
   ```bash
   git push heroku master
   ```

5. Abrir la aplicación en el navegador:
   ```bash
   heroku open
   ```

### Configuración de Heroku
- La aplicación incluye un archivo `Procfile` necesario para Heroku
- Las versiones de Node.js y npm están especificadas en el archivo `package.json` en la sección `engines`
- La aplicación está configurada para manejar variables de entorno a través de `.env` (localmente) y variables de entorno de Heroku (en producción)
- **Importante**: El sistema de archivos en Heroku es efímero, lo que significa que los archivos cargados y las estructuras generadas se perderán cuando la aplicación se reinicie o se despliegue nuevamente

### Variables de Entorno
La aplicación utiliza las siguientes variables de entorno (hay un archivo `.env.example` como referencia):

- `PORT`: Puerto en el que se ejecutará la aplicación (por defecto: 3000)
- `NODE_ENV`: Entorno de ejecución ('development', 'production', etc.)
- `FILE_UPLOAD_SIZE_LIMIT`: Límite de tamaño para la carga de archivos en MB (por defecto: 50)
- `REQUEST_TIMEOUT`: Tiempo de espera para las solicitudes en milisegundos (por defecto: 120000)
- `ALLOWED_ORIGINS`: Lista de orígenes permitidos para CORS, separados por comas (por defecto: '*' para permitir cualquier origen)

## Estructura del Proyecto

```
node_api/
├── api/
│   ├── message-analyzer.js
│   └── message-creator.js
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── main.js
│   └── index.html
├── routes/
│   ├── api.js
│   ├── excel.js
│   └── services.js
├── utils/
│   └── excel-parser.js
├── uploads/
│   └── (archivos Excel subidos)
├── structures/
│   └── (estructuras JSON extraídas)
├── package.json
├── server.js
└── README.md
```

## Uso

### Iniciar el servidor

```bash
cd node_api
npm start
```

Para desarrollo (con recarga automática):

```bash
npm run dev
```

### Interfaz Web

Accede a la interfaz web en tu navegador:

```
http://localhost:3000
```

La interfaz web permite:
- Cargar archivos Excel con estructuras de mensajes
- Visualizar la estructura de cabecera y servicio
- Ver la estructura en formato JSON
- Acceder a archivos previamente procesados
- Procesar servicios por número

### Endpoints API

- `GET /api`: Información general de la API
- `GET /api/header`: Devuelve la estructura de la cabecera
- `POST /api/process`: Procesa un payload y devuelve un mensaje formateado
- `POST /api/parse`: Analiza un mensaje y devuelve su estructura

### Endpoints de Servicios

- `GET /api/services`: Obtiene la lista de servicios disponibles
- `POST /api/services/process`: Procesa un servicio por número y stream opcional
- `GET /api/services/{service_number}`: Obtiene un servicio por número y stream opcional

### Endpoints Excel

- `POST /excel/upload`: Sube y procesa un archivo Excel
- `GET /excel/files`: Obtiene la lista de archivos Excel procesados
- `GET /excel/structure`: Obtiene la estructura de un archivo procesado

### Configuración CORS

La API incorpora soporte CORS (Cross-Origin Resource Sharing) para permitir solicitudes desde otros dominios. La configuración CORS se puede personalizar a través de variables de entorno:

- **Orígenes permitidos**: Controla qué dominios pueden acceder a la API
  - Se configura mediante la variable de entorno `ALLOWED_ORIGINS`
  - Admite múltiples orígenes separados por comas: `https://app1.example.com,https://app2.example.com`
  - Por defecto es `*` (permite todos los orígenes)

- **Métodos HTTP permitidos**: 
  - GET, POST, PUT, DELETE, OPTIONS

- **Cabeceras permitidas**:
  - Content-Type, Authorization, X-Requested-With, Accept

- **Credenciales**: 
  - Habilitado (permite enviar cookies y cabeceras de autenticación)

- **Caché de preflight**:
  - 24 horas (86400 segundos)

Ejemplo de configuración personalizada en `.env`:

```
ALLOWED_ORIGINS=https://miapp.ejemplo.com,http://localhost:8080
```

## Flujo de trabajo con archivos Excel

1. Accede a la interfaz web en http://localhost:3000
2. Haz clic en "Seleccionar Archivo Excel" y elige un archivo Excel con la estructura de mensajes
3. Haz clic en "Procesar Archivo" para subir y procesar el archivo
4. La aplicación extraerá automáticamente la estructura de cabecera y servicio
5. Puedes ver la estructura en las pestañas "Cabecera", "Requerimiento", "Respuesta" y "Estructura"
6. Los archivos procesados se guardan y pueden ser accedidos posteriormente desde la pestaña "Archivos"

## Flujo de trabajo con servicios

1. Accede a la interfaz web en http://localhost:3000
2. Haz clic en la pestaña "Servicios"
3. Verás una lista de servicios disponibles (extraídos de los archivos Excel procesados)
4. Puedes procesar un servicio de dos formas:
   - Haciendo clic en el botón "Procesar" junto a un servicio en la lista
   - Ingresando el número de servicio en el campo de texto y haciendo clic en "Procesar Servicio"
5. Opcionalmente, puedes proporcionar un stream de datos para parsear
6. El resultado del procesamiento se mostrará en la sección "Resultado"

## Uso programático de servicios

También puedes usar la API de servicios programáticamente:

```javascript
const axios = require('axios');

// Obtener lista de servicios disponibles
axios.get('http://localhost:3000/api/services')
  .then(response => {
    const services = response.data.services;
    console.log(services);
  });

// Procesar un servicio por número
const serviceNumber = '3050';
axios.get(`http://localhost:3000/api/services/${serviceNumber}`)
  .then(response => {
    const result = response.data;
    console.log(result);
  });

// Procesar un servicio con stream
const serviceNumber = '3050';
const stream = '000643OT3050000000000761180920121140PASCUAL1047                                             00     VALOR1 12345020CC1123OCC2456               VALOR FINAL     ';
axios.post('http://localhost:3000/api/services/process', {
  service_number: serviceNumber,
  stream: stream
})
  .then(response => {
    const parsedResult = response.data;
    console.log(parsedResult);
  });
```

## Ejemplo de Payload

```json
{
  "header": {
    "CANAL": "OT",
    "SERVICIO": "3050",
    "USUARIO": "USUARIO1"
  },
  "data": {
    "SVC3050-CAMPO1": "VALOR1",
    "SVC3050-CAMPO2": "12345",
    "SVC3050-CANT-OCURR": "02",
    "occurrence_3": [
      {
        "SVC3050-OCC-CAMPO1": "OCC1",
        "SVC3050-OCC-CAMPO2": "123"
      },
      {
        "SVC3050-OCC-CAMPO1": "OCC2",
        "SVC3050-OCC-CAMPO2": "456"
      }
    ],
    "SVC3050-CAMPO3": "VALOR FINAL"
  },
  "section": "request"
}
```

## Licencia

MIT
