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
      { path: path.join(__dirname, '..', 'JsonStorage', 'structures'), keep: ['.gitkeep'] },
      { path: path.join(__dirname, '..', 'JsonStorage', 'uploads'), keep: ['.gitkeep'] },
      { path: path.join(__dirname, '..', 'JsonStorage', 'headers'), keep: ['.gitkeep'] },
      { path: path.join(__dirname, '..', 'JsonStorage', 'settings'), keep: ['.gitkeep'] }
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
    
    // Los eventos se manejan via EventBus local en el frontend
    
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

/**
 * @route DELETE /system-maintenance/delete-service-complete
 * @description Elimina completamente un servicio y todos sus archivos relacionados
 */
router.delete('/delete-service-complete', async (req, res) => {
  try {
    const { serviceNumber, filename } = req.body;
    
    // Validar parámetros requeridos
    if (!serviceNumber) {
      return res.status(400).json({
        success: false,
        error: 'Número de servicio es requerido'
      });
    }
    
    if (!filename) {
      return res.status(400).json({
        success: false, 
        error: 'Nombre de archivo es requerido'
      });
    }
    
    console.log(`[System Maintenance] Eliminando servicio completo: ${serviceNumber} (${filename})`);
    
    const deletedFiles = [];
    const errors = [];
    
    // Directorios donde buscar archivos relacionados al servicio
    const directories = [
      { name: 'uploads', path: path.join(__dirname, '..', 'JsonStorage', 'uploads') },
      { name: 'structures', path: path.join(__dirname, '..', 'JsonStorage', 'structures') },
      { name: 'headers', path: path.join(__dirname, '..', 'JsonStorage', 'headers') },
      { name: 'settings', path: path.join(__dirname, '..', 'JsonStorage', 'settings') }
    ];
    
    // Buscar y eliminar archivos en cada directorio
    for (const dir of directories) {
      if (!fs.existsSync(dir.path)) {
        console.log(`[System Maintenance] Directorio no existe: ${dir.path}`);
        continue;
      }
      
      try {
        const files = fs.readdirSync(dir.path);
        
        for (const file of files) {
          let shouldDelete = false;
          
          // Determinar si el archivo debe ser eliminado basado en el directorio
          switch (dir.name) {
            case 'uploads':
              // Eliminar archivo Excel específico
              shouldDelete = file === filename;
              break;
            case 'structures':
              // Eliminar estructuras que contengan el número de servicio
              shouldDelete = file.includes(`_${serviceNumber}_`) || file.startsWith(`${serviceNumber}_`);
              break;
            case 'headers':
              // Eliminar headers que contengan el número de servicio
              shouldDelete = file.startsWith(`${serviceNumber}_`) || file.includes(`${serviceNumber}_`);
              break;
            case 'settings':
              // Eliminar configuraciones que empiecen con el número de servicio
              shouldDelete = file.startsWith(`${serviceNumber}-`) && file.endsWith('.json');
              break;
          }
          
          if (shouldDelete) {
            const filePath = path.join(dir.path, file);
            try {
              await fs.remove(filePath);
              deletedFiles.push(`${dir.name}/${file}`);
              console.log(`[System Maintenance] Eliminado: ${dir.name}/${file}`);
            } catch (deleteError) {
              errors.push(`Error eliminando ${dir.name}/${file}: ${deleteError.message}`);
              console.error(`[System Maintenance] Error eliminando ${filePath}:`, deleteError);
            }
          }
        }
      } catch (dirError) {
        errors.push(`Error accediendo directorio ${dir.name}: ${dirError.message}`);
        console.error(`[System Maintenance] Error accediendo directorio ${dir.path}:`, dirError);
      }
    }
    
    // Limpiar caché del servicio
    if (global.serviceCache) {
      // Eliminar del caché de servicios
      if (global.serviceCache.services) {
        global.serviceCache.services = global.serviceCache.services.filter(
          service => service.service_number !== serviceNumber
        );
      }
      
      // Eliminar estructura específica del caché
      if (global.serviceCache.structures && global.serviceCache.structures[serviceNumber]) {
        delete global.serviceCache.structures[serviceNumber];
      }
      
      console.log(`[System Maintenance] Cache limpiado para servicio ${serviceNumber}`);
    }
    
    // Preparar respuesta
    const response = {
      success: true,
      message: `Servicio ${serviceNumber} eliminado completamente`,
      serviceNumber: serviceNumber,
      filename: filename,
      deletedFiles: deletedFiles,
      deletedCount: deletedFiles.length
    };
    
    if (errors.length > 0) {
      response.warnings = errors;
      console.warn(`[System Maintenance] Eliminación completada con advertencias:`, errors);
    }
    
    console.log(`[System Maintenance] Eliminación completada. Archivos eliminados: ${deletedFiles.length}`);
    
    return res.json(response);
    
  } catch (error) {
    console.error('[System Maintenance] Error al eliminar servicio completo:', error);
    return res.status(500).json({
      success: false,
      error: `Error interno al eliminar servicio: ${error.message}`
    });
  }
});

module.exports = router;
