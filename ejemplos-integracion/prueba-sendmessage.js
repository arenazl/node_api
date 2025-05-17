/**
 * Cliente de prueba para el endpoint /api/services/sendmessage
 * Demuestra cómo generar un string de IDA
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
        "SVC1004-NIP": 63443434,
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
    
    // Mostrar estructura detallada si está disponible
    if (response.data.estructura) {
      console.log('\n--- ESTRUCTURA DETALLADA ---');
      console.log('Total de campos:', response.data.estructura.length);
      
      // Mostrar información detallada de cada campo
      response.data.estructura.forEach((campo, index) => {
        console.log(`\nCampo #${index + 1}: ${campo.nombre}`);
        console.log(`  Valor: "${campo.valor}"`);
        console.log(`  Longitud: ${campo.longitud}`);
        console.log(`  Tipo: ${campo.tipo}`);
      });
    }
    
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

// Ejecutar la prueba
async function ejecutarPrueba() {
  try {
    await probarSendMessageEndpoint();
    console.log('\n✨ Prueba de sendmessage completada exitosamente');
  } catch (error) {
    console.error('\n❌ Error en la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar la prueba
ejecutarPrueba();
