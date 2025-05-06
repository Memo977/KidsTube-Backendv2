const twilio = require('twilio');
require('dotenv').config();

// Crear cliente de Twilio con las credenciales
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Envía un código de verificación por SMS
 * @param {string|number} phoneNumber - Número de teléfono del usuario
 * @returns {Promise<Object>} - Resultado de la operación
 */
const sendVerificationCode = async (phoneNumber) => {
    try {
      // Asegurar que sea una cadena de texto
      let formattedNumber = String(phoneNumber);
      
      // Añadir el signo '+' si no existe
      if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+' + formattedNumber;
      }

      // Enviar el código de verificación
      const verification = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: formattedNumber,
          channel: 'sms'
        });
    
      return {
        success: true,
        status: verification.status
      };
    } catch (error) {
      console.error('Error sending verification code:', error);
      return {
        success: false,
        error: error.message
      };
    }
};

/**
 * Verifica el código recibido
 * @param {string|number} phoneNumber - Número de teléfono del usuario
 * @param {string} code - Código de verificación
 * @returns {Promise<Object>} - Resultado de la verificación
 */
const verifyCode = async (phoneNumber, code) => {
  try {
    // Asegurar formato internacional para el número de teléfono
    let formattedNumber = phoneNumber.toString();
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+' + formattedNumber;
    }

    // Verificar el código
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: formattedNumber,
        code: code
      });
    
    return {
      success: true,
      valid: verification.status === 'approved',
      status: verification.status
    };
  } catch (error) {
    console.error('Error verifying code:', error);
    return {
      success: false,
      valid: false,
      error: error.message
    };
  }
};

/**
 * Reenvía el código de verificación
 * @param {string|number} phoneNumber - Número de teléfono del usuario
 * @returns {Promise<Object>} - Resultado de la operación
 */
const resendVerificationCode = async (phoneNumber) => {
  return sendVerificationCode(phoneNumber);
};

module.exports = {
  sendVerificationCode,
  verifyCode,
  resendVerificationCode
};