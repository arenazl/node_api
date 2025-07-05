/**
 * Service Routes Module
 * Handles message transformation between JSON and fixed-position strings
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

// Core utilities
const messageCreator = require('../utils/message-creator');
const messageAnalyzer = require('../utils/message-analyzer');
const { deepMerge } = require('../utils/deep-merge');
const jsonCleaner = require('../utils/json-cleaner');
const { generarEstructuraDetallada } = require('../utils/ida-message-utils');
const { getAvailableServices, findServiceByNumber } = require('../utils/service-lookup');
const backendResponseGenerator = require('../utils/backend-response-generator');

// Directory paths
const STRUCTURES_DIR = path.join(__dirname, '..', 'JsonStorage', 'structures');
const SETTINGS_DIR = path.join(__dirname, '..', 'JsonStorage', 'settings');
const UPLOADS_DIR = path.join(__dirname, '..', 'JsonStorage', 'uploads');

// ================== MAIN ENDPOINTS ==================

/**
 * POST /api/services/sendmessage
 * Converts JSON parameters to fixed-position string (IDA)
 */
router.post('/sendmessage', async (req, res) => {
  try {
    console.log('[sendmessage] Request received:', JSON.stringify(req.body, null, 2));
    
    const validationError = validateSendMessageRequest(req.body);
    if (validationError) {
      console.error('[sendmessage] Validation error:', validationError);
      return res.status(400).json({ error: validationError });
    }

    const { header, parameters } = req.body;
    const { serviceNumber, canal } = header;

    console.log(`[sendmessage] Processing service: ${serviceNumber}, canal: ${canal}`);
    console.log(`[sendmessage] Parameters keys:`, Object.keys(parameters || {}));

    const serviceData = await loadServiceData(serviceNumber);
    if (!serviceData) {
      console.error(`[sendmessage] Structure not found for service ${serviceNumber}`);
      return res.status(404).json({ 
        error: `Structure not found for service ${serviceNumber}` 
      });
    }

    const configData = await loadServiceConfig(serviceNumber, canal);
    const requestData = buildRequestData(header, parameters, configData, serviceNumber, canal);
    const message = generateFixedString(serviceData, requestData);
    const response = buildSendMessageResponse(header, parameters, message, serviceData, requestData);

    console.log(`[sendmessage] Success - Service: ${serviceNumber}, Canal: ${canal}, Message length: ${message.length}`);
    res.json(response);

  } catch (error) {
    console.error(`[sendmessage] Error:`, error);
    handleEndpointError(res, error, 'sendmessage');
  }
});

/**
 * POST /api/services/receivemessage
 * Converts fixed-position string to JSON (VUELTA)
 */
router.post('/receivemessage', async (req, res) => {
  try {
    console.log('[receivemessage] Request received:', JSON.stringify(req.body, null, 2));
    
    const validationError = validateReceiveMessageRequest(req.body);
    if (validationError) {
      console.error('[receivemessage] Validation error:', validationError);
      return res.status(400).json({ error: validationError });
    }

    const { header, parameters } = req.body;
    const { serviceNumber } = header;
    
    console.log(`[receivemessage] Processing service: ${serviceNumber}`);
    console.log(`[receivemessage] Parameters keys:`, Object.keys(parameters || {}));
    
    const isSimulation = parameters?.simulate === true;
    
    if (!isSimulation) {
      console.log(`[receivemessage] SOAP response string length: ${parameters.returnMsg ? parameters.returnMsg.length : 0}`);
      console.log(`[receivemessage] SOAP response: ${parameters.returnMsg}`);
    }

    const serviceData = await loadServiceData(serviceNumber);
    if (!serviceData) {
      console.error(`[receivemessage] Structure not found for service ${serviceNumber}`);
      return res.status(404).json({ 
        error: `Structure not found for service ${serviceNumber}` 
      });
    }

    let responseData;
    if (isSimulation) {
      console.log(`[receivemessage] Running in simulation mode`);
      responseData = await handleSimulation(serviceNumber, serviceData, parameters);
    } else {
      console.log(`[receivemessage] Processing real SOAP response`);
      responseData = await processMessageStream(parameters.returnMsg, serviceData);
    }

    const response = buildReceiveMessageResponse(header, parameters, responseData, isSimulation);
    console.log(`[receivemessage] Success - Service: ${serviceNumber}, Response type: ${typeof responseData}`);
    res.json(response);

  } catch (error) {
    console.error(`[receivemessage] Error:`, error);
    handleEndpointError(res, error, 'receivemessage');
  }
});

// ================== SERVICE LISTING ENDPOINTS ==================

/**
 * GET /api/services
 * Returns list of available services
 */
router.get('/', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const services = await getAvailableServices(forceRefresh);
    res.json({ services });
  } catch (error) {
    handleEndpointError(res, error, 'list services');
  }
});

/**
 * GET /api/services/refresh
 * Forces cache refresh
 */
router.get('/refresh', async (req, res) => {
  try {
    clearServiceCache();
    const services = await getAvailableServices(true);
    
    res.json({
      message: "Cache updated successfully",
      services_count: services.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleEndpointError(res, error, 'refresh cache');
  }
});

/**
 * GET /api/services/:serviceNumber
 * Gets service details by number
 */
router.get('/:serviceNumber', async (req, res) => {
  try {
    const { serviceNumber } = req.params;
    const { stream } = req.query;
    
    const result = await processServiceDetails(serviceNumber, stream);
    res.json(result);
  } catch (error) {
    handleEndpointError(res, error, 'get service details');
  }
});

// ================== UTILITY ENDPOINTS ==================

/**
 * POST /api/services/create-header
 * Creates header message
 */
router.post('/create-header', async (req, res) => {
  try {
    const { headerStructure, headerData } = req.body;
    
    if (!headerStructure || !headerData) {
      return res.status(400).json({ 
        error: "headerStructure and headerData are required" 
      });
    }
    
    const headerMessage = messageCreator.createHeaderMessage(headerStructure, headerData);
    res.json({ headerMessage });
  } catch (error) {
    handleEndpointError(res, error, 'create header');
  }
});

/**
 * POST /api/services/process
 * Generic service processor
 */
router.post('/process', async (req, res) => {
  try {
    const { service_number, stream } = req.body;
    
    if (!service_number) {
      return res.status(400).json({ error: "service_number is required" });
    }
    
    const serviceData = await loadServiceData(service_number);
    const result = await processGenericService(service_number, stream, serviceData);
    
    res.json({ result });
  } catch (error) {
    handleEndpointError(res, error, 'process service');
  }
});

// ================== ADDITIONAL ENDPOINTS ==================

/**
 * GET /api/services/files
 * Gets Excel files for a specific service
 */
router.get('/files', async (req, res) => {
  try {
    const { service_number } = req.query;
    
    if (!service_number) {
      return res.status(400).json({ error: "service_number is required" });
    }
    
    const files = await getServiceFiles(service_number);
    res.json({ files });
  } catch (error) {
    handleEndpointError(res, error, 'get service files');
  }
});

/**
 * GET /api/services/versions
 * Gets available versions of a service
 */
router.get('/versions', async (req, res) => {
  try {
    const { serviceNumber } = req.query;
    
    if (!serviceNumber) {
      return res.status(400).json({ error: "serviceNumber is required" });
    }
    
    const versions = await getServiceVersions(serviceNumber);
    res.json({ serviceNumber, versions });
  } catch (error) {
    handleEndpointError(res, error, 'get service versions');
  }
});

// ================== HELPER FUNCTIONS ==================

function validateSendMessageRequest(body) {
  const { header } = body;
  if (!header || !header.serviceNumber || !header.canal) {
    return "header.serviceNumber and header.canal are required";
  }
  return null;
}

function validateReceiveMessageRequest(body) {
  const { header, parameters } = body;
  if (!header || !header.serviceNumber) {
    return "header.serviceNumber is required";
  }
  
  const isSimulation = parameters?.simulate === true;
  if (!isSimulation && (!parameters || !parameters.returnMsg)) {
    return "parameters.returnMsg is required when not simulating";
  }
  return null;
}

async function loadServiceData(serviceNumber) {
  const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber, false);
  if (!headerStructure || !serviceStructure) {
    return null;
  }
  return { headerStructure, serviceStructure };
}

async function loadServiceConfig(serviceNumber, canal) {
  try {
    const configFiles = await findConfigFiles(serviceNumber, canal);
    if (configFiles.length > 0) {
      return await fs.readJson(path.join(SETTINGS_DIR, configFiles[0]));
            }
          } catch (error) {
    console.error(`Error loading config: ${error.message}`);
  }
  return null;
}

async function findConfigFiles(serviceNumber, canal) {
  const files = await fs.readdir(SETTINGS_DIR);
  
  // First try to find canal-specific config
  let configFiles = files.filter(file => 
    file.endsWith('.json') && 
    (file.includes(`${serviceNumber}-${canal}`) || file.includes(`${serviceNumber}_${canal}`))
  );
  
  // If not found, try any config for the service
  if (configFiles.length === 0) {
    configFiles = files.filter(file => 
      file.endsWith('.json') && file.includes(serviceNumber)
    );
  }
  
  return configFiles;
}

function buildRequestData(header, parameters, configData, serviceNumber, canal) {
  const defaultHeader = { 
    CANAL: canal, 
    SERVICIO: serviceNumber, 
    USUARIO: "SISTEMA" 
  };
  
  const requestData = {
    header: configData?.header || defaultHeader,
    data: configData?.request || {}
  };
  
  if (parameters && typeof parameters === 'object') {
    requestData.data = deepMerge(requestData.data, parameters);
  }
  
  return requestData;
}

function generateFixedString(serviceData, requestData) {
  const { headerStructure, serviceStructure } = serviceData;
  return messageCreator.createMessage(
    headerStructure, 
    serviceStructure, 
    requestData, 
    "request"
  );
}

function buildSendMessageResponse(header, parameters, message, serviceData, requestData) {
  const estructura = generarEstructuraDetallada(
    serviceData.headerStructure, 
    serviceData.serviceStructure, 
    requestData
  );
  
  const cleanHeader = { ...header };
  delete cleanHeader.serviceNumber;
  delete cleanHeader.canal;
      
      return {
    request: {
      header: {
        serviceNumber: header.serviceNumber,
        canal: header.canal,
        ...cleanHeader
      },
      parameters
    },
    response: message,
    estructura,
    estructuraCompleta: { 
      requestStructure: serviceData.serviceStructure.request 
    }
  };
}

async function handleSimulation(serviceNumber, serviceData, parameters) {
  console.log(`[receivemessage] Generating simulated data for service ${serviceNumber}`);
  
  if (parameters.returnString === true) {
    const simulatedString = backendResponseGenerator.generateVueltaMessage(
      serviceNumber,
      serviceData,
      true
    );
    
    return {
      simulatedString,
      isString: true
    };
  }
  
  return backendResponseGenerator.generateRandomDataForStructure(
    serviceData.serviceStructure.response,
    null,
    true
  );
}

async function processMessageStream(stream, serviceData) {
  
  const { headerStructure, serviceStructure } = serviceData;
  const parsedMessage = messageAnalyzer.parseMessage(stream, headerStructure, serviceStructure);
  const responseData = parsedMessage.data || {};
  
  console.log("[receivemessage] Headers parsed:", JSON.stringify(parsedMessage.header, null, 2));
  
  try {
    return jsonCleaner.cleanVueltaJson(responseData, 'aggressive');
  } catch (cleanError) {
    console.error("[receivemessage] Error cleaning data:", cleanError);
    return responseData;
  }
}

function buildReceiveMessageResponse(header, parameters, responseData, isSimulation) {
  if (responseData.isString) {
    return {
      request: {
        header,
        parameters: {
          simulate: true,
          returnString: true
        }
      },
      response: responseData.simulatedString,
      stringLength: responseData.simulatedString.length
    };
  }
  
  const randomNumber = Math.floor(Math.random() * 10) + 1;
  
  const responseObj = {
    ...responseData
  };
  if (isSimulation) {
    responseObj.randomNumber = randomNumber;
  }
  return {
    request: {
      header,
      parameters: isSimulation ? 
        { simulate: true } : 
        { returnMsg: `[string de longitud ${parameters.returnMsg ? parameters.returnMsg.length : 0}]` }
    },
    response: responseObj
  };
}

function clearServiceCache() {
  if (global.serviceCache) {
    console.log('[refresh] Clearing service cache');
    global.serviceCache.services = null;
    global.serviceCache.lastUpdate = null;
    global.serviceCache.structures = {};
  }
}

async function processServiceDetails(serviceNumber, stream) {
  const serviceData = await loadServiceData(serviceNumber);
  
  let parsedData = null;
  if (stream) {
    try {
      const { headerStructure, serviceStructure } = serviceData;
      parsedData = messageAnalyzer.parseMessage(stream, headerStructure, serviceStructure);
    } catch (error) {
      const err = new Error(`Error parsing stream: ${error.message}`);
      err.statusCode = 400;
      throw err;
    }
  }
  
  const message = stream || generateExampleMessage(serviceNumber, serviceData);
  
  return {
    service_number: serviceNumber,
    service_name: serviceData.serviceStructure.serviceName || "",
    message,
    parsed_data: parsedData,
    status: "success"
  };
}

function generateExampleMessage(serviceNumber, serviceData) {
    const messageData = {
      header: {
        CANAL: "OT",
        SERVICIO: serviceNumber,
        USUARIO: "SISTEMA"
      },
      data: {},
      section: "request"
    };
    
  return messageCreator.createMessage(
    serviceData.headerStructure,
    serviceData.serviceStructure,
    messageData,
    "request"
  );
}

async function processGenericService(serviceNumber, stream, serviceData) {
  if (!stream) {
  return {
      message: generateExampleMessage(serviceNumber, serviceData),
      info: "Example request generated"
    };
  }
  
  try {
    const { headerStructure, serviceStructure } = serviceData;
    const headerLength = headerStructure.totalLength || 102;
    
    const headerMessage = stream.substring(0, headerLength);
    const headerData = messageAnalyzer.parseHeaderMessage(headerMessage, headerStructure);
    
    const bodyMessage = stream.substring(headerLength);
    let responseData = {};
    
    if (serviceStructure.response?.elements) {
      responseData = messageAnalyzer.parseDataMessage(bodyMessage, serviceStructure.response);
    }
    
    const cleanResponseData = jsonCleaner.cleanVueltaJson(responseData, 'aggressive');
    
    return {
      header: headerData,
      response: cleanResponseData
    };
  } catch (error) {
    console.error("Error processing stream:", error);
    return { error: error.message };
  }
}

async function getServiceFiles(serviceNumber) {
  const files = [];
  
  if (!await fs.exists(UPLOADS_DIR)) {
    return files;
  }
  
  const excelFiles = (await fs.readdir(UPLOADS_DIR))
    .filter(file => file.endsWith('.xls') || file.endsWith('.xlsx'));
  
  for (const excelFile of excelFiles) {
    const fileInfo = parseExcelFileName(excelFile);
    if (fileInfo.serviceNumber === serviceNumber) {
      files.push(fileInfo);
    }
  }
  
  return files.sort((a, b) => b.upload_date.localeCompare(a.upload_date));
}

function parseExcelFileName(filename) {
  const timestampMatch = filename.match(/^(\d+T\d+)_(.+)\.xls(x)?$/);
  let uploadDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let serviceName = filename;
  let fileServiceNumber = null;
  
  if (timestampMatch) {
    uploadDate = parseTimestamp(timestampMatch[1]);
    serviceName = timestampMatch[2] || serviceName;
  }
  
  const serviceMatch = serviceName.match(/SVO(\d+)/i) || serviceName.match(/(\d{4})/);
  if (serviceMatch) {
    fileServiceNumber = serviceMatch[1];
  }
  
  return {
    filename,
    service_name: serviceName,
    upload_date: uploadDate,
    service_number: fileServiceNumber
  };
}

function parseTimestamp(timestamp) {
  try {
    if (timestamp.length >= 14) {
      const year = timestamp.substring(0, 4);
      const month = timestamp.substring(4, 6);
      const day = timestamp.substring(6, 8);
      const hour = timestamp.substring(9, 11);
      const minute = timestamp.substring(11, 13);
      const second = timestamp.substring(13, 15) || '00';
      
      const dt = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      return dt.toISOString().replace('T', ' ').substring(0, 19);
    }
  } catch (error) {
    // Return current date if parsing fails
  }
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

async function getServiceVersions(serviceNumber) {
  const allServices = await getAvailableServices();
  const serviceVersions = allServices.filter(s => s.service_number === serviceNumber);
  
  const settingsFiles = await getSettingsFiles(serviceNumber);
  const versionsWithTimestamps = enrichVersionsWithTimestamps(serviceVersions, settingsFiles);
  
  const allVersions = versionsWithTimestamps.length > 0 ? 
    versionsWithTimestamps : 
    createVersionsFromSettings(settingsFiles, serviceNumber);
  
  return allVersions.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
}

async function getSettingsFiles(serviceNumber) {
  try {
    if (!await fs.exists(SETTINGS_DIR)) {
      return [];
    }
    
    const files = await fs.readdir(SETTINGS_DIR);
    const settingsFiles = [];
    
    for (const file of files) {
      if (file.endsWith('.json') && file.includes(serviceNumber)) {
        const filePath = path.join(SETTINGS_DIR, file);
        const stats = await fs.stat(filePath);
        
        settingsFiles.push({
          filename: file,
          settings_file: file,
          timestamp: stats.mtime.toISOString(),
          upload_date: stats.mtime.toISOString(),
          size: stats.size
        });
      }
    }
    
    return settingsFiles;
  } catch (error) {
    console.warn(`Error reading settings files: ${error.message}`);
    return [];
  }
}

function enrichVersionsWithTimestamps(serviceVersions, settingsFiles) {
  return serviceVersions.map(service => {
    const validTimestamp = extractValidTimestamp(service);
    const relatedSettingsFile = settingsFiles.find(sf => 
      sf.filename.includes(service.service_number)
    );
    
    return {
      ...service,
      timestamp: validTimestamp,
      settings_file: relatedSettingsFile?.filename || null
    };
  });
}

function extractValidTimestamp(service) {
  if (service.excel_file) {
    const timestampMatch = service.excel_file.match(/^(\d{8}T\d{6})_/);
    if (timestampMatch) {
      const timestamp = parseExcelTimestamp(timestampMatch[1]);
      if (timestamp) return timestamp;
    }
  }
  
  if (service.timestamp) {
    const existingDate = new Date(service.timestamp);
    if (!isNaN(existingDate.getTime())) {
      return service.timestamp;
    }
  }
  
  return new Date().toISOString();
}

function parseExcelTimestamp(timestamp) {
  try {
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(9, 11);
    const minute = timestamp.substring(11, 13);
    const second = timestamp.substring(13, 15) || '00';
    
    const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    const parsedDate = new Date(dateStr);
    
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
    } catch (error) {
    console.warn(`Error parsing timestamp ${timestamp}:`, error);
  }
  return null;
}

function createVersionsFromSettings(settingsFiles, serviceNumber) {
  return settingsFiles.map(sf => ({
    filename: sf.filename,
    excel_file: null,
    settings_file: sf.filename,
    timestamp: sf.timestamp,
    upload_date: sf.upload_date,
    size: sf.size,
    service_number: serviceNumber,
    service_name: `Configuration ${serviceNumber}`
  }));
}

function handleEndpointError(res, error, operation) {
  console.error(`[${operation}] Error: ${error.message}`, error.stack);
      res.status(error.statusCode || 500).json({
    error: error.message || `Error during ${operation}` 
  });
}

// ================== ROUTE MOUNTING ==================

// Mount sub-routes
const idaRoutes = require('./ida-routes');
const vueltaRoutes = require('./vuelta-routes');
const exampleGenerationRoutes = require('./example-generation-routes');
const handleGenerateRequest = require('./new-generate-endpoint');

router.use('/', idaRoutes);
router.use('/', vueltaRoutes);
router.use('/examples', exampleGenerationRoutes);

// Legacy generate endpoint
router.post('/generate', async (req, res) => {
  return handleGenerateRequest(req, res, findServiceByNumber);
});

// ================== EXPORTS ==================

module.exports = router;
module.exports.getAvailableServices = getAvailableServices;