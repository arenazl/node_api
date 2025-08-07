/**
 * Middleware para validar archivos Excel antes de procesarlos
 */

const XLSX = require('xlsx');
const path = require('path');

/**
 * Valida que un archivo sea un Excel válido
 * @param {string} filePath - Ruta del archivo a validar
 * @returns {Object} { isValid: boolean, error?: string }
 */
function validateExcelFile(filePath) {
  try {
    // Intentar leer el archivo como Excel
    const workbook = XLSX.readFile(filePath, { 
      cellDates: true,
      // Opciones estrictas para validación
      bookVBA: false,
      bookDeps: false,
      bookFiles: false,
      bookProps: false,
      bookSheets: false
    });
    
    // Validaciones básicas
    if (!workbook) {
      return { isValid: false, error: 'No se pudo leer el archivo como Excel' };
    }
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { isValid: false, error: 'El archivo Excel no contiene hojas' };
    }
    
    // Verificar que al menos una hoja tenga contenido
    let hasContent = false;
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet && sheet['!ref']) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        if (range.e.r > 0 || range.e.c > 0) {
          hasContent = true;
          break;
        }
      }
    }
    
    if (!hasContent) {
      return { isValid: false, error: 'El archivo Excel está vacío o no tiene contenido válido' };
    }
    
    // Validar que tenga estructura esperada (buscar hoja de cabecera o body)
    let hasExpectedStructure = false;
    for (const sheetName of workbook.SheetNames) {
      const nameLower = sheetName.toLowerCase();
      if (nameLower.includes('cabecera') || 
          nameLower.includes('body') || 
          nameLower.includes('ida') || 
          nameLower.includes('vuelta')) {
        hasExpectedStructure = true;
        break;
      }
    }
    
    if (!hasExpectedStructure) {
      // Buscar por contenido
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet || !sheet['!ref']) continue;
        
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const maxRows = Math.min(range.e.r, 20);
        
        for (let row = 0; row <= maxRows; row++) {
          for (let col = 0; col <= range.e.c; col++) {
            const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = sheet[cellAddr];
            
            if (cell && cell.v) {
              const value = String(cell.v).toLowerCase();
              if (value.includes('cabecera') || 
                  value.includes('body') || 
                  value.includes('campo') || 
                  value.includes('longitud')) {
                hasExpectedStructure = true;
                break;
              }
            }
          }
          if (hasExpectedStructure) break;
        }
        if (hasExpectedStructure) break;
      }
    }
    
    if (!hasExpectedStructure) {
      return { 
        isValid: false, 
        error: 'El archivo no parece ser un Excel de estructura de servicios válido. Debe contener hojas de "Cabecera", "Body", "IDA" o "VUELTA"' 
      };
    }
    
    return { isValid: true };
    
  } catch (error) {
    // Si XLSX no puede leer el archivo, no es un Excel válido
    if (error.message.includes('Unsupported file') || 
        error.message.includes('Corrupted') ||
        error.message.includes('Cannot read') ||
        error.message.includes('CFB file size')) {
      return { 
        isValid: false, 
        error: 'El archivo no es un Excel válido o está corrupto' 
      };
    }
    
    // Para otros errores, dar más detalles
    return { 
      isValid: false, 
      error: `Error al validar archivo Excel: ${error.message}` 
    };
  }
}

/**
 * Middleware Express para validar uploads de Excel
 */
function excelValidationMiddleware(req, res, next) {
  // Solo validar si hay archivo
  if (!req.files || !req.files.file) {
    return next();
  }
  
  const file = req.files.file;
  
  // Validar extensión
  const ext = path.extname(file.name).toLowerCase();
  if (ext !== '.xlsx' && ext !== '.xls' && ext !== '.xlsm') {
    const error = new Error(`Formato de archivo no válido: ${ext}. Solo se aceptan archivos Excel (.xlsx, .xls, .xlsm)`);
    error.statusCode = 400;
    error.errorType = 'INVALID_FILE_FORMAT';
    return next(error);
  }
  
  // Validar tamaño
  const maxSize = parseInt(process.env.FILE_UPLOAD_SIZE_LIMIT || '50', 10) * 1024 * 1024; // MB a bytes
  if (file.size > maxSize) {
    const error = new Error(`El archivo es demasiado grande (${Math.round(file.size / 1024 / 1024)}MB). Máximo permitido: ${process.env.FILE_UPLOAD_SIZE_LIMIT || '50'}MB`);
    error.statusCode = 413;
    error.errorType = 'FILE_TOO_LARGE';
    return next(error);
  }
  
  // Si el archivo ya está guardado temporalmente, validar su contenido
  if (file.tempFilePath) {
    const validation = validateExcelFile(file.tempFilePath);
    if (!validation.isValid) {
      const error = new Error(validation.error);
      error.statusCode = 400;
      error.errorType = 'INVALID_EXCEL_FILE';
      return next(error);
    }
  }
  
  next();
}

module.exports = {
  validateExcelFile,
  excelValidationMiddleware
};