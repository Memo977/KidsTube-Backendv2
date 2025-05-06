const mongoose = require('mongoose');

/**
 * Conecta la aplicación a la base de datos MongoDB
 * @returns {Promise} - Promesa de conexión
 */
const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Terminar el proceso con error en caso de fallo crítico
    process.exit(1);
  }
};

module.exports = connectDatabase;