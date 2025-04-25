/**
 * Servidor principal para la API de MQ Importer
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');

// Importar rutas
const apiRoutes = require('./routes/api');
const excelRoutes = require('./routes/excel');
const serviceRoutes = require('./routes/services');

// Crear directorios necesarios si no existen
const uploadsDir = path.join(__dirname, 'uploads');
const structuresDir = path.join(__dirname, 'structures');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(structuresDir);

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
app.use('/api', apiRoutes);
app.use('/excel', excelRoutes);
app.use('/api/services', serviceRoutes);

// Ruta principal - Servir la interfaz web
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  console.log(`Documentación API: http://localhost:${PORT}/api`);
});
