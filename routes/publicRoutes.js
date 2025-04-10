const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const Restricted_users = require("../models/restricted_usersModel");

/**
 * Obtener los perfiles para la pantalla de selección
 * GET /api/public/profiles
 */
router.get('/profiles', authenticate, async (req, res) => {
    try {
        // Usar el ID del usuario del token (req.user.id)
        const adminId = req.user.id;
        
        // Buscar perfiles asociados a este administrador
        const profiles = await Restricted_users.find({ AdminId: adminId });
        
        // Solo devolver información mínima necesaria por seguridad
        const sanitizedProfiles = profiles.map(profile => ({
            _id: profile._id,
            full_name: profile.full_name,
            avatar: profile.avatar
        }));
        
        res.status(200).json(sanitizedProfiles);
    } catch (error) {
        console.error('Error al obtener perfiles:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * Verificar PIN para acceso a un perfil restringido
 * POST /api/public/verify-pin
 */
router.post('/verify-pin', authenticate, async (req, res) => {
    const { profileId, pin } = req.body;
    
    if (!profileId || !pin) {
        return res.status(400).json({ error: 'Se requieren ID del perfil y PIN' });
    }
    
    try {
        // Verificar que el perfil pertenece al administrador autenticado
        const profile = await Restricted_users.findOne({
            _id: profileId,
            AdminId: req.user.id  // Asegura que el perfil pertenece al admin actual
        });
        
        if (!profile) {
            return res.status(404).json({ error: 'Perfil no encontrado' });
        }
        
        if (profile.pin !== pin) {
            return res.status(401).json({ error: 'PIN incorrecto' });
        }
        
        // Devolver información del perfil para confirmación (sin incluir el PIN por seguridad)
        res.status(200).json({
            _id: profile._id,
            full_name: profile.full_name,
            avatar: profile.avatar
        });
    } catch (error) {
        console.error('Error al verificar PIN:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;