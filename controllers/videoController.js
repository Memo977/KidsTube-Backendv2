const express = require('express');
const Video = require('../models/videoModel');
const Playlist = require('../models/playlistModel');
const { google } = require('googleapis');

// Configurar el cliente de YouTube
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

/**
 * Crear un nuevo video
 * @param {*} req - Objeto de solicitud
 * @param {*} res - Objeto de respuesta
 */
const videoPost = async (req, res) => {
    try {
        // Verificar que req.user existe antes de continuar
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!req.body.playlistId) {
            return res.status(422).json({ error: 'Playlist ID is required' });
        }

        // Verificar que la playlist existe y pertenece al usuario
        const playlist = await Playlist.findById(req.body.playlistId);
        
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        
        if (playlist.adminId !== req.user.id) {
            return res.status(403).json({ error: "You don't have permission to add videos to this playlist" });
        }

        // Crear el nuevo video
        const video = new Video({
            name: req.body.name,
            youtubeUrl: req.body.youtubeUrl,
            description: req.body.description || '',
            playlistId: req.body.playlistId,
            adminId: req.user.id
        });

        // Validar datos requeridos
        if (!video.name || !video.youtubeUrl) {
            return res.status(422).json({ error: 'Name and YouTube URL are required' });
        }

        // Si se proporciona solo el ID de YouTube, construir la URL completa
        if (req.body.youtubeId && !req.body.youtubeUrl) {
            video.youtubeUrl = `https://www.youtube.com/watch?v=${req.body.youtubeId}`;
        }

        // Opcionalmente, obtener metadatos adicionales de YouTube si solo se envía la URL
        if (video.youtubeUrl && (!video.name || !video.description)) {
            try {
                // Extraer el ID del video de la URL
                let videoId = '';
                if (video.youtubeUrl.includes('youtube.com/watch')) {
                    const url = new URL(video.youtubeUrl);
                    videoId = url.searchParams.get('v');
                } else if (video.youtubeUrl.includes('youtu.be')) {
                    const parts = video.youtubeUrl.split('/');
                    videoId = parts[parts.length - 1];
                }

                if (videoId) {
                    // Obtener información del video de YouTube
                    const response = await youtube.videos.list({
                        part: 'snippet',
                        id: videoId
                    });

                    if (response.data.items.length > 0) {
                        const videoInfo = response.data.items[0].snippet;
                        
                        // Usar la información de YouTube si no se proporcionó
                        if (!video.name) video.name = videoInfo.title;
                        if (!video.description) video.description = videoInfo.description || '';
                    }
                }
            } catch (youtubeError) {
                console.error('Error obteniendo información de YouTube:', youtubeError);
                // Continuar el proceso aunque falle la obtención de datos de YouTube
            }
        }

        // Guardar en la base de datos
        const savedVideo = await video.save();
        
        res.status(201).header({
            'location': `/api/videos?id=${savedVideo.id}`
        }).json(savedVideo);
    } catch (error) {
        console.error('Error creating video:', error);
        
        // Si el error es de validación (URL de YouTube inválida)
        if (error.name === 'ValidationError') {
            return res.status(422).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Error creating video' });
    }
};

/**
 * Obtener todos los videos o uno específico
 * @param {*} req - Objeto de solicitud
 * @param {*} res - Objeto de respuesta
 */
const videoGet = async (req, res) => {
    try {
        // Si se proporciona un ID, obtener un video específico
        if (req.query && req.query.id) {
            const video = await Video.findById(req.query.id);
            
            if (!video) {
                return res.status(404).json({ error: "Video not found" });
            }
            
            // Verificar permisos: debe ser el propietario o estar en la lista de usuarios restringidos
            const playlist = await Playlist.findById(video.playlistId);
            
            if (!playlist) {
                return res.status(404).json({ error: "Associated playlist not found" });
            }
            
            // Verificar req.user antes de acceder a req.user.id
            const isAdmin = req.user && video.adminId === req.user.id;
            const isRestrictedUser = req.restrictedUserId && playlist.associatedProfiles.includes(req.restrictedUserId);
            
            if (!isAdmin && !isRestrictedUser) {
                return res.status(403).json({ error: "You don't have permission to view this video" });
            }
            
            return res.status(200).json(video);
        } 
        
        // Si se proporciona un playlistId, obtener videos de esa playlist
        else if (req.query && req.query.playlistId) {
            const playlist = await Playlist.findById(req.query.playlistId);
            
            if (!playlist) {
                return res.status(404).json({ error: "Playlist not found" });
            }
            
            // Verificar permisos
            // Solo el admin o un usuario restringido con acceso puede ver estos videos
            const isAdmin = req.user && playlist.adminId === req.user.id;
            const isRestrictedUser = req.restrictedUserId && playlist.associatedProfiles.includes(req.restrictedUserId);
            
            if (!isAdmin && !isRestrictedUser) {
                return res.status(403).json({ error: "You don't have permission to view these videos" });
            }
            
            const videos = await Video.find({ playlistId: req.query.playlistId });
            return res.status(200).json(videos);
        } 
        
        // Búsqueda de videos
        else if (req.query && req.query.search) {
            // Si es un usuario restringido, buscar solo en sus playlists asignadas
            if (req.restrictedUserId) {
                // Primero obtener las playlists asignadas a este perfil específico
                const playlists = await Playlist.find({ 
                    associatedProfiles: { $in: [req.restrictedUserId] } 
                });
                
                const playlistIds = playlists.map(p => p._id);
                
                // Solo buscar en las playlists a las que tiene acceso
                const videos = await Video.find({
                    playlistId: { $in: playlistIds },
                    $or: [
                        { name: { $regex: req.query.search, $options: 'i' } },
                        { description: { $regex: req.query.search, $options: 'i' } }
                    ]
                });
                
                return res.status(200).json(videos);
            } 
            // Si es un usuario administrador, buscar en todos sus videos
            else if (req.user) {
                const videos = await Video.find({
                    adminId: req.user.id,
                    $or: [
                        { name: { $regex: req.query.search, $options: 'i' } },
                        { description: { $regex: req.query.search, $options: 'i' } }
                    ]
                });
                
                return res.status(200).json(videos);
            } else {
                return res.status(401).json({ error: "Authentication required" });
            }
        } 
        
        // Si no se proporcionan parámetros, obtener videos según el tipo de usuario
        else {
            // Verificar req.user antes de acceder a req.user.id
            if (req.user) {
                // Si es administrador, mostrar todos sus videos
                const videos = await Video.find({ adminId: req.user.id });
                return res.status(200).json(videos);
            } else if (req.restrictedUserId) {
                // Para usuarios restringidos, obtener SOLO videos de playlists asignadas a su perfil
                const playlists = await Playlist.find({ 
                    associatedProfiles: { $in: [req.restrictedUserId] } 
                });
                
                const playlistIds = playlists.map(p => p._id);
                const videos = await Video.find({ playlistId: { $in: playlistIds } });
                
                return res.status(200).json(videos);
            } else {
                return res.status(401).json({ error: "Authentication required" });
            }
        }
    } catch (error) {
        console.error('Error getting videos:', error);
        res.status(500).json({ error: 'Error getting videos' });
    }
};

/**
 * Actualizar un video
 * @param {*} req - Objeto de solicitud
 * @param {*} res - Objeto de respuesta
 */
const videoPatch = async (req, res) => {
    try {
        // Verificar que req.user existe antes de continuar
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!req.query || !req.query.id) {
            return res.status(400).json({ error: "Video ID is required" });
        }

        const video = await Video.findById(req.query.id);
        
        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }
        
        // Verificar que el usuario sea el propietario del video
        if (video.adminId !== req.user.id) {
            return res.status(403).json({ error: "You don't have permission to edit this video" });
        }
        
        // Actualizar campos
        if (req.body.name) video.name = req.body.name;
        if (req.body.youtubeUrl) video.youtubeUrl = req.body.youtubeUrl;
        if (req.body.description !== undefined) video.description = req.body.description;
        
        // Si se proporciona un ID de YouTube, construir la URL completa
        if (req.body.youtubeId) {
            video.youtubeUrl = `https://www.youtube.com/watch?v=${req.body.youtubeId}`;
        }
        
        // Si se proporciona un nuevo playlistId, verificar que existe y pertenece al usuario
        if (req.body.playlistId) {
            const playlist = await Playlist.findById(req.body.playlistId);
            
            if (!playlist) {
                return res.status(404).json({ error: 'Playlist not found' });
            }
            
            if (playlist.adminId !== req.user.id) {
                return res.status(403).json({ error: "You don't have permission to move videos to this playlist" });
            }
            
            video.playlistId = req.body.playlistId;
        }
        
        // Guardar cambios
        const updatedVideo = await video.save();
        
        res.status(200).json({
            message: "Video updated successfully",
            data: updatedVideo
        });
    } catch (error) {
        console.error('Error updating video:', error);
        
        // Si el error es de validación (URL de YouTube inválida)
        if (error.name === 'ValidationError') {
            return res.status(422).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Error updating video' });
    }
};

/**
 * Eliminar un video
 * @param {*} req - Objeto de solicitud
 * @param {*} res - Objeto de respuesta
 */
const videoDelete = async (req, res) => {
    try {
        // Verificar que req.user existe antes de continuar
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!req.query || !req.query.id) {
            return res.status(400).json({ error: "Video ID is required" });
        }

        const video = await Video.findById(req.query.id);
        
        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }
        
        // Verificar que el usuario sea el propietario del video
        if (video.adminId !== req.user.id) {
            return res.status(403).json({ error: "You don't have permission to delete this video" });
        }
        
        // Eliminar el video
        await video.deleteOne();
        
        return res.status(204).end();
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: 'Error deleting video' });
    }
};

module.exports = {
    videoPost,
    videoGet,
    videoPatch,
    videoDelete
};