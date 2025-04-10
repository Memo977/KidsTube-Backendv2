require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Configuración de la base de datos
const connectDatabase = require('./config/database');

// Middlewares
const authenticate = require('./middleware/authMiddleware');
const authenticateRestrictedUser = require('./middleware/restrictedUserMiddleware');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

// Rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const restrictedUserRoutes = require('./routes/restrictedUserRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const videoRoutes = require('./routes/videoRoutes');
const publicRoutes = require('./routes/publicRoutes');

// Inicializar la aplicación
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware global
app.use(cors({
  domains: '*',
  methods: "*"
}));
app.use(bodyParser.json());

// Conectar a la base de datos
connectDatabase();

// Rutas públicas (no requieren autenticación)
app.use('/api/session', authRoutes);         
app.use('/api/users', userRoutes);           
app.use('/api/public', publicRoutes);        

// Middleware de autenticación para las rutas protegidas del admin
app.use('/api/admin', authenticate);

// Rutas protegidas por JWT (requieren inicio de sesión del padre)
app.use('/api/admin/restricted_users', restrictedUserRoutes);  
app.use('/api/admin/playlists', playlistRoutes);              
app.use('/api/admin/videos', videoRoutes);                    

// Rutas protegidas por PIN (accesibles para perfiles de niños)
app.use('/api/restricted/playlists', authenticateRestrictedUser, playlistRoutes);  
app.use('/api/restricted/videos', authenticateRestrictedUser, videoRoutes);       

// Mantener retrocompatibilidad con rutas anteriores
app.use('/api/restricted_users', authenticate, restrictedUserRoutes);
app.use('/api/playlists', authenticate, playlistRoutes);
app.use('/api/videos', authenticate, videoRoutes);

// Manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});