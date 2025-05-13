/**
 * Utilidad para actualizar el formato de nombres de archivos de configuración
 * y mantener compatibilidad con formatos antiguos
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Convierte un nombre de archivo del formato viejo al nuevo
 * @param {string} oldFilename - Nombre en formato antiguo (1004_ME_v2.json)
 * @returns {string} - Nombre en formato nuevo (1004-ME-v2.json)
 */
function convertOldToNewFormat(oldFilename) {
    // Si ya está en formato nuevo, devolverlo tal cual
    if (oldFilename.match(/^\d+-[^-]+-[^-\.]+\.json$/)) {
        return oldFilename;
    }

    // Convertir de formato antiguo a nuevo
    return oldFilename.replace(/^(\d+)_([^_]+)_([^_\.]+)\.json$/, '$1-$2-$3.json');
}

/**
 * Convierte un ID del formato viejo al nuevo
 * @param {string} oldId - ID en formato antiguo (1004_ME_v2)
 * @returns {string} - ID en formato nuevo (1004-ME-v2)
 */
function convertIdFormat(oldId) {
    // Si es undefined o null, devolver
    if (!oldId) return oldId;
    
    // Si es un ID en formato JSON, devolverlo
    if (oldId.endsWith('.json')) {
        return convertOldToNewFormat(oldId);
    }
    
    // Si ya está en formato nuevo, devolverlo tal cual
    if (oldId.match(/^\d+-[^-]+-[^-]+$/)) {
        return oldId;
    }

    // Convertir de formato antiguo a nuevo (sin extensión)
    return oldId.replace(/^(\d+)_([^_]+)_([^_]+)$/, '$1-$2-$3');
}

/**
 * Verifica si un nombre de archivo corresponde al formato nuevo
 * @param {string} filename - Nombre del archivo
 * @returns {boolean} - true si está en formato nuevo
 */
function isNewFormat(filename) {
    return filename.match(/^\d+-[^-]+-[^-\.]+\.json$/) !== null;
}

/**
 * Compatibilidad para obtener una configuración con cualquier formato
 * @param {string} configId - ID de configuración (puede ser en formato antiguo o nuevo)
 * @returns {string} - Path al archivo, o null si no existe
 */
function getConfigFilePath(configDir, configId) {
    // Si ya tiene extensión .json, usarla directamente
    let filename = configId.endsWith('.json') ? configId : configId + '.json';
    let filePath = path.join(configDir, filename);
    
    // Verificar si existe en formato nuevo
    if (fs.existsSync(filePath)) {
        return filePath;
    }
    
    // Si no existe, intentar con el formato convertido (viejo a nuevo)
    const newFilename = convertOldToNewFormat(filename);
    const newFilePath = path.join(configDir, newFilename);
    
    if (fs.existsSync(newFilePath)) {
        return newFilePath;
    }
    
    // Si tampoco existe, intentar con formato antiguo
    const oldFilename = filename.replace(/^(\d+)-([^-]+)-([^-\.]+)\.json$/, '$1_$2_$3.json');
    const oldFilePath = path.join(configDir, oldFilename);
    
    if (fs.existsSync(oldFilePath)) {
        return oldFilePath;
    }
    
    // No se encontró la configuración
    return null;
}

module.exports = {
    convertOldToNewFormat,
    convertIdFormat,
    isNewFormat,
    getConfigFilePath
};
