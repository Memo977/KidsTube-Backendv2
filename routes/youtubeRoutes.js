const express = require('express');
const router = express.Router();
const { 
    searchVideos, 
    getVideoInfo 
} = require('../controllers/youtubeController');

/**
 * Buscar videos en YouTube
 * GET /api/youtube/search?q={términoBúsqueda}
 */
router.get('/search', searchVideos);

/**
 * Obtener información de un video mediante su URL
 * GET /api/youtube/info?url={youtubeUrl}
 */
router.get('/info', getVideoInfo);

module.exports = router;