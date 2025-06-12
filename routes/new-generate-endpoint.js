/**
 * Endpoint genérico para procesar servicios
 * Se encarga de generar el string de ida a partir de parámetros personalizados,
 * simular una respuesta y convertirla de vuelta en JSON usando el endpoint /vuelta
 */

const path = require('path');
const fs = require('fs-extra'); // Keep for config loading
const messageCreator = require('../utils/message-creator');
// const serverExampleGenerator = require('../utils/server-example-generator'); // Replaced
const backendResponseGenerator = require('../utils/backend-response-generator'); // New
const messageAnalyzer = require('../utils/message-analyzer'); // For direct parsing
const jsonCleaner = require('../utils/json-cleaner'); // New

// Configuración para la generación de ejemplos
// const USE_RANDOM_VALUES = true; // This flag seems unused now, random generation is default in backendResponseGenerator

/**
 * Implementa el endpoint /api/services/generate
 */

const { findServiceByNumber } = require('../utils/service-lookup');

async function handleGenerateRequest(req, res) { // findServiceByNumber is no longer passed
  try {
    const { header, parameters } = req.body;
    
    // Validar datos de entrada
    if (!header || !header.serviceNumber) {
      return res.status(400).json({ error: "Se requiere header.serviceNumber" });
    }
    
    if (!header.canal) {
      return res.status(400).json({ error: "Se requiere header.canal" });
    }
    
    const serviceNumber = header.serviceNumber;
    const canal = header.canal;
    console.log(`Procesando servicio: ${serviceNumber}, canal: ${canal}`);
    
    // 1. Buscar estructura del servicio
    const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber);
    if (!headerStructure || !serviceStructure) {
      return res.status(404).json({ error: `Estructura no encontrada para el servicio ${serviceNumber}` });
    }
    console.log(`Estructura encontrada para servicio ${serviceNumber}`);
    
    // 2. Buscar configuración por canal
    const configDir = path.join(__dirname, '..', 'JsonStorage', 'settings');
    
    // Buscar configuración por serviceNumber y canal
    let configFound = false;
    let configData = null;
    
    try {
      // Buscar archivos de configuración para este servicio
      // Patrones comunes: 1004-ME-v2.json, 1004_ME_v2.json, etc.
      const configFiles = fs.readdirSync(configDir)
        .filter(file => file.endsWith('.json') && 
                (file.startsWith(`${serviceNumber}-${canal}`) || 
                 file.startsWith(`${serviceNumber}_${canal}`) || 
                 file.includes(`${serviceNumber}-${canal}`) || 
                 file.includes(`${serviceNumber}_${canal}`)));
      
      if (configFiles.length > 0) {
        // Usar la primera configuración encontrada
        const configPath = path.join(configDir, configFiles[0]);
        configData = await fs.readJson(configPath);
        configFound = true;
        console.log(`Configuración encontrada: ${configFiles[0]}`);
      } else {
        console.log(`No se encontró configuración para servicio ${serviceNumber} y canal ${canal}`);
      }
    } catch (configError) {
      console.error(`Error al buscar configuración:`, configError);
    }
    
    // 3. Combinar configuración con parámetros específicos
    let requestData = {};
    
    // Si encontramos configuración, usarla como base
    if (configFound && configData) {
      // Clonar objeto para no modificar el original
      requestData = {
        header: { ...configData.header || {} },
        data: { ...configData.request || {} }
      };
    } else {
      // Si no hay configuración, crear objeto básico
      requestData = {
        header: {
          CANAL: canal,
          SERVICIO: serviceNumber,
          USUARIO: "SISTEMA"
        },
        data: {}
      };
    }
    
    // Agregar parámetros específicos a los datos del request
    if (parameters && typeof parameters === 'object') {
      // Reemplazar/agregar parámetros en data
      Object.assign(requestData.data, parameters);
      console.log(`Parámetros combinados con configuración`);
    }
    
    // 4. Crear mensaje de IDA
    const message = messageCreator.createMessage(headerStructure, serviceStructure, requestData, "request");
    console.log(`String de IDA generado: ${message.length} caracteres`);
    
    // Verificar si se solicita usar valores significativos mediante el parámetro simulate
    const useSimulateMode = parameters && parameters.simulate === true;
    
    // 5. Simular respuesta de VUELTA utilizando el nuevo generador de backend
    console.log(`[Generate] Generando ejemplo de respuesta para servicio ${serviceNumber}${useSimulateMode ? ' con valores significativos' : ''}`);
    const simulatedResponseMessage = backendResponseGenerator.generateVueltaMessage(
      serviceNumber,
      { headerStructure, serviceStructure },
      useSimulateMode // Pasar el flag de simulación al generador
    );
    console.log(`[Generate] String de VUELTA simulado: ${simulatedResponseMessage.length} caracteres`);

    // 6. Procesar el mensaje simulado para convertirlo a JSON
    console.log(`[Generate] Parseando string de vuelta simulado...`);
    const parsedVuelta = messageAnalyzer.parseMessage(simulatedResponseMessage, headerStructure, serviceStructure);
    
    // 7. Limpiar el JSON parseado para obtener la versión "data-only"
    const showOnlyNonEmpty = header.showOnlyNonEmpty === true;
    const filterMode = showOnlyNonEmpty ? 'aggressive' : 'occurrencesOnly'; // 'occurrencesOnly' could be a less aggressive default
    
    // dataVuelta contendrá el objeto { header: {}, data: {} } o solo la parte de data si parsedVuelta no tiene header/data
    let dataVuelta;
    if (parsedVuelta && parsedVuelta.data) {
        const cleanedData = jsonCleaner.cleanVueltaJson(parsedVuelta.data, filterMode);
        dataVuelta = cleanedData; // cleanVueltaJson now returns just the data part if only data part was passed
    } else {
        // Fallback if parsing didn't produce expected structure, clean whatever was parsed
        dataVuelta = jsonCleaner.cleanVueltaJson(parsedVuelta, filterMode);
    }
    
    console.log("[Generate] Datos de respuesta limpiados.");

    // 8. Devolver resultado completo
    res.json({
      serviceName: serviceStructure.serviceName || `Servicio ${serviceNumber}`,
      stringIda: message,
      stringVuelta: simulatedResponseMessage,
      dataVuelta: dataVuelta // Corrected variable
    });
    
  } catch (error) {
    console.error(`Error en procesamiento:`, error);
    res.status(error.statusCode || 500).json({ 
      error: error.message || 'Error desconocido en procesamiento'
    });
  }
}

module.exports = handleGenerateRequest;
