/**
 * Cliente de prueba para el endpoint /api/services/sendmessage
 * Demuestra cómo generar un string de IDA
 */

const axios = require('axios');

// URL base de la API
const API_URL = 'http://localhost:3000';

// Servicio a probar - puedes modificar estos valores
const SERVICIO = '3088';  // Número del servicio a probar
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
        // Parámetros requeridos para el servicio 3088
        "OPC1": "TEST",
        "OPC2": "1",
        // Añadiendo ocurrencias para probar el procesamiento
        "SVC3088-TIP-PEDIDO": "1",
        "occ_1": [
          {
            "SVC3088-NRO-OPER-SERV": "12345",
            "SVC3088-BCO-ORIG": "99999",
            "SVC3088-SUC-ORIG": "12345",
            "SVC3088-BCO-DEST": "88888",
            "SVC3088-SUC-DEST": "54321",
            "SVC3088-NRO-ORDEN": "123",
            "SVC3088-FECHA-PROC": "2025-05-24",
            "SVC3088-FECHA-MOVI": "2025-05-25",
            "SVC3088-FECHA-VALOR": "2025-05-26",
            "SVC3088-CALC-COMIS": "01",
            "SVC3088-CONCEPTO": "PAGO DE FACTURA",
            "SVC3088-CANT-CUENTAS": "2",
            "SVC3088-CANT-IMPORTES": "1",
            "SVC3088-CANT-SUCURSALES": "3",
            "SVC3088-ID-MENS-ORIG": "123456789",
            "SVC3088-CON-ID-OPS": "OPERACION-A123456",
            "SVC3088-TITULAR": "JUAN PEREZ",
            // Ocurrencias anidadas
            // Ocurrencia anidada como objeto simple (para probar el caso de error)
            "occ_14": {
              "SVC3088-PROD-RUBRO": "11111",
              "SVC3088-CUENTA-NIV": "22222"
            },
            // Ocurrencia anidada como array normal
            "occ_18": [
              {
                "SVC3088-IMPORTE": "1000"
              }
            ],
            // Otra ocurrencia anidada como objeto simple
            "occ_21": {
              "SVC3088-BCO": "1",
              "SVC3088-SUCU": "2"
            }
          },
          {
            "SVC3088-NRO-OPER-SERV": "67890",
            "SVC3088-BCO-ORIG": "55555",
            "SVC3088-SUC-ORIG": "10001",
            "SVC3088-BCO-DEST": "33333",
            "SVC3088-SUC-DEST": "88889",
            "SVC3088-NRO-ORDEN": "456",
            "SVC3088-FECHA-PROC": "2025-05-27",
            "SVC3088-FECHA-MOVI": "2025-05-28",
            "SVC3088-FECHA-VALOR": "2025-05-29",
            "SVC3088-CALC-COMIS": "02",
            "SVC3088-CONCEPTO": "TRANSFERENCIA BANCARIA",
            "SVC3088-CANT-CUENTAS": "1",
            "SVC3088-CANT-IMPORTES": "2",
            "SVC3088-CANT-SUCURSALES": "1",
            "SVC3088-ID-MENS-ORIG": "987654321",
            "SVC3088-CON-ID-OPS": "OPERACION-B987654",
            "SVC3088-TITULAR": "MARIA GONZALEZ"
          }
        ]
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
