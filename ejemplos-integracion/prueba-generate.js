/**
 * Cliente de prueba para el endpoint /api/services/generate
 * Demuestra cómo generar un ejemplo de mensaje de respuesta para un servicio
 */

const axios = require('axios');

// URL base de la API
const API_URL = 'http://localhost:3000';

// Servicio a probar - puedes modificar estos valores
const SERVICIO = '1004';  // Número del servicio a probar (actualizado al disponible)
const CANAL = 'ME';       // Canal para el servicio (corregido al valor correcto)

// Función para probar el endpoint /api/services/generate
async function probarGenerateEndpoint() {
  try {
    console.log(`\n--- Probando /api/services/generate para servicio ${SERVICIO}, canal ${CANAL} ---`);
    
    // Datos para el request
    const requestData = {
      header: {
        serviceNumber: SERVICIO,
        canal: CANAL,
        showOnlyNonEmpty: false // Filtrar valores vacíos para mostrar solo datos significativos
      },
      parameters: {
        // Parámetros requeridos para el servicio 1004
        "SVC1004-NIP": "12345678",
        "SVC1004-TIP-PEDIDO": "1"
      }
    };
    
    console.log('\nEnviando solicitud...');
    
    // Realizar la solicitud HTTP
    const response = await axios.post(`${API_URL}/api/services/generate`, requestData);
    
    // Mostrar resultado
    console.log('\n✅ Respuesta recibida exitosamente!');
    console.log('\n--- Información del servicio ---');
    console.log(`Nombre: ${response.data.serviceName}`);
    console.log(`String IDA (${response.data.stringIda.length} caracteres)`);
    console.log(`String VUELTA (${response.data.stringVuelta.length} caracteres)`);
    
    console.log('\n--- CABECERA del string de IDA (102 caracteres) ---');
    console.log(response.data.stringIda.substring(0, 102));
    
    console.log('\n--- DATOS del string de IDA ---');
    console.log(response.data.stringIda.substring(102));
    
    console.log('\n--- CABECERA del string de VUELTA (102 caracteres) ---');
    console.log(response.data.stringVuelta.substring(0, 102));
    
    console.log('\n--- DATOS del string de VUELTA ---');
    console.log(response.data.stringVuelta.substring(102));
    
    console.log('\n--- PARÁMETROS ORIGINALES ---');
    console.log(JSON.stringify(requestData.parameters, null, 2));
    
    console.log('\n--- Datos JSON de VUELTA COMPLETOS ---');
    console.log(JSON.stringify(response.data.dataVuelta, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('\n❌ Error al probar el endpoint generate:');
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
probarGenerateEndpoint()
  .then(() => {
    console.log('\n✨ Prueba completada exitosamente');
  })
  .catch(() => {
    console.error('\n❌ Prueba fallida');
  });
