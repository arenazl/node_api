/**
 * Ruta temporal para FORZAR un crash y probar el middleware
 */
const express = require('express');
const router = express.Router();

// Este endpoint SIEMPRE falla
router.get('/force-crash', (req, res) => {
  // Forzar un error inmediato
  throw new Error('💥 CRASH FORZADO PARA PRUEBA - La API NO debería caerse!');
});

// Este simula un error al procesar Excel
router.post('/fake-excel-error', (req, res) => {
  const error = new Error('Error procesando Excel: El archivo está corrupto en la fila 45, columna B');
  error.code = 'EXCEL_PARSE_ERROR';
  throw error;
});

// Este simula que no puede conectar con Mora.Sim-api
router.get('/connection-error', (req, res) => {
  const error = new Error('ECONNREFUSED: No se pudo conectar con Mora.Sim-api en localhost:5000');
  error.code = 'ECONNREFUSED';
  error.hostname = 'localhost';
  error.port = 5000;
  throw error;
});

module.exports = router;