/**
 * Cliente de prueba para el endpoint /api/services/receivemessage
 * Demuestra cómo procesar un string de VUELTA generado con valores aleatorios
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Importar el generador de ejemplos para usar la función generateRandomValue
const serverExampleGenerator = require('../utils/server-example-generator');

// URL base de la API
const API_URL = 'http://localhost:3000';

// Servicio a probar - puedes modificar estos valores
const SERVICIO = '1004';  // Número del servicio a probar

/**
 * Genera un string de VUELTA con valores aleatorios
 * @returns {Promise<string>} String de VUELTA generado
 */
async function generarStringVueltaAleatorio() {
  try {
    console.log(`\nGenerando string de VUELTA aleatorio para servicio ${SERVICIO}...`);
    
    // Cargar la estructura del servicio
    const structuresDir = path.join(__dirname, '..', 'structures');
    const structureFiles = await fs.readdir(structuresDir);
    
    // Filtrar archivos que coincidan con el patrón del servicio
    const matchingFiles = structureFiles
      .filter(file => file.includes(SERVICIO) && file.includes('structure') && file.endsWith('.json'))
      .map(file => path.join(structuresDir, file));
    
    if (!matchingFiles || matchingFiles.length === 0) {
      throw new Error(`No se encontró estructura para el servicio ${SERVICIO}`);
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
    
    // Generar el string de VUELTA usando el generador de ejemplos
    const stringVuelta = await serverExampleGenerator.generateServerExample(
      SERVICIO,
      { headerStructure, serviceStructure }
    );

    console.log(`\nString de VUELTA generado con valores aleatorios (${stringVuelta})`);
    
    console.log(`\nString de VUELTA generado con valores aleatorios (${stringVuelta.length} caracteres)`);
    
    return stringVuelta;
  } catch (error) {
    console.error(`Error al generar string de VUELTA: ${error.message}`);
    throw error;
  }
}

// Función para probar el endpoint /api/services/receivemessage
async function probarReceiveMessageEndpoint() {
  try {
    console.log(`\n--- Probando /api/services/receivemessage para servicio ${SERVICIO} ---`);
    
    // Usar el string de IDA generado anteriormente
    const stringVuelta = "000113ME1004000000000000121052009155959P0769501047                                                    06344343401";
    
    // Datos para el request
    const requestData = {
      header: {
        serviceNumber: SERVICIO,
        filterEmptyFields: true // Activar filtrado de campos vacíos
      },
      parameters: {
        returnMsg: stringVuelta
      }
    };
    
    console.log('\nEnviando solicitud a receivemessage...');
    
    // Realizar la solicitud HTTP
    const response = await axios.post(`${API_URL}/api/services/receivemessage`, requestData);
    
    // Mostrar resultado
    console.log('\n✅ Respuesta recibida exitosamente!');
    
    
    console.log('\n--- Request original ---');
    console.log('Header:', JSON.stringify(response.data.request.header, null, 2));
    console.log('Parameters: { returnMsg: [string de longitud ' + stringVuelta.length + '] }');
    
    console.log('\n--- Datos JSON parseados ---');
    console.log(JSON.stringify(response.data.response, null, 2));
    console.log('\n--- END JSON parseados ---');
    
    return response.data;

  } catch (error) {
    console.error('\n❌ Error al probar el endpoint receivemessage:');
    if (error.response) {
      // El servidor respondió con un estado fuera del rango 2xx
      console.error(`  Status: ${error.response.status}`);
      console.error('  Datos:', error.response.data);
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      console.error('  No se recibió respuesta del servidor');
    } else {
      // Error en la configuración de la petición
      console.error('  Error:', error.message);
    }
    throw error;
  }
}

// Ejecutar la prueba
async function ejecutarPrueba() {
  try {
    // Ejecutar varias veces para ver valores aleatorios diferentes
    for (let i = 0; i < 3; i++) {
      console.log(`\n=== Ejecución ${i+1} ===`);
      await probarReceiveMessageEndpoint();
      console.log(`\n✨ Prueba de receivemessage ${i+1} completada exitosamente`);
    }
    
    console.log('\n✅ Todas las pruebas completadas exitosamente');
  } catch (error) {
    console.error('\n❌ Prueba fallida');
    process.exit(1);
  }
}

// Ejecutar la prueba
ejecutarPrueba();