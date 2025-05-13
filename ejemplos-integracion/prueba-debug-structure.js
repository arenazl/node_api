/**
 * Script para probar la generación de ejemplos con depuración
 * Este script muestra los logs de depuración para entender cómo se está procesando la estructura
 */

const path = require('path');
const fs = require('fs-extra');
const serverExampleGenerator = require('../utils/server-example-generator');

// Servicio a probar
const serviceNumber = '1004';

async function main() {
  try {
    console.log(`\n--- Probando generación de ejemplo para servicio ${serviceNumber} ---\n`);
    
    // 1. Cargar la estructura del servicio
    const structuresDir = path.join(__dirname, '..', 'structures');
    const structureFiles = await fs.readdir(structuresDir);
    
    // Filtrar archivos que coincidan con el patrón del servicio
    const matchingFiles = structureFiles
      .filter(file => file.includes(serviceNumber) && file.includes('structure') && file.endsWith('.json'))
      .map(file => path.join(structuresDir, file));
    
    if (!matchingFiles || matchingFiles.length === 0) {
      throw new Error(`No se encontró estructura para el servicio ${serviceNumber}`);
    }
    
    // Usar la primera estructura encontrada
    const structureFile = matchingFiles[0];
    console.log(`Usando estructura: ${path.basename(structureFile)}`);
    
    // Cargar la estructura
    const structure = await fs.readJson(structureFile);
    
    // Extraer las estructuras de cabecera y servicio
    const headerStructure = structure.header_structure;
    const serviceStructure = structure.service_structure;
    
    if (!headerStructure || !serviceStructure) {
      throw new Error('Estructura incompleta');
    }
    
    console.log(`Estructura cargada para servicio ${serviceNumber}`);
    console.log(`Nombre del servicio: ${serviceStructure.serviceName || 'No definido'}`);
    
    // 2. Generar el ejemplo
    console.log(`\nGenerando ejemplo para servicio ${serviceNumber}...\n`);
    const exampleString = await serverExampleGenerator.generateServerExample(
      serviceNumber,
      { headerStructure, serviceStructure }
    );
    
    console.log(`\n--- Ejemplo generado (${exampleString.length} caracteres) ---\n`);
    
    // Mostrar los primeros 100 caracteres del ejemplo
    console.log(`Primeros 100 caracteres: "${exampleString.substring(0, 100)}"`);
    
    console.log(`\n✅ Prueba completada exitosamente\n`);
    
  } catch (error) {
    console.error(`\n❌ Error en la prueba: ${error.message}\n`);
    console.error(error);
  }
}

// Ejecutar la prueba
main();