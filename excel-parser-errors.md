# Propuesta de mejora: Detección precisa de errores en Excel Parser

## Objetivo
Mejorar el sistema de detección y reporte de errores en el módulo de parseo de Excel para que identifique exactamente en qué fila, columna y hoja ocurre el problema cuando falla la generación de estructura.

## Cambios necesarios en el Backend

### 1. Modificar el archivo `utils/excel-parser.js`

Añadir captura detallada de excepciones durante el parsing:

```javascript
// Dentro de la función que procesa la hoja de requerimiento
try {
  // Código existente de parsing de la hoja
} catch (error) {
  // Capturar información detallada
  const detailedError = {
    sheet: sheetName,
    row: currentRow || '?',
    column: currentColumn || '?',
    message: error.message || 'Error al procesar la hoja',
    code: error.code || 'PARSE_ERROR'
  };
  
  // Guardar el error en un array
  if (!parseErrors) parseErrors = [];
  parseErrors.push(detailedError);
  
  console.error(`Error en hoja ${sheetName}, fila ${currentRow}, columna ${currentColumn}: ${error.message}`);
  
  // Continuar con la siguiente hoja en lugar de fallar completamente
}
```

### 2. Modificar la ruta `/excel/structure`

Actualizar para devolver los errores de parsing:

```javascript
// En routes/excel.js
router.get('/structure', (req, res) => {
  // Código existente...
  
  // Al final, antes de enviar la respuesta:
  if (structure) {
    // Añadir los errores de parsing si existen
    if (parseErrors && parseErrors.length > 0) {
      structure.parse_errors = parseErrors;
    }
    if (requestParseErrors && requestParseErrors.length > 0) {
      structure.parse_errors_request = requestParseErrors;
    }
    if (responseParseErrors && responseParseErrors.length > 0) {
      structure.parse_errors_response = responseParseErrors;
    }
    
    res.json(structure);
  } else {
    res.status(404).json({ error: 'No se encontró la estructura' });
  }
});
```

## Implementación de tracking de errores

Para cada sección del Excel, necesitamos:

1. Mantener un seguimiento de la fila y columna actual durante el parsing
2. Usar bloques try-catch alrededor de cada operación importante
3. Categorizar los errores por tipo (formato incorrecto, celda vacía obligatoria, etc.)
4. Almacenar la información del error y continuar con el procesamiento si es posible

## Ejemplos de errores a detectar

- Pestañas con nombres incorrectos
- Encabezados de columna faltantes o con formato incorrecto
- Celdas combinadas que interrumpen el parsing
- Caracteres especiales o formato que no puede ser procesado
- Inconsistencias entre campos relacionados (ejemplo: contador de ocurrencias no coincide con la estructura)

## Frontend ya implementado

El frontend ya ha sido actualizado para:

1. Mostrar alertas visualmente atractivas con los errores específicos
2. Indicar exactamente qué fila y columna contiene el problema
3. Ofrecer sugerencias para corregir el error
4. Permitir continuar trabajando con una estructura parcial cuando sea posible

## Prioridad
Alta - Esta mejora reducirá significativamente el tiempo de depuración cuando los usuarios carguen archivos Excel incorrectos.
