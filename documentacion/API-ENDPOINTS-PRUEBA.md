# Endpoints de Prueba - API MQ Importer

Este documento detalla los endpoints de prueba disponibles para verificar el estado y funcionamiento de la API MQ Importer.

## Endpoints Disponibles

### 1. Ping - Verificación del Servicio

**Endpoint:** `GET /api-test/ping`

**Descripción:** Verifica que la API esté funcionando correctamente y devuelve información básica del servidor.

**Ejemplo de uso:**
```
http://localhost:3000/api-test/ping
```

**Respuesta:**
```json
{
  "message": "¡Pong! La API MQ Importer está funcionando correctamente",
  "timestamp": "2025-05-11T07:13:27.076Z",
  "serverInfo": {
    "nodeVersion": "v20.16.0",
    "platform": "win32",
    "uptime": "18.6084012 segundos"
  }
}
```

### 2. Echo con Parámetro - Repetición de Texto

**Endpoint:** `GET /api-test/echo/:texto`

**Descripción:** Devuelve el texto proporcionado como parámetro en la URL.

**Ejemplo de uso:**
```
http://localhost:3000/api-test/echo/hola-mundo
```

**Respuesta:**
```json
{
  "message": "Echo API",
  "input": "hola-mundo",
  "timestamp": "2025-05-11T07:13:52.998Z"
}
```

### 3. Echo con Cuerpo - Repetición de JSON

**Endpoint:** `POST /api-test/echo`

**Descripción:** Recibe un objeto JSON y lo devuelve en la respuesta.

**Ejemplo de uso con cURL:**
```bash
curl -X POST http://localhost:3000/api-test/echo \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Prueba", "valor": 42}'
```

**Respuesta:**
```json
{
  "message": "Echo API (POST)",
  "input": {
    "nombre": "Prueba",
    "valor": 42
  },
  "timestamp": "2025-05-11T07:14:30.123Z"
}
```

### 4. Error Simulado - Manejo de Errores

**Endpoint:** `GET /api-test/error`

**Descripción:** Genera un error deliberadamente para probar el manejo de errores de la API.

**Ejemplo de uso:**
```
http://localhost:3000/api-test/error
```

**Respuesta:**
```json
{
  "error": "Este es un error de prueba",
  "timestamp": "2025-05-11T07:15:00.456Z"
}
```

## Uso en Integración

Estos endpoints son útiles para:

1. **Verificación de Conectividad:** Utilice el endpoint `/api-test/ping` para comprobar rápidamente si la API está en línea y responde correctamente.

2. **Pruebas de Integración:** Use `/api-test/echo` para verificar que su aplicación cliente puede enviar y recibir correctamente datos JSON.

3. **Desarrollo de Clientes:** Ayuda a los desarrolladores a probar la conectividad básica antes de implementar integraciones más complejas.

4. **Monitoreo de Salud:** Puede utilizarse en conjunto con herramientas de monitoreo para verificar periódicamente el estado del servicio.

## Ejemplo de Código Para Consumir los Endpoints

### JavaScript (Node.js)

```javascript
const axios = require('axios');

// Verificar estado de la API
async function checkApiStatus() {
  try {
    const response = await axios.get('http://localhost:3000/api-test/ping');
    console.log("API está online:", response.data);
    return true;
  } catch (error) {
    console.error("API no disponible:", error.message);
    return false;
  }
}

// Ejemplo de uso con echo
async function testEchoApi() {
  try {
    const response = await axios.post('http://localhost:3000/api-test/echo', {
      test: "Datos de prueba",
      timestamp: new Date().toISOString()
    });
    console.log("Respuesta del servidor:", response.data);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Ejecutar pruebas
checkApiStatus().then(isOnline => {
  if (isOnline) {
    testEchoApi();
  }
});
```

### Python

```python
import requests
import json

# URL base
base_url = 'http://localhost:3000'

# Verificar estado de la API
def check_api_status():
    try:
        response = requests.get(f"{base_url}/api-test/ping")
        if response.status_code == 200:
            print("API está online:", response.json())
            return True
        else:
            print(f"API responde con código de estado: {response.status_code}")
            return False
    except Exception as e:
        print("Error de conexión:", str(e))
        return False

# Ejemplo de uso con echo
def test_echo_api():
    try:
        payload = {
            "test": "Datos de prueba",
            "tiempo": "2025-05-11T07:00:00Z"
        }
        response = requests.post(
            f"{base_url}/api-test/echo",
            data=json.dumps(payload),
            headers={'Content-Type': 'application/json'}
        )
        print("Respuesta del servidor:", response.json())
    except Exception as e:
        print("Error:", str(e))

# Ejecutar pruebas
if check_api_status():
    test_echo_api()
