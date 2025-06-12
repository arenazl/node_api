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
  console.log('[ExcelParser-Header] Iniciando parseo de cabecera para:', filePath);
  // Leer archivo Excel
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  // console.log('[ExcelParser-Header] Nombres de hojas:', workbook.SheetNames);

  // Buscar hoja "Cabecera Servicios"
  let headerSheetName = null;

  // Buscar coincidencia exacta primero
  for (const name of workbook.SheetNames) {
    if (name.toLowerCase().includes('cabecera') && name.toLowerCase().includes('servicio')) {
      headerSheetName = name;
      // console.log(`[ExcelParser-Header] Hoja de cabecera encontrada por nombre exacto: ${headerSheetName}`);
      break;
    }
  }

  // Si no hay coincidencia exacta, buscar hoja que contenga 'CABECERA DE SERVICIOS'
  if (!headerSheetName) {
    // console.log('[ExcelParser-Header] No se encontró por nombre exacto, buscando por contenido "CABECERA DE SERVICIOS"...');
    for (const name of workbook.SheetNames) {
      // console.log(`[ExcelParser-Header] Verificando hoja por contenido: ${name}`);
      const sheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');

      // Buscar en las primeras 20 filas
      for (let rowNum = range.s.r; rowNum <= Math.min(range.e.r, 20); rowNum++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: col });
          const cell = sheet[cellAddress];

          if (cell && cell.t === 's' && cell.v.includes('CABECERA DE SERVICIOS')) {
            headerSheetName = name;
            // console.log(`[ExcelParser-Header] Hoja de cabecera encontrada por contenido en celda ${cellAddress} de hoja ${name}: ${headerSheetName}`);
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
    if (workbook.SheetNames && workbook.SheetNames.length > 0) {
        headerSheetName = workbook.SheetNames[0];
        // console.log(`[ExcelParser-Header] No se encontró hoja específica de cabecera por contenido, usando la primera hoja por defecto: ${headerSheetName}`);
    } else {
        console.error('[ExcelParser-Header] ERROR: El libro de trabajo no contiene hojas.');
        throw new Error('El archivo Excel no contiene hojas.');
    }
  }
  // console.log('[ExcelParser-Header] Hoja de cabecera finalmente seleccionada:', headerSheetName);

  // Convertir hoja a matriz de datos
  const worksheet = workbook.Sheets[headerSheetName];
  if (!worksheet) {
    console.error(`[ExcelParser-Header] ERROR: La hoja de cabecera seleccionada "${headerSheetName}" no existe o está vacía.`);
    throw new Error(`La hoja de cabecera seleccionada "${headerSheetName}" no existe o está vacía.`);
  }
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  // console.log('[ExcelParser-Header] Datos de la hoja de cabecera (primeras 5 filas):', JSON.stringify(data.slice(0,5)));

  const headerStructure = {
    totalLength: 0,
    fields: []
  };

  function findFirstNonEmptyCell(row) {
    if (!row) return -1;
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '') return i;
    }
    return -1;
  }

  function findTextIndexInRow(row, searchText) {
    if (!row) return -1;
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== null && row[i] !== undefined && typeof row[i] === 'string' && row[i].includes(searchText)) return i;
    }
    return -1;
  }

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const rowData = data[rowIndex];
    // console.log(`[ExcelParser-Header] Procesando fila de cabecera ${rowIndex}: ${JSON.stringify(rowData)}`);

    if (!rowData || rowData.length === 0) {
      // console.log(`[ExcelParser-Header] Fila ${rowIndex} vacía, omitiendo.`);
      continue;
    }

    const cabeceraIndex = findTextIndexInRow(rowData, 'CABECERA DE SERVICIOS');
    if (cabeceraIndex >= 0) {
      // console.log(`[ExcelParser-Header] Encontrado "CABECERA DE SERVICIOS" en fila ${rowIndex}, celda ${cabeceraIndex}.`);
      for (let i = cabeceraIndex + 1; i < rowData.length; i++) {
        if (rowData[i] !== null && rowData[i] !== undefined && String(rowData[i]).trim() !== '') {
          try {
            const length = parseInt(String(rowData[i]).trim());
            headerStructure.totalLength = length;
            // console.log(`[ExcelParser-Header] Longitud total de cabecera encontrada: ${headerStructure.totalLength} en celda ${i}`);
            break;
          } catch (error) {
            // console.log(`[ExcelParser-Header] Valor en celda ${i} no es un número para longitud total: ${rowData[i]}`);
          }
        }
      }
      continue;
    }

    const firstNonEmptyIndex = findFirstNonEmptyCell(rowData);
    if (firstNonEmptyIndex === -1) {
      // console.log(`[ExcelParser-Header] Fila ${rowIndex} sin celdas no vacías (para nombre de campo), omitiendo.`);
      continue;
    }

    const fieldName = String(rowData[firstNonEmptyIndex]).trim();
    // console.log(`[ExcelParser-Header] Fila ${rowIndex}, posible nombre de campo: "${fieldName}" en celda ${firstNonEmptyIndex}`);

    const skipKeywords = ['AREA GENERAL', 'DATOS ENVIADOS', 'MAXIMA LONGITUD', 'CABECERA DE SERVICIOS'];
    if (skipKeywords.some(keyword => fieldName.toUpperCase().includes(keyword))) {
      // console.log(`[ExcelParser-Header] Fila ${rowIndex} omitida por palabra clave: "${fieldName}"`);
      continue;
    }

    let fieldLength = 0;
    let fieldLengthIndex = -1;
    for (let i = firstNonEmptyIndex + 1; i < rowData.length; i++) { 
      if (rowData[i] !== null && rowData[i] !== undefined && String(rowData[i]).trim() !== '') {
        try {
          const length = parseInt(String(rowData[i]).trim());
          fieldLength = length;
          fieldLengthIndex = i;
          // console.log(`[ExcelParser-Header] Longitud de campo encontrada: ${fieldLength} para "${fieldName}" en celda ${i}`);
          break;
        } catch (error) {
          // console.log(`[ExcelParser-Header] Valor en celda ${i} no es un número para longitud de campo "${fieldName}": ${rowData[i]}`);
        }
      }
    }

    if (fieldLengthIndex >= 0) {
      let fieldTypeIndex = -1, fieldRequiredIndex = -1, fieldValuesIndex = -1, fieldDescriptionIndex = -1;
      for (let i = fieldLengthIndex + 1; i < rowData.length; i++) {
        if (rowData[i] !== null && rowData[i] !== undefined && String(rowData[i]).trim() !== '') { fieldTypeIndex = i; break; }
      }
      if (fieldTypeIndex >= 0) for (let i = fieldTypeIndex + 1; i < rowData.length; i++) {
        if (rowData[i] !== null && rowData[i] !== undefined && String(rowData[i]).trim() !== '') { fieldRequiredIndex = i; break; }
      }
      if (fieldRequiredIndex >= 0) for (let i = fieldRequiredIndex + 1; i < rowData.length; i++) {
        if (rowData[i] !== null && rowData[i] !== undefined && String(rowData[i]).trim() !== '') { fieldValuesIndex = i; break; }
      }
      if (fieldValuesIndex >= 0) for (let i = fieldValuesIndex + 1; i < rowData.length; i++) {
        if (rowData[i] !== null && rowData[i] !== undefined && String(rowData[i]).trim() !== '') { fieldDescriptionIndex = i; break; }
      }

      let fieldValues = fieldValuesIndex >= 0 ? String(rowData[fieldValuesIndex] || '').trim() : '';
      if (fieldValues) {
        const hasListFormat = fieldValues.match(/(\d+[\.\=]|\w+[\.\=])/);
        const hasMultipleLines = fieldValues.includes('\n') || fieldValues.includes('\r');
        const hasSeparators = fieldValues.includes(',') || fieldValues.includes(';');
        const isList = hasListFormat || hasMultipleLines || hasSeparators;
        if (isList) {
          const valuesList = [];
          const lines = fieldValues.split(/[\r\n]+/);
          if (lines.length > 1) for (const line of lines) { if (line.trim()) valuesList.push(line.trim()); }
          else {
            const items = fieldValues.split(/(?=\d+[\.\=]|\w+[\.\=])/);
            if (items.length > 1) for (const item of items) { if (item.trim()) valuesList.push(item.trim()); }
            else if (fieldValues.includes(',') || fieldValues.includes(';')) {
              const separatorItems = fieldValues.split(/[,;]+/);
              for (const item of separatorItems) { if (item.trim()) valuesList.push(item.trim()); }
            } else if (fieldValues.match(/\d+/)) {
              const spaceItems = fieldValues.split(/\s+(?=\d+)/);
              if (spaceItems.length > 1) for (const item of spaceItems) { if (item.trim()) valuesList.push(item.trim()); }
            }
          }
          if (valuesList.length > 1) {
            if (fieldTypeIndex >= 0 && String(rowData[fieldTypeIndex] || '').trim().toLowerCase().includes('numerico') && fieldLength > 0) {
              fieldValues = valuesList.map(item => {
                const numMatch = item.match(/^(\d+)[\.\=]/);
                if (numMatch && numMatch[1]) return item.replace(/^(\d+)/, numMatch[1].padStart(fieldLength, '0'));
                return item;
              });
            } else fieldValues = valuesList;
          } else if (hasListFormat && fieldValues.trim()) {
            if (fieldTypeIndex >= 0 && String(rowData[fieldTypeIndex] || '').trim().toLowerCase().includes('numerico') && fieldLength > 0) {
              const numMatch = fieldValues.match(/^(\d+)[\.\=]/);
              if (numMatch && numMatch[1]) fieldValues = [fieldValues.replace(/^(\d+)/, numMatch[1].padStart(fieldLength, '0'))];
              else fieldValues = [fieldValues.trim()];
            } else fieldValues = [fieldValues.trim()];
          }
        }
      }

      const field = {
        name: fieldName, length: fieldLength,
        type: fieldTypeIndex >= 0 ? String(rowData[fieldTypeIndex] || '').trim() : '',
        required: fieldRequiredIndex >= 0 ? String(rowData[fieldRequiredIndex] || '').trim() : '',
        values: fieldValues,
        description: fieldDescriptionIndex >= 0 ? String(rowData[fieldDescriptionIndex] || '').trim() : ''
      };
      // console.log('[ExcelParser-Header] Campo de cabecera encontrado y parseado:', JSON.stringify(field));
      headerStructure.fields.push(field);
    } else {
      // console.log(`[ExcelParser-Header] Fila ${rowIndex} no parece ser un campo de cabecera válido (nombre: "${fieldName}", longitud no encontrada o no válida).`);
    }
  }

  const calculatedLength = headerStructure.fields.reduce((sum, field) => sum + (field.length || 0), 0);
  if (headerStructure.totalLength > 0 && calculatedLength !== headerStructure.totalLength) {
    console.warn(`[ExcelParser-Header] ADVERTENCIA: La longitud calculada de la cabecera (${calculatedLength}) no coincide con la longitud declarada (${headerStructure.totalLength})`);
  }
  console.log('[ExcelParser-Header] Parseo de cabecera finalizado para:', filePath);
  return headerStructure;
}

function parseServiceStructure(filePath) {
  try {
    console.log("[ExcelParser-Service] ===== INICIANDO PARSEO DE SERVICIO =====");
    console.log("[ExcelParser-Service] Archivo:", filePath);
    console.log("[ExcelParser-Service] PASO 1: Probando con parser estándar original (parseServiceStructureOriginal)");
    try {
      console.log("[ExcelParser-Service] Ejecutando parseServiceStructureOriginal...");
      const structure = parseServiceStructureOriginal(filePath);
      if (!structure.request || !structure.request.elements || structure.request.elements.length === 0) {
        console.warn("[ExcelParser-Service] ¡ATENCIÓN! El parser original (parseServiceStructureOriginal) no encontró elementos en request.");
        console.warn("[ExcelParser-Service] Request está vacío, esto podría indicar que el formato del Excel no es el estándar esperado por este parser.");
        console.log("[ExcelParser-Service] Elementos en request (original):", structure.request?.elements?.length || 0);
        throw new Error("No hay elementos en request con el parser original, se intentará con el parser 'enhanced'.");
      }
      console.log("[ExcelParser-Service] ✓ Parser original (parseServiceStructureOriginal) EXITOSO.");
      console.log("[ExcelParser-Service] Elementos en request (original):", structure.request.elements.length);
      console.log("[ExcelParser-Service] Elementos en response (original):", structure.response.elements.length);
      return structure;
    } catch (originalError) {
      console.log(`[ExcelParser-Service] ✗ Parser original (parseServiceStructureOriginal) FALLÓ: ${originalError.message}`);
      console.log("[ExcelParser-Service] PASO 2: Usando parser 'enhanced' (excel-parser-enhanced.js) como FALLBACK.");
      try {
        console.log("[ExcelParser-Service] Cargando módulo './excel-parser-enhanced'...");
        const enhancedParser = require('./excel-parser-enhanced');
        console.log("[ExcelParser-Service] Ejecutando enhancedParser.parseServiceStructureDetailed...");
        const enhancedResult = enhancedParser.parseServiceStructureDetailed(filePath);
        console.log("[ExcelParser-Service] ✓ Parser 'enhanced' EXITOSO.");
        if (enhancedResult.request && enhancedResult.request.elements) console.log("[ExcelParser-Service] Elementos en request (enhanced):", enhancedResult.request.elements.length);
        if (enhancedResult.response && enhancedResult.response.elements) console.log("[ExcelParser-Service] Elementos en response (enhanced):", enhancedResult.response.elements.length);
        return enhancedResult;
      } catch (enhancedError) {
        console.error("[ExcelParser-Service] ✗ Error también con parser 'enhanced':", enhancedError.message);
        console.error("[ExcelParser-Service] Stack del error 'enhanced':", enhancedError.stack);
        return {
          serviceNumber: "error_enhanced", serviceName: "Error al parsear estructura con ambos parsers",
          request: { elements: [], fieldCount: 0, occurrenceCount: 0, totalFieldCount: 0, parse_errors: [enhancedError.message] },
          response: { elements: [], fieldCount: 0, occurrenceCount: 0, totalFieldCount: 0, parse_errors: [enhancedError.message] },
          parse_errors: [{ message: `Enhanced parser failed: ${enhancedError.message}`, stack: enhancedError.stack }]
        };
      }
    }
  } catch (error) {
    console.error("[ExcelParser-Service] Error general en parseServiceStructure (wrapper):", error.message);
    console.error("[ExcelParser-Service] Stack del error general:", error.stack);
    return {
      serviceNumber: "error_general", serviceName: "Error general al parsear estructura",
      request: { elements: [], fieldCount: 0, occurrenceCount: 0, totalFieldCount: 0, parse_errors: [error.message] },
      response: { elements: [], fieldCount: 0, occurrenceCount: 0, totalFieldCount: 0, parse_errors: [error.message] },
      parse_errors: [{ message: `General error: ${error.message}`, stack: error.stack }]
    };
  }
}

function parseServiceStructureOriginal(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });

  let sheetName = null;

  // Lógica de selección de hoja MODIFICADA:
  // 1. Intentar usar la SEGUNDA hoja (índice 1).
  // 2. Si no existe o falla, usar la PRIMERA hoja (índice 0) como fallback.
  if (workbook.SheetNames && workbook.SheetNames.length > 1) {
    sheetName = workbook.SheetNames[1]; // Índice 1 para la segunda hoja
  } else if (workbook.SheetNames && workbook.SheetNames.length > 0) {
    sheetName = workbook.SheetNames[0]; // Índice 0 para la primera hoja
  } else {
    console.error('[ExcelParser-ServiceOriginal] ERROR CRÍTICO: No se pudo seleccionar ninguna hoja. El libro no tiene hojas.');
    throw new Error("No se encontraron hojas en el archivo Excel para procesar la estructura del servicio.");
  }
  
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    console.error(`[ExcelParser-ServiceOriginal] ERROR CRÍTICO: La hoja seleccionada "${sheetName}" no existe o está vacía en el libro.`);
    throw new Error(`La hoja seleccionada "${sheetName}" no existe o está vacía.`);
  }

  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  let serviceNumber = null;
  if (sheetName.match(/^\d{4}$/)) { 
      serviceNumber = sheetName;
  } else {
      const serviceMatchSheetName = sheetName.match(/(\d{4})/);
      const serviceMatchSVC = sheetName.match(/SVC(\d+)/i);
      if (serviceMatchSheetName && serviceMatchSheetName[1]) {
        serviceNumber = serviceMatchSheetName[1];
      } else if (serviceMatchSVC && serviceMatchSVC[1]) {
        serviceNumber = serviceMatchSVC[1];
      } else {
      }
  }

  let serviceName = "";
  let serviceNameFound = false;
  const maxRowsServiceName = Math.min(data.length, 10);
  for (let rowIndex = 0; rowIndex < maxRowsServiceName; rowIndex++) {
    const rowData = data[rowIndex];
    if (!rowData) continue;
    for (let colIndex = 0; colIndex < rowData.length; colIndex++) {
      const cellValue = rowData[colIndex];
      if (cellValue && typeof cellValue === 'string') {
        const cellText = String(cellValue).trim();
        if (cellText.toUpperCase().startsWith('SERVICIO')) {
          serviceName = cellText;
          serviceNameFound = true;
          break;
        }
      }
    }
    if (serviceNameFound) break;
  }

  if (!serviceNameFound) {
    if (data.length > 1 && data[1] && data[1].length > 0) {
      for (let i = 0; i < data[1].length; i++) {
        if (data[1][i] && String(data[1][i]).trim() !== '') {
          serviceName = String(data[1][i]).trim();
          serviceNameFound = true;
          break;
        }
      }
    }
  }

  if (!serviceNameFound || !serviceName) {
    const excelFileName = path.basename(filePath, path.extname(filePath));
    serviceName = excelFileName;
    if (excelFileName.match(/^\d{8}T\d{4,6}_/)) {
      serviceName = excelFileName.replace(/^\d{8}T\d{4,6}_/, '');
    }
  }
  
  let COL_FIELD_NAME = 1, COL_LENGTH = 2, COL_TYPE = 3, COL_REQUIRED = 4, COL_VALUES = 5, COL_DESC = 6;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const rowData = data[i];
    if (!rowData) continue;
    if (rowData[0] && typeof rowData[0] === 'string' &&
        (rowData[0].toUpperCase().includes('SVC') || rowData[0].toUpperCase().includes('SVO')) &&
        rowData[1] && typeof rowData[1] === 'number') {
      COL_FIELD_NAME = 0; COL_LENGTH = 1; COL_TYPE = 2; COL_REQUIRED = 3; COL_VALUES = 4; COL_DESC = 5;
      break;
    }
  }
  
  const structure = {
    serviceNumber: serviceNumber, serviceName: serviceName,
    request: { totalLength: 0, elements: [], fieldCount: 0, occurrenceCount: 0, totalFieldCount: 0 },
    response: { totalLength: 0, elements: [], fieldCount: 0, occurrenceCount: 0, totalFieldCount: 0 }
  };

  function createField(row, index) {
    const fieldName = String(row[COL_FIELD_NAME] || '').trim();
    const fieldType = String(row[COL_TYPE] || '').trim();
    return {
      type: 'field', index: index, name: fieldName,
      length: row[COL_LENGTH] && String(row[COL_LENGTH]).trim().match(/^\d+$/) ? parseInt(String(row[COL_LENGTH])) : 0,
      fieldType: fieldType, required: String(row[COL_REQUIRED] || '').trim(),
      values: String(row[COL_VALUES] || '').trim(), description: String(row[COL_DESC] || '').trim()
    };
  }

  function createOccurrence(count, index, level, parentId = null) {
    const occId = parentId ? `${parentId}_${index}` : `occ_${index}`;
    return { type: 'occurrence', index: index, id: occId, count: count, fields: [], level: level, parentId: parentId };
  }

  let currentSection = null, occurrenceStack = [], occurrenceLevel = 0, currentIndex = 0;
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const rowData = data[rowIndex];
    if (!rowData || rowData.length === 0) { continue; }

    const fieldName = String(rowData[COL_FIELD_NAME] || '').trim();
    const lengthValue = String(rowData[COL_LENGTH] || '').trim();
    const normalizedFieldName = fieldName.toUpperCase();

    const colAValue = rowData[0] ? String(rowData[0] || '').trim().toUpperCase() : "";

    if (colAValue.includes('REQUERIMIENTO') || colAValue.includes('SOLICITUD') ||
        normalizedFieldName.includes('REQUERIMIENTO') || normalizedFieldName.includes('SOLICITUD')) {
      currentSection = 'request';
      structure.request.totalLength = lengthValue.match(/^\d+$/) ? parseInt(lengthValue) : 0;
      occurrenceStack = []; occurrenceLevel = 0; currentIndex = 0;
      continue;
    }

    const colAValueResp = rowData[0] ? String(rowData[0] || '').trim().toUpperCase() : "";
    if (colAValueResp.includes('RESPUESTA') || normalizedFieldName.includes('RESPUESTA')) {
      currentSection = 'response';
      structure.response.totalLength = lengthValue.match(/^\d+$/) ? parseInt(lengthValue) : 0;
      occurrenceStack = []; occurrenceLevel = 0; currentIndex = 0;
      continue;
    }

    if (!currentSection) { continue; }

    let occurrenceMatch = null;
    if (normalizedFieldName.includes('OCURRENCIAS NOVEDAD INGRESADA')) {
      const numMatch = normalizedFieldName.match(/(\d+)\s+OCURRENCIAS/i);
      occurrenceMatch = numMatch && numMatch[1] ? [normalizedFieldName, numMatch[1]] : [normalizedFieldName, "1"];
    }

    if (!occurrenceMatch) {
      occurrenceMatch = normalizedFieldName.match(/(\d+)\s+OCURRENCIA(?:S)?\s+(?:INFORMADA|NOVEDAD\s+INGRESADA)(?:S)?/i);
    }

    if (occurrenceMatch) {
      occurrenceLevel++;
      const count = occurrenceMatch[1] && occurrenceMatch[1].match(/^\d+$/) ? parseInt(occurrenceMatch[1]) : 0;
      const newOccurrence = createOccurrence(count, currentIndex, occurrenceLevel, occurrenceStack.length > 0 ? occurrenceStack[occurrenceStack.length - 1].id : null);
      currentIndex++;
      
      // CORRECCIÓN para manejo de pila de ocurrencias anidadas:
      if (occurrenceStack.length > 0 && occurrenceLevel > occurrenceStack[occurrenceStack.length-1].level) {
        // Si es un nuevo nivel de anidamiento, la ocurrencia actual se convierte en padre
        // y la nueva ocurrencia se añade a la pila.
         occurrenceStack[occurrenceStack.length - 1].fields.push(newOccurrence); // Se añade como campo del padre
         occurrenceStack.push(newOccurrence); // Y se añade a la pila para ser la actual
      } else if (occurrenceStack.length > 0 && occurrenceLevel < occurrenceStack[occurrenceStack.length-1].level) {
        // Si el nivel disminuye, sacar de la pila hasta el nivel correcto
        while(occurrenceStack.length > 0 && occurrenceLevel <= occurrenceStack[occurrenceStack.length-1].level) {
          occurrenceStack.pop();
        }
        if (occurrenceStack.length > 0) {
            occurrenceStack[occurrenceStack.length - 1].fields.push(newOccurrence);
        } else { // Si la pila queda vacía, es una ocurrencia de nivel 1
            structure[currentSection].elements.push(newOccurrence);
            structure[currentSection].occurrenceCount++;
        }
        occurrenceStack.push(newOccurrence);
      } else if (occurrenceStack.length > 0 && occurrenceLevel === occurrenceStack[occurrenceStack.length-1].level) {
        // Si es mismo nivel, sacar la anterior de la pila y añadir la nueva
        occurrenceStack.pop(); 
        if (occurrenceStack.length > 0) {
            occurrenceStack[occurrenceStack.length - 1].fields.push(newOccurrence);
        } else {
             structure[currentSection].elements.push(newOccurrence);
             structure[currentSection].occurrenceCount++;
        }
        occurrenceStack.push(newOccurrence);
      }
       else { // Nivel 1 o la pila está vacía
        structure[currentSection].elements.push(newOccurrence);
        structure[currentSection].occurrenceCount++;
        occurrenceStack = [newOccurrence]; // Reiniciar pila con la ocurrencia de nivel 1
      }
      continue;
    }

    if (normalizedFieldName === 'FIN OCURRENCIA') {
      if (occurrenceLevel > 0) {
        occurrenceLevel--;
        if (occurrenceStack.length > 0) {
           const endedOccurrence = occurrenceStack.pop();
        }
      } else {
        console.warn(`[ExcelParser-ServiceOriginal] "FIN OCURRENCIA" detectado pero occurrenceLevel ya es 0.`);
      }
      continue;
    }

    if (fieldName && lengthValue.match(/^\d+$/)) {
      const field = createField(rowData, currentIndex);
      currentIndex++;
      if (occurrenceLevel > 0 && occurrenceStack.length > 0) {
        const currentOccurrence = occurrenceStack[occurrenceStack.length - 1];
        field.parentId = currentOccurrence.id;
        currentOccurrence.fields.push(field);
      } else {
        structure[currentSection].elements.push(field);
        structure[currentSection].fieldCount++;
      }
    } else {
    }
  }

  function countTotalFields(elements) {
    let total = 0;
    for (const element of elements) {
      if (element.type === 'field') total++;
      else if (element.type === 'occurrence') {
        total += countTotalFields(element.fields); 
      }
    }
    return total;
  }

  structure.request.totalFieldCount = countTotalFields(structure.request.elements);
  structure.response.totalFieldCount = countTotalFields(structure.response.elements);
  return structure;
}

/**
 * Guarda una muestra de la cabecera de un servicio.
 * Busca una hoja que contenga "ejemplo" en su nombre, luego busca la primera fila
 * que contenga "000" y guarda los primeros 102 caracteres de esa fila.
 * @param {string} excelFilePath - Ruta al archivo Excel.
 * @param {string} serviceNumber - Número del servicio, para nombrar el archivo JSON.
 * @param {string} headersDirPath - Directorio donde guardar el archivo JSON de muestra.
 * @returns {object} Objeto con el resultado de la operación.
 */
function saveHeaderSample(excelFilePath, serviceNumber, headersDirPath) {
    // console.log(`[ExcelParser-SaveSample] Iniciando guardado de muestra de cabecera para servicio ${serviceNumber} desde ${excelFilePath}`);
  try {
    const workbook = XLSX.readFile(excelFilePath);
    let headerSampleValue = "";
    let missingTab = true; // Asumir que falta hasta que se encuentre
    let availableTabs = workbook.SheetNames.length;
    let error = null;
    let foundSheetName = null;
    let foundRowData = null;

    // 1. Buscar la hoja que contenga "ejemplo"
    for (const sheetName of workbook.SheetNames) {
      if (sheetName.toLowerCase().includes("ejemplo")) {
        foundSheetName = sheetName;
        missingTab = false; // Se encontró una hoja candidata
        break;
      }
    }

    if (missingTab) {
      error = `No se encontró ninguna hoja que contenga "ejemplo" en su nombre. Pestañas disponibles: ${availableTabs}.`;
      // console.warn(`[ExcelParser-SaveSample] ${error}`);
    } else {
      // console.log(`[ExcelParser-SaveSample] Hoja de ejemplo encontrada: "${foundSheetName}"`);
      const worksheet = workbook.Sheets[foundSheetName];
      if (!worksheet) {
        error = `La hoja de ejemplo "${foundSheetName}" está vacía o no se pudo leer.`;
        // console.warn(`[ExcelParser-SaveSample] ${error}`);
        missingTab = true; // Tratar como si la pestaña faltara si no se puede leer
      } else {
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        let found000 = false;
        for (const row of jsonData) {
          if (Array.isArray(row)) {
            const rowString = row.map(cell => String(cell).trim()).join(""); // Concatenar celdas de la fila
            if (rowString.includes("000")) {
              foundRowData = rowString;
              headerSampleValue = foundRowData.substring(0, 102);
              found000 = true;
              // console.log(`[ExcelParser-SaveSample] Fila con "000" encontrada. Muestra (primeros 102 chars): "${headerSampleValue}"`);
              break;
            }
          }
        }
        if (!found000) {
          error = `No se encontró la cadena "000" en ninguna fila de la hoja "${foundSheetName}".`;
          // console.warn(`[ExcelParser-SaveSample] ${error}`);
        }
      }
    }

    const headerSampleData = {
      value: headerSampleValue, // La cadena de 102 caracteres o vacía si no se encontró
      serviceNumber: serviceNumber,
      timestamp: new Date().toISOString(),
      sourceFile: path.basename(excelFilePath),
      foundSheetName: foundSheetName, // Nombre de la hoja donde se buscó/encontró
      foundRowContaining000: foundRowData ? (foundRowData.length > 200 ? foundRowData.substring(0,200) + "..." : foundRowData) : null, // La fila completa (truncada si es muy larga)
      missingTab: missingTab, // True si no se encontró hoja "ejemplo" o estaba vacía
      availableTabs: availableTabs,
      error: error // Mensaje de error/advertencia específico
    };

    // Crear directorio de headers si no existe
    if (!fs.existsSync(headersDirPath)) {
      fs.mkdirSync(headersDirPath, { recursive: true });
    }

    const outputFilePath = path.join(headersDirPath, `${serviceNumber}_header_sample.json`);
    fs.writeJsonSync(outputFilePath, headerSampleData, { spaces: 2 });
    // console.log(`[ExcelParser-SaveSample] Muestra de cabecera guardada en: ${outputFilePath}`);

    return {
      success: !error || (error && headerSampleValue !== ""), // Considerar éxito si se obtuvo algún valor, incluso con advertencias
      headerSample: headerSampleData,
      message: error ? `Advertencia al guardar muestra de cabecera: ${error}` : `Muestra de cabecera para ${serviceNumber} guardada.`
    };

  } catch (e) {
    console.error(`[ExcelParser-SaveSample] Error crítico en saveHeaderSample para ${serviceNumber}: ${e.message}`, e);
    return {
      success: false,
      headerSample: { value: "", missingTab: true, availableTabs: 0, error: e.message, foundSheetName: null, foundRowContaining000: null },
      message: `Error crítico al guardar muestra de cabecera: ${e.message}`
    };
  }
}

module.exports = {
  parseHeaderStructure,
  parseServiceStructure,
  saveHeaderSample // Asegurarse de exportar la nueva función
};
