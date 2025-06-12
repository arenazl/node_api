/**
 * ida-routes.js
 * Routes for generating "IDA" messages.
 */
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

const messageCreator = require('../utils/message-creator');
const { findServiceByNumber } = require('../utils/service-lookup');
const { generarEstructuraDetallada, procesarElementos } = require('../utils/ida-message-utils');


  /**
   * @route POST /sendmessage-detailed (within /api/services/ida/*)
   * @description Generates the IDA string with detailed field breakdown.
   */
  router.post('/sendmessage-detailed', async (req, res) => {
    try {
      const { header, parameters } = req.body;
      if (!header || !header.serviceNumber || !header.canal) {
        return res.status(400).json({ error: "header.serviceNumber and header.canal are required" });
      }
      const { serviceNumber, canal } = header;
      console.log(`[IDA/sendmessage-detailed] Processing service: ${serviceNumber}, canal: ${canal}`);

      const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber, false);
      if (!headerStructure || !serviceStructure) {
        return res.status(404).json({ error: `[IDA/sendmessage-detailed] Structure not found for service ${serviceNumber}` });
      }
      
      const configDir = path.join(__dirname, '..', 'JsonStorage', 'settings');
      let configData = null;
      try {
        const configFiles = fs.readdirSync(configDir)
          .filter(file => file.endsWith('.json') && (file.startsWith(`${serviceNumber}-${canal}`) || file.startsWith(`${serviceNumber}_${canal}`) || file.includes(`${serviceNumber}-${canal}`) || file.includes(`${serviceNumber}_${canal}`)));
        if (configFiles.length > 0) {
          configData = await fs.readJson(path.join(configDir, configFiles[0]));
        }
      } catch (e) { console.error(`[IDA/sendmessage-detailed] Error reading config: ${e.message}`); }

      let requestData = {
        header: configData && configData.header ? { ...configData.header } : { CANAL: canal, SERVICIO: serviceNumber, USUARIO: "SISTEMA" },
        data: configData && configData.request ? { ...configData.request } : {}
      };
      if (parameters && typeof parameters === 'object') {
        Object.assign(requestData.data, parameters);
      }

      const message = messageCreator.createMessage(headerStructure, serviceStructure, requestData, "request");
      const estructura = generarEstructuraDetallada(headerStructure, serviceStructure, requestData);
      const desgloseCampos = generarDesgloseCampos(estructura);

      res.json({
        request: { header, parameters },
        response: message,
        estructura,
        desgloseCampos,
        estructuraCompleta: { requestStructure: serviceStructure.request }
      });
    } catch (error) {
      console.error(`[IDA/sendmessage-detailed] Error: ${error.message}`, error.stack);
      res.status(error.statusCode || 500).json({ error: error.message || 'Error processing sendmessage-detailed' });
    }
  });

  /**
   * @route POST /ida (within /api/services/ida/*)
   * @description Processes a service with JSON input (IDA Service).
   */
  router.post('/ida', async (req, res) => {
    try {
      const jsonData = req.body;
      const serviceNumber = jsonData.service_number;
      if (!serviceNumber) {
        return res.status(400).json({ error: "Se requiere un número de servicio en el campo service_number" });
      }

      const { headerStructure, serviceStructure } = await findServiceByNumber(serviceNumber, false);
      if (!headerStructure || !serviceStructure) {
        return res.status(404).json({ error: `[IDA/ida] Structure not found for service ${serviceNumber}` });
      }
      
      const messageData = {
        header: {
          CANAL: jsonData.CANAL || "API",
          SERVICIO: serviceNumber,
          USUARIO: jsonData.USUARIO || "SISTEMA"
        },
        data: jsonData.data || {},
        section: "request"
      };
      
      const message = messageCreator.createMessage(headerStructure, serviceStructure, messageData, "request");
      
      res.json({
        service_number: serviceNumber,
        service_name: serviceStructure.serviceName || "",
        message: message,
        status: "success"
      });
    } catch (error) {
      console.error(`[IDA/ida] Error: ${error.message}`, error.stack);
      res.status(error.statusCode || 500).json({ error: error.message || 'Error processing /ida' });
    }
  });

module.exports = router; // Correctly export the router
// }; // No longer exporting a function that takes findServiceByNumberFn

/**
 * Generates a detailed field-by-field breakdown of the message.
 * @param {Array} estructura - Detailed field structure from generarEstructuraDetallada.
 * @returns {Object} Object with the detailed field breakdown.
 */
function generarDesgloseCampos(estructura) {
  const desglose = {
    seccionCabecera: [],
    seccionRequerimiento: [],
    resumenPorTipo: {
      alfanumerico: { cantidad: 0, longitudTotal: 0 },
      numerico: { cantidad: 0, longitudTotal: 0 },
      otros: { cantidad: 0, longitudTotal: 0 }
    },
    totalCampos: 0,
    longitudTotal: 0
  };
  let seccionActual = null;
  for (const campo of estructura) {
    if (campo.nombre === "SECCION") {
      seccionActual = campo.valor;
      continue;
    }
    const campoDet = { nombre: campo.nombre, valor: campo.valor, longitud: campo.longitud, tipo: campo.tipo };
    if (seccionActual === "CABECERA") {
      desglose.seccionCabecera.push(campoDet);
    } else if (seccionActual === "REQUERIMIENTO") {
      desglose.seccionRequerimiento.push(campoDet);
    }
    desglose.totalCampos++;
    desglose.longitudTotal += campo.longitud;
    if (campo.tipo === "alfanumerico") {
      desglose.resumenPorTipo.alfanumerico.cantidad++;
      desglose.resumenPorTipo.alfanumerico.longitudTotal += campo.longitud;
    } else if (campo.tipo === "numerico") {
      desglose.resumenPorTipo.numerico.cantidad++;
      desglose.resumenPorTipo.numerico.longitudTotal += campo.longitud;
    } else if (campo.tipo !== "separator" && campo.longitud > 0) {
      desglose.resumenPorTipo.otros.cantidad++;
      desglose.resumenPorTipo.otros.longitudTotal += campo.longitud;
    }
  }
  return desglose;
}
