/**
 * API Processors - Funciones compartidas para procesar requests entre endpoints
 */

const messageAnalyzer = require('../utils/message-analyzer');
const { fixResponseOccurrences } = require('../utils/fix-nested-occurrences');

/**
 * Procesa un servicio de vuelta
 * @param {Object} req - Request con service_number y stream
 * @param {Object} res - Response para devolver resultados
 * @param {Function} findServiceByNumber - Función para encontrar servicio por número
 * @param {Function} removeEmptyOccurrences - Función para remover ocurrencias vacías
 */
async function processVuelta(req, res, findServiceByNumber, removeEmptyOccurrences) {
  try {
    const { service_number, stream } = req.body;
    
    if (!service_number) {
      return res.status(400).json({ 
        error: "Se requiere un número de servicio" 
      });
    }
    
    if (!stream) {
      return res.status(400).json({
        error: "Se requiere el stream de datos"
      });
    }
    
    // Buscar estructuras del servicio
    const { headerStructure, serviceStructure } = await findServiceByNumber(service_number);
    
    // Procesar el stream de entrada
    try {
      // Forzar la sección a "response" para el servicio de vuelta
      const section = "response";
      
      // Analizar mensaje explícitamente como una respuesta
      console.log(`Procesando stream de ${stream.length} caracteres como RESPUESTA`);
      
      // Extraer cabecera
      const headerLength = headerStructure.totalLength || 102;
      const headerMessage = stream.substring(0, headerLength);
      const headerData = messageAnalyzer.parseHeaderMessage(headerMessage, headerStructure);
      
      // Extraer cuerpo de la respuesta
      const bodyMessage = stream.substring(headerLength);
      const responseStructure = serviceStructure.response;
      
      // Procesar el cuerpo de la respuesta
      let responseData = {};
      if (responseStructure && responseStructure.elements) {
        try {
          // Usar el parseDataMessage para procesar la respuesta CON VALIDACIÓN DE OCURRENCIAS
          // y preservando los valores originales del string
          responseData = messageAnalyzer.parseDataMessage(
            bodyMessage,
            responseStructure,
            true // Activar validación de ocurrencias
          );
          
          console.log("Validación de ocurrencias exitosa");
        } catch (validationError) {
          // Capturar errores específicos de validación
          if (validationError.message.includes('Error de validación')) {
            return res.status(400).json({ 
              error: validationError.message,
              validationFailed: true,
              errorType: 'VALIDATION_ERROR'
            });
          }
          throw validationError; // Reenviar otros errores
        }
      } else {
        console.warn("No se encontró estructura de respuesta para el servicio");
      }
      
      // Filtrar ocurrencias vacías antes de retornar
      let cleanResponseData = removeEmptyOccurrences(responseData);
      
      // NUEVO: Aplicar corrección para ocurrencias anidadas
      cleanResponseData = fixResponseOccurrences(cleanResponseData);
      
      // Construir resultado final
      const parsedData = {
        header: headerData,
        response: cleanResponseData
      };
      
      // Añadir logs para debuggear
      console.log("Servicio de vuelta - headers:", JSON.stringify(headerData, null, 2));
      console.log("Servicio de vuelta - response filtrada:", JSON.stringify(cleanResponseData, null, 2));
      
      // Devolver los datos de respuesta filtrados, sin ocurrencias vacías
      return res.json(cleanResponseData);
    } catch (error) {
      console.error("Error al procesar el stream:", error);
      return res.status(500).json({ 
        error: `Error al procesar el stream: ${error.message}`,
        errorType: 'PROCESSING_ERROR' 
      });
    }
  } catch (error) {
    return res.status(error.statusCode || 500).json({ 
      error: error.message 
    });
  }
}

module.exports = {
  processVuelta
};
