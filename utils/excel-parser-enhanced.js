/**
 * Funciones para parsear archivos Excel con diagnóstico mejorado
 * 
 * Este archivo contiene una versión mejorada del parser de Excel
 * que incluye un diagnóstico detallado de errores, reportando
 * exactamente en qué línea y columna hay problemas.
 */

const XLSX = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

/**
 * Parsea la estructura de servicio desde un archivo Excel con diagnóstico detallado
 * @param {string} filePath - Ruta del archivo Excel
 * @returns {Object} Estructura de servicio con detalles de errores
 */
function parseServiceStructureDetailed(filePath) {
  try {
    console.log("[DEBUG-ENHANCED] Iniciando parseServiceStructureDetailed para:", filePath);
    
    // Inicializar arrays para almacenar errores
    const parseErrors = [];
    const requestErrors = [];
    const responseErrors = [];
    let currentRow = 0;
    let currentColumn = 0;

    // Leer archivo Excel
    console.log("[DEBUG-ENHANCED] Leyendo archivo Excel...");
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    
    // Usar siempre la segunda hoja (índice 1), o la primera si solo hay una
    const sheetName = workbook.SheetNames.length > 1 ? workbook.SheetNames[1] : workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir hoja a matriz de datos
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    // Dump de datos para diagnóstico
    console.log("[DEBUG-RAW-DATA] Primeras 10 filas del Excel:");
    for (let i = 0; i < Math.min(10, data.length); i++) {
      if (data[i] && data[i].length > 0) {
        // Solo mostrar filas con contenido - mostrar la fila exactamente como es
        console.log(`[DEBUG-RAW-DATA] Fila ${i+1} (Excel B${i+1}): ${JSON.stringify(data[i])}`);
        // Mostrar columna B (índice 1) específicamente si existe
        if (data[i].length > 1) {
          console.log(`[DEBUG-RAW-DATA]  --> Columna B (valor): "${data[i][1] || ''}", tipo: ${typeof data[i][1]}`);
        }
        // Mostrar columna C (índice 2) específicamente si existe (longitud)
        if (data[i].length > 2) {
          console.log(`[DEBUG-RAW-DATA]  --> Columna C (longitud): "${data[i][2] || ''}", tipo: ${typeof data[i][2]}`);
        }
      }
    }
    
    // Obtener número de servicio del nombre de la hoja
    let serviceNumber = null;
    const serviceMatch = sheetName.match(/(\d{4})/) || sheetName.match(/SVC(\d+)/i);
    if (serviceMatch) {
      serviceNumber = serviceMatch[1];
    } else {
      parseErrors.push({
        message: "No se pudo detectar número de servicio en el nombre de la hoja",
        sheet: sheetName,
        row: 0,
        column: 0
      });
    }
    
    // Obtener el nombre del servicio buscando en las primeras filas un valor que empiece con "SERVICIO"
    let serviceName = "";
    let serviceNameFound = false;
    
    // Buscar en las primeras 10 filas de la hoja
    const maxRows = Math.min(data.length, 10);
    
    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      currentRow = rowIndex + 1; // +1 porque las filas en Excel empiezan en 1
      
      const row = data[rowIndex];
      if (!row) continue;
      
      // Buscar en todas las columnas de la fila
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        currentColumn = colIndex + 1; // +1 porque las columnas en Excel empiezan en 1
        
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
    
    if (!serviceNameFound) {
      parseErrors.push({
        message: "No se encontró el nombre del servicio (debe comenzar con 'SERVICIO')",
        sheet: sheetName,
        row: 2,
        column: 1
      });
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
      },
      parse_errors: parseErrors,
      parse_errors_request: requestErrors,
      parse_errors_response: responseErrors
    };
    
    // Variables de estado para procesamiento
    let currentSection = null;  // 'request' o 'response'
    let occurrenceStack = [];   // Pila para rastrear ocurrencias anidadas
    let occurrenceLevel = 0;    // Nivel de anidamiento actual
    let currentIndex = 0;       // Índice actual en lista unificada
    let sectionStartRow = 0;    // Fila donde comienza la sección actual
    let sectionHasElements = false; // Flag para verificar si una sección tiene elementos
    
    // Mapa para almacenar los campos según sus índices originales
    // Esto es crítico para las "ocurrencias saneadas"
    let fieldsIndexMap = {
      request: {},
      response: {}
    };
    
    // Procesamiento principal
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      currentRow = rowIndex + 1; // Para referencias de Excel (empiezan en 1)
      const row = data[rowIndex];
      
      // PUNTO CRÍTICO: Log especial para las filas problemáticas
      if (currentRow >= 10 && currentRow <= 13) {
        console.log(`[DEBUG-CRITICAL] EXAMINANDO FILA ${currentRow}: ${JSON.stringify(row)}`);
        
        // Dump detallado de la fila
        if (row) {
          // Log de la fila completa
          console.log(`[DEBUG-CRITICAL] Contenido completo de fila ${currentRow}:`, row);
          
          // Verificar si parece contener "RESPUESTA"
          if (row[0] && typeof row[0] === 'string' && row[0].includes('RESPUESTA')) {
            console.log(`[DEBUG-CRITICAL] ¡ALERTA! Fila ${currentRow} contiene RESPUESTA en columna A`);
          }
          
          // Log de cada columna individualmente
          for (let i = 0; i < row.length; i++) {
            console.log(`[DEBUG-CRITICAL] Fila ${currentRow}, Col ${i}: ${row[i]} (${typeof row[i]})`);
          }
        } else {
          console.log(`[DEBUG-CRITICAL] Fila ${currentRow} es NULA o VACÍA!`);
        }
      }
      
      if (!row || row.length === 0) continue;
      
      try {
        const fieldName = row[COL_FIELD_NAME] ? String(row[COL_FIELD_NAME] || '').trim() : "";
        const lengthValue = row[COL_LENGTH] ? String(row[COL_LENGTH] || '').trim() : "";
        const normalizedFieldName = fieldName.toUpperCase();
        
        // Detectar sección principal (REQUERIMIENTO/RESPUESTA o SOLICITUD/RESPUESTA)
        // Primero verificamos en la columna A (índice 0)
        const colAValue = row[0] ? String(row[0] || '').trim().toUpperCase() : "";
        
        // Requerimiento puede estar en columna A o B
        if (colAValue.includes('REQUERIMIENTO') || colAValue.includes('SOLICITUD') ||
            normalizedFieldName.includes('REQUERIMIENTO') || normalizedFieldName.includes('SOLICITUD')) {
          console.log(`Detectada sección REQUERIMIENTO/SOLICITUD: "${colAValue || fieldName}" en fila ${currentRow}`);
          
          // Marcamos el inicio de la sección de request
          currentSection = 'request';
          sectionStartRow = currentRow;
          sectionHasElements = false;
          
          // Verificar si el valor de longitud es numérico
          if (!lengthValue.match(/^\d+$/)) {
            requestErrors.push({
              message: `La longitud total del requerimiento no es un número válido: "${lengthValue}"`,
              sheet: sheetName,
              row: currentRow,
              column: COL_LENGTH + 1
            });
          } else {
            structure.request.totalLength = parseInt(lengthValue);
          }
          
          occurrenceStack = [];
          occurrenceLevel = 0;
          currentIndex = 0;
          continue;
        }
        
        // También verificar RESPUESTA en columna A (incluso si tiene texto adicional)
        const colAValueResp = row[0] ? String(row[0] || '').trim().toUpperCase() : "";
        if (colAValueResp.includes('RESPUESTA') || normalizedFieldName.includes('RESPUESTA')) {
          console.log(`Detectada sección RESPUESTA: "${colAValueResp || fieldName}" en fila ${currentRow}`);
          
          // Si la sección anterior era request y no tenía elementos
          if (currentSection === 'request' && !sectionHasElements) {
            requestErrors.push({
              message: `La sección de REQUERIMIENTO no contiene elementos (filas que comiencen con 'SVC')`,
              sheet: sheetName,
              row: sectionStartRow,
              column: COL_FIELD_NAME + 1,
              critical: true
            });
          }
          
          currentSection = 'response';
          sectionStartRow = currentRow;
          sectionHasElements = false;
          
          // Verificar si el valor de longitud es numérico
          if (!lengthValue.match(/^\d+$/)) {
            responseErrors.push({
              message: `La longitud total de la respuesta no es un número válido: "${lengthValue}"`,
              sheet: sheetName,
              row: currentRow,
              column: COL_LENGTH + 1
            });
          } else {
            structure.response.totalLength = parseInt(lengthValue);
          }
          
          occurrenceStack = [];
          occurrenceLevel = 0;
          currentIndex = 0;
          continue;
        }
        
        // Si no hay sección activa, omitir pero loguear
        if (!currentSection) {
          // Registrar filas potencialmente importantes si no hay sección activa
          if (normalizedFieldName && lengthValue && row[COL_TYPE]) {
            console.log(`[DEBUG-ERROR] Fila ${currentRow}: No hay sección activa pero parece un campo: "${fieldName}", longitud: ${lengthValue}, tipo: ${row[COL_TYPE]}`);
          }
          continue;
        }
        
        // Log de verificación para depurar el estado actual
        if (rowIndex % 5 === 0) { // Loguear cada 5 filas para no saturar
          console.log(`[DEBUG-STATE] Fila ${currentRow}: sección=${currentSection}, nivel=${occurrenceLevel}, elementos acumulados=${structure[currentSection].elements.length}`);
        }
        
        // Variables para almacenar errores específicos de la sección actual
        const sectionErrors = currentSection === 'request' ? requestErrors : responseErrors;
        
        // Detectar inicio de ocurrencia
        const occurrenceMatch = normalizedFieldName.match(/(\d+)\s+OCURRENCIA(?:S)?\s+INFORMADA(?:S)?/i);
        if (occurrenceMatch) {
          // Verificar formato de ocurrencia
          const countStr = occurrenceMatch[1];
          if (!countStr.match(/^\d+$/)) {
            sectionErrors.push({
              message: `El contador de ocurrencias no es un número válido: "${countStr}"`,
              sheet: sheetName,
              row: currentRow,
              column: COL_FIELD_NAME + 1
            });
            continue;
          }
          
          // Incrementar nivel de anidamiento
          occurrenceLevel++;
          sectionHasElements = true; // La sección tiene al menos una ocurrencia
          
          // Procesamiento normal de la ocurrencia...
          const count = parseInt(countStr);
          const newOccurrence = {
            type: 'occurrence',
            index: currentIndex,
            id: `occ_${currentIndex}`,
            count: count,
            fields: [],
            level: occurrenceLevel,
            parentId: null
          };
          currentIndex++;
          
          // Obtener ID del padre si existe
          const parentId = occurrenceStack.length > 0 ? occurrenceStack[occurrenceStack.length - 1].id : null;
          newOccurrence.parentId = parentId;
          
          if (occurrenceLevel === 1) {
            structure[currentSection].elements.push(newOccurrence);
            structure[currentSection].occurrenceCount++;
            occurrenceStack = [newOccurrence];
          } else if (occurrenceLevel > 1 && occurrenceStack.length > 0) {
            occurrenceStack.push(newOccurrence);
          }
          
          continue;
        }
        
        // Detectar fin de ocurrencia
        if (normalizedFieldName === 'FIN OCURRENCIA') {
          if (occurrenceLevel > 0) {
            // Verificar que la ocurrencia actual tenga campos
            const currentOccurrence = occurrenceStack[occurrenceStack.length - 1];
            if (currentOccurrence && (!currentOccurrence.fields || currentOccurrence.fields.length === 0)) {
              sectionErrors.push({
                message: `Ocurrencia sin campos: "${currentOccurrence.id}" - La ocurrencia debe contener al menos un campo`,
                sheet: sheetName,
                row: currentRow,
                column: COL_FIELD_NAME + 1
              });
            }
            
            // Procesamiento normal del fin de ocurrencia...
            occurrenceLevel--;
            
          if (occurrenceLevel >= 1 && occurrenceStack.length >= 2) {
            const childOccurrence = occurrenceStack.pop();
            const parentOccurrence = occurrenceStack[occurrenceStack.length - 1];
            
            // IMPORTANTE: Vincular el hijo al padre correctamente
            childOccurrence.parentId = parentOccurrence.id;
            
            // Inicializar array de hijos si no existe
            if (!parentOccurrence.children) {
              parentOccurrence.children = [];
            }
            
            // Preservar el índice original - esto es CRÍTICO para ocurrencias anidadas
            // (como las ocurrencias 14, 18, 21 vistas en la interfaz)
            console.log(`[OCURRENCIA ANIDADA] Agregando ocurrencia con índice ${childOccurrence.index} al padre ${parentOccurrence.index}`);
            
            // Agregar ocurrencia hija al padre (lo que importa es el orden original)
            parentOccurrence.children.push(childOccurrence);
            } else if (occurrenceStack.length > 0) {
              occurrenceStack.pop();
            }
          } else {
            // Error: FIN OCURRENCIA sin una OCURRENCIA correspondiente
            sectionErrors.push({
              message: "Se encontró un FIN OCURRENCIA sin una OCURRENCIA correspondiente",
              sheet: sheetName,
              row: currentRow,
              column: COL_FIELD_NAME + 1
            });
          }
          
          continue;
        }
        
        // Verificar campos directamente en la primera columna (columna A, índice 0)
        const colAFieldName = row[0] ? String(row[0] || '').trim() : "";
        
        // CORRECCIÓN DE MAPEADO DE COLUMNAS: El problema está en la interpretación de las columnas
        // El Excel del servicio 1010 tiene:
        // - Col A (índice 0): Nombre del campo (SVC1010-NIC, etc.)
        // - Col B (índice 1): LONGITUD (valor numérico: 9, 2, 5, etc.)
        // - Col C (índice 2): TIPO (numerico, alfanumerico, etc.)
        
        // Primero obtenemos el nombre del campo desde columna A
        const fieldToProcess = colAFieldName ? colAFieldName : fieldName;
        
        // CORRECCIÓN CRÍTICA: Obtener la longitud de Col B (índice 1) directamente como número
        const correctLengthValue = row[1] ? (typeof row[1] === 'number' ? row[1].toString() : String(row[1] || '').trim()) : "";
        
        // Logs detallados para depuración
        console.log(`[DEBUG-FIXED] FILA ${currentRow}: nombre=${fieldToProcess}, long_correcta=${correctLengthValue}, tipo=${row[COL_TYPE]}`);
        
        // Validación corregida: usamos la longitud de la columna B (que es un número)
        // ADEMÁS: Verificamos si es un campo real o una línea descriptiva
        const isFieldValid = fieldToProcess && fieldToProcess.trim() !== '' && 
                          correctLengthValue && correctLengthValue.match(/^\d+$/) &&
                          // Identificar campos reales: campos SVC o campos con tipo válido
                          (fieldToProcess.toUpperCase().includes('SVC') || 
                           // Si tiene una columna de tipo definida, es un campo real
                           (row[2] && ['NUMERICO', 'ALFANUMERICO', 'ALFABETICO'].some(
                              t => String(row[2] || '').toLowerCase().includes(t.toLowerCase())
                           )));
        
        if (isFieldValid) {
          console.log(`[DEBUG-FIELD] PROCESANDO CAMPO SVC en fila ${currentRow} (${rowIndex+1}): "${fieldToProcess}" - Longitud: ${lengthValue}, Tipo: ${row[COL_TYPE]}`);
          // Verificación adicional - mostrar estructura bruta de la fila
          console.log(`[DEBUG-ROW] Fila raw ${currentRow}: ${JSON.stringify(row)}`);
          
          // PROBLEMA CRÍTICO: La validación aquí estaba usando 'lengthValue' pero ya estamos usando
          // 'correctLengthValue' para el campo. Esta inconsistencia impide que se agreguen campos.
          // Ya sabemos que correctLengthValue es válido (lo verificamos antes en isFieldValid).
          
          // CORREGIDO: Ya no validamos lengthValue aquí pues es innecesario y está causando
          // que los campos no se agreguen a la estructura. Ya tenemos la longitud correcta.
          
          // Log adicional para confirmar valores
          console.log(`[DEBUG-ADD-FIELD] Agregando campo "${fieldToProcess}" con longitud ${correctLengthValue}`);
          
          // Si llegamos aquí, la sección tiene al menos un campo válido
          sectionHasElements = true;
          
          // CORRECCIÓN DE LONGITUD: Usar la longitud correcta de la columna B (índice 1)
          const correctedLength = parseInt(correctLengthValue);
          
          // CORRECCIÓN DE TIPO: Para el servicio 1010, está en columna C (índice 2)
          const correctedType = row[2] ? String(row[2] || '').trim() : "";
          
          // CORRECCIÓN DE CAMPOS ADICIONALES: Ajustar índices para las demás columnas
          const correctedRequired = row[3] ? String(row[3] || '').trim() : "";
          const correctedValues = row[4] ? String(row[4] || '').trim() : "";
          const correctedDesc = row[5] ? String(row[5] || '').trim() : "";
          
          // Usar los valores corregidos al crear el campo
          const field = {
            type: 'field',
            index: currentIndex,
            name: fieldToProcess,
            length: correctedLength,
            fieldType: correctedType,
            required: correctedRequired,
            values: correctedValues,
            description: correctedDesc
          };
          currentIndex++;
          
          // Verificar si el campo está dentro de una ocurrencia
          if (occurrenceLevel > 0 && occurrenceStack.length > 0) {
            const currentOccurrence = occurrenceStack[occurrenceStack.length - 1];
            
            field.parentId = currentOccurrence.id || currentOccurrence.index;
            field.id = `${field.parentId}_field_${field.index}`;
            field.level = occurrenceLevel;
            
            currentOccurrence.fields.push(field);
          } else {
            field.id = `field_${field.index}`;
            structure[currentSection].elements.push(field);
            structure[currentSection].fieldCount++;
            console.log(`[DEBUG-FIELD] CAMPO AGREGADO a ${currentSection}: "${field.name}"`);
          }
        }
        // Si la línea no es reconocida como una de las anteriores
        else if (fieldName !== '' && !fieldName.includes('OCURRENCIA') && fieldName !== 'FIN OCURRENCIA' && 
                !['REQUERIMIENTO', 'SOLICITUD', 'RESPUESTA'].includes(normalizedFieldName)) {
          
          // SOLUCIÓN UNIVERSAL: Si estamos en una sección activa y hay un campo con longitud válida y tipo,
          // lo procesamos siempre, independientemente de su nombre.
          // Esto funciona para cualquier servicio (3088, 1010, etc.)
          if (lengthValue && lengthValue.match(/^\d+$/) && 
              row[COL_TYPE] && row[COL_TYPE].toString().trim() !== '') {
            
            console.log(`[DEBUG-UNIVERSAL] CAMPO UNIVERSAL DETECTADO en fila ${currentRow}: "${fieldName}"`);
            console.log(`[DEBUG-UNIVERSAL] --> Sección: ${currentSection}, Longitud: ${lengthValue}, Tipo: ${row[COL_TYPE]}`);
            
            // Es un campo válido aunque no empiece con SVC (común en algunos servicios como 1010)
            sectionHasElements = true;
            
            // Procesamiento del campo con formato no estándar...
            const field = {
              type: 'field',
              index: currentIndex,
              name: fieldName,
              length: parseInt(lengthValue),
              fieldType: String(row[COL_TYPE] || '').trim(),
              required: String(row[COL_REQUIRED] || '').trim(),
              values: String(row[COL_VALUES] || '').trim(),
              description: String(row[COL_DESC] || '').trim()
            };
            currentIndex++;
            
            // Verificar si el campo está dentro de una ocurrencia
            if (occurrenceLevel > 0 && occurrenceStack.length > 0) {
              const currentOccurrence = occurrenceStack[occurrenceStack.length - 1];
              
              field.parentId = currentOccurrence.id || currentOccurrence.index;
              field.id = `${field.parentId}_field_${field.index}`;
              field.level = occurrenceLevel;
              
              currentOccurrence.fields.push(field);
            } else {
              field.id = `field_${field.index}`;
              structure[currentSection].elements.push(field);
              structure[currentSection].fieldCount++;
            }
          }
          // No reportar errores para filas que podrían ser encabezados o comentarios
          else if (!fieldName.includes('CAMPO') && 
              !fieldName.includes('TIPO') && 
              !fieldName.includes('LONGITUD') &&
              !fieldName.toUpperCase().includes('VALOR')) {
            sectionErrors.push({
              message: `Línea con formato desconocido: "${fieldName}" - No comienza con 'SVC'`,
              sheet: sheetName,
              row: currentRow,
              column: COL_FIELD_NAME + 1,
              content: fieldName,
              warning: true // Marcar como advertencia en lugar de error crítico
            });
          }
        }
      } catch (error) {
        // Capturar cualquier error inesperado durante el procesamiento de esta fila
        const errorMessage = `Error procesando fila ${currentRow}: ${error.message}`;
        console.error(errorMessage);
        
        if (currentSection === 'request') {
          requestErrors.push({
            message: errorMessage,
            sheet: sheetName,
            row: currentRow, 
            column: 1,
            error: error.message
          });
        } else if (currentSection === 'response') {
          responseErrors.push({
            message: errorMessage,
            sheet: sheetName,
            row: currentRow,
            column: 1,
            error: error.message
          });
        } else {
          parseErrors.push({
            message: errorMessage,
            sheet: sheetName,
            row: currentRow,
            column: 1,
            error: error.message
          });
        }
      }
    }
    
    // Verificación final: si la última sección (response) no tiene elementos
    if (currentSection === 'response' && !sectionHasElements) {
      responseErrors.push({
        message: `La sección de RESPUESTA no contiene elementos (filas que comiencen con 'SVC')`,
        sheet: sheetName,
        row: sectionStartRow,
        column: COL_FIELD_NAME + 1,
        critical: true
      });
    }
    
    // Resumir estructura generada
    console.log("[DEBUG-ENHANCED] Resumen de estructura generada:");
    console.log(`[DEBUG-ENHANCED] Servicio: ${structure.serviceNumber} - ${structure.serviceName}`);
    console.log(`[DEBUG-ENHANCED] Elementos en request: ${structure.request.elements.length}`);
    console.log(`[DEBUG-ENHANCED] Elementos en response: ${structure.response.elements.length}`);
    
    // CRÍTICO: Verificar y loggear específicamente las ocurrencias anidadas
    console.log("[DEBUG-ENHANCED] Verificando ocurrencias anidadas:");
    
    for (const section of ['request', 'response']) {
      const sectionData = structure[section];
      
      // Buscar ocurrencias principales
      const mainOccurrences = sectionData.elements.filter(el => el.type === 'occurrence');
      
      for (const occ of mainOccurrences) {
        console.log(`[DEBUG-ENHANCED] Ocurrencia principal en ${section}: id=${occ.id}, index=${occ.index}`);
        
        // Buscar ocurrencias anidadas (children)
        if (occ.children && occ.children.length > 0) {
          console.log(`[DEBUG-ENHANCED] - Contiene ${occ.children.length} ocurrencias anidadas:`);
          
          for (const child of occ.children) {
            console.log(`[DEBUG-ENHANCED]   - Ocurrencia anidada: id=${child.id}, index=${child.index}, parentId=${child.parentId}`);
            
            // CRÍTICO: Asegurar que cada ocurrencia anidada mantenga su índice original
            if (child.index !== undefined) {
              console.log(`[DEBUG-ENHANCED]     > Índice original preservado: ${child.index}`);
            } else {
              console.warn(`[DEBUG-ENHANCED]     > ADVERTENCIA: Índice original no presente`);
            }
          }
        }
      }
    }
    
    // Dump completo de la estructura para depuración
    try {
      const jsonDump = JSON.stringify(structure);
      console.log(`[DEBUG-DUMP] LONGITUD JSON: ${jsonDump.length} caracteres`);
      
      // Si hay elementos en request o response, mostrar ejemplos
      if (structure.request.elements.length > 0 || structure.response.elements.length > 0) {
        const partialDump = JSON.stringify({
          serviceNumber: structure.serviceNumber,
          request_elements_count: structure.request.elements.length,
          response_elements_count: structure.response.elements.length,
          request_first_element: structure.request.elements[0] || null,
          response_first_element: structure.response.elements[0] || null
        }, null, 2);
        console.log(`[DEBUG-DUMP] MUESTRA ESTRUCTURA:\n${partialDump}`);
      } else {
        console.log(`[DEBUG-DUMP-ERROR] ERROR CRITICO: No hay elementos en request ni response!`);
      }
    } catch (jsonError) {
      console.error(`[DEBUG-DUMP-ERROR] Error al convertir estructura a JSON: ${jsonError.message}`);
    }
    
    // Imprimir los primeros campos para verificación
    if (structure.request.elements.length > 0) {
      console.log("[DEBUG-ENHANCED] Primeros campos en REQUEST:");
      for (let i = 0; i < Math.min(5, structure.request.elements.length); i++) {
        const field = structure.request.elements[i];
        console.log(`[DEBUG-ENHANCED]   Campo ${i+1}: ${field.name || 'sin nombre'}, tipo: ${field.type}, longitud: ${field.length || 0}`);
      }
    }
    
    if (structure.response.elements.length > 0) {
      console.log("[DEBUG-ENHANCED] Primeros campos en RESPONSE:");
      for (let i = 0; i < Math.min(5, structure.response.elements.length); i++) {
        const field = structure.response.elements[i];
        console.log(`[DEBUG-ENHANCED]   Campo ${i+1}: ${field.name || 'sin nombre'}, tipo: ${field.type}, longitud: ${field.length || 0}`);
      }
    }
    
    return structure;
    
  } catch (error) {
    console.error(`Error general al analizar estructura de servicio: ${error.message}`);
    return {
      serviceNumber: "unknown",
      serviceName: "Error en estructura",
      request: { elements: [], fieldCount: 0, occurrenceCount: 0 },
      response: { elements: [], fieldCount: 0, occurrenceCount: 0 },
      parse_errors: [{
        message: `Error general al analizar estructura: ${error.message}`,
        error: error.message,
        stack: error.stack
      }]
    };
  }
}

// Esta función puede reemplazar a la versión actual o agregarse como un
// método adicional para ser usada explícitamente cuando se requiere
// un diagnóstico detallado de errores.
module.exports = {
    parseServiceStructureDetailed
};
