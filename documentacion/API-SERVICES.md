# Documentación: API Services

Esta documentación describe los métodos principales para el envío y recepción de mensajes:

1. `sendMessage`: Envía un mensaje JSON y lo convierte al formato de cadena requerido
2. `receiveMessage`: Recibe una cadena de respuesta y la convierte en formato JSON
3. `sendmessage-detailed`: Similar a sendMessage pero con desglose detallado de campos
4. `ida`: Procesa un servicio con entrada JSON (IDA Service)
5. `vuelta`: Procesa un servicio por número y stream (VUELTA Service)
6. `generate`: Procesa un servicio con parámetros personalizados y genera tanto el string de IDA como una respuesta VUELTA simulada

Todos los métodos llaman internamente a las funciones correspondientes en el servicio backend.

## Método: sendMessage

Este método permite enviar un mensaje en formato JSON y convertirlo al formato de cadena requerido por el sistema.

### Endpoint

```
POST /api/services/sendmessage
```

### Parámetros de entrada

```json
{
  "header": {
    "serviceNumber": "XXXX",  // Número de servicio (ej: "1004", "3088")
    "canal": "XX"            // Canal de envío (ej: "ME", "PO", "LO")
  },
  "parameters": {
    // Parámetros específicos del servicio
    // Varían según el servicio utilizado
  }
}
```

### Ejemplo de uso

#### Solicitud para servicio 1004

```javascript
// Importar axios u otra biblioteca para realizar solicitudes HTTP
const axios = require('axios');

// URL base de la API
const API_URL = 'http://localhost:3000';

// Datos para el request
const requestData = {
  "header": {
    "serviceNumber": "1004",
    "canal": "ME"
  },
  "parameters": {
    "SVC1004-NIP": 63443434,
    "SVC1004-TIP-PEDIDO": 1
  }
};

// Realizar la solicitud HTTP
axios.post(`${API_URL}/api/services/sendmessage`, requestData)
  .then(response => {
    console.log('Respuesta recibida exitosamente!');
    console.log('String IDA generado:', response.data.response);
  })
  .catch(error => {
    console.error('Error al enviar mensaje:', error);
  });
```

### Respuesta

```json
{
  "request": {
    "header": {
      "serviceNumber": "1004",
      "canal": "ME"
    },
    "parameters": {
      "SVC1004-NIP": 63443434,
      "SVC1004-TIP-PEDIDO": 1
    }
  },
  "response": "00102ME100400000000000076119062023132203PASCUAL1047                                             63443434100000000", 
  "estructura": [
    // Detalle de los campos en el string generado
    // ...
  ],
  "estructuraCompleta": {
    "requestStructure": {
      // Definición de la estructura de la solicitud
    }
  }
}
```

## Método: sendmessage-detailed

Este método es similar a sendMessage pero proporciona un desglose detallado de los campos generados en el mensaje.

### Endpoint

```
POST /api/services/sendmessage-detailed
```

### Parámetros de entrada

```json
{
  "header": {
    "serviceNumber": "XXXX",  // Número de servicio (ej: "1004", "3088")
    "canal": "XX"            // Canal de envío (ej: "ME", "PO", "LO")
  },
  "parameters": {
    // Parámetros específicos del servicio
    // Varían según el servicio utilizado
  }
}
```

### Respuesta

```json
{
  "request": {
    "header": {
      "serviceNumber": "1004",
      "canal": "ME"
    },
    "parameters": {
      "SVC1004-NIP": 63443434,
      "SVC1004-TIP-PEDIDO": 1
    }
  },
  "response": "00102ME100400000000000076119062023132203PASCUAL1047                                             63443434100000000", 
  "estructura": [
    // Detalle de los campos en el string generado
    // ...
  ],
  "desgloseCampos": {
    "seccionCabecera": [
      // Desglose detallado de los campos de la cabecera
    ],
    "seccionRequerimiento": [
      // Desglose detallado de los campos del requerimiento
    ],
    "resumenPorTipo": {
      "alfanumerico": { "cantidad": 10, "longitudTotal": 120 },
      "numerico": { "cantidad": 5, "longitudTotal": 30 },
      "otros": { "cantidad": 2, "longitudTotal": 10 }
    },
    "totalCampos": 17,
    "longitudTotal": 160
  },
  "estructuraCompleta": {
    "requestStructure": {
      // Definición de la estructura de la solicitud
    }
  }
}
```

## Método: ida

Este método procesa un servicio con entrada JSON y genera una cadena IDA.

### Endpoint

```
POST /api/services/ida
```

### Parámetros de entrada

```json
{
  "service_number": "XXXX",  // Número de servicio (ej: "1004", "3088")
  "CANAL": "XX",            // Canal de envío (opcional, por defecto "API")
  "USUARIO": "USUARIO1",    // Usuario (opcional, por defecto "SISTEMA")
  "data": {
    // Parámetros específicos del servicio
    // Varían según el servicio utilizado
  }
}
```

### Respuesta

```json
{
  "service_number": "1004",
  "service_name": "Consulta de Saldo",
  "message": "00102ME100400000000000076119062023132203PASCUAL1047                                             63443434100000000", 
  "status": "success"
}
```

## Método: receiveMessage

Este método permite recibir una cadena de respuesta del sistema y convertirla en formato JSON estructurado.

### Endpoint

```
POST /api/services/receivemessage
```

### Parámetros de entrada

#### Modo normal (con string de respuesta)

```json
{
  "header": {
    "serviceNumber": "XXXX",  // Número de servicio (ej: "1004", "3088")
    "filterEmptyFields": true // Opcional: filtrar campos vacíos en la respuesta
  },
  "parameters": {
    "returnMsg": "00102ME10040000000000007611..." // String de respuesta del sistema
  }
}
```

#### Modo simulación

```json
{
  "header": {
    "serviceNumber": "XXXX",  // Número de servicio (ej: "1004", "3088")
    "filterEmptyFields": true // Opcional: filtrar campos vacíos en la respuesta
  },
  "parameters": {
    "simulate": true         // Genera datos simulados para pruebas
  }
}
```

### Ejemplo de uso

```javascript
// Importar axios u otra biblioteca para realizar solicitudes HTTP
const axios = require('axios');

// URL base de la API
const API_URL = 'http://localhost:3000';

// Modo normal - con string de respuesta
const requestDataNormal = {
  "header": {
    "serviceNumber": "3088",
    "filterEmptyFields": true
  },
  "parameters": {
    "returnMsg": "000643ME30880000000000007618092012114044PASCUAL1047                                             00"
  }
};

// Modo simulación - generar datos aleatorios
const requestDataSimulation = {
  "header": {
    "serviceNumber": "1004",
    "filterEmptyFields": true
  },
  "parameters": {
    "simulate": true
  }
};

// Realizar la solicitud HTTP (modo normal)
axios.post(`${API_URL}/api/services/receivemessage`, requestDataNormal)
  .then(response => {
    console.log('Respuesta recibida exitosamente!');
    console.log('Datos JSON parseados:', response.data.response);
  })
  .catch(error => {
    console.error('Error al recibir mensaje:', error);
  });

// Realizar la solicitud HTTP (modo simulación)
axios.post(`${API_URL}/api/services/receivemessage`, requestDataSimulation)
  .then(response => {
    console.log('Respuesta simulada generada exitosamente!');
    console.log('Datos JSON simulados:', response.data.response);
  })
  .catch(error => {
    console.error('Error en simulación:', error);
  });
```

### Respuesta

```json
{
  "request": {
    "header": {
      "serviceNumber": "1004",
      "filterEmptyFields": true
    },
    "parameters": {
      "simulate": true
    }
  },
  "response": {
    // Datos JSON estructurados de la respuesta
    // O datos simulados si se utilizó el modo de simulación
    "campo1": "valor1",
    "campo2": "valor2",
    // ...
    "randomNumber": 5
  }
}
```

## Método: vuelta

Este método procesa un string VUELTA y lo convierte a formato JSON.

### Endpoint

```
POST /api/services/vuelta
```

### Parámetros de entrada

```json
{
  "service_number": "XXXX",  // Número de servicio (ej: "1004", "3088") 
  "stream": "00102ME10040000000000007611..." // String de respuesta del sistema
}
```

### Respuesta

```json
{
  // Datos JSON estructurados de la respuesta sin campos vacíos
  "campo1": "valor1",
  "campo2": "valor2",
  // ...
}
```

## Método: generate

Este método procesa un servicio con parámetros personalizados y genera tanto el string de IDA como una respuesta VUELTA simulada. Es un método completo que combina las funcionalidades de sendMessage y receiveMessage en un solo endpoint.

### Endpoint

```
POST /api/services/generate
```

### Parámetros de entrada

```json
{
  "header": {
    "serviceNumber": "XXXX",  // Número de servicio (ej: "1004", "3088")
    "canal": "XX",           // Canal de envío (ej: "ME", "PO", "LO")
    "showOnlyNonEmpty": true // Opcional: filtrar campos vacíos en la respuesta
  },
  "parameters": {
    // Parámetros específicos del servicio
    // Varían según el servicio utilizado
    "simulate": true         // Opcional: usar valores significativos para la simulación
  }
}
```

### Respuesta

```json
{
  "serviceName": "Consulta de Saldo",
  "stringIda": "00102ME100400000000000076119062023132203PASCUAL1047                                             63443434100000000",
  "stringVuelta": "00102ME100400000000000076119062023132203PASCUAL1047                                             0063443434",
  "dataVuelta": {
    // Datos JSON estructurados de la respuesta simulada
    "campo1": "valor1",
    "campo2": "valor2",
    // ...
  }
}
```

### Ejemplo de uso

```javascript
// Importar axios u otra biblioteca para realizar solicitudes HTTP
const axios = require('axios');

// URL base de la API
const API_URL = 'http://localhost:3000';

// Datos para el request
const requestData = {
  "header": {
    "serviceNumber": "1004",
    "canal": "ME",
    "showOnlyNonEmpty": true
  },
  "parameters": {
    "SVC1004-NIP": 63443434,
    "SVC1004-TIP-PEDIDO": 1,
    "simulate": true
  }
};

// Realizar la solicitud HTTP
axios.post(`${API_URL}/api/services/generate`, requestData)
  .then(response => {
    console.log('Flujo completo generado exitosamente!');
    console.log('String IDA:', response.data.stringIda);
    console.log('String VUELTA:', response.data.stringVuelta);
    console.log('Datos JSON de VUELTA:', response.data.dataVuelta);
  })
  .catch(error => {
    console.error('Error al generar flujo completo:', error);
  });
```

## Métodos para Ejemplos y Simulaciones

### generate-legacy

Este método genera ejemplos completos de IDA y VUELTA para un servicio.

### Endpoint

```
POST /api/services/examples/generate-legacy
```

### Parámetros de entrada

```json
{
  "header": {
    "serviceNumber": "XXXX",  // Número de servicio (ej: "1004", "3088")
    "canal": "XX"            // Canal de envío (ej: "ME", "PO", "LO")
  },
  "parameters": {
    // Parámetros específicos del servicio (opcional)
  }
}
```

### Respuesta

```json
{
  "serviceName": "Consulta de Saldo",
  "stringIda": "00102ME100400000000000076119062023132203PASCUAL1047                                             63443434100000000",
  "stringVuelta": "00102ME100400000000000076119062023132203PASCUAL1047                                             0063443434",
  "dataVuelta": {
    // Datos JSON estructurados de la respuesta simulada
    "campo1": "valor1",
    "campo2": "valor2"
  }
}
```

### generate-example-response

Este método genera un ejemplo de string VUELTA para un servicio específico.

### Endpoint

```
POST /api/services/examples/generate-example-response
```

### Parámetros de entrada

```json
{
  "serviceNumber": "XXXX"  // Número de servicio (ej: "1004", "3088")
}
```

### Respuesta

```json
{
  "exampleResponseString": "00102ME100400000000000076119062023132203PASCUAL1047                                             0063443434"
}
```

## Ejemplos Completos

### Ejemplo de sendMessage para servicio 1004

Archivo de ejemplo para servicio 1004:

```json
// jsonsForExternals/1004-ME.json
{
  "header": {
    "serviceNumber": "1004",
    "canal": "ME"
  },
  "parameters": {
    "SVC1004-NIP": 63443434,
    "SVC1004-TIP-PEDIDO": 1
  }
}
```

```javascript
/**
 * Cliente de prueba para el endpoint /api/services/sendmessage
 * Demuestra cómo generar un string de IDA
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// URL base de la API
const API_URL = 'http://localhost:3000';

// Obtener datos del archivo de ejemplo
const exampleFile = path.join(__dirname, 'jsonsForExternals', '1004-ME.json');
const requestData = fs.readJsonSync(exampleFile);

// Función para probar el endpoint /api/services/sendmessage
async function probarSendMessageEndpoint() {
  try {
    console.log(`\n--- Probando /api/services/sendmessage para servicio ${requestData.header.serviceNumber}, canal ${requestData.header.canal} ---`);
    
    console.log('\nEnviando solicitud a sendmessage...');
    
    // Realizar la solicitud HTTP
    const response = await axios.post(`${API_URL}/api/services/sendmessage`, requestData);
    
    // Mostrar resultado
    console.log('\n✅ Respuesta recibida exitosamente!');
    
    console.log('\n--- Request original ---');
    console.log('Header:', JSON.stringify(response.data.request.header, null, 2));
    console.log('Parameters:', JSON.stringify(response.data.request.parameters, null, 2));
    
    console.log(`\n--- String IDA generado (${response.data.response.length} caracteres) ---`);
    console.log(response.data.response);
    
    return response.data;
  } catch (error) {
    console.error('\n❌ Error al probar el endpoint sendmessage:', error);
    throw error;
  }
}

// Ejecutar la prueba
probarSendMessageEndpoint();
```

### Ejemplo de receiveMessage para servicio 1004

```javascript
/**
 * Cliente de prueba para el endpoint /api/services/receivemessage
 */

const axios = require('axios');

// URL base de la API
const API_URL = 'http://localhost:3000';

// Servicio a probar
const SERVICIO = '1004';

// Función para probar el endpoint /api/services/receivemessage en modo simulación
async function probarReceiveMessageSimulado() {
  try {
    console.log(`\n--- Probando /api/services/receivemessage (simulación) para servicio ${SERVICIO} ---`);
    
    // Datos para el request en modo simulación
    const requestData = {
      header: {
        serviceNumber: SERVICIO,
        filterEmptyFields: true
      },
      parameters: {
        simulate: true
      }
    };
    
    console.log('\nSolicitando datos simulados...');
    
    // Realizar la solicitud HTTP
    const response = await axios.post(`${API_URL}/api/services/receivemessage`, requestData);
    
    // Mostrar resultado
    console.log('\n✅ Respuesta recibida exitosamente!');
    console.log('\n--- Datos JSON simulados ---');
    console.log(JSON.stringify(response.data.response, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('\n❌ Error al probar el endpoint receivemessage:', error);
    throw error;
  }
}

// Ejecutar la prueba
probarReceiveMessageSimulado();
