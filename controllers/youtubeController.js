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

module.exports = {
    searchVideos,
};