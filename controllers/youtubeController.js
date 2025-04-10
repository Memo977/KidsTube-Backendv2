const { google } = require('googleapis');
require('dotenv').config();

// Configurar el cliente de YouTube
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

/**
 * Buscar videos en YouTube
 * @param {*} req 
 * @param {*} res 
 */
const searchVideos = async (req, res) => {
    try {
        // Verificar que req.user existe antes de continuar
        if (!req.user) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }

        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Se requiere un término de búsqueda' });
        }

        // Realizar la búsqueda en YouTube
        const response = await youtube.search.list({
            part: 'snippet',
            q: query,
            maxResults: 10,
            type: 'video',
            safeSearch: 'strict' // Para contenido apropiado para niños
        });

        // Formatear los resultados para devolver solo la información necesaria
        const videos = response.data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`
        }));

        res.status(200).json(videos);
    } catch (error) {
        console.error('Error en la búsqueda de videos:', error);
        res.status(500).json({ error: 'Error al buscar videos en YouTube' });
    }
};

/**
 * Obtener información de un video de YouTube mediante su URL
 * @param {*} req 
 * @param {*} res 
 */
const getVideoInfo = async (req, res) => {
    try {
        // Verificar que req.user existe antes de continuar
        if (!req.user) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }

        const youtubeUrl = req.query.url;
        if (!youtubeUrl) {
            return res.status(400).json({ error: 'Se requiere una URL de YouTube' });
        }

        // Extraer el ID del video de la URL
        let videoId = '';
        if (youtubeUrl.includes('youtube.com/watch')) {
            // URL completa de YouTube: https://www.youtube.com/watch?v=VIDEO_ID
            const url = new URL(youtubeUrl);
            videoId = url.searchParams.get('v');
        } else if (youtubeUrl.includes('youtu.be')) {
            // URL corta de YouTube: https://youtu.be/VIDEO_ID
            const parts = youtubeUrl.split('/');
            videoId = parts[parts.length - 1];
        } else {
            return res.status(400).json({ error: 'URL de YouTube no válida' });
        }

        if (!videoId) {
            return res.status(400).json({ error: 'No se pudo extraer el ID del video' });
        }

        // Obtener información del video
        const response = await youtube.videos.list({
            part: 'snippet,contentDetails',
            id: videoId
        });

        if (response.data.items.length === 0) {
            return res.status(404).json({ error: 'Video no encontrado' });
        }

        const videoInfo = response.data.items[0];
        
        // Formatear la respuesta
        const video = {
            id: videoInfo.id,
            title: videoInfo.snippet.title,
            description: videoInfo.snippet.description,
            thumbnail: videoInfo.snippet.thumbnails.medium.url,
            channelTitle: videoInfo.snippet.channelTitle,
            publishedAt: videoInfo.snippet.publishedAt,
            duration: videoInfo.contentDetails.duration,
            youtubeUrl: `https://www.youtube.com/watch?v=${videoInfo.id}`
        };

        res.status(200).json(video);
    } catch (error) {
        console.error('Error al obtener información del video:', error);
        res.status(500).json({ error: 'Error al obtener información del video de YouTube' });
    }
};

module.exports = {
    searchVideos,
    getVideoInfo
};