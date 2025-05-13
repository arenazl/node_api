# Procesador de Mensajes de Servicios - Documentación Esencial

## Propósito y Función
Sistema intermediario entre programadores y servicios legacy que convierte entre:
- **JSON** (formato moderno para desarrolladores)
- **Strings posicionales** (formato legacy con posiciones fijas)

## Estructura de Datos Fundamental

### 1. Mensajes Posicionales
- **Cabecera**: 102 posiciones fijas, común para todos los servicios
- **Cuerpo**: Longitud variable según el servicio (secciones request/response)
- **Ocurrencias**: Secciones repetibles (loops) que pueden estar anidadas

### 2. Archivos Esenciales
- **Excel**: Define la estructura del servicio (cabecera, requerimiento, respuesta)
- **JSON Structure**: Representación en JSON de la estructura completa del servicio
- **JSON Settings**: Personalización del servicio para contextos específicos
- **Headers**: Cabeceras de 102 posiciones para mensajes de ida

## Flujo de Datos Principal
1. **JSON de Ida** → **String de Ida** → Envío a servicio MQ
2. **String de Vuelta** del servicio → **JSON de Vuelta** para el programador

## Estructura del JSON de Estructura
```json
{
  "header_structure": {
    "totalLength": 102,
    "fields": [
      {"name": "CAMPO1", "length": X, "type": "..."},
      {"name": "CAMPO2", "length": Y, "type": "..."}
    ]
  },
  "service_structure": {
    "serviceNumber": "XXXX",
    "serviceName": "...",
    "request": {
      "elements": [
        {"type": "field", "name": "...", "length": N},
        {
          "type": "occurrence", 
          "id": "occ_X", 
          "count": N,
          "fields": [...]
        }
      ]
    },
    "response": {
      "elements": [...]
    }
  }
}
```

## Estructura del JSON de Configuración
```json
{
  "serviceNumber": "XXXX",
  "canal": "XX",
  "version": "vX",
  "header": {
    "CAMPO1": "valor1",
    "CAMPO2": "valor2"
  },
  "request": {
    "CAMPO3": "valor3",
    "occ_1": [
      {"CAMPO4": "valor4"}
    ]
  }
}
```

## Conceptos Cruciales para Procesar Mensajes

### 1. Campos
- Elementos básicos con longitud fija
- Propiedades: nombre, longitud, tipo, obligatoriedad, valores permitidos
- En JSON se representan como propiedades normales
- En strings posicionales ocupan posiciones exactas

### 2. Ocurrencias (Loops)
- Secciones repetibles que pueden contener múltiples instancias
- Pueden estar anidadas (ocurrencias dentro de ocurrencias)
- En JSON se representan como arrays
- En strings posicionales se repiten secuencialmente

### 3. Claves para Identificar Elementos
- `serviceNumber`: Identificador numérico del servicio (ej: "3088")
- `canal`: Identifica el departamento o equipo (ej: "ME")
- Campos específicos del servicio (ej: "SVC3088-TIP-PEDIDO")

## Códigos de Error Importantes
- `0000`: Transacción exitosa
- `8001`: Error validación de datos
- `8992`: CANAL/SERVICIO NO HABILITADO
- `8991`: ERROR Validación Header mensaje
- `5001-5099`: Errores específicos de servicios

## Funciones Principales del Código

### Módulo message-creator.js
```javascript
// Función principal para crear mensajes
function createMessage(headerStructure, serviceStructure, messageData, section = 'request') {
  // Validar parámetros
  // Crear mensaje de cabecera
  const headerMessage = createHeaderMessage(headerStructure, messageData.header || {});
  // Crear mensaje de datos
  const dataMessage = createDataMessage(serviceStructure, messageData.data || {}, section);
  // Combinar mensajes
  return headerMessage + dataMessage;
}

// Crear la parte de cabecera del mensaje
function createHeaderMessage(headerStructure, headerData) {
  let message = '';
  // Procesar cada campo de la cabecera
  for (const field of headerStructure.fields) {
    const fieldName = field.name;
    const fieldLength = field.length;
    const fieldValue = headerData[fieldName] || '';
    // Formatear valor según longitud
    const formattedValue = formatValue(fieldValue, fieldLength);
    // Agregar al mensaje
    message += formattedValue;
  }
  return message;
}

// Crear la parte de datos del mensaje
function createDataMessage(serviceStructure, data, section) {
  // Obtener estructura de la sección
  const sectionStructure = serviceStructure[section];
  let message = '';
  // Procesar elementos de la sección
  for (const element of sectionStructure.elements) {
    if (element.type === 'field') {
      // Procesar campo
      const fieldName = element.name;
      const fieldLength = element.length;
      const fieldValue = data[fieldName] || '';
      // Formatear y agregar
      message += formatValue(fieldValue, fieldLength);
    } else if (element.type === 'occurrence') {
      // Procesar ocurrencia
      const occurrenceData = findOccurrenceData(data, element.id);
      // Formatear ocurrencias
      message += formatOccurrences(element, occurrenceData, element.count);
    }
  }
  return message;
}

// Formatear ocurrencias
function formatOccurrences(occurrenceElement, occurrenceData, maxCount) {
  let message = '';
  // Procesar cada ocurrencia hasta maxCount
  for (let i = 0; i < maxCount; i++) {
    const occurrenceItem = occurrenceData[i] || {};
    // Procesar campos de la ocurrencia
    for (const field of occurrenceElement.fields) {
      if (field.type === 'field') {
        message += formatValue(occurrenceItem[field.name] || '', field.length);
      } else if (field.type === 'occurrence') {
        // Procesar ocurrencia anidada
        const nestedData = findNestedOccurrenceData(occurrenceItem, field.id);
        message += formatOccurrences(field, nestedData, field.count);
      }
    }
  }
  return message;
}
```

### Módulo message-analyzer.js
```javascript
// Función principal para analizar mensajes
function parseMessage(message, headerStructure, serviceStructure) {
  // Analizar cabecera
  const headerLength = calculateHeaderLength(headerStructure);
  const headerMessage = message.substring(0, headerLength);
  const headerData = parseHeaderMessage(headerMessage, headerStructure);
  
  // Determinar sección (request o response)
  const section = determineSection(headerData, serviceStructure);
  
  // Analizar datos
  const dataMessage = message.substring(headerLength);
  const dataStructure = serviceStructure[section];
  const dataData = parseDataMessage(dataMessage, dataStructure);
  
  // Combinar resultados
  return {
    header: headerData,
    data: dataData,
    section: section
  };
}

// Analizar la parte de cabecera
function parseHeaderMessage(headerMessage, headerStructure) {
  const headerData = {};
  let position = 0;
  
  // Procesar cada campo de la cabecera
  for (const field of headerStructure.fields) {
    // Extraer valor del mensaje
    const fieldValue = headerMessage.substring(position, position + field.length).trim();
    // Agregar al objeto de datos
    headerData[field.name] = fieldValue;
    // Avanzar posición
    position += field.length;
  }
  
  return headerData;
}

// Analizar datos del mensaje
function parseDataMessage(dataMessage, dataStructure) {
  const data = {};
  let position = 0;
  
  // Procesar elementos
  for (const element of dataStructure.elements) {
    if (element.type === 'field') {
      // Procesar campo
      const fieldValue = dataMessage.substring(position, position + element.length).trim();
      data[element.name] = fieldValue;
      position += element.length;
    } else if (element.type === 'occurrence') {
      // Procesar ocurrencia
      const { occurrenceData, newPosition } = parseOccurrence(
        dataMessage, position, element, element.count
      );
      // Agregar al objeto de datos
      data[element.id] = occurrenceData;
      // Actualizar posición
      position = newPosition;
    }
  }
  
  return data;
}

// Analizar ocurrencias
function parseOccurrence(message, startPosition, occurrenceElement, count) {
  const occurrenceData = [];
  let position = startPosition;
  
  // Calcular longitud de una ocurrencia
  const occurrenceLength = calculateOccurrenceLength(occurrenceElement.fields);
  
  // Procesar cada ocurrencia
  for (let i = 0; i < count; i++) {
    const occurrenceItem = {};
    let itemPosition = position;
    
    // Procesar campos de la ocurrencia
    for (const field of occurrenceElement.fields) {
      if (field.type === 'field') {
        // Extraer valor del mensaje
        const fieldValue = message.substring(itemPosition, itemPosition + field.length).trim();
        // Agregar al objeto de datos
        occurrenceItem[field.name] = fieldValue;
        // Avanzar posición
        itemPosition += field.length;
      } else if (field.type === 'occurrence') {
        // Procesar ocurrencia anidada
        const { occurrenceData: nestedData, newPosition } = parseOccurrence(
          message, itemPosition, field, field.count
        );
        // Agregar al objeto de datos
        occurrenceItem[field.id] = nestedData;
        // Actualizar posición
        itemPosition = newPosition;
      }
    }
    
    // Agregar item a la lista de ocurrencias
    occurrenceData.push(occurrenceItem);
    
    // Avanzar posición para la siguiente ocurrencia
    position += occurrenceLength;
  }
  
  return { occurrenceData, newPosition: position };
}
```