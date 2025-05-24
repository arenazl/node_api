/**
 * vuelta-routes.js
 * Routes for processing "VUELTA" messages (string to JSON).
 */
const express = require('express');
const router = express.Router();

const messageAnalyzer = require('../api/message-analyzer');
const jsonCleaner = require('../utils/json-cleaner');
const { findServiceByNumber } = require('../utils/service-lookup');

// module.exports = function(findServiceByNumberFn) { // No longer taking it as a param
  // if (!findServiceByNumberFn) {
  //   throw new Error("findServiceByNumber function is required for vuelta-routes");
  // }

  /**
   * @route POST /vuelta (within /api/services/vuelta/*)
   * @description Processes a service by number and stream (Vuelta Service).
   */
  router.post('/vuelta', async (req, res) => {
    try {
      const { service_number, stream } = req.body;
      if (!service_number) {
        return res.status(400).json({ error: "Se requiere un número de servicio" });
      }
      if (!stream) {
        return res.status(400).json({ error: "Se requiere el stream de datos" });
      }

      const { headerStructure, serviceStructure } = await findServiceByNumber(service_number, false);
      
      console.log(`[VUELTA/vuelta] Processing stream for service ${service_number}`);
      const parsedMessage = messageAnalyzer.parseMessage(stream, headerStructure, serviceStructure);
      
      // Clean the data part aggressively
      const cleanedData = jsonCleaner.cleanVueltaJson(parsedMessage.data, 'aggressive');
      
      console.log("[VUELTA/vuelta] Response filtrada:", JSON.stringify(cleanedData, null, 2));
      return res.json(cleanedData);

    } catch (error) {
      console.error(`[VUELTA/vuelta] Error: ${error.message}`, error.stack);
      res.status(error.statusCode || 500).json({ 
        error: `Error al procesar el stream: ${error.message}`,
        errorType: 'PROCESSING_ERROR' 
      });
    }
  });

//  return router;
// }; // No longer exporting a function

module.exports = router; // Export the router directly
