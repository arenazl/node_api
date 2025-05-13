/**
 * Cliente de ejemplo para consumir el servicio 1004 - Consulta de cliente por NIP
 * 
 * Ejecutar con: node client-1004.js
 */

const axios = require('axios');

// Configuración
const API_BASE_URL = 'http://localhost:3000'; // Ajustar según donde esté ejecutándose la API
const SERVICIO_ENDPOINT = '/service-1004/consultar';

/**
 * Función para consultar cliente por NIP
 * @param {string} nip - Número interno de persona
 * @param {string} tipoPedido - Tipo de pedido (default: "1")
 * @returns {Promise<Object>} Resultado de la consulta
 */
async function consultarClientePorNIP(nip, tipoPedido = "1") {
    try {
        console.log(`Consultando cliente con NIP: ${nip}`);
        
        const response = await axios.post(`${API_BASE_URL}${SERVICIO_ENDPOINT}`, {
            nip: nip,
            tipoPedido: tipoPedido,
            canal: "EM",
            usuario: "SISTEMA",
            ubicacion: "1047"
        });
        
        return response.data;
    } catch (error) {
        console.error('Error al consultar cliente:', error.message);
        
        if (error.response) {
            // La solicitud fue realizada y el servidor respondió con un código de error
            console.error('Respuesta del servidor:', error.response.data);
            console.error('Código de estado:', error.response.status);
        } else if (error.request) {
            // La solicitud fue hecha pero no se recibió respuesta
            console.error('No se recibió respuesta del servidor. Verifique que el servicio esté en ejecución.');
        }
        
        throw error;
    }
}

/**
 * Función principal para demostrar el uso
 */
async function main() {
    try {
        // Ejemplo: Consultar cliente con NIP 12345678
        const resultado = await consultarClientePorNIP('12345678');
        
        // Mostrar los resultados
        console.log('\n=== DATOS DE ENTRADA ===');
        console.log(JSON.stringify(resultado.requestData, null, 2));
        
        console.log('\n=== MENSAJE GENERADO ===');
        console.log(resultado.rawMessage);
        
        console.log('\n=== RESPUESTA PARSEADA ===');
        console.log(JSON.stringify(resultado.response, null, 2));
        
        return resultado;
    } catch (error) {
        console.error('Error en la ejecución:', error.message);
    }
}

// Ejecutar el ejemplo si este script se ejecuta directamente
if (require.main === module) {
    main()
        .then(() => console.log('\nEjemplo completado exitosamente.'))
        .catch(err => console.error('\nError en el ejemplo:', err.message));
}

// Exportar la función para uso en otros módulos
module.exports = {
    consultarClientePorNIP
};
