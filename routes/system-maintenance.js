/**
 * Rutas para mantenimiento del sistema
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

/**
 * @route DELETE /system-maintenance/clear-dirs
 * @description Limpia el contenido de los directorios de trabajo (structures, uploads, ejemplos)
 */
router.delete('/clear-dirs', async (req, res) => {
  try {
    const dirs = [
      { path: path.join(__dirname, '..', 'structures'), keep: ['.gitkeep'] },
      { path: path.join(__dirname, '..', 'uploads'), keep: ['.gitkeep'] },
      { path: path.join(__dirname, '..', 'ejemplos'), keep: [] }
    ];
    
    const results = [];
    
    for (const dir of dirs) {
      try {
        if (fs.existsSync(dir.path)) {
          const files = fs.readdirSync(dir.path);
          
          for (const file of files) {
            // Mantener archivos específicos como .gitkeep
            if (dir.keep.includes(file)) {
              continue;
            }
            
            const filePath = path.join(dir.path, file);
            await fs.remove(filePath);
          }
          
          results.push({
            directory: path.basename(dir.path),
            cleared: true,
            message: `Directorio ${path.basename(dir.path)} limpiado correctamente`
          });
        } else {
          results.push({
            directory: path.basename(dir.path),
            cleared: false,
            message: `Directorio ${path.basename(dir.path)} no encontrado`
          });
        }
      } catch (dirError) {
        results.push({
          directory: path.basename(dir.path),
          cleared: false,
          error: dirError.message
        });
      }
    }
    
    // Si se tiene una instancia de Socket.io, notificar a los clientes
    if (global.io) {
      global.io.emit('directories:cleared', {
        timestamp: new Date().toISOString(),
        results: results
      });
    }
    
    // Forzar refresco de la caché de servicios
    if (global.serviceCache) {
      global.serviceCache.services = null;
      global.serviceCache.lastUpdate = null;
      global.serviceCache.structures = {};
    }
    
    return res.json({
      success: true,
      message: 'Directorios limpiados correctamente',
      results: results
    });
    
  } catch (error) {
    console.error('Error al limpiar directorios:', error);
    return res.status(500).json({
      success: false,
      message: `Error al limpiar directorios: ${error.message}`
    });
  }
});

module.exports = router;
