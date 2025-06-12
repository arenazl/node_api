/**
 * Funciones para parsear archivos Excel con diagnóstico mejorado
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

    // Buscar hoja adecuada
    let sheetName = null;
    for (let i = 0; i < workbook.SheetNames.length; i++) {
      const name = workbook.SheetNames[i];
      if (name.toLowerCase().includes('ejemplo')) {
        sheetName = name;
        break;
      }
    }

    if (!sheetName) {
      for (let i = 0; i < workbook.SheetNames.length; i++) {
        const name = workbook.SheetNames[i];
        if (i === 1) {
          sheetName = name;
          break;
        }
        if (!sheetName) {
          sheetName = name;
        }
      }
    }

    if (!sheetName && workbook.SheetNames.length > 0) {
      sheetName = workbook.SheetNames[0];
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

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

    // Obtener el nombre del servicio
    let serviceName = "";
    let serviceNameFound = false;
    const maxRows = Math.min(data.length, 10);

    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      currentRow = rowIndex + 1;
      const row = data[rowIndex];
      if (!row) continue;

      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        currentColumn = colIndex + 1;
        const cellValue = row[colIndex];
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

    // Procesamiento principal
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      currentRow = rowIndex + 1;
      const row = data[rowIndex];
      if (!row || row.length === 0) continue;

      try {
        const fieldName = row[COL_FIELD_NAME] ? String(row[COL_FIELD_NAME] || '').trim() : "";
        const lengthValue = row[COL_LENGTH] ? String(row[COL_LENGTH] || '').trim() : "";
        const normalizedFieldName = fieldName.toUpperCase();
        const colAValue = row[0] ? String(row[0] || '').trim().toUpperCase() : "";

        // Detectar sección REQUERIMIENTO/SOLICITUD
        if (colAValue.includes('REQUERIMIENTO') || colAValue.includes('SOLICITUD') ||
            normalizedFieldName.includes('REQUERIMIENTO') || normalizedFieldName.includes('SOLICITUD')) {
          currentSection = 'request';
          sectionStartRow = currentRow;
          sectionHasElements = false;

          if (lengthValue.match(/^\d+$/)) {
            structure.request.totalLength = parseInt(lengthValue);
          } else {
            requestErrors.push({
              message: `La longitud total del requerimiento no es un número válido: "${lengthValue}"`,
              sheet: sheetName,
              row: currentRow,
              column: COL_LENGTH + 1
            });
          }

          occurrenceStack = [];
          occurrenceLevel = 0;
          currentIndex = 0;
          continue;
        }

        // Detectar sección RESPUESTA
        const colAValueResp = row[0] ? String(row[0] || '').trim().toUpperCase() : "";
        if (colAValueResp.includes('RESPUESTA') || normalizedFieldName.includes('RESPUESTA')) {
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

          if (lengthValue.match(/^\d+$/)) {
            structure.response.totalLength = parseInt(lengthValue);
          } else {
            responseErrors.push({
              message: `La longitud total de la respuesta no es un número válido: "${lengthValue}"`,
              sheet: sheetName,
              row: currentRow,
              column: COL_LENGTH + 1
            });
          }

          occurrenceStack = [];
          occurrenceLevel = 0;
          currentIndex = 0;
          continue;
        }

        // Si no hay sección activa, omitir
        if (!currentSection) continue;

        // Variables para almacenar errores específicos de la sección actual
        const sectionErrors = currentSection === 'request' ? requestErrors : responseErrors;

        // Detectar inicio de ocurrencia
        let occurrenceMatch = null;
        if (normalizedFieldName.includes('OCURRENCIAS NOVEDAD INGRESADA')) {
          const numMatch = normalizedFieldName.match(/(\d+)\s+OCURRENCIAS/i);
          if (numMatch && numMatch[1]) {
            occurrenceMatch = [normalizedFieldName, numMatch[1]];
          } else {
            occurrenceMatch = [normalizedFieldName, "1"];
          }
        }

        if (!occurrenceMatch) {
          occurrenceMatch = normalizedFieldName.match(/(\d+)\s+OCURRENCIA(?:S)?\s+(?:INFORMADA|NOVEDAD\s+INGRESADA)(?:S)?/i);
        }

        if (occurrenceMatch) {
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

          occurrenceLevel++;
          sectionHasElements = true;
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
            const currentOccurrence = occurrenceStack[occurrenceStack.length - 1];
            if (currentOccurrence && (!currentOccurrence.fields || currentOccurrence.fields.length === 0)) {
              sectionErrors.push({
                message: `Ocurrencia sin campos: "${currentOccurrence.id}" - La ocurrencia debe contener al menos un campo`,
                sheet: sheetName,
                row: currentRow,
                column: COL_FIELD_NAME + 1
              });
            }

            occurrenceLevel--;

            if (occurrenceLevel >= 1 && occurrenceStack.length >= 2) {
              const childOccurrence = occurrenceStack.pop();
              const parentOccurrence = occurrenceStack[occurrenceStack.length - 1];
              childOccurrence.parentId = parentOccurrence.id;

              if (!parentOccurrence.children) {
                parentOccurrence.children = [];
              }

              parentOccurrence.children.push(childOccurrence);
            } else if (occurrenceStack.length > 0) {
              occurrenceStack.pop();
            }
          } else {
            sectionErrors.push({
              message: "Se encontró un FIN OCURRENCIA sin una OCURRENCIA correspondiente",
              sheet: sheetName,
              row: currentRow,
              column: COL_FIELD_NAME + 1
            });
          }
          continue;
        }

        // Procesar campos
        const colAFieldName = row[0] ? String(row[0] || '').trim() : "";
        const fieldToProcess = colAFieldName ? colAFieldName : fieldName;
        const correctLengthValue = row[1] ? (typeof row[1] === 'number' ? row[1].toString() : String(row[1] || '').trim()) : "";

        const isFieldValid = fieldToProcess && fieldToProcess.trim() !== '' &&
                          correctLengthValue && correctLengthValue.match(/^\d+$/) &&
                          (fieldToProcess.toUpperCase().includes('SVC') ||
                           (row[2] && ['NUMERICO', 'ALFANUMERICO', 'ALFABETICO'].some(
                              t => String(row[2] || '').toLowerCase().includes(t.toLowerCase())
                           )));

        if (isFieldValid) {
          sectionHasElements = true;
          const correctedLength = parseInt(correctLengthValue);
          const correctedType = row[2] ? String(row[2] || '').trim() : "";
          const correctedRequired = row[3] ? String(row[3] || '').trim() : "";
          const correctedValues = row[4] ? String(row[4] || '').trim() : "";
          const correctedDesc = row[5] ? String(row[5] || '').trim() : "";

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
      } catch (error) {
        console.error(`[ERROR] Error procesando fila ${currentRow}:`, error);

        if (currentSection === 'request') {
          requestErrors.push({
            message: `Error procesando fila ${currentRow}: ${error.message}`,
            sheet: sheetName,
            row: currentRow,
            column: 0,
            error: error
          });
        } else if (currentSection === 'response') {
          responseErrors.push({
            message: `Error procesando fila ${currentRow}: ${error.message}`,
            sheet: sheetName,
            row: currentRow,
            column: 0,
            error: error
          });
        } else {
          parseErrors.push({
            message: `Error procesando fila ${currentRow}: ${error.message}`,
            sheet: sheetName,
            row: currentRow,
            column: 0,
            error: error
          });
        }
      }
    }

    // Verificar si hay ocurrencias sin cerrar
    if (occurrenceLevel > 0) {
      const sectionErrors = currentSection === 'request' ? requestErrors : responseErrors;
      sectionErrors.push({
        message: `Hay ${occurrenceLevel} ocurrencia(s) sin cerrar (falta FIN OCURRENCIA)`,
        sheet: sheetName,
        row: currentRow,
        column: 0,
        critical: true
      });
    }

    return structure;
  } catch (error) {
    console.error("[ERROR-ENHANCED] Error general en parseServiceStructureDetailed:", error);
    return {
      serviceNumber: "error",
      serviceName: "Error al parsear estructura",
      request: { elements: [], fieldCount: 0, occurrenceCount: 0 },
      response: { elements: [], fieldCount: 0, occurrenceCount: 0 },
      parse_errors: [{ message: `Error general: ${error.message}`, error: error }],
      parse_errors_request: [],
      parse_errors_response: []
    };
  }
}

// Exportar funciones
module.exports = {
  parseServiceStructureDetailed
};
