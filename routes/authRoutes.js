const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const BlacklistedToken = require('../models/blacklistedTokenModel');
const { userGetEmail } = require('../controllers/userController');
const { saveSession, deleteSession } = require('../controllers/sessionController');
const { sendVerificationCode, verifyCode, resendVerificationCode } = require('../services/twilioService');

/**
 * Login con JWT y bcrypt - Paso 1: verificación de credenciales
 * POST /api/session
 */
router.post("/", async (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(422).json({
      error: 'Username and password are required'
    });
  }

  try {
    const savedUser = await userGetEmail(req.body.username);
    if (!savedUser) {
      return res.status(422).json({
        error: 'Invalid username or password'
      });
    }

    // Verificar si la cuenta está confirmada
    if (savedUser.state === false) {
      return res.status(403).json({
        error: 'Your account has not been confirmed. Please check your email to confirm your registration.'
      });
    }

    // Comparar la contraseña con bcrypt
    const passwordMatch = await bcrypt.compare(req.body.password, savedUser.password);
    
    if (passwordMatch) {
      // Enviar código de verificación por SMS
      const verificationResult = await sendVerificationCode(savedUser.phone_number);
      
      if (!verificationResult.success) {
        return res.status(500).json({
          error: 'Error sending verification code: ' + verificationResult.error
        });
      }
      
      // Crear un token temporal para la segunda etapa de autenticación
      const tempToken = jwt.sign({
        email: savedUser.email,
        id: savedUser._id,
        step: 'verification_required'
      }, process.env.JWT_SECRET, { expiresIn: '5m' }); // Token de corta duración
      
      return res.status(200).json({ 
        message: 'Verification code sent to your phone',
        tempToken: tempToken,
        phone: savedUser.phone_number.toString().substr(-4) // Últimos 4 dígitos
      });
    } else {
      return res.status(422).json({
        error: 'Invalid username or password'
      });
    }
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({
      error: "Internal server error: " + err.message
    });
  }
});

/**
 * Segundo paso del login: verificación del código SMS
 * POST /api/session/verify
 */
router.post("/verify", async (req, res) => {
  const { tempToken, code } = req.body;
  
  if (!tempToken || !code) {
    return res.status(422).json({
      error: 'Token and verification code are required'
    });
  }
  
  try {
    // Verificar el token temporal
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    
    if (decoded.step !== 'verification_required') {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }
    
    // Obtener el usuario
    const user = await userGetEmail(decoded.email);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Verificar el código
    const verificationResult = await verifyCode(user.phone_number, code);
    
    if (!verificationResult.success || !verificationResult.valid) {
      return res.status(401).json({
        error: 'Invalid verification code'
      });
    }
    
    // Generar JWT completo con información del usuario
    const token = jwt.sign({
      email: user.email,
      name: user.name,
      permission: ['create', 'edit', 'delete', 'get'],
      id: user._id
    }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Guardar información de sesión
    await saveSession(user.email);
    
    // Incluir el PIN en la respuesta
    return res.status(201).json({ 
      token,
      pin: user.pin
    });
  } catch (err) {
    console.error('Error during verification:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: "Verification time expired. Please login again."
      });
    }
    
    return res.status(500).json({
      error: "Error during verification: " + err.message
    });
  }
});

/**
 * Reenviar código de verificación SMS
 * POST /api/session/resend-code
 */
router.post("/resend-code", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(422).json({
      error: 'Token is required'
    });
  }

  try {
    // Verificar y decodificar el token temporal
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.step !== 'verification_required') {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }
    
    // Obtener el usuario
    const user = await userGetEmail(decoded.email);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Reenviar el código de verificación
    const verificationResult = await resendVerificationCode(user.phone_number);
    
    if (!verificationResult.success) {
      return res.status(500).json({
        error: 'Error sending verification code: ' + verificationResult.error
      });
    }
    
    return res.status(200).json({ 
      message: 'Verification code resent',
      phone: user.phone_number.toString().substr(-4) // Últimos 4 dígitos
    });
    
  } catch (err) {
    console.error('Error during code resend:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: "Verification time expired. Please login again."
      });
    }
    
    return res.status(500).json({
      error: "Error resending verification code: " + err.message
    });
  }
});

/**
 * Logout - revoca el token JWT
 * DELETE /api/session
 */
router.delete("/", async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Añadir token a la lista negra hasta que expire
    const expirationDate = new Date(decoded.exp * 1000); // Convertir a milisegundos
    
    const blacklistToken = new BlacklistedToken({
      token: token,
      expireAt: expirationDate
    });
    
    await blacklistToken.save();
    
    // Eliminar también de la tabla de sesiones
    await deleteSession(decoded.email);
    
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Error during logout:", err);
    return res.status(500).json({ error: "Error during logout" });
  }
});

module.exports = router;