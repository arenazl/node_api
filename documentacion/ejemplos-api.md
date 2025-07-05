# Ejemplos de API - MQ Importer API

## Endpoints Principales

### 1. Conversión JSON → String (IDA)

**Endpoint**: `POST /api/services/sendmessage`

Convierte un objeto JSON en un string de posiciones fijas para envío al mainframe.

#### Ejemplo de Request:
```json
{
  "header": {
    "serviceNumber": "1379",
    "canal": "SM"
  },
  "parameters": {
    "SVC1379-TIP-PEDIDO": "01",
    "SVC1379-C-DEST-REEN": "12345"
  }
}
```

#### Ejemplo de Response:
```json
{
  "success": true,
  "message": "Mensaje creado exitosamente",
  "result": {
    "messageString": "000102SM1379000000000000120240111123000USR001100000000000000000000000000000000000000000000000100012345",
    "length": 109,
    "structure": {
      "header": "000102SM1379000000000000120240111123000USR001100000000000000000000000000000000000000000000000100",
      "request": "0112345"
    }
  }
}
```

### 2. Conversión String → JSON (VUELTA)

**Endpoint**: `POST /api/services/receivemessage`

Convierte un string de posiciones fijas en un objeto JSON estructurado.

#### Ejemplo de Request:
```json
{
  "header": {
    "serviceNumber": "1379"
  },
  "parameters": {
    "returnMsg": "000102SM1379000000000000120240111123000USR001100000000000000000000000000000000000000000000000100001500112345DESTINO FINANCIACION EJEMPLO"
  }
}
```

#### Ejemplo de Response:
```json
{
  "success": true,
  "message": "Mensaje analizado exitosamente",
  "result": {
    "header": {
      "LONGITUD_DEL_MENSAJE": "000102",
      "CANAL": "SM",
      "SERVICIO": "1379",
      "CODIGO_DE_RETORNO": "0000",
      "ID_DEL_MENSAJE": "000000001",
      "FECHA": "20240111",
      "HORA": "123000",
      "USUARIO": "USR0011",
      "UBICACION": "0000",
      "TEXTO_DEL_CODIGO_DE_RETORNO": "                                            ",
      "ESTADO_ENVIADO": "00",
      "CAMPO_COMPLEMENTARIO": "     "
    },
    "response": {
      "SVC1379-ESTADO": "00",
      "SVC1379-CANT-ELEM": "001",
      "SVC1379-MAS-DATOS": "0",
      "occurrences": [
        {
          "SVC1379-C-DEST-FIN": "12345",
          "SVC1379-NO-DESTFIN": "DESTINO FINANCIACION EJEMPLO"
        }
      ]
    }
  }
}
```

### 3. Obtener Lista de Servicios

**Endpoint**: `GET /api/services`

Lista todos los servicios disponibles con sus metadatos.

#### Ejemplo de Response:
```json
{
  "success": true,
  "services": [
    {
      "serviceNumber": "1004",
      "serviceName": "Consulta Cliente por NIP",
      "hasStructure": true,
      "hasSettings": true,
      "availableChannels": ["SM", "LO"]
    },
    {
      "serviceNumber": "1379",
      "serviceName": "Consulta Destinos de Financiación",
      "hasStructure": true,
      "hasSettings": true,
      "availableChannels": ["SM"]
    }
  ]
}
```

### 4. Obtener Versiones de Servicio

**Endpoint**: `GET /api/services/versions?serviceNumber=1379`

Lista las versiones disponibles de un servicio específico.

#### Ejemplo de Response:
```json
{
  "success": true,
  "serviceNumber": "1379",
  "versions": [
    {
      "filename": "20250701T084815_SVO1379-Consulta Destinos.xlsx",
      "settings_file": "1379-SM-v4.json",
      "timestamp": "2025-07-01T08:48:15.000Z",
      "service_number": "1379",
      "service_name": "Consulta Destinos de Financiación V4088DF0"
    }
  ]
}
```

## Endpoints de Prueba

### 1. Health Check

**Endpoint**: `GET /api-test/ping`

Verifica el estado de la API.

#### Ejemplo de Response:
```json
{
  "message": "¡Pong! La API MQ Importer está funcionando correctamente",
  "timestamp": "2025-01-11T10:30:00.000Z",
  "serverInfo": {
    "nodeVersion": "v16.20.0",
    "platform": "win32",
    "uptime": "3600.5 segundos"
  }
}
```

### 2. Echo Test

**Endpoint**: `POST /api-test/echo`

Devuelve los datos enviados para probar la conectividad.

#### Ejemplo de Request:
```json
{
  "test": "datos de prueba",
  "timestamp": "2025-01-11T10:30:00.000Z"
}
```

#### Ejemplo de Response:
```json
{
  "message": "Echo API (POST)",
  "input": {
    "test": "datos de prueba",
    "timestamp": "2025-01-11T10:30:00.000Z"
  },
  "timestamp": "2025-01-11T10:30:00.123Z"
}
```

## Ejemplos de Integración

### JavaScript/Node.js

```javascript
const axios = require('axios');

class MQImporterClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  // Verificar estado de la API
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/api-test/ping`);
      console.log('✅ API está funcionando:', response.data.message);
      return true;
    } catch (error) {
      console.error('❌ Error de conectividad:', error.message);
      return false;
    }
  }

  // Obtener servicios disponibles
  async getServices() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/services`);
      return response.data.services;
    } catch (error) {
      throw new Error(`Error obteniendo servicios: ${error.message}`);
    }
  }

  // Enviar mensaje (JSON → String)
  async sendMessage(serviceNumber, canal, parameters) {
    try {
      const payload = {
        header: {
          serviceNumber: serviceNumber,
          canal: canal
        },
        parameters: parameters
      };

      const response = await axios.post(
        `${this.baseUrl}/api/services/sendmessage`,
        payload
      );

      return response.data;
    } catch (error) {
      throw new Error(`Error enviando mensaje: ${error.message}`);
    }
  }

  // Recibir mensaje (String → JSON)
  async receiveMessage(serviceNumber, messageString) {
    try {
      const payload = {
        header: {
          serviceNumber: serviceNumber
        },
        parameters: {
          returnMsg: messageString
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/api/services/receivemessage`,
        payload
      );

      return response.data;
    } catch (error) {
      throw new Error(`Error recibiendo mensaje: ${error.message}`);
    }
  }
}

// Ejemplo de uso
async function ejemplo() {
  const client = new MQImporterClient();

  // Verificar conectividad
  const isHealthy = await client.healthCheck();
  if (!isHealthy) return;

  // Obtener servicios
  const services = await client.getServices();
  console.log('Servicios disponibles:', services);

  // Enviar mensaje
  const sendResult = await client.sendMessage('1379', 'SM', {
    'SVC1379-TIP-PEDIDO': '01',
    'SVC1379-C-DEST-REEN': '12345'
  });
  console.log('Mensaje enviado:', sendResult.result.messageString);

  // Recibir mensaje
  const receiveResult = await client.receiveMessage('1379', 
    '000102SM1379000000000000120240111123000USR001100000000000000000000000000000000000000000000000100001500112345DESTINO FINANCIACION EJEMPLO'
  );
  console.log('Mensaje recibido:', receiveResult.result);
}

ejemplo().catch(console.error);
```

### Python

```python
import requests
import json
from datetime import datetime

class MQImporterClient:
    def __init__(self, base_url='http://localhost:3000'):
        self.base_url = base_url
        self.session = requests.Session()
    
    def health_check(self):
        """Verificar estado de la API"""
        try:
            response = self.session.get(f"{self.base_url}/api-test/ping")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ API funcionando: {data['message']}")
                return True
            else:
                print(f"❌ API respondió con código: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error de conectividad: {str(e)}")
            return False
    
    def get_services(self):
        """Obtener servicios disponibles"""
        try:
            response = self.session.get(f"{self.base_url}/api/services")
            response.raise_for_status()
            return response.json()['services']
        except Exception as e:
            raise Exception(f"Error obteniendo servicios: {str(e)}")
    
    def send_message(self, service_number, canal, parameters):
        """Enviar mensaje (JSON → String)"""
        try:
            payload = {
                'header': {
                    'serviceNumber': service_number,
                    'canal': canal
                },
                'parameters': parameters
            }
            
            response = self.session.post(
                f"{self.base_url}/api/services/sendmessage",
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise Exception(f"Error enviando mensaje: {str(e)}")
    
    def receive_message(self, service_number, message_string):
        """Recibir mensaje (String → JSON)"""
        try:
            payload = {
                'header': {
                    'serviceNumber': service_number
                },
                'parameters': {
                    'returnMsg': message_string
                }
            }
            
            response = self.session.post(
                f"{self.base_url}/api/services/receivemessage",
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise Exception(f"Error recibiendo mensaje: {str(e)}")

# Ejemplo de uso
def ejemplo():
    client = MQImporterClient()
    
    # Verificar conectividad
    if not client.health_check():
        return
    
    # Obtener servicios
    services = client.get_services()
    print(f"Servicios disponibles: {len(services)}")
    
    # Enviar mensaje
    send_result = client.send_message('1379', 'SM', {
        'SVC1379-TIP-PEDIDO': '01',
        'SVC1379-C-DEST-REEN': '12345'
    })
    print(f"Mensaje enviado: {send_result['result']['messageString']}")
    
    # Recibir mensaje
    receive_result = client.receive_message('1379', 
        '000102SM1379000000000000120240111123000USR001100000000000000000000000000000000000000000000000100001500112345DESTINO FINANCIACION EJEMPLO'
    )
    print(f"Mensaje recibido: {receive_result['result']}")

if __name__ == "__main__":
    ejemplo()
```

### C#

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class MQImporterClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    public MQImporterClient(string baseUrl = "http://localhost:3000")
    {
        _baseUrl = baseUrl;
        _httpClient = new HttpClient();
    }

    // Verificar estado de la API
    public async Task<bool> HealthCheckAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/api-test/ping");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"✅ API funcionando: {content}");
                return true;
            }
            Console.WriteLine($"❌ API respondió con código: {response.StatusCode}");
            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error de conectividad: {ex.Message}");
            return false;
        }
    }

    // Enviar mensaje (JSON → String)
    public async Task<string> SendMessageAsync(string serviceNumber, string canal, object parameters)
    {
        try
        {
            var payload = new
            {
                header = new
                {
                    serviceNumber = serviceNumber,
                    canal = canal
                },
                parameters = parameters
            };

            var json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_baseUrl}/api/services/sendmessage", content);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex)
        {
            throw new Exception($"Error enviando mensaje: {ex.Message}");
        }
    }

    // Recibir mensaje (String → JSON)
    public async Task<string> ReceiveMessageAsync(string serviceNumber, string messageString)
    {
        try
        {
            var payload = new
            {
                header = new
                {
                    serviceNumber = serviceNumber
                },
                parameters = new
                {
                    returnMsg = messageString
                }
            };

            var json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_baseUrl}/api/services/receivemessage", content);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex)
        {
            throw new Exception($"Error recibiendo mensaje: {ex.Message}");
        }
    }
}

// Ejemplo de uso
class Program
{
    static async Task Main(string[] args)
    {
        var client = new MQImporterClient();

        // Verificar conectividad
        if (!await client.HealthCheckAsync())
            return;

        // Enviar mensaje
        var sendResult = await client.SendMessageAsync("1379", "SM", new
        {
            SVC1379_TIP_PEDIDO = "01",
            SVC1379_C_DEST_REEN = "12345"
        });
        Console.WriteLine($"Mensaje enviado: {sendResult}");

        // Recibir mensaje
        var receiveResult = await client.ReceiveMessageAsync("1379", 
            "000102SM1379000000000000120240111123000USR001100000000000000000000000000000000000000000000000100001500112345DESTINO FINANCIACION EJEMPLO");
        Console.WriteLine($"Mensaje recibido: {receiveResult}");
    }
}
```

## Manejo de Errores

### Códigos de Error Comunes

```json
{
  "success": false,
  "error": "Service not found",
  "code": "SERVICE_NOT_FOUND",
  "timestamp": "2025-01-11T10:30:00.000Z"
}
```

```json
{
  "success": false,
  "error": "Invalid message format",
  "code": "INVALID_FORMAT",
  "details": "Missing required field: serviceNumber",
  "timestamp": "2025-01-11T10:30:00.000Z"
}
```

### Mejores Prácticas

1. **Validar datos antes de enviar**
2. **Implementar retry con backoff exponencial**
3. **Manejar timeouts apropiadamente**
4. **Logear errores para debugging**
5. **Usar health check antes de operaciones críticas**

Este conjunto de ejemplos proporciona una base sólida para integrar cualquier aplicación con la MQ Importer API. 