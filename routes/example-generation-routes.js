/**
 * example-generation-routes.js
 * Routes for generating example messages and full flow simulations.
 */
const express = require('express');
const router = express.Router();

const messageCreator = require('../api/message-creator'); // For IDA part of generate-legacy
const messageAnalyzer = require('../api/message-analyzer');
const backendResponseGenerator = require('../utils/backend-response-generator');
const jsonCleaner = require('../utils/json-cleaner');
const { findServiceByNumber } = require('../utils/service-lookup');

// module.exports = function(findServiceByNumberFn) { // No longer taking it as a param
  // if (!findServiceByNumberFn) {
  //   throw new Error("findServiceByNumber function is required for example-generation-routes");
  // }

  /**
   * @route POST /generate-legacy (within /api/services/examples/* or similar)
   * @description Legacy endpoint for generating IDA and simulating/parsing VUELTA.
   */
  router.post('/generate-legacy', async (req, res) => {
    try {
      const { header, parameters } = req.body;
      if (!header || !header.serviceNumber || !header.canal) {
        return res.status(400).json({ error: "header.serviceNumber and header.canal are required" });
      }
      const { serviceNumber, canal } = header;
      console.log(`[EXAMPLES/generate-legacy] Processing service: ${serviceNumber}, canal: ${canal}`);

      const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber, false);
      if (!headerStructure || !serviceStructure) {
        return res.status(404).json({ error: `[EXAMPLES/generate-legacy] Structure not found for service ${serviceNumber}` });
      }

      // Config loading (simplified, consider moving to a helper if used elsewhere often)
      const configDir = require('path').join(__dirname, '..', 'settings');
      let configData = null;
      try {
        const configFiles = require('fs-extra').readdirSync(configDir)
          .filter(file => file.endsWith('.json') && (file.startsWith(`${serviceNumber}-${canal}`) || file.startsWith(`${serviceNumber}_${canal}`) || file.includes(`${serviceNumber}-${canal}`) || file.includes(`${serviceNumber}_${canal}`)));
        if (configFiles.length > 0) {
          configData = await require('fs-extra').readJson(require('path').join(configDir, configFiles[0]));
        }
      } catch (e) { console.error(`[EXAMPLES/generate-legacy] Error reading config: ${e.message}`); }

      let requestData = {
        header: configData && configData.header ? { ...configData.header } : { CANAL: canal, SERVICIO: serviceNumber, USUARIO: "SISTEMA" },
        data: configData && configData.request ? { ...configData.request } : {}
      };
      if (parameters && typeof parameters === 'object') {
        Object.assign(requestData.data, parameters);
      }

      const idaMessage = messageCreator.createMessage(headerStructure, serviceStructure, requestData, "request");
      const vueltaString = backendResponseGenerator.generateVueltaMessage(serviceNumber, { headerStructure, serviceStructure });
      const parsedVueltaFull = messageAnalyzer.parseMessage(vueltaString, headerStructure, serviceStructure);
      const cleanedDataVuelta = jsonCleaner.cleanVueltaJson(parsedVueltaFull.data, 'aggressive');

      res.json({
        serviceName: serviceStructure.serviceName || `Servicio ${serviceNumber}`,
        stringIda: idaMessage,
        stringVuelta: vueltaString,
        dataVuelta: cleanedDataVuelta
      });
    } catch (error) {
      console.error(`[EXAMPLES/generate-legacy] Error: ${error.message}`, error.stack);
      res.status(error.statusCode || 500).json({ error: error.message || 'Error processing generate-legacy' });
    }
  });

  /**
   * @route POST /generate-example-response (within /api/services/examples/* or similar)
   * @description Generates a complete example "vuelta" string for a service.
   */
  router.post('/generate-example-response', async (req, res) => {
    try {
      const { serviceNumber } = req.body;
      if (!serviceNumber) {
        return res.status(400).json({ error: "Se requiere serviceNumber" });
      }

      const structures = await findServiceByNumber(serviceNumber, false);
      if (!structures || !structures.headerStructure || !structures.serviceStructure) {
        return res.status(404).json({ error: `[EXAMPLES/generate-example-response] Structure not found for service ${serviceNumber}` });
      }
      
      const exampleResponseString = backendResponseGenerator.generateVueltaMessage(serviceNumber, structures);
      
      res.json({ exampleResponseString });
    } catch (error) {
      console.error(`[EXAMPLES/generate-example-response] Error: ${error.message}`, error.stack);
      res.status(error.statusCode || 500).json({ error: error.message || 'Error processing generate-example-response' });
    }
  });

//  return router;
// }; // No longer exporting a function

module.exports = router; // Export the router directly
