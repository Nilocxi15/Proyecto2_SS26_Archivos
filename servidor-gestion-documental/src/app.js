const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const { noEncontrado, manejadorErrores } = require('./middlewares/errorMiddleware');

const app = express();

// Middlewares globales de seguridad y parseo
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Endpoint de verificación de salud (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'servidor-gestion-documental',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Ruta raíz informativa
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor del Sistema de Gestión Documental activo',
    version: '1.0.0'
  });
});

// Montar todas las rutas de la API bajo el prefijo /api
app.use('/api', apiRoutes);

// Manejo de rutas no encontradas (404)
app.use(noEncontrado);

// Manejo global y centralizado de errores
app.use(manejadorErrores);

module.exports = app;
