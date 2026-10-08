require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;

/**
 * Punto de entrada y arranque del servidor HTTP
 */
const startServer = async () => {
  // Conexión con MongoDB
  await connectDB();

  // Inicio de escucha de peticiones
  const server = app.listen(PORT, () => {
    console.log(`[Servidor] API escuchando en el puerto ${PORT}`);
    console.log(`[Servidor] Entorno: ${process.env.NODE_ENV || 'development'}`);
  });

  // Manejo de rechazos de promesas no controladas
  process.on('unhandledRejection', (err) => {
    console.error('[Servidor] Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });
};

startServer();
