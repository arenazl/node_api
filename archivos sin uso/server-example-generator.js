/**
 * utils/server-example-generator.js
 * 
 * Versión para servidor del generador de ejemplos dinámicos.
 * Este módulo ahora delega la generación de la respuesta al nuevo backendResponseGenerator.
 */

const backendResponseGenerator = require('./backend-response-generator');

/**
 * Genera un ejemplo dinámico para un servicio (simulated "vuelta" string).
 * @param {string} serviceNumber - Número de servicio.
 * @param {Object} structures - Estructuras del servicio ya cargadas (headerStructure, serviceStructure).
 * @returns {Promise<string>} - String simulado de respuesta.
 */
async function generateServerExample(serviceNumber, structures) {
  console.log(`[server-example-generator] Generando ejemplo de respuesta para servicio ${serviceNumber}`);
  
  try {
    // Delegar la generación completa del mensaje de vuelta al nuevo generador
    const vueltaMessage = backendResponseGenerator.generateVueltaMessage(serviceNumber, structures);
    
    console.log(`[server-example-generator] Ejemplo generado: ${vueltaMessage.length} caracteres`);
    return vueltaMessage;
    
  } catch (error) {
    console.error(`[server-example-generator] Error al generar ejemplo para servicio ${serviceNumber}: ${error.message}`);
    // Considerar si se debe lanzar el error o devolver un string de error/vacío
    throw error; 
  }
}

module.exports = {
  generateServerExample
};
