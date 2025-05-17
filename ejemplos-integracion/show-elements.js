/**
 * Script para mostrar exclusivamente el contenido de dataStructure.elements
 * de un servicio específico y generar un análisis detallado de la estructura
 */

const fs = require('fs-extra');
const path = require('path');

// Número de servicio a mostrar
const serviceNumber = process.argv[2] || '1004';

async function showElements() {
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
    
    // Variable para almacenar todo el contenido
    let outputContent = `Análisis de Estructura - Servicio ${serviceNumber}\n`;
    outputContent += `Fecha: ${new Date().toISOString()}\n\n`;
    
    // Procesar los elements del requerimiento
    if (serviceStructure.request && serviceStructure.request.elements) {
      console.log('==== CONTENIDO DE dataStructure.elements (REQUERIMIENTO) ====');
      console.log(JSON.stringify(serviceStructure.request.elements, null, 2));
      
      outputContent += '==== CONTENIDO DE dataStructure.elements (REQUERIMIENTO) ====\n';
      outputContent += JSON.stringify(serviceStructure.request.elements, null, 2) + '\n\n';
      
      // Generar tabla de análisis para requerimiento
      outputContent += '==== ANÁLISIS DE CAMPOS (REQUERIMIENTO) ====\n';
      outputContent += 'Índice | Nombre | Longitud | Tipo | Requerido | Descripción\n';
      outputContent += '-------|--------|----------|------|-----------|------------\n';
      
      serviceStructure.request.elements.forEach(element => {
        if (element.type === 'field') {
          outputContent += `${element.index} | ${element.name} | ${element.length} | ${element.fieldType} | ${element.required} | ${element.description || '-'}\n`;
        } else if (element.type === 'occurrence') {
          outputContent += `${element.index} | OCURRENCIA (${element.count} repeticiones) | - | - | - | -\n`;
          // Procesar campos dentro de la ocurrencia
          if (element.fields) {
            element.fields.forEach(field => {
              outputContent += `  ${field.index} | ${field.name} | ${field.length} | ${field.fieldType} | ${field.required} | ${field.description || '-'}\n`;
            });
          }
        }
      });
      outputContent += '\n';
    } else {
      console.log('No se encontraron elementos en la estructura de requerimiento');
      outputContent += 'No se encontraron elementos en la estructura de requerimiento\n\n';
    }
    
    // Procesar los elements de la respuesta
    if (serviceStructure.response && serviceStructure.response.elements) {
      console.log('\n==== CONTENIDO DE dataStructure.elements (RESPUESTA) ====');
      console.log(JSON.stringify(serviceStructure.response.elements, null, 2));
      
      outputContent += '==== CONTENIDO DE dataStructure.elements (RESPUESTA) ====\n';
      outputContent += JSON.stringify(serviceStructure.response.elements, null, 2) + '\n\n';
      
      // Generar tabla de análisis para respuesta
      outputContent += '==== ANÁLISIS DE CAMPOS (RESPUESTA) ====\n';
      outputContent += 'Índice | Nombre | Longitud | Tipo | Requerido | Descripción\n';
      outputContent += '-------|--------|----------|------|-----------|------------\n';
      
      serviceStructure.response.elements.forEach(element => {
        if (element.type === 'field') {
          outputContent += `${element.index} | ${element.name} | ${element.length} | ${element.fieldType} | ${element.required} | ${element.description || '-'}\n`;
        } else if (element.type === 'occurrence') {
          outputContent += `${element.index} | OCURRENCIA (${element.count} repeticiones) | - | - | - | -\n`;
          // Procesar campos dentro de la ocurrencia
          if (element.fields) {
            element.fields.forEach(field => {
              outputContent += `  ${field.index} | ${field.name} | ${field.length} | ${field.fieldType} | ${field.required} | ${field.description || '-'}\n`;
            });
          }
        }
      });
    } else {
      console.log('No se encontraron elementos en la estructura de respuesta');
      outputContent += 'No se encontraron elementos en la estructura de respuesta\n';
    }
    
    // Guardar el análisis completo en un archivo
    const outputFileName = `analisis_${serviceNumber}_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    const outputPath = path.join(__dirname, outputFileName);
    await fs.writeFile(outputPath, outputContent);
    
    console.log(`\nAnálisis completo guardado en: ${outputFileName}`);
  } catch (error) {
    console.error('Error al procesar la estructura:', error);
  }
}

// Ejecutar la función
showElements();
