/**
 * Script para exportar y mostrar la estructura completa de un servicio
 */

const fs = require('fs-extra');
const path = require('path');

// Número de servicio a mostrar
const serviceNumber = process.argv[2] || '1004';

async function dumpStructure() {
  try {
    // Directorio de estructuras
    const structuresDir = path.join(__dirname, '..', 'structures');
    
    // Buscar archivos de estructura para el servicio
    const structureFiles = fs.readdirSync(structuresDir)
      .filter(file => file.includes(`${serviceNumber}_structure.json`));
    
    if (structureFiles.length === 0) {
      console.error(`No se encontraron archivos de estructura para el servicio ${serviceNumber}`);
      return;
    }
    
    // Usar el archivo más reciente
    const structureFile = structureFiles.sort().reverse()[0];
    const structurePath = path.join(structuresDir, structureFile);
    
    console.log(`Analizando estructura: ${structureFile}\n`);
    
    // Leer el archivo de estructura
    const structure = await fs.readJson(structurePath);
    
    // Extraer la estructura del servicio
    const serviceStructure = structure.service_structure || {};
    
    // Mostrar la estructura de requerimiento
    if (serviceStructure.request && serviceStructure.request.elements) {
      console.log('==== ESTRUCTURA DE REQUERIMIENTO ====');
      console.log(JSON.stringify(serviceStructure.request, null, 2));
      
      // Mostrar detalle de cada elemento
      console.log('\n==== DETALLE DE ELEMENTOS DE REQUERIMIENTO ====');
      serviceStructure.request.elements.forEach((element, index) => {
        console.log(`\nElemento #${index + 1}:`);
        console.log(JSON.stringify(element, null, 2));
      });
    } else {
      console.log('No se encontró estructura de requerimiento');
    }
    
    // Mostrar la estructura de respuesta
    if (serviceStructure.response && serviceStructure.response.elements) {
      console.log('\n==== ESTRUCTURA DE RESPUESTA ====');
      console.log(JSON.stringify(serviceStructure.response, null, 2));
      
      // Mostrar detalle de cada elemento
      console.log('\n==== DETALLE DE ELEMENTOS DE RESPUESTA ====');
      serviceStructure.response.elements.forEach((element, index) => {
        console.log(`\nElemento #${index + 1}:`);
        console.log(JSON.stringify(element, null, 2));
      });
    } else {
      console.log('No se encontró estructura de respuesta');
    }
  } catch (error) {
    console.error('Error al procesar la estructura:', error);
  }
}

// Ejecutar la función
dumpStructure();
