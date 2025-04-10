const jwt = require('jsonwebtoken');
const Restricted_users = require('../models/restricted_usersModel');
const BlacklistedToken = require('../models/blacklistedTokenModel');

/**
 * Middleware para autenticar a usuarios restringidos (niños) mediante PIN
 * Verifica el PIN del perfil y que pertenezca al administrador autenticado
 */
const authenticateRestrictedUser = async (req, res, next) => {
    // Verificar si existe el header con el PIN
    const pin = req.headers['x-restricted-pin'];
    if (!pin) {
        return res.status(401).json({ error: "PIN required for restricted access" });
    }
    
    try {
        // Primero verificar si existe una sesión de administrador
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Administrator session required" });
        }
        
        // Verificar token de administrador
        const token = authHeader.split(' ')[1];
        const isBlacklisted = await BlacklistedToken.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({ error: "Token has been revoked" });
        }
        
        // Verificar validez del token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        
        // Buscar el usuario restringido que coincida con el PIN y pertenezca al admin
        const restrictedUser = await Restricted_users.findOne({ 
            pin: pin,
            AdminId: req.user.id  // Asegurar que pertenece al admin actual
        });
        
        if (!restrictedUser) {
            return res.status(401).json({ error: "Invalid PIN or profile not associated with this administrator" });
        }
        
        // Guardar ID del usuario restringido en el request para usar en controladores
        req.restrictedUserId = restrictedUser._id.toString();
        req.restrictedUser = restrictedUser; // Guardar la información completa del perfil para referencia
        
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expired" });
        }
        console.error("Authentication error:", err);
        return res.status(401).json({ error: "Authentication error" });
    }
};

module.exports = authenticateRestrictedUser;