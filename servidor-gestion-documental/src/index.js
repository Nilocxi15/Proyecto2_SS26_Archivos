require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
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

// Inicialización del servidor
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Servidor] API escuchando en el puerto ${PORT}`);
  });
};

startServer();
