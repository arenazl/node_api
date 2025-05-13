# API como Servicio - Guía de Implementación en Windows

## Introducción

Esta guía explica cómo instalar y mantener en funcionamiento la API MQ Importer como un servicio en sistemas Windows, permitiendo su uso continuo desde otras aplicaciones.

## Requisitos previos

- Node.js 16+ instalado ([Descargar Node.js](https://nodejs.org/))
- PM2 (Process Manager 2) para gestionar el servicio
- Acceso con permisos de administrador al sistema

## Instalación del Servicio

### 1. Instalar PM2 globalmente

PM2 es un gestor de procesos para aplicaciones Node.js que permite mantener aplicaciones en funcionamiento como servicios.

```cmd
npm install -g pm2
```

### 2. Navegar al directorio de la API

```cmd
cd C:\ruta\hacia\mq-importer-api\node_api
```

### 3. Instalar dependencias

```cmd
npm install
```

### 4. Configurar variables de entorno

Asegúrese de que el archivo `.env` contenga la configuración adecuada. Puede copiar `.env.example` y modificarlo:

```cmd
copy .env.example .env
```

### 5. Iniciar la API como servicio con PM2

```cmd
pm2 start server.js --name mq-importer-api
```

### 6. Configurar PM2 para iniciar automáticamente con Windows

```cmd
pm2 startup
```

Siga las instrucciones mostradas en pantalla. Esto generará un comando personalizado que debe ejecutar con privilegios de administrador.

### 7. Guardar la configuración de PM2

```cmd
pm2 save
```

## Gestión del Servicio

### Verificar estado del servicio

```cmd
pm2 status
```

### Reiniciar el servicio

```cmd
pm2 restart mq-importer-api
```

### Detener el servicio

```cmd
pm2 stop mq-importer-api
```

### Ver logs en tiempo real

```cmd
pm2 logs mq-importer-api
```

## Acceso a la API

Una vez que el servicio esté en ejecución, la API estará disponible en:

- **API Principal**: http://localhost:3000/api
- **Documentación**: http://localhost:3000
- **Monitoreo de salud**: http://localhost:3000/health

## Ejemplo de integración con otras aplicaciones

### Cliente REST desde JavaScript

```javascript
// Ejemplo de cliente REST para interactuar con la API
const fetch = require('node-fetch');

async function consultarServicio1004(nip, tipoPedido) {
  const payload = {
    serviceNumber: "1004",
    serviceName: "SERVICIO 1004 - CONSULTA DE UN CLIENTE POR NUMERO INTERNO DE PERSONA",
    canal: "EM",
    version: "v2",
    timestamp: new Date().toISOString(),
    header: {
      "LONGITUD DEL MENSAJE": "000113",
      "CANAL": "EM",
      "SERVICIO": "1004",
      "CÓDIGO DE RETORNO": "0000",
      "ID DEL MENSAJE": "000000001",
      "FECHA": new Date().toISOString().substring(0, 10).replace(/-/g, ""),
      "HORA": new Date().toTimeString().substring(0, 8).replace(/:/g, ""),
      "USUARIO": "SISTEMA",
      "Ubicación": "1047",
      "TEXTO DEL CÓDIGO DE RETORNO": "",
      "ESTADO ENVIADO": "",
      "CAMPO COMPLEMENTARIO": ""
    },
    request: {
      "SVC1004-NIP": nip,
      "SVC1004-TIP-PEDIDO": tipoPedido
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api-test/service-1004', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al consumir la API:', error);
    throw error;
  }
}

// Ejemplo de uso
consultarServicio1004('123456789', '1')
  .then(result => {
    console.log('Resultado:', JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('Error en la consulta:', error);
  });
```

### Cliente desde C# (.NET)

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class MqImporterClient
{
    private readonly HttpClient _client;
    private readonly string _baseUrl;

    public MqImporterClient(string baseUrl = "http://localhost:3000")
    {
        _baseUrl = baseUrl;
        _client = new HttpClient();
    }

    public async Task<dynamic> ConsultarServicio1004(string nip, string tipoPedido)
    {
        var payload = new
        {
            serviceNumber = "1004",
            serviceName = "SERVICIO 1004 - CONSULTA DE UN CLIENTE POR NUMERO INTERNO DE PERSONA",
            canal = "EM",
            version = "v2",
            timestamp = DateTime.Now.ToString("o"),
            header = new
            {
                LONGITUD_DEL_MENSAJE = "000113",
                CANAL = "EM",
                SERVICIO = "1004",
                CÓDIGO_DE_RETORNO = "0000",
                ID_DEL_MENSAJE = "000000001",
                FECHA = DateTime.Now.ToString("ddMMyyyy"),
                HORA = DateTime.Now.ToString("HHmmss"),
                USUARIO = "SISTEMA",
                Ubicación = "1047",
                TEXTO_DEL_CÓDIGO_DE_RETORNO = "",
                ESTADO_ENVIADO = "",
                CAMPO_COMPLEMENTARIO = ""
            },
            request = new
            {
                SVC1004_NIP = nip,
                SVC1004_TIP_PEDIDO = tipoPedido
            }
        };

        var content = new StringContent(
            JsonConvert.SerializeObject(payload),
            Encoding.UTF8,
            "application/json"
        );

        var response = await _client.PostAsync($"{_baseUrl}/api-test/service-1004", content);
        response.EnsureSuccessStatusCode();

        var responseString = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<dynamic>(responseString);
    }
}

// Ejemplo de uso
public static async Task Main()
{
    var client = new MqImporterClient();
    try
    {
        var resultado = await client.ConsultarServicio1004("123456789", "1");
        Console.WriteLine($"Resultado: {JsonConvert.SerializeObject(resultado, Formatting.Indented)}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}
```

## Solución de problemas

### El servicio no inicia automáticamente

Verifique que PM2 esté configurado correctamente para iniciar con Windows:

```cmd
pm2 startup
```

Siga las instrucciones proporcionadas para completar la configuración.

### Error de conexión a la API

Verifique que el servicio esté en ejecución:

```cmd
pm2 status
```

Si el servicio no está en ejecución, inícielo:

```cmd
pm2 start server.js --name mq-importer-api
```

### Problemas con las estructuras de servicio

Asegúrese de que los archivos de estructura en las carpetas `headers/` y `structures/` estén correctamente configurados.

## Soporte y Contacto

Para asistencia técnica, contacte al equipo de desarrollo en [email@example.com](mailto:email@example.com).
