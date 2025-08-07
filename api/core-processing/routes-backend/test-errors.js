/**
 * Rutas de prueba para verificar el middleware de manejo de errores
 * SOLO para desarrollo y testing
 */

const express = require('express');
const router = express.Router();

// Endpoint de prueba que funciona correctamente
router.get('/success', (req, res) => {
  res.json({
    status: 'success',
    message: 'El endpoint funciona correctamente',
    timestamp: new Date().toISOString()
  });
});

// Error síncrono simple
router.get('/sync-error', (req, res, next) => {
  throw new Error('Este es un error síncrono de prueba');
});

// Error asíncrono
router.get('/async-error', async (req, res, next) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  throw new Error('Este es un error asíncrono de prueba');
});

// Error de validación
router.post('/validation-error', (req, res, next) => {
  const error = new Error('Los datos proporcionados no son válidos');
  error.name = 'ValidationError';
  error.statusCode = 400;
  throw error;
});

// Simular error de archivo no encontrado
router.get('/file-not-found', (req, res, next) => {
  const error = new Error('ENOENT: no such file or directory');
  error.code = 'ENOENT';
  error.path = '/path/to/missing/file.json';
  throw error;
});

// Simular error de Excel
router.get('/excel-error', (req, res, next) => {
  throw new Error('Error procesando archivo Excel: formato inválido en celda A1');
});

// Simular timeout
router.get('/timeout', async (req, res, next) => {
  // Esperar más tiempo del timeout configurado
  await new Promise(resolve => setTimeout(resolve, 130000)); // 130 segundos
  res.json({ message: 'No debería llegar aquí' });
});

// Error con código de estado personalizado
router.get('/custom-status', (req, res, next) => {
  const error = new Error('Recurso no encontrado');
  error.statusCode = 404;
  throw error;
});

// Error de JSON mal formado
router.post('/bad-json', express.text(), (req, res, next) => {
  try {
    JSON.parse(req.body);
    res.json({ parsed: true });
  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
});

// División por cero
router.get('/divide-by-zero', (req, res, next) => {
  const result = 10 / 0; // Esto da Infinity, no un error
  if (!isFinite(result)) {
    throw new Error('División por cero detectada');
  }
  res.json({ result });
});

// Error en promesa rechazada
router.get('/promise-rejection', async (req, res, next) => {
  try {
    await Promise.reject(new Error('Promesa rechazada de prueba'));
  } catch (err) {
    next(err); // Pasar el error al middleware
  }
});

// Null reference
router.get('/null-reference', (req, res, next) => {
  const obj = null;
  res.json({ length: obj.length }); // Esto causará TypeError
});

module.exports = router;