const express = require('express');
const router = express.Router();
const passport = require('passport');
const authenticate = require('../middleware/authMiddleware');
const { googleCallback, completeProfile } = require('../controllers/googleAuthController');

// Ruta para iniciar la autenticación con Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Ruta de callback para recibir la respuesta de Google
router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: `${process.env.FRONTEND_URL}/views/shared/login.html?error=google_auth_failed` 
  }), 
  googleCallback
);

// Ruta para completar el perfil después del registro con Google
router.post('/complete-profile', authenticate, completeProfile);

module.exports = router;