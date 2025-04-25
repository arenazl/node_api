/**
 * Funciones para parsear archivos Excel
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
 * Parsea la estructura de servicio desde un archivo Excel
 * @param {string} filePath - Ruta del archivo Excel
 * @returns {Object} Estructura de servicio
 */
function parseServiceStructure(filePath) {
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
  
  // Obtener el nombre del servicio de la segunda fila (row index 1) de la segunda solapa
  let serviceName = "";
  
  // Si hay al menos dos filas en el Excel, intentar obtener el nombre del servicio de la fila 2
  if (data.length > 1 && data[1] && data[1].length > 0) {
    // La segunda fila (index 1) contiene el nombre del servicio en la primera columna no vacía
    for (let i = 0; i < data[1].length; i++) {
      if (data[1][i] && String(data[1][i]).trim() !== '') {
        serviceName = String(data[1][i]).trim();
        console.log(`Nombre del servicio extraído de la fila 2: "${serviceName}"`);
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
    
    // Registrar información del campo para depuración
    console.log(`Parseando campo: ${fieldName}, tipo desde Excel: ${fieldType}`);
    
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
    
    // Detectar sección principal (REQUERIMIENTO/RESPUESTA)
    if (normalizedFieldName === 'REQUERIMIENTO') {
      currentSection = 'request';
      structure.request.totalLength = lengthValue.match(/^\d+$/) ? parseInt(lengthValue) : 0;
      occurrenceStack = [];
      occurrenceLevel = 0;
      currentIndex = 0;
      continue;
    }
    
    if (normalizedFieldName === 'RESPUESTA') {
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
    // Solo procesar filas que comienzan con SVC y tienen un valor numérico en la columna de longitud
    if (fieldName.startsWith('SVC') && lengthValue.match(/^\d+$/)) {
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
  
  // Reorganizar estructura para que las ocurrencias anidadas estén en la posición correcta
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
        
        // Si la ocurrencia tiene hijos, reorganizarlos
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

module.exports = {
  parseHeaderStructure,
  parseServiceStructure,
  saveStructures
};
