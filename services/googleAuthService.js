const User = require('../models/userModel');
const { saveSession } = require('../controllers/sessionController');
const jwt = require('jsonwebtoken');
const { sendVerificationCode } = require('../services/twilioService');

/**
 * Completa el perfil de un usuario registrado con Google
 * @param {string} userId - ID del usuario
 * @param {Object} profileData - Datos del perfil a actualizar
 * @returns {Promise<Object>} - Usuario actualizado
 */
const completeGoogleUserProfile = async (userId, profileData) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Actualizar datos del perfil
    user.phone_number = profileData.phone_number;
    user.pin = profileData.pin;
    user.country = profileData.country;
    user.birthdate = profileData.birthdate;
    
    // Activar el usuario (ya no necesita verificación de email)
    user.state = true;
    
    // Guardar cambios
    await user.save();
    
    return user;
  } catch (error) {
    console.error('Error al completar perfil:', error);
    throw error;
  }
};

/**
 * Genera un token temporal para la primera etapa de autenticación
 * @param {Object} user - Usuario autenticado
 * @returns {Promise<Object>} - Objeto con token temporal, teléfono y resultado del envío del código
 */
const generateTemporaryToken = async (user) => {
  try {
    // Crear payload del token temporal
    const payload = {
      email: user.email,
      id: user._id,
      step: 'verification_required'
    };
    
    // Generar token temporal con corta duración
    const tempToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5m' });
    
    // Enviar código de verificación por SMS
    const verificationResult = await sendVerificationCode(user.phone_number);
    
    return {
      tempToken,
      phone: user.phone_number.toString().substr(-4), // Últimos 4 dígitos
      verificationResult
    };
  } catch (error) {
    console.error('Error al generar token temporal:', error);
    throw error;
  }
};

/**
 * Genera un token JWT para un usuario autenticado completamente
 * @param {Object} user - Usuario autenticado
 * @returns {string} - Token JWT
 */
const generateToken = async (user) => {
  try {
    // Crear payload del token
    const payload = {
      id: user._id,
      email: user.email,
      name: user.name,
      permission: ['create', 'edit', 'delete', 'get']
    };
    
    // Generar token
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    // Guardar sesión
    await saveSession(user.email);
    
    return token;
  } catch (error) {
    console.error('Error al generar token:', error);
    throw error;
  }
};

/**
 * Verifica si un usuario necesita completar su perfil
 * @param {Object} user - Usuario
 * @returns {boolean} - True si el perfil está incompleto
 */
const needsProfileCompletion = (user) => {
  return user.googleId && 
         (!user.phone_number || !user.pin || !user.country || !user.birthdate || !user.state);
};

module.exports = {
  completeGoogleUserProfile,
  generateTemporaryToken,
  generateToken,
  needsProfileCompletion
};