/**
 * Cliente de ejemplo para consumir la API MQ Importer
 * 
 * Este archivo muestra cómo conectarse y consumir los
 * servicios de la API desde una aplicación externa.
 */

// Usando axios para realizar las peticiones HTTP
const axios = require('axios');

// URL base de la API (modificar según la configuración de su entorno)
const API_BASE_URL = 'http://localhost:3000';

// Cliente HTTP configurado
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Obtiene la lista de servicios disponibles
 * @returns {Promise} Promise con el resultado
 */
async function obtenerServicios() {
  try {
    const response = await apiClient.get('/api/services');
    return response.data.services;
  } catch (error) {
    console.error('Error al obtener servicios:', error.message);
    throw error;
  }
}

/**
 * Obtiene la información de un servicio específico
 * @param {string} numeroServicio - Número del servicio a consultar
 * @returns {Promise} Promise con el resultado
 */
async function obtenerServicio(numeroServicio) {
  try {
    const response = await apiClient.get(`/api/services/${numeroServicio}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener servicio ${numeroServicio}:`, error.message);
    throw error;
  }
}

/**
 * Procesa un servicio con un stream de datos
 * @param {string} numeroServicio - Número del servicio a procesar
 * @param {string} stream - Stream de datos para procesar
 * @returns {Promise} Promise con el resultado
 */
async function procesarServicio(numeroServicio, stream) {
  try {
    const response = await apiClient.post('/api/services/process', {
      service_number: numeroServicio,
      stream: stream
    });
    return response.data;
  } catch (error) {
    console.error(`Error al procesar servicio ${numeroServicio}:`, error.message);
    throw error;
  }
}

/**
 * Verifica el estado de salud de la API
 * @returns {Promise} Promise con el resultado
 */
async function verificarEstado() {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('Error al verificar estado:', error.message);
    throw error;
  }
}

// Ejemplos de uso

// Ejemplo 1: Obtener todos los servicios
async function ejemploObtenerServicios() {
  try {
    const servicios = await obtenerServicios();
    console.log('Servicios disponibles:');
    console.table(servicios.map(s => ({
      numero: s.service_number,
      nombre: s.service_name || 'Sin nombre',
      tipo: s.type || 'N/A'
    })));
  } catch (error) {
    console.error('No se pudo completar la operación');
  }
}

// Ejemplo 2: Obtener un servicio específico
async function ejemploObtenerServicioEspecifico(numeroServicio) {
  try {
    const servicio = await obtenerServicio(numeroServicio);
    console.log(`Información del servicio ${numeroServicio}:`);
    console.log(JSON.stringify(servicio, null, 2));
  } catch (error) {
    console.error('No se pudo completar la operación');
  }
}

// Ejemplo 3: Procesar un servicio con datos
async function ejemploProcesarServicio(numeroServicio, stream) {
  try {
    const resultado = await procesarServicio(numeroServicio, stream);
    console.log(`Resultado del procesamiento del servicio ${numeroServicio}:`);
    console.log(JSON.stringify(resultado, null, 2));
  } catch (error) {
    console.error('No se pudo completar la operación');
  }
}

// Ejemplo 4: Verificar estado del sistema
async function ejemploVerificarEstado() {
  try {
    const estado = await verificarEstado();
    console.log('Estado del sistema:');
    console.log(`- Estado: ${estado.status}`);
    console.log(`- Entorno: ${estado.environment.nodeEnv}`);
    console.log(`- Tiempo activo: ${Math.round(estado.uptime / 60)} minutos`);
    console.log(`- Memoria usada: ${estado.memory.heapUsed}`);
  } catch (error) {
    console.error('No se pudo completar la operación');
  }
}

// Ejecutar los ejemplos (descomentar según necesidad)
// ejemploObtenerServicios();
// ejemploObtenerServicioEspecifico('3088');
// ejemploProcesarServicio('3088', 'STREAMDEDATOS...');
// ejemploVerificarEstado();

// Exportar funciones para uso en otros módulos
module.exports = {
  obtenerServicios,
  obtenerServicio,
  procesarServicio,
  verificarEstado
};
