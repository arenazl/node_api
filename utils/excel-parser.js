/**
 * Funciones para parsear archivos Excel - VERSIÓN CON DETECCIÓN AUTOMÁTICA
 */

const XLSX = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

/**
 * Parsea la estructura de cabecera desde un archivo Excel
 * @param {string} filePath - Ruta del archivo Excel
 * @returns {Object} Estructura de cabecera
 */
function parseHeaderStructure(filePath) {
  // Leer archivo Excel
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  
  // Buscar hoja "Cabecera Servicios"
  let headerSheetName = null;
  
  // Buscar coincidencia exacta primero
  for (const name of workbook.SheetNames) {
    if (name.toLowerCase().includes('cabecera') && name.toLowerCase().includes('servicio')) {
      headerSheetName = name;
      console.log(`Hoja de cabecera encontrada por nombre: ${headerSheetName}`);
      break;
    }
  }
  
  // Si no hay coincidencia exacta, buscar hoja que contenga 'CABECERA DE SERVICIOS'
  if (!headerSheetName) {
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      
      // Buscar en las primeras 20 filas
      for (let row = range.s.r; row <= Math.min(range.e.r, 20); row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = sheet[cellAddress];
          
          if (cell && cell.t === 's' && cell.v.includes('CABECERA DE SERVICIOS')) {
            headerSheetName = name;
            console.log(`Hoja de cabecera encontrada por contenido: ${headerSheetName}`);
            break;
          }
        }
        
        if (headerSheetName) break;
      }
      
      if (headerSheetName) break;
    }
  }
  
  // Si aún no se encuentra, usar la primera hoja
  if (!headerSheetName) {
    headerSheetName = workbook.SheetNames[0];
    console.log(`No se encontró hoja específica de cabecera, usando la primera hoja: ${headerSheetName}`);
  }
  
  // Convertir hoja a matriz de datos
  const worksheet = workbook.Sheets[headerSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  
  // Mostrar primeras 5 filas para depuración
  console.log('Primeras 5 filas de datos de cabecera:');
  for (let i = 0; i < Math.min(data.length, 5); i++) {
    console.log(`Fila ${i}: ${JSON.stringify(data[i])}`);
  }
  
  // Estructura para almacenar campos de cabecera
  const headerStructure = {
    totalLength: 0,
    fields: []
  };
  
  // Función para encontrar la primera celda no vacía en una fila
  function findFirstNonEmptyCell(row) {
    if (!row) return -1;
    
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') {
        return i;
      }
    }
    
    return -1;
  }
  
  // Función para encontrar texto específico en una fila
  function findTextIndexInRow(row, searchText) {
    if (!row) return -1;
    
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== null && row[i] !== undefined && 
          typeof row[i] === 'string' && row[i].includes(searchText)) {
        return i;
      }
    }
    
    return -1;
  }
  
  // Procesar filas
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    
    // Omitir filas vacías
    if (!row || row.length === 0) continue;
    
    // Buscar fila que contenga "CABECERA DE SERVICIOS" para obtener longitud total
    const cabeceraIndex = findTextIndexInRow(row, 'CABECERA DE SERVICIOS');
    if (cabeceraIndex >= 0) {
      // Buscar longitud en celdas siguientes
      for (let i = cabeceraIndex + 1; i < row.length; i++) {
        if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') {
          try {
            const length = parseInt(String(row[i]).trim());
            headerStructure.totalLength = length;
            console.log(`Longitud total de cabecera: ${headerStructure.totalLength}`);
            break;
          } catch (error) {
            // Ignorar si no es un número
          }
        }
      }
      continue;
    }
    
    // Procesar campos (buscando patrón de nombre seguido de longitud numérica)
    const firstNonEmptyIndex = findFirstNonEmptyCell(row);
    if (firstNonEmptyIndex === -1) continue;
    
    const fieldName = String(row[firstNonEmptyIndex]).trim();
    
    // Filtrar filas de título o sección
    if (fieldName.includes('AREA GENERAL') || 
        fieldName.includes('DATOS ENVIADOS') || 
        fieldName.includes('MAXIMA LONGITUD') || 
        fieldName.includes('CABECERA DE SERVICIOS')) {
      continue;
    }
    
    // Buscar longitud (debería ser un número en alguna celda siguiente)
    let fieldLength = 0;
    let fieldLengthIndex = -1;
    
    for (let i = firstNonEmptyIndex + 1; i < row.length; i++) {
      if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') {
        try {
          const length = parseInt(String(row[i]).trim());
          fieldLength = length;
          fieldLengthIndex = i;
          break;
        } catch (error) {
          // Ignorar si no es un número
        }
      }
    }
    
    // Solo procesar si encontramos una longitud válida
    if (fieldLengthIndex >= 0) {
      // Buscar valores restantes en posiciones siguientes
      let fieldTypeIndex = -1;
      let fieldRequiredIndex = -1;
      let fieldValuesIndex = -1;
      let fieldDescriptionIndex = -1;
      
      // Tipo (siguiente celda no vacía después de longitud)
      for (let i = fieldLengthIndex + 1; i < row.length; i++) {
        if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') {
          fieldTypeIndex = i;
          break;
        }
      }
      
      // Requerido (siguiente celda no vacía después de tipo)
      if (fieldTypeIndex >= 0) {
        for (let i = fieldTypeIndex + 1; i < row.length; i++) {
          if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') {
            fieldRequiredIndex = i;
            break;
          }
        }
      }
      
      // Valores (siguiente celda no vacía después de requerido)
      if (fieldRequiredIndex >= 0) {
        for (let i = fieldRequiredIndex + 1; i < row.length; i++) {
          if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') {
            fieldValuesIndex = i;
            break;
          }
        }
      }
      
      // Descripción (siguiente celda no vacía después de valores)
      if (fieldValuesIndex >= 0) {
        for (let i = fieldValuesIndex + 1; i < row.length; i++) {
          if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') {
            fieldDescriptionIndex = i;
            break;
          }
        }
      }
      
      // Crear objeto de campo
      const field = {
        name: fieldName,
        length: fieldLength,
        type: fieldTypeIndex >= 0 ? String(row[fieldTypeIndex] || '').trim() : '',
        required: fieldRequiredIndex >= 0 ? String(row[fieldRequiredIndex] || '').trim() : '',
        values: fieldValuesIndex >= 0 ? String(row[fieldValuesIndex] || '').trim() : '',
        description: fieldDescriptionIndex >= 0 ? String(row[fieldDescriptionIndex] || '').trim() : ''
      };
      
      headerStructure.fields.push(field);
      console.log(`Campo agregado a cabecera: ${fieldName} (longitud: ${fieldLength})`);
    }
  }
  
  // Validar longitud total
  const calculatedLength = headerStructure.fields.reduce((sum, field) => sum + field.length, 0);
  console.log(`Longitud calculada: ${calculatedLength}, Longitud declarada: ${headerStructure.totalLength}`);
  
  if (headerStructure.totalLength > 0 && calculatedLength !== headerStructure.totalLength) {
    console.warn(`ADVERTENCIA: La longitud calculada de la cabecera (${calculatedLength}) no coincide con la longitud declarada (${headerStructure.totalLength})`);
  }
  
  // Imprimir resumen
  console.log('\nResumen de cabecera:');
  console.log(`- Total de campos: ${headerStructure.fields.length}`);
  console.log(`- Longitud total: ${headerStructure.totalLength}`);
  
  return headerStructure;
}

/**
 * Parsea la estructura de servicio desde un archivo Excel - VERSIÓN ORIGINAL
 * @param {string} filePath - Ruta del archivo Excel
 * @returns {Object} Estructura de servicio
 */
function parseServiceStructure(filePath) {
  try {
    console.log("[DEBUG-PARSER] ===== INICIANDO PARSEO DE SERVICIO =====");
    console.log("[DEBUG-PARSER] Archivo:", filePath);
    
    // Intentar con el parser estándar (que funciona bien para SVC3088)
    console.log("[DEBUG-PARSER] PASO 1: Probando con parser estándar original");
    
    try {
      console.log("[DEBUG-PARSER] Ejecutando parser original...");
      const structure = parseServiceStructureOriginal(filePath);
      
      // VERIFICACIÓN CLAVE: Si el request está vacío, puede ser un indicio de problemas con el parser
      if (!structure.request || !structure.request.elements || structure.request.elements.length === 0) {
        console.warn("[DEBUG-PARSER] ¡ATENCIÓN! El parser original no encontró elementos en request");
        console.warn("[DEBUG-PARSER] Request está vacío, esto indica que el formato puede ser no estándar");
        console.log("[DEBUG-PARSER] Campos en el request:", structure.request?.elements?.length || 0);
        throw new Error("No hay elementos en request, probar enhanced");
      }
      
      console.log("[DEBUG-PARSER] ✓ Parser original EXITOSO");
      console.log("[DEBUG-PARSER] Campos en request:", structure.request.elements.length);
      console.log("[DEBUG-PARSER] Campos en response:", structure.response.elements.length);
      return structure;
    } catch (originalError) {
      // Si falla el parser original, intentar con el mejorado
      console.log(`[DEBUG-PARSER] ✗ Parser original FALLÓ: ${originalError.message}`);
      console.log("[DEBUG-PARSER] PASO 2: Usando parser enhanced como FALLBACK");
      
      try {
        console.log("[DEBUG-PARSER] Cargando módulo excel-parser-enhanced...");
        const enhancedParser = require('./excel-parser-enhanced');
        console.log("[DEBUG-PARSER] Ejecutando parseServiceStructureDetailed...");
        const enhancedResult = enhancedParser.parseServiceStructureDetailed(filePath);
        console.log("[DEBUG-PARSER] ✓ Parser enhanced EXITOSO");
        
        if (enhancedResult.request && enhancedResult.request.elements) {
          console.log("[DEBUG-PARSER] Campos en request (enhanced):", enhancedResult.request.elements.length);
        }
        
        return enhancedResult;
      } catch (enhancedError) {
        console.error("[DEBUG-PARSER] ✗ Error también con enhanced parser:", enhancedError);
        throw enhancedError;
      }
    }
  } catch (error) {
    console.error("Error general en parseServiceStructure:", error);
    
    return {
      serviceNumber: "error",
      serviceName: "Error al parsear estructura",
      request: { elements: [], fieldCount: 0, occurrenceCount: 0, totalFieldCount: 0 },
      response: { elements: [], fieldCount: 0, occurrenceCount: 0, totalFieldCount: 0 }
    };
  }
}

/**
 * Versión original del parser - Funciona bien para SVC3088 y otros servicios estándar
 * @param {string} filePath - Ruta del archivo Excel
 * @returns {Object} Estructura de servicio
 */
function parseServiceStructureOriginal(filePath) {
  // Leer archivo Excel
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  
  // Usar siempre la segunda hoja (índice 1), o la primera si solo hay una
  const sheetName = workbook.SheetNames.length > 1 ? workbook.SheetNames[1] : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convertir hoja a matriz de datos
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  
  // Obtener número de servicio del nombre de la hoja
  let serviceNumber = null;
  const serviceMatch = sheetName.match(/(\d{4})/) || sheetName.match(/SVC(\d+)/i);
  if (serviceMatch) {
    serviceNumber = serviceMatch[1];
  }
  
  // Obtener el nombre del servicio buscando en las primeras filas un valor que empiece con "SERVICIO"
  let serviceName = "";
  
  // Buscar en las primeras 10 filas de la hoja
  const maxRows = Math.min(data.length, 10);
  let serviceNameFound = false;
  
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
    const row = data[rowIndex];
    if (!row) continue;
    
    // Buscar en todas las columnas de la fila
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = row[colIndex];
      if (cellValue && typeof cellValue === 'string') {
        const cellText = String(cellValue).trim();
        // Buscar una celda que empiece con "SERVICIO"
        if (cellText.toUpperCase().startsWith('SERVICIO')) {
          serviceName = cellText;
          console.log(`Nombre del servicio encontrado en fila ${rowIndex + 1}, columna ${colIndex + 1}: "${serviceName}"`);
          serviceNameFound = true;
          break;
        }
      }
    }
    
    if (serviceNameFound) break;
  }
  
  // Si no se encontró un nombre que empiece con "SERVICIO", intentar obtener de la fila 2 (método original)
  if (!serviceNameFound && data.length > 1 && data[1] && data[1].length > 0) {
    // La segunda fila (index 1) contiene el nombre del servicio en la primera columna no vacía
    for (let i = 0; i < data[1].length; i++) {
      if (data[1][i] && String(data[1][i]).trim() !== '') {
        serviceName = String(data[1][i]).trim();
        console.log(`Nombre del servicio extraído de la fila 2 (método alternativo): "${serviceName}"`);
        break;
      }
    }
  }
  
  // Si no se pudo extraer el nombre del servicio, usar el nombre del archivo como fallback
  if (!serviceName) {
    const excelFileName = path.basename(filePath, path.extname(filePath));
    // Extraer el nombre sin timestamp si tiene un formato estándar
    serviceName = excelFileName;
    if (excelFileName.match(/^\d{8}T\d{4,6}_/)) {
      serviceName = excelFileName.replace(/^\d{8}T\d{4,6}_/, '');
    }
    console.log(`Nombre del servicio no encontrado en fila 2, usando nombre del archivo: "${serviceName}"`);
  }
  
  // Mapeo de columnas (índice 0)
  const COL_FIELD_NAME = 1;  // Columna B
  const COL_LENGTH = 2;      // Columna C
  const COL_TYPE = 3;        // Columna D
  const COL_REQUIRED = 4;    // Columna E
  const COL_VALUES = 5;      // Columna F
  const COL_DESC = 6;        // Columna G
  
  // Estructura de salida unificada
  const structure = {
    serviceNumber: serviceNumber,
    serviceName: serviceName,
    request: {
      totalLength: 0,
      elements: [],
      fieldCount: 0,
      occurrenceCount: 0
    },
    response: {
      totalLength: 0,
      elements: [],
      fieldCount: 0,
      occurrenceCount: 0
    }
  };
  
  // Funciones para crear elementos
  function createField(row, index) {
    const fieldName = String(row[COL_FIELD_NAME] || '').trim();
    const fieldType = String(row[COL_TYPE] || '').trim();
    
    return {
      type: 'field',
      index: index,
      name: fieldName,
      length: row[COL_LENGTH] && String(row[COL_LENGTH]).trim().match(/^\d+$/) ? parseInt(String(row[COL_LENGTH])) : 0,
      fieldType: fieldType,
      required: String(row[COL_REQUIRED] || '').trim(),
      values: String(row[COL_VALUES] || '').trim(),
      description: String(row[COL_DESC] || '').trim()
    };
  }
  
  function createOccurrence(count, index, level, parentId = null) {
    // Crear ID único para ocurrencia
    // Si tiene parentId, usar formato "parentId_index"
    const occId = parentId ? `${parentId}_${index}` : `occ_${index}`;
    
    return {
      type: 'occurrence',
      index: index,
      id: occId,
      count: count,
      fields: [],
      level: level,
      parentId: parentId
    };
  }
  
  // Variables de estado para procesamiento
  let currentSection = null;  // 'request' o 'response'
  let occurrenceStack = [];   // Pila para rastrear ocurrencias anidadas
  let occurrenceLevel = 0;    // Nivel de anidamiento actual
  let currentIndex = 0;       // Índice actual en lista unificada
  
  // Procesamiento principal
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    
    if (!row || row.length === 0) continue;
    
    const fieldName = String(row[COL_FIELD_NAME] || '').trim();
    const lengthValue = String(row[COL_LENGTH] || '').trim();
    const normalizedFieldName = fieldName.toUpperCase();
    
    // Detectar sección principal (REQUERIMIENTO/RESPUESTA/SOLICITUD)
    // Primero verificamos en la columna A (índice 0)
    const colAValue = row[0] ? String(row[0] || '').trim().toUpperCase() : "";
    
    // Requerimiento puede estar en columna A o B
    if (colAValue.includes('REQUERIMIENTO') || colAValue.includes('SOLICITUD') ||
        normalizedFieldName.includes('REQUERIMIENTO') || normalizedFieldName.includes('SOLICITUD')) {
      console.log(`Detectada sección REQUERIMIENTO/SOLICITUD: "${colAValue || fieldName}" en fila ${rowIndex+1}`);
      currentSection = 'request';
      structure.request.totalLength = lengthValue.match(/^\d+$/) ? parseInt(lengthValue) : 0;
      occurrenceStack = [];
      occurrenceLevel = 0;
      currentIndex = 0;
      continue;
    }
    
    // También verificar RESPUESTA en columna A
    const colAValueResp = row[0] ? String(row[0] || '').trim().toUpperCase() : "";
    if (colAValueResp === 'RESPUESTA' || normalizedFieldName.includes('RESPUESTA')) {
      console.log(`Detectada sección RESPUESTA: "${colAValueResp || fieldName}" en fila ${rowIndex+1}`);
      currentSection = 'response';
      structure.response.totalLength = lengthValue.match(/^\d+$/) ? parseInt(lengthValue) : 0;
      occurrenceStack = [];
      occurrenceLevel = 0;
      currentIndex = 0;
      continue;
    }
    
    // Si no hay sección activa, omitir
    if (!currentSection) continue;
    
    // Detectar inicio de ocurrencia
    const occurrenceMatch = normalizedFieldName.match(/(\d+)\s+OCURRENCIA(?:S)?\s+INFORMADA(?:S)?/i);
    if (occurrenceMatch) {
      // Incrementar nivel de anidamiento
      occurrenceLevel++;
      
      // Crear nueva ocurrencia
      const count = occurrenceMatch[1].match(/^\d+$/) ? parseInt(occurrenceMatch[1]) : 0;
      const newOccurrence = createOccurrence(count, currentIndex, occurrenceLevel);
      currentIndex++;
      
      // Obtener ID del padre si existe
      const parentId = occurrenceStack.length > 0 ? occurrenceStack[occurrenceStack.length - 1].id : null;
      
      // Actualizar parentId de la ocurrencia
      newOccurrence.parentId = parentId;
      
      // Si es ocurrencia de nivel 1 o superior, no agregar a la lista principal
      // Solo agregar a la pila para que sus campos se agreguen a ella
      if (occurrenceLevel === 1) {
        // Ocurrencia de nivel 1, agregar a la lista principal
        structure[currentSection].elements.push(newOccurrence);
        structure[currentSection].occurrenceCount++;
        
        // Nueva ocurrencia principal
        occurrenceStack = [newOccurrence];
      } else if (occurrenceLevel > 1 && occurrenceStack.length > 0) {
        // Ocurrencia anidada, no agregar a la lista principal
        // Solo agregar a la pila para que sus campos se agreguen a ella
        occurrenceStack.push(newOccurrence);
      }
      
      continue;
    }
    
    // Detectar fin de ocurrencia
    if (normalizedFieldName === 'FIN OCURRENCIA') {
      if (occurrenceLevel > 0) {
        // Reducir nivel de anidamiento
        occurrenceLevel--;
        
        // Si se sale de una ocurrencia de nivel > 1, agregarla a su padre
        if (occurrenceLevel >= 1 && occurrenceStack.length >= 2) {
          const childOccurrence = occurrenceStack.pop();
          const parentOccurrence = occurrenceStack[occurrenceStack.length - 1];
          
          // Asegurar que el parentId del hijo sea el ID del padre
          childOccurrence.parentId = parentOccurrence.id;
          
          // Inicializar array de hijos si no existe
          if (!parentOccurrence.children) {
            parentOccurrence.children = [];
          }
          
          // Agregar ocurrencia hija al padre
          parentOccurrence.children.push(childOccurrence);
        } else if (occurrenceStack.length > 0) {
          // Solo sacar la última ocurrencia
          occurrenceStack.pop();
        }
      }
      
      continue;
    }
    
    // Procesar campos
    // Detectar cualquier campo que tenga una longitud numérica válida y un tipo definido
    if (lengthValue && lengthValue.match(/^\d+$/) && 
        row[COL_TYPE] && row[COL_TYPE].toString().trim() !== '') {
      
      // Verificar que el campo tenga longitud válida
      if (!lengthValue.match(/^\d+$/)) {
        console.warn(`Advertencia: La longitud del campo "${fieldName}" no es un número válido: "${lengthValue}"`);
        continue;
      }
      
      // Si el campo no comienza con SVC, registrar que se detectó un campo no estándar
      if (!fieldName.startsWith('SVC')) {
        console.log(`Detectado campo con formato no estándar: "${fieldName}", longitud: ${lengthValue}, tipo: ${row[COL_TYPE]}`);
      }
      const field = createField(row, currentIndex);
      currentIndex++;
      
      // Agregar información de ocurrencia padre si existe
      if (occurrenceLevel > 0 && occurrenceStack.length > 0) {
        const currentOccurrence = occurrenceStack[occurrenceStack.length - 1];
        
        // Usar ID de ocurrencia padre como prefijo para ID de campo
        field.parentId = currentOccurrence.id || currentOccurrence.index;
        field.id = `${field.parentId}_field_${field.index}`;
        field.level = occurrenceLevel;
        
        // Agregar campo solo a la ocurrencia padre
        currentOccurrence.fields.push(field);
      } else {
        // Si no hay ocurrencia padre, agregar a la lista principal
        field.id = `field_${field.index}`;
        structure[currentSection].elements.push(field);
        structure[currentSection].fieldCount++;
      }
    }
  }
  
  // VALIDACIÓN IMPORTANTE: Si no se encontraron elementos en request, es posible que haya un problema con el formato
  if (structure.request.elements.length === 0) {
    console.warn("[VALIDACIÓN] No se encontraron elementos en la sección request - posible problema de formato");
    throw new Error("No hay elementos en la sección request, es posible que sea un formato no estándar");
  }
  
  // VERSIÓN EXACTA ANTERIOR DEL REORGANIZADO PARA SVC3088:
  // Este era el código que funcionaba bien antes
  for (const section of ['request', 'response']) {
    const sectionData = structure[section];
    
    // Ordenar elementos por índice
    sectionData.elements.sort((a, b) => parseInt(a.index) - parseInt(b.index));
    
    // Encontrar ocurrencias de nivel 1 y reorganizar sus campos y ocurrencias anidadas
    for (let i = 0; i < sectionData.elements.length; i++) {
      const element = sectionData.elements[i];
      if (element.type === 'occurrence' && element.level === 1) {
        // Ordenar campos de ocurrencia por índice
        if (element.fields && element.fields.length > 0) {
          element.fields.sort((a, b) => parseInt(a.index) - parseInt(b.index));
        }
        
        // Si la ocurrencia tiene hijos, reorganizarlos - ESTA ES LA PARTE CRÍTICA
        if (element.children && element.children.length > 0) {
          // Ordenar hijos por índice
          element.children.sort((a, b) => parseInt(a.index) - parseInt(b.index));
          
          // Encontrar posición correcta para insertar cada hijo
          for (const child of element.children) {
            // Encontrar posición correcta en los campos de la ocurrencia
            let insertIndex = element.fields.length;
            
            for (let j = 0; j < element.fields.length; j++) {
              if (parseInt(element.fields[j].index) > parseInt(child.index)) {
                insertIndex = j;
                break;
              }
            }
            
            // Insertar hijo en la posición correcta
            element.fields.splice(insertIndex, 0, child);
          }
          
          // Eliminar propiedad children ya que los hijos ahora están en fields
          delete element.children;
          
          console.log(`[ESTRUCTURA-ORIGINAL] Ocurrencia ${element.id} tiene hijos anidados ahora integrados correctamente en fields`);
        }
      }
    }
  }
  
  // Calcular conteos finales
  for (const section of ['request', 'response']) {
    const sectionData = structure[section];
    
    // Contar todos los campos
    let totalFieldCount = 0;
    let totalOccurrenceCount = 0;
    
    // Contar campos y ocurrencias
    for (const element of sectionData.elements) {
      if (element.type === 'field') {
        totalFieldCount++;
      } else if (element.type === 'occurrence') {
        totalOccurrenceCount++;
      }
    }
    
    // Actualizar totales
    sectionData.fieldCount = totalFieldCount;
    sectionData.occurrenceCount = totalOccurrenceCount;
    sectionData.totalFieldCount = totalFieldCount;
  }
  
  // Ordenar elementos por índice para facilitar el procesamiento
  for (const section of ['request', 'response']) {
    structure[section].elements.sort((a, b) => parseInt(a.index) - parseInt(b.index));
  }
  
  return structure;
}

/**
 * Guarda las estructuras extraídas en archivos JSON
 * @param {string} excelFilePath - Ruta del archivo Excel
 * @param {string} outputDir - Directorio de salida
 * @returns {Object} Rutas de los archivos guardados
 */
function saveStructures(excelFilePath, outputDir) {
  // Crear directorio de salida si no existe
  fs.ensureDirSync(outputDir);
  
  // Parsear estructuras
  const headerStructure = parseHeaderStructure(excelFilePath);
  const serviceStructure = parseServiceStructure(excelFilePath);
  
  // Generar nombres de archivo
  const baseName = path.basename(excelFilePath, path.extname(excelFilePath));
  const headerFile = path.join(outputDir, `${baseName}_header.json`);
  const serviceFile = path.join(outputDir, `${baseName}_service.json`);
  
  // Guardar en archivos JSON
  fs.writeJsonSync(headerFile, headerStructure, { spaces: 2 });
  fs.writeJsonSync(serviceFile, serviceStructure, { spaces: 2 });
  
  console.log(`Estructura de cabecera guardada en ${headerFile}`);
  console.log(`Estructura de servicio guardada en ${serviceFile}`);
  
  return { headerFile, serviceFile };
}

/**
 * Extrae un ejemplo de cabecera (header sample) de la 3ra solapa del Excel
 * @param {string} filePath - Ruta del archivo Excel
 * @param {string} serviceNumber - Número de servicio
 * @returns {Object} Objeto con el ejemplo de cabecera { value: '00...' }
 */
function extractHeaderSample(filePath, serviceNumber) {
  try {
    console.log(`Extrayendo header sample para servicio ${serviceNumber} de ${filePath}`);
    
    // Leer archivo Excel
    const workbook = XLSX.readFile(filePath, { cellDates: true, raw: true });
    
    // Verificar que exista al menos 3 solapas
    if (workbook.SheetNames.length < 3) {
      console.warn(`El archivo Excel no tiene 3 solapas, tiene ${workbook.SheetNames.length}. No se podrá extraer header sample.`);
      
      // Retornar un objeto indicando que no hay pestaña de cabecera pero que esto no es un error fatal
      return { 
        value: "", 
        warning: "El archivo Excel no tiene la tercera pestaña donde se ubican los ejemplos", 
        missingTab: true,
        availableTabs: workbook.SheetNames.length,
        nonFatalError: true // Indica explícitamente que este no es un error fatal
      };
    }
    
    // Usar la tercera solapa (índice 2)
    const sheetName = workbook.SheetNames[2];
    console.log(`Usando la tercera solapa: ${sheetName}`);
    
    try {
      return findHeaderSampleInSheet(workbook, sheetName, serviceNumber);
    } catch (sheetError) {
      // Si hay un error al procesar la tercera pestaña, aún así permitimos continuar
      console.warn(`Error al procesar la tercera pestaña: ${sheetError.message}. El proceso continuará.`);
      return {
        value: "",
        warning: `Error al procesar la tercera pestaña: ${sheetError.message}`,
        processingError: true,
        nonFatalError: true // Indica que este error tampoco es fatal
      };
    }
  } catch (error) {
    console.error(`Error al extraer header sample: ${error.message}`);
    return { 
      value: "", 
      error: error.message, 
      missingTab: false,
      nonFatalError: true // Este también es un error no fatal
    };
  }
}

/**
 * Busca un ejemplo de cabecera en una hoja específica del Excel
 * @param {Object} workbook - Workbook de XLSX
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} serviceNumber - Número de servicio
 * @returns {Object} Objeto con el ejemplo de cabecera { value: '00...' }
 */
function findHeaderSampleInSheet(workbook, sheetName, serviceNumber) {
  const worksheet = workbook.Sheets[sheetName];
  
  // Convertir hoja a matriz de datos (preservando tipos y espacios)
  const data = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null,
    raw: true
  });
  
  console.log(`Buscando línea que empiece con "00" en hoja ${sheetName}...`);
  
  // Buscar la primera línea que empiece con "00"
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!row || row.length === 0) continue;
    
    // Buscar el primer valor no vacío (columna A generalmente)
    const firstCell = row[0];
    
    if (firstCell && String(firstCell).trim().startsWith('00')) {
      console.log(`Encontrada línea en fila ${rowIndex + 1}: ${String(firstCell)}`);
      
      // Extraer el string completo de la fila para obtener las 102 posiciones
      let rowString = '';
      
      // Concatenar todas las celdas de la fila
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== null && row[i] !== undefined) {
          rowString += String(row[i]);
        }
      }
      
      // Tomar las primeras 102 posiciones (o menos si no hay suficientes)
      const headerSample = rowString.substring(0, 102);
      console.log(`Header sample extraído (${headerSample.length} caracteres): ${headerSample}`);
      
      return { value: headerSample };
    }
  }
  
  console.warn(`No se encontró línea que empiece con "00" en la hoja ${sheetName}`);
  return { value: "", error: "No se encontró línea que empiece con '00'" };
}

/**
 * Guarda un ejemplo de cabecera en un archivo JSON
 * @param {string} excelFilePath - Ruta del archivo Excel
 * @param {string} serviceNumber - Número de servicio
 * @param {string} outputDir - Directorio de salida (opcional)
 * @returns {Object} Resultado de la operación
 */
function saveHeaderSample(excelFilePath, serviceNumber, outputDir = null) {
  try {
    // Si no se proporciona directorio, usar "headers" en el directorio raíz
    if (!outputDir) {
      outputDir = path.join(__dirname, '..', 'headers');
    }
    
    // Crear directorio de headers si no existe
    fs.ensureDirSync(outputDir);
    
    // Extraer el header sample
    const headerSample = extractHeaderSample(excelFilePath, serviceNumber);
    
    // Si hay error y no hay valor, retornar el error
    if (headerSample.error && !headerSample.value) {
      return { 
        success: false, 
        error: headerSample.error,
        headerSampleFile: null,
        headerSample
      };
    }
    
    // Generar nombre de archivo
    const headerSampleFile = path.join(outputDir, `${serviceNumber}_header_sample.json`);
    
    // Guardar en archivo JSON
    fs.writeJsonSync(headerSampleFile, headerSample, { spaces: 2 });
    
    console.log(`Header sample guardado en ${headerSampleFile}`);
    
    return { 
      success: true, 
      headerSampleFile,
      headerSample
    };
  } catch (error) {
    console.error(`Error al guardar header sample: ${error.message}`);
    return { 
      success: false, 
      error: error.message,
      headerSampleFile: null
    };
  }
}

// Exportar funciones
module.exports = {
  parseHeaderStructure,
  parseServiceStructure,
  saveStructures,
  extractHeaderSample,
  saveHeaderSample
};
