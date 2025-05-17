/**
 * Cliente de prueba para el endpoint /api/services/sendmessage-detailed
 * 
 * Este ejemplo muestra cómo usar el nuevo endpoint que retorna un desglose detallado
 * campo por campo con información de nombre, valor, longitud y tipo de datos.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// URL base de la API
const API_URL = 'http://localhost:3000/api';

// Servicio de prueba (modificar según sea necesario)
const SERVICE_NUMBER = '1004'; // Reemplazar con el número de servicio deseado
const CANAL = 'ME';

// Función para realizar la solicitud al endpoint sendmessage-detailed
async function testSendMessageDetailed() {
  try {
    console.log(`\n=== PROBANDO ENDPOINT /api/services/sendmessage-detailed ===`);
    console.log(`Servicio: ${SERVICE_NUMBER}, Canal: ${CANAL}`);
    
    // Preparar datos de la solicitud
    const requestData = {
      header: {
        serviceNumber: SERVICE_NUMBER,
        canal: CANAL
      },
      parameters: {
        // Parámetros específicos para este servicio
        // Ejemplo para servicio 1004:
        'NOMBRE-SOLICITANTE': 'JUAN PEREZ',
        'EMPRESA': 'ACME CORP',
      }
    };
    
    console.log('\nEnviando solicitud...');
    const startTime = Date.now();
    
    // Realizar la solicitud POST al endpoint
    const response = await axios.post(`${API_URL}/services/sendmessage-detailed`, requestData);
    
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    
    console.log(`\nRespuesta recibida en ${elapsedTime}ms`);
    
    // Mostrar el string de IDA generado
    console.log('\n--- STRING DE IDA GENERADO ---');
    console.log(`Longitud total: ${response.data.response.length} caracteres`);
    console.log(`Primeros 100 caracteres: "${response.data.response.substring(0, 100)}..."`);
    
    // Mostrar desglose detallado de campos
    console.log('\n--- DESGLOSE DETALLADO DE CAMPOS ---');
    
    // Este es el nuevo objeto que incluye el desglose campo por campo
    const desgloseCampos = response.data.desgloseCampos;
    
    // Mostrar estadísticas generales
    console.log(`\nEstadísticas generales:`);
    console.log(`- Total de campos: ${desgloseCampos.totalCampos}`);
    console.log(`- Longitud total: ${desgloseCampos.longitudTotal} caracteres`);
    
    // Mostrar resumen por tipo de dato
    console.log(`\nResumen por tipo de dato:`);
    for (const [tipo, datos] of Object.entries(desgloseCampos.resumenPorTipo)) {
      if (datos.cantidad > 0) {
        console.log(`- Tipo ${tipo}: ${datos.cantidad} campos, ${datos.longitudTotal} caracteres`);
      }
    }
    
    // Mostrar campos de la cabecera
    console.log(`\nCampos de la cabecera (${desgloseCampos.seccionCabecera.length}):`);
    console.log('| NOMBRE | VALOR | LONGITUD | TIPO |');
    console.log('|--------|-------|----------|------|');
    for (const campo of desgloseCampos.seccionCabecera) {
      console.log(`| ${campo.nombre} | ${campo.valor} | ${campo.longitud} | ${campo.tipo} |`);
    }
    
    // Mostrar campos del requerimiento
    console.log(`\nCampos del requerimiento (${desgloseCampos.seccionRequerimiento.length}):`);
    console.log('| NOMBRE | VALOR | LONGITUD | TIPO |');
    console.log('|--------|-------|----------|------|');
    for (const campo of desgloseCampos.seccionRequerimiento) {
      console.log(`| ${campo.nombre} | ${campo.valor} | ${campo.longitud} | ${campo.tipo} |`);
    }
    
    // Guardar resultado completo en archivo para análisis detallado
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const outputFile = path.join(__dirname, `analisis_${SERVICE_NUMBER}_${timestamp}.txt`);
    
    const outputContent = `
=== ANÁLISIS DETALLADO DEL SERVICIO ${SERVICE_NUMBER} ===
Fecha: ${new Date().toISOString()}

--- DESGLOSE DETALLADO DE CAMPOS ---

Estadísticas generales:
- Total de campos: ${desgloseCampos.totalCampos}
- Longitud total: ${desgloseCampos.longitudTotal} caracteres

Resumen por tipo de dato:
${Object.entries(desgloseCampos.resumenPorTipo)
  .filter(([_, datos]) => datos.cantidad > 0)
  .map(([tipo, datos]) => `- Tipo ${tipo}: ${datos.cantidad} campos, ${datos.longitudTotal} caracteres`)
  .join('\n')}

Campos de la cabecera (${desgloseCampos.seccionCabecera.length}):
${desgloseCampos.seccionCabecera.map(c => 
  `- ${c.nombre.padEnd(20)}: valor="${c.valor}", longitud=${c.longitud}, tipo=${c.tipo}`
).join('\n')}

Campos del requerimiento (${desgloseCampos.seccionRequerimiento.length}):
${desgloseCampos.seccionRequerimiento.map(c => 
  `- ${c.nombre.padEnd(20)}: valor="${c.valor}", longitud=${c.longitud}, tipo=${c.tipo}`
).join('\n')}

--- STRING DE IDA COMPLETO ---
${response.data.response}
`;
    
    fs.writeFileSync(outputFile, outputContent);
    console.log(`\nAnálisis detallado guardado en: ${outputFile}`);
    
  } catch (error) {
    console.error('\nError al realizar la solicitud:');
    if (error.response) {
      // El servidor respondió con un código de estado diferente de 2xx
      console.error(`Código de error: ${error.response.status}`);
      console.error('Datos del error:', error.response.data);
    } else if (error.request) {
      // La solicitud se realizó pero no se recibió respuesta
      console.error('No se recibió respuesta del servidor');
    } else {
      // Error al configurar la solicitud
      console.error('Error:', error.message);
    }
  }
}

// Ejecutar la prueba
testSendMessageDetailed();
