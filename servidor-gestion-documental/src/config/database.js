const mongoose = require('mongoose');

/**
 * Establece la conexión con la instancia de MongoDB
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/gestion_documental';
    await mongoose.connect(mongoURI);
    console.log(`[MongoDB] Conexión establecida con éxito en: ${mongoURI.split('@').pop()}`);
  } catch (error) {
    console.error('[MongoDB] Error al conectar con la base de datos:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
