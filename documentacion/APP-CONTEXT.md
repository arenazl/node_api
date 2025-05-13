# Documentación Completa de la Aplicación para Procesamiento de Mensajes de Servicios

## Información General
- **Nombre de la Aplicación**: Procesador de Mensajes de Servicios
- **Versión**: 1.0
- **Fecha de última actualización**: Mayo 2025
- **Desarrollador**: [Tu nombre/empresa]

## Objetivos del Proyecto
- Facilitar la generación y procesamiento de mensajes en formato de cadena de texto con posiciones fijas para interactuar con servicios web legacy/antiguos
- Permitir a los usuarios crear mensajes estructurados que cumplan con los requisitos de formato específicos para comunicarse con servicios MQ
- Procesar las respuestas recibidas y presentarlas de manera legible al usuario
- Servir como intermediario entre sistemas modernos y sistemas antiguos que trabajan con formatos de mensaje de longitud fija

## Motivaciones
- Necesidad de mantener compatibilidad con sistemas legacy que utilizan formatos de mensaje estructurados por posición
- Simplificar el proceso de creación de mensajes complejos para los usuarios finales
- Reducir errores en la comunicación con sistemas que requieren un formato específico de mensaje
- Crear un puente entre tecnologías modernas y sistemas antiguos que utilizan MQ para comunicación

## Tecnologías Utilizadas
- **Frontend**: Aplicación para cargar y procesar archivos Excel
- **Backend**: API en Node.js para el procesamiento y comunicación con servicios externos
- **Formatos de datos**: Excel (.xlsx) como interfaz para el usuario
- **Comunicación**: Servicios web y MQ (Message Queue) para el intercambio de mensajes
- **Formato de mensajes**: Cadenas de texto con campos de longitud fija en posiciones específicas

## Estructura de la Aplicación
La aplicación consta de dos componentes principales:

### Frontend
Interfaz donde los usuarios pueden:
- Cargar archivos Excel que contienen plantillas para generar mensajes
- Procesar estos archivos para generar cadenas de texto con el formato adecuado
- Visualizar y validar las cadenas generadas antes de enviarlas

### Backend (API Node.js)
- Recibe los mensajes generados desde el frontend
- Formatea y envía estos mensajes a los servicios web correspondientes
- Procesa las respuestas recibidas y las devuelve al frontend
- Sirve como intermediario entre el frontend y los sistemas MQ externos

## Componentes Principales

### Estructura de Archivos Excel
- **Propósito**: Definir la estructura de los mensajes que se enviarán a los servicios
- **Características**:
  - Organizados en pestañas/hojas que representan diferentes servicios (como se ve en "Cabecera Servicios", "3088", "Ejemplo", "pruebas")
  - Cada pestaña contiene una tabla estructurada con metadatos sobre los campos del mensaje

### Cabecera de Servicios
- **Propósito**: Define los metadatos generales del servicio y la estructura del mensaje
- **Elementos clave**:
  - **ÁREA GENERAL PARA LLAMADA DE SERVICIOS**: Sección principal que contiene campos comunes a todos los servicios
  - **Longitud del CAMPO**: Especifica cuántos caracteres debe ocupar cada campo en el mensaje final
  - **Tipo de Datos**: Define si el campo debe contener valores numéricos, alfanuméricos, etc.
  - **Obligatorio/opcional**: Indica si el campo es requerido para el mensaje
  - **VALORES**: Especifica los valores posibles para cada campo
  - **Descripción del campo**: Explica el propósito de cada campo

### Secciones de Mensajes
- **Propósito**: Definir las diferentes partes de los mensajes y sus características
- **Elementos clave**:
  - **CABECERA DE SERVICIOS**: Información general del servicio (como se ve en la imagen 1)
  - **REQUERIMIENTO**: Información específica sobre el tipo de solicitud (como se ve en la imagen 2)
  - **OCCURRENCIAS INFOPERA**: Secciones que definen operaciones específicas

### Mensajes Generados/Ejemplos
- **Propósito**: Mostrar ejemplos de mensajes generados y sus resultados
- **Características**:
  - Cadenas largas de caracteres con formato específico (como se ve en la imagen 3)
  - Comentarios explicativos sobre operaciones como "imputación", "reversa", etc.
  - Códigos de respuesta que indican el resultado de la operación

## Flujos de Usuario

### Generación de Mensajes
1. El usuario abre el archivo Excel correspondiente al servicio que desea utilizar
2. Completa los campos necesarios según los requerimientos de su operación
3. La aplicación genera automáticamente una cadena de texto con formato específico (respetando longitudes fijas)
4. El usuario puede revisar y validar la cadena generada
5. Al confirmar, la cadena se envía a través de la API a los servicios externos

### Procesamiento de Respuestas
1. La API recibe la respuesta del servicio externo (MQ)
2. Procesa la cadena de respuesta y extrae los datos relevantes
3. Formatea la respuesta para que sea comprensible para el usuario
4. Presenta la respuesta en la interfaz, mostrando el resultado de la operación y posibles códigos de error

## API y Comunicación

### Formato de Mensajes
- **Estructura**: Cadenas de texto con campos de longitud fija en posiciones específicas
- **Longitud**: Variable según el servicio y tipo de operación
- **Contenido**: Incluye cabecera, tipo de servicio, datos de operación y otros campos requeridos

### Códigos de Respuesta
- **0000**: Transacción exitosa
- **8001**: Error validación de datos
- **8992**: CANAL/SERVICIO NO HABILITADO
- **8991**: ERROR Validación Header mensaje
- **8993**: SERVICIO NO HABILITADO POR CANAL
- **8001**: ERROR PÁRRAFO DE VALIDACIÓN GENERAL
- **5099**: Varios códigos específicos para diferentes tipos de errores (como se ve en la imagen 1)

### Tipos de Operaciones
- **Imputación**: Operaciones relacionadas con cuentas (caja de ahorro, cta cte)
- **Reversa**: Operaciones de reversión
- **Validación**: Verificación de diferentes condiciones (posición deudora, cuenta bloqueada, etc.)

## Estructura del Sistema y Componentes Clave

### Interfaz de Usuario
- **Carga de Archivos**: Permite al usuario seleccionar un archivo Excel específico para el servicio a utilizar
- **Pestañas de navegación**: 
  - **Cabecera**: Muestra los campos de la cabecera del mensaje (102 posiciones)
  - **Requerimiento**: Muestra los campos que forman parte del cuerpo del mensaje de solicitud
  - **Respuesta**: Muestra los campos esperados en la respuesta del servicio
  - **Estructura**: Muestra la representación JSON de toda la estructura del servicio

### Archivo JSON de Estructura
Este archivo es el componente central del sistema y contiene toda la metadata necesaria para procesar los mensajes:

```json
{
  "header_structure": {
    "totalLength": 102,
    "fields": [
      /* Definición detallada de todos los campos de la cabecera */
    ]
  },
  "service_structure": {
    "serviceNumber": "3088",
    "serviceName": "SERVICIO 3088 - Imputador Genérico para varias operaciones",
    "request": {
      "totalLength": 12026,
      "elements": [
        /* Definición de campos y ocurrencias del requerimiento */
      ]
    },
    "response": {
      "totalLength": 7712,
      "elements": [
        /* Definición de campos y ocurrencias de la respuesta */
      ]
    }
  }
}
```

### Elementos Principales de la Estructura JSON
1. **header_structure**: Define la estructura de la cabecera de 102 posiciones
   - **totalLength**: Longitud total de la cabecera (102)
   - **fields**: Array con la definición de cada campo (nombre, longitud, tipo, etc.)

2. **service_structure**: Define la estructura específica del servicio
   - **serviceNumber**: Identificador del servicio (ej: "3088")
   - **serviceName**: Nombre descriptivo del servicio
   - **request**: Estructura del mensaje de solicitud
     - **totalLength**: Longitud total del requerimiento
     - **elements**: Array de campos y ocurrencias que forman el requerimiento
   - **response**: Estructura del mensaje de respuesta
     - **totalLength**: Longitud total de la respuesta
     - **elements**: Array de campos y ocurrencias que forman la respuesta

## Interfaz de Usuario y Operación del Sistema

### Interfaz de Servicio de Ida

La interfaz para el servicio de ida permite:

1. **Selección de servicio**: Permite elegir el servicio específico (ej: "SERVICIO 3088 - Imputador Genérico para varias operaciones")
2. **Selección de configuración**: Permite elegir la configuración específica para ese servicio (ej: "Config (88_ME_v2) [ME]")
3. **Edición de JSON**: Muestra un editor donde se puede visualizar y modificar el JSON a enviar, que incluye:
   - Información del servicio (serviceNumber, serviceName, canal, version)
   - Datos de cabecera (LONGITUD DEL MENSAJE, CANAL, SERVICIO, etc.)
   - Cuerpo del requerimiento con los campos específicos del servicio
4. **Generación de string**: Botón "Generar String Fijo" que convierte el JSON en el string posicional
5. **Visualización del string**: Muestra el string generado en formato posicional con longitud fija

### Interfaz de Servicio de Vuelta

La interfaz para el servicio de vuelta permite:

1. **Selección de servicio**: Permite elegir el servicio para procesar la respuesta
2. **Procesamiento de respuesta**: Botón "Procesar Servicio de Vuelta" para convertir un string de respuesta en JSON
3. **Generación de ejemplo**: Botón "Generar Ejemplo" para crear un string de respuesta de prueba
4. **Visualización del string**: Muestra el string de respuesta en el área "Stream de datos"
5. **Visualización del JSON**: Muestra el JSON resultante del procesamiento en el área "Respuesta"

### Flujo de Trabajo en la Interfaz

1. **Para enviar un requerimiento**:
   - Seleccionar el servicio y la configuración
   - Editar el JSON según sea necesario
   - Generar el string fijo
   - Copiar el string para usarlo en la llamada al servicio

2. **Para procesar una respuesta**:
   - Seleccionar el servicio
   - Ingresar el string de respuesta recibido en "Stream de datos" (o generar un ejemplo)
   - Procesar el servicio de vuelta
   - Obtener el JSON resultante

### Importancia de las Configuraciones

Como se puede ver en la interfaz, cada servicio puede tener múltiples configuraciones (ej: "Config (88_ME_v2) [ME]"). Estas configuraciones:

- Definen valores específicos para cada equipo o caso de uso
- Establecen valores predeterminados para campos comunes (como el canal "ME" en el ejemplo)
- Permiten personalizar el comportamiento del servicio sin cambiar su estructura base

### Simulación de Respuestas

Una característica importante del sistema es que puede generar ejemplos de respuestas que cumplen con la estructura definida. Esto permite:

- Probar el proceso de conversión sin necesidad de realizar llamadas reales al servicio
- Validar que la estructura de respuesta se procese correctamente
- Facilitar el desarrollo y pruebas de los sistemas que consumirán estas respuestas
- Proporcionar ejemplos para documentación y capacitación

## Flujo de Datos Completo

### 1. JSON de Ida (Simplificado para el Programador)
- Formato simplificado que el programador envía a la API
- Contiene solo la información esencial necesaria para generar el mensaje completo
- No requiere que el programador conozca la estructura posicional compleja

Ejemplo:
```json
{
  "servicio": "3088",
  "canal": "01",
  "usuario": "USUARIO1",
  "tipoPedido": "1",
  "operaciones": [
    {
      "numeroOperacion": "2",
      "bancoOrigen": "072",
      "sucursalOrigen": "001",
      "fechaProceso": "11/05/2025",
      "fechaMovimiento": "11/05/2025",
      "fechaValor": "11/05/2025",
      "concepto": "TRANSFERENCIA",
      "cuentas": [
        {
          "productoRubro": "10001",
          "numeroCuenta": "1234567"
        }
      ],
      "importes": [
        {
          "importe": "1000.50"
        }
      ],
      "sucursales": [
        {
          "banco": "072",
          "sucursal": "001"
        }
      ]
    }
  ]
}
```

### 2. Proceso de Transformación (JSON de Ida → String de Ida)
- La aplicación identifica el servicio (3088) y obtiene la estructura completa del JSON de estructura
- Recupera la cabecera de 102 posiciones correspondiente
- Recorre el JSON de ida y va construyendo el string según las posiciones y longitudes definidas
- Para cada ocurrencia en el JSON de ida, genera las repeticiones correspondientes en el string

### 3. String de Ida (Formato Posicional para el Servicio)
- Compuesto por: Cabecera (102 posiciones) + Cuerpo del requerimiento
- Respeta estrictamente las posiciones y longitudes definidas en la estructura
- Se envía al servicio externo a través de MQ

Ejemplo:
```
00064303088000000000111105202514302200USUARIO1001                          0010127200110000000000111105202511052025110520250TRANSFERENCIA000010001123456700010000500010720010000000000000000
```

### 4. String de Vuelta (Respuesta del Servicio)
- Respuesta recibida desde el servicio externo
- Compuesto por: Cabecera de respuesta (102 posiciones) + Cuerpo de la respuesta
- La cabecera contiene información sobre el resultado de la operación (éxito/error)

Ejemplo:
```
00064303088000001111150525143022USUARIO1001TRANSACCION EXITOSA                         00   0001000101                                        REALIZADO                                                                       
```

### 5. Proceso de Transformación (String de Vuelta → JSON de Vuelta)
- La aplicación analiza los primeros 102 caracteres para obtener información de la cabecera
- Utiliza la estructura de la respuesta definida en el JSON de estructura para interpretar el resto del string
- Para cada ocurrencia en la estructura, determina cuántas instancias hay en la respuesta y extrae sus datos
- Construye un JSON estructurado con solo la información relevante

### 6. JSON de Vuelta (Formato para el Programador)
- Formato estructurado y fácil de procesar para el programador
- Solo incluye la información relevante, sin campos vacíos o no utilizados
- Las ocurrencias se representan como arrays de objetos

Ejemplo:
```json
{
  "codigoRetorno": "0000",
  "descripcion": "TRANSACCION EXITOSA",
  "fecha": "11/05/2025",
  "hora": "143022",
  "estado": "00",
  "cantidadRegistros": "1",
  "masDatos": "0",
  "resultados": [
    {
      "inconsistencia": "00",
      "contenidoIdOps": "01",
      "numeroOperacion": "2",
      "mensajeError": "REALIZADO",
      "mensajeErrorTrama": ""
    }
  ]
}
```

## Instrucciones Detalladas para Claude sobre el Procesador de Mensajes de Servicios

Este documento contiene toda la información relevante sobre la aplicación de procesamiento de mensajes para servicios financieros. La aplicación actúa como un intermediario entre programadores modernos y sistemas legacy, convirtiendo entre formatos JSON y strings posicionales.

### Conceptos Fundamentales a Recordar

1. **Estructura de Mensajes**: 
   - Cabecera fija de 102 posiciones + cuerpo dinámico según el servicio
   - Los mensajes siguen un formato posicional estricto con longitudes fijas
   - La estructura está definida en archivos Excel y luego convertida a JSON

2. **Archivos Clave**:
   - **Excel**: Define la estructura base de los servicios (cabecera, requerimiento, respuesta)
   - **JSON de Estructura**: Representación JSON de la estructura completa del servicio
   - **Headers**: Cabeceras de 102 posiciones para cada servicio
   - **Settings**: Configuraciones específicas para diferentes equipos o casos de uso

3. **Flujo de Procesamiento**:
   - JSON de Ida (programador) → String de Ida (servicio MQ)
   - String de Vuelta (servicio MQ) → JSON de Vuelta (programador)

4. **Ocurrencias (Loops)**:
   - Secciones repetibles en los mensajes
   - Pueden tener múltiples instancias y estar anidadas
   - Se representan como arrays en JSON y como secuencias en el formato posicional

5. **Configuraciones**:
   - Personalizan la implementación de un servicio para diferentes equipos
   - Definen valores específicos como el canal, usuario, etc.
   - Permiten reutilizar la misma estructura con diferentes parámetros

### Capacidades para Asistir al Usuario

1. **Explicar Conceptos**:
   - Puedes explicar cómo funciona la conversión entre JSON y strings posicionales
   - Puedes aclarar el propósito y estructura de los diferentes archivos (Excel, structure, headers, settings)
   - Puedes describir el flujo completo de procesamiento y transformación

2. **Asistencia con Estructura**:
   - Puedes ayudar a interpretar la estructura JSON de un servicio específico
   - Puedes explicar el significado y propósito de campos específicos
   - Puedes asesorar sobre el manejo de ocurrencias y su representación

3. **Ayuda con Configuraciones**:
   - Puedes explicar cómo crear o modificar configuraciones para diferentes equipos
   - Puedes asesorar sobre qué valores deben ser configurados según el contexto

4. **Resolución de Problemas**:
   - Puedes ayudar a identificar posibles causas de errores en la conversión
   - Puedes sugerir validaciones o verificaciones para asegurar la correcta formación de los mensajes

5. **Mejores Prácticas**:
   - Puedes recomendar enfoques para el uso eficiente del sistema
   - Puedes sugerir estrategias para la documentación y mantenimiento

### Cómo Responder a Consultas Específicas

1. **Si preguntan sobre un servicio específico**: Solicita información sobre el número de servicio (ej: 3088) y, si es posible, la estructura completa o algún ejemplo de su uso.

2. **Si preguntan sobre campos específicos**: Pide detalles sobre el servicio al que pertenece el campo y su contexto (cabecera, requerimiento, respuesta).

3. **Si tienen problemas con la conversión**: Solicita ver tanto el JSON como el string resultante para identificar posibles discrepancias o errores.

4. **Si necesitan crear una nueva configuración**: Guíalos paso a paso sobre qué elementos deben definir y cómo aplicarlos.

5. **Si quieren entender la estructura de ocurrencias**: Explica el concepto utilizando ejemplos concretos y cómo se representan en ambos formatos.

Cuando el usuario necesite que utilices esta referencia, pueden mencionar: "Por favor, utiliza el archivo README.md sobre el Procesador de Mensajes de Servicios como contexto para entender mi aplicación y continuar desde ahí."
