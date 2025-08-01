# 🔄 CRÍTICO: Flujo de Datos y Procesamiento de Mensajes

## Resumen Ejecutivo

El flujo de datos es el corazón del sistema. Cualquier error aquí puede resultar en comunicación incorrecta con el mainframe, lo cual es crítico para las operaciones del negocio.

## Flujos Principales

### 1. Definición de Servicio (Excel → JSON)

```
Excel Upload → excel-parser.js → JSON Structure
     ↓              ↓                  ↓
 uploads/     Parse Headers     structures/
              Parse Service
              Parse Fields
```

**Archivos Clave**:
- `routes/excel.js`: Maneja la carga
- `utils/excel-parser.js`: Procesa el Excel
- `utils/excel-parser-enhanced.js`: Versión mejorada

### 2. Flujo IDA (Outbound: JSON → Fixed String)

```javascript
// Entrada
{
  "header": {
    "serviceNumber": "1004",
    "canal": "SM"
  },
  "parameters": {
    "campo1": "valor1"
  }
}

// Proceso
1. loadServiceData(serviceNumber)
2. loadServiceConfig(serviceNumber, canal)
3. buildRequestData(header, parameters, config)
4. message-creator.createMessage()
5. Aplicar formato según tipo de campo

// Salida
"SM  1004    SISTEMA   valor1      ..."
```

### 3. Flujo VUELTA (Inbound: Fixed String → JSON)

```javascript
// Entrada
"SM  1004    SISTEMA   respuesta   ..."

// Proceso
1. parseHeaderMessage(0, headerLength)
2. parseDataMessage(headerLength, end)
3. Mapear campos según estructura
4. json-cleaner.cleanVueltaJson()
5. Eliminar campos vacíos/nulos

// Salida
{
  "campo1": "respuesta",
  "codigo": "00"
}
```

## Componentes Críticos del Flujo

### message-creator.js

**Responsabilidades**:
- Formatear valores según tipo (numérico, alfanumérico)
- Aplicar padding correcto (espacios o ceros)
- Manejar occurrences (arrays de estructuras repetidas)
- Construir mensaje final concatenado

**Puntos Críticos**:
```javascript
function formatValue(value, length, type, fieldName, valores) {
  // CRÍTICO: El padding incorrecto rompe el mainframe
  if (type === 'X') {
    return value.padEnd(length, ' ');
  } else if (type === '9') {
    return value.padStart(length, '0');
  }
}
```

### message-analyzer.js

**Responsabilidades**:
- Parsear mensaje por posiciones fijas
- Identificar tipos de campos
- Manejar estructuras anidadas
- Limpiar valores (trim, conversión)

**Puntos Críticos**:
```javascript
function parseDataMessage(message, structure) {
  let position = 0;
  // CRÍTICO: Un error de posición corrompe todo el parsing
  for (const field of structure.elements) {
    const value = message.substring(position, position + field.length);
    position += field.length;
  }
}
```

## Validaciones Críticas

### Pre-procesamiento
1. ✅ Validar serviceNumber existe
2. ✅ Validar estructura cargada
3. ❌ **FALTANTE**: Validar longitud total del mensaje
4. ❌ **FALTANTE**: Validar tipos de datos antes de formatear

### Post-procesamiento
1. ✅ Limpiar campos vacíos
2. ❌ **FALTANTE**: Validar checksum o CRC
3. ❌ **FALTANTE**: Log de mensajes para auditoría

## Riesgos Identificados

### 🔴 Riesgo Alto
1. **Sin validación de longitud total**: Puede enviar mensajes truncados
2. **Sin rollback**: Si falla a mitad, queda en estado inconsistente
3. **Posiciones hardcodeadas**: Un cambio rompe todo

### 🟡 Riesgo Medio
1. **Cache no sincronizado**: Puede usar estructuras obsoletas
2. **Sin versionado de estructuras**: Cambios rompen compatibilidad

## Acciones Críticas Requeridas

1. **Implementar validación de longitud**:
   ```javascript
   if (message.length !== expectedLength) {
     throw new Error(`Longitud incorrecta: ${message.length} vs ${expectedLength}`);
   }
   ```

2. **Agregar logs de auditoría**:
   ```javascript
   logger.info('IDA_MESSAGE', {
     service: serviceNumber,
     canal: canal,
     messageLength: message.length,
     timestamp: new Date()
   });
   ```

3. **Crear tests de regresión** para cada servicio

4. **Documentar formato exacto** de cada campo

## Diagrama de Flujo Completo

```
Cliente
   ↓
Validación Request
   ↓
Cache Check → [HIT] → Usar estructura cached
   ↓           
[MISS] → Cargar de archivo
   ↓
Construir Mensaje
   ↓
Validar Longitud ← CRÍTICO: Implementar
   ↓
Log Auditoría ← CRÍTICO: Implementar
   ↓
Responder al Cliente
```