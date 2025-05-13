/**
 * Cliente de prueba para los endpoints /api/services/sendmessage y /api/services/receivemessage
 * Demuestra cómo generar un string de IDA y procesar un string de VUELTA
 */

const axios = require('axios');

// URL base de la API
const API_URL = 'http://localhost:3000';

// Servicio a probar - puedes modificar estos valores
const SERVICIO = '1004';  // Número del servicio a probar
const CANAL = 'ME';       // Canal para el servicio

// Función para probar el endpoint /api/services/sendmessage
async function probarSendMessageEndpoint() {
  try {
    console.log(`\n--- Probando /api/services/sendmessage para servicio ${SERVICIO}, canal ${CANAL} ---`);
    
    // Datos para el request
    const requestData = {
      header: {
        serviceNumber: SERVICIO,
        canal: CANAL
      },
      parameters: {
        // Parámetros requeridos para el servicio 1004
        "SVC1004-NIP": 12345678,
        "SVC1004-TIP-PEDIDO": 1
      }
    };
    
    console.log('\nEnviando solicitud a sendmessage...');
    
    // Realizar la solicitud HTTP
    const response = await axios.post(`${API_URL}/api/services/sendmessage`, requestData);
    
    // Mostrar resultado
    console.log('\n✅ Respuesta recibida exitosamente!');
    
    console.log('\n--- Request original ---');
    console.log('Header:', JSON.stringify(response.data.request.header, null, 2));
    console.log('Parameters:', JSON.stringify(response.data.request.parameters, null, 2));
    
    console.log(`\n--- String IDA generado (${response.data.response.length} caracteres) ---`);
    console.log('\n--- CABECERA (102 caracteres) ---');
    console.log(response.data.response.substring(0, 102));
    
    console.log('\n--- DATOS ---');
    console.log(response.data.response.substring(102));
    
    return response.data;
  } catch (error) {
    console.error('\n❌ Error al probar el endpoint sendmessage:');
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

// Función para probar el endpoint /api/services/receivemessage
async function probarReceiveMessageEndpoint(stringVuelta) {
  try {
    console.log(`\n--- Probando /api/services/receivemessage para servicio ${SERVICIO} ---`);
    
    // Si no se proporciona un string de vuelta, usamos uno de ejemplo
    if (!stringVuelta) {
      // Primero obtenemos un string de ejemplo usando el endpoint generate
      console.log('\nObteniendo un string de ejemplo desde el endpoint generate...');
      const generateResponse = await axios.post(`${API_URL}/api/services/generate`, {
        header: {
          serviceNumber: SERVICIO,
          canal: CANAL
        },
        parameters: {
          "SVC1004-NIP": 12345678,
          "SVC1004-TIP-PEDIDO": 1
        }
      });
      
      stringVuelta = generateResponse.data.stringVuelta;
      console.log(`\nString de VUELTA obtenido (${stringVuelta.length} caracteres)`);
    }
    
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

// Ejecutar las pruebas en secuencia
async function ejecutarPruebas() {
  try {
    // Primero probamos sendmessage
    const sendMessageResult = await probarSendMessageEndpoint();
    console.log('\n✨ Prueba de sendmessage completada exitosamente');
    
    // Probar el endpoint receivemessage varias veces para ver valores aleatorios
    console.log('\n--- Ejecutando prueba de receivemessage varias veces para ver valores aleatorios ---');
    
    // Ejecutar 3 veces para ver si los valores cambian
    for (let i = 0; i < 3; i++) {
      console.log(`\n--- Ejecución ${i+1} ---`);
      await probarReceiveMessageEndpoint();
      console.log(`\n✨ Prueba de receivemessage ${i+1} completada exitosamente`);
    }
    
    console.log('\n✅ Todas las pruebas completadas exitosamente');
  } catch (error) {
    console.error('\n❌ Pruebas fallidas');
  }
}

// Ejecutar todas las pruebas
ejecutarPruebas();