/**
 * Endpoint genérico para procesar servicios
 * Se encarga de generar el string de ida a partir de parámetros personalizados,
 * simular una respuesta y convertirla de vuelta en JSON usando el endpoint /vuelta
 */

const path = require('path');
const fs = require('fs-extra');
const messageCreator = require('../api/message-creator');
const serverExampleGenerator = require('../utils/server-example-generator');

// Configuración para la generación de ejemplos
const USE_RANDOM_VALUES = true; // Activar generación de valores aleatorios

/**
 * Implementa el endpoint /api/services/generate
 */
async function handleGenerateRequest(req, res, findServiceByNumber) {
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
    const configDir = path.join(__dirname, '..', 'settings');
    
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
    
    // 5. Simular respuesta de VUELTA utilizando el generador de ejemplos
    console.log(`Generando ejemplo de respuesta para servicio ${serviceNumber}`);
    
    // Usar nuestro generador de ejemplos para servidor
    const simulatedResponseMessage = await serverExampleGenerator.generateServerExample(
      serviceNumber,
      { headerStructure, serviceStructure }
    );
    
    console.log(`String de VUELTA simulado: ${simulatedResponseMessage.length} caracteres`);
    
    // 6. Procesar el mensaje simulado para convertirlo a JSON usando el endpoint /vuelta existente
    console.log(`Procesando string de vuelta con parseador existente`);
    
    // Preparar el request para el endpoint de vuelta como si fuera una petición HTTP
    const vueltaRequest = {
      body: {
        service_number: serviceNumber,
        stream: simulatedResponseMessage
      }
    };
    
    // Preparar el response para capturar la respuesta del endpoint
    const vueltaResponse = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      },
      statusCode: 200,
      data: {}
    };
    
    // Obtener la función de procesamiento de vuelta
    const apiRouter = require('./api');
    
    // Procesar el string simulado a través del endpoint /vuelta
    await apiRouter.processVuelta(vueltaRequest, vueltaResponse, findServiceByNumber, require('../utils/occurrence-fixer').fixOccurrenceIndices);
    
    // Verificar si hubo error en el procesamiento
    if (vueltaResponse.statusCode !== 200) {
      throw new Error(`Error al procesar respuesta: ${JSON.stringify(vueltaResponse.data)}`);
    }
    
    // Aplicar removeEmptyOccurrences para limpiar ocurrencias vacías
    const occurrenceFixer = require('../utils/occurrence-fixer');
    
    // Función para limpiar solo las ocurrencias vacías
    function removeEmptyOccurrences(responseData) {
      console.log("[GENERATE] Limpiando solo ocurrencias vacías, manteniendo todos los demás campos");
      
      if (!responseData || typeof responseData !== 'object') {
        return responseData;
      }
      
      // Primero aplicamos el fixer de ocurrencias para asegurar índices correctos
      const fixedData = occurrenceFixer.fixOccurrenceIndices({ response: responseData }).response;
      
      // Crear una copia del objeto para manipularlo
      const result = { ...fixedData };
      
      // Función que detecta si una clave corresponde a una ocurrencia
      const isOccurrenceKey = (key) => {
        return key.startsWith('occ_') || key.match(/^OCC\d+/i);
      };
      
      // Buscar y limpiar sólo las ocurrencias
      for (const [key, value] of Object.entries(result)) {
        if (isOccurrenceKey(key) && Array.isArray(value)) {
          // Limpiar sólo ocurrencias: filtrar elementos vacíos del array
          result[key] = value.filter(item => {
            if (!item || typeof item !== 'object') return true;
            
            // Un elemento está "vacío" sólo si todos sus valores (excluyendo index) están vacíos
            const hasNonEmptyValue = Object.entries(item).some(([propKey, propValue]) => {
              if (propKey === 'index') return false; // ignorar propiedad index
              
              if (Array.isArray(propValue)) {
                return propValue.length > 0;
              }
              
              // Si algún valor no es vacío, mantener el item
              return propValue !== "" && propValue !== null && propValue !== undefined;
            });
            
            return hasNonEmptyValue;
          });
          
          // Limpiar campos vacíos dentro de cada item de la ocurrencia
          result[key] = result[key].map(item => {
            if (!item || typeof item !== 'object') return item;
            
            const cleanedItem = {};
            for (const [propKey, propValue] of Object.entries(item)) {
              // Mantener index siempre
              if (propKey === 'index') {
                cleanedItem[propKey] = propValue;
                continue;
              }
              
              // Si el campo tiene un valor no vacío, mantenerlo
              if (propValue !== "" && propValue !== null && propValue !== undefined) {
                cleanedItem[propKey] = propValue;
              }
            }
            return cleanedItem;
          });
        }
      }
      
      return result;
    }
    
    // Verificar si se debe mostrar solo valores no vacíos
    const showOnlyNonEmpty = header.showOnlyNonEmpty === true;
    
    // Limpiar datos de ocurrencias vacías
    const cleanResponseData = removeEmptyOccurrences(vueltaResponse.data);
    console.log("[GENERATE] Datos de respuesta limpiados de ocurrencias vacías");
    
    // Si se solicita mostrar solo valores no vacíos, filtrar todos los campos vacíos
    let finalResponseData = cleanResponseData;
    if (showOnlyNonEmpty) {
      console.log("[GENERATE] Filtrando campos vacíos de la respuesta completa");
      
      const filterEmptyValues = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        // Si es array, procesamos cada elemento
        if (Array.isArray(obj)) {
          return obj
            .map(item => filterEmptyValues(item))
            .filter(item => {
              if (item === null || item === undefined) return false;
              if (typeof item === 'object') {
                // Si solo tiene la propiedad index o está vacío, lo excluimos
                if (Object.keys(item).length === 0) return false;
                if (Object.keys(item).length === 1 && 'index' in item) return false;
                
                // Verificar si hay algún valor significativo además del índice
                const hasNonEmptyValue = Object.entries(item).some(([k, v]) => {
                  return k !== 'index' && v !== null && v !== undefined && 
                         v !== "" && !(typeof v === 'string' && v.trim() === "") &&
                         !(typeof v === 'string' && /^0+$/.test(v));
                });
                
                return hasNonEmptyValue;
              }
              return true;
            });
        }
        
        // Para objetos, filtramos propiedades con valores vacíos
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          // Para ocurrencias (arrays), procesarlas manteniendo estructura
          if (key.startsWith('occ_') && Array.isArray(value)) {
            const filteredArray = filterEmptyValues(value);
            if (filteredArray.length > 0) {
              result[key] = filteredArray;
            }
          }
          // Para otros objetos anidados
          else if (value && typeof value === 'object' && !Array.isArray(value)) {
            const filtered = filterEmptyValues(value);
            if (Object.keys(filtered).length > 0) {
              result[key] = filtered;
            }
          } 
          // Para valores primitivos, solo incluir si no están vacíos
          else if (value !== "" && value !== null && value !== undefined &&
                  !(typeof value === 'string' && value.trim() === "") &&
                  !(typeof value === 'string' && /^0+$/.test(value)) &&
                  !(typeof value === 'string' && /^\s+$/.test(value))) {
            result[key] = value;
          }
        }
        
        return result;
      };
      
      finalResponseData = filterEmptyValues(cleanResponseData);
    } else {
      finalResponseData = cleanResponseData;
    }
    
    // 7. Devolver resultado completo
    res.json({
      serviceName: serviceStructure.serviceName || `Servicio ${serviceNumber}`,
      stringIda: message,
      stringVuelta: simulatedResponseMessage,
      dataVuelta: finalResponseData
    });
    
  } catch (error) {
    console.error(`Error en procesamiento:`, error);
    res.status(error.statusCode || 500).json({ 
      error: error.message || 'Error desconocido en procesamiento'
    });
  }
}

module.exports = handleGenerateRequest;
