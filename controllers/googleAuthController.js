const { completeGoogleUserProfile, generateTemporaryToken, generateToken, needsProfileCompletion } = require('../services/googleAuthService');
const User = require('../models/userModel');

/**
 * Maneja el callback de autenticación con Google
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    
    // Verificar si el usuario necesita completar su perfil
    if (needsProfileCompletion(user)) {
      // Generar token temporal para completar el perfil
      const tempToken = await generateToken(user);
      
      // Redireccionar a la página para completar el perfil
      return res.redirect(`${process.env.FRONTEND_URL}/views/shared/completeGoogleProfile.html#token=${tempToken}`);
    }
    
    // Si el perfil está completo, iniciar proceso de verificación SMS
    const { tempToken, phone, verificationResult } = await generateTemporaryToken(user);
    
    if (!verificationResult.success) {
      return res.redirect(`${process.env.FRONTEND_URL}/views/shared/login.html#error=sms_sending_failed`);
    }
    
    // Redireccionar a la página de verificación SMS con el token temporal
    res.redirect(`${process.env.FRONTEND_URL}/views/shared/smsVerification.html#token=${tempToken}&phone=${phone}`);
  } catch (error) {
    console.error('Error en googleCallback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/views/shared/login.html#error=auth_failed`);
  }
};

/**
 * Completa el perfil de un usuario registrado con Google
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const completeProfile = async (req, res) => {
  try {
    // Verificar que el token es válido
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    
    // Obtener datos del perfil del cuerpo de la solicitud
    const profileData = {
      phone_number: req.body.phone_number,
      pin: req.body.pin,
      country: req.body.country,
      birthdate: req.body.birthdate
    };
    
    // Completar el perfil
    const updatedUser = await completeGoogleUserProfile(req.user.id, profileData);
    
    // Iniciar proceso de verificación SMS
    const { tempToken, phone, verificationResult } = await generateTemporaryToken(updatedUser);
    
    if (!verificationResult.success) {
      return res.status(500).json({ error: 'Error al enviar código de verificación' });
    }
    
    // Responder con el token temporal y teléfono para continuar con SMS
    res.status(200).json({ 
      tempToken,
      phone,
      message: 'Perfil completado. Se requiere verificación SMS.' 
    });
  } catch (error) {
    console.error('Error al completar perfil:', error);
    res.status(500).json({ error: 'Error al completar el perfil' });
  }
};

module.exports = {
  googleCallback,
  completeProfile
};