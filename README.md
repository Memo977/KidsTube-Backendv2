# API de KidsTube - Documentación

## Descripción
Esta API REST proporciona funcionalidades para la gestión de usuarios, sesiones, perfiles restringidos, playlists y videos para una plataforma de streaming infantil, con énfasis en la seguridad y mejores prácticas modernas.

## Características principales
- Autenticación y autorización con JWT y sistema de revocación de tokens
- Autenticación con Google OAuth 2.0
- Verificación en dos factores con códigos SMS (Twilio)
- Registro de usuarios con confirmación por correo electrónico
- Hash seguro de contraseñas con bcrypt
- Creación de perfiles restringidos por PIN
- Sistema de playlists y videos asociados a perfiles
- Validación de permisos basada en roles
- Búsqueda y obtención de información de videos de YouTube
- Verificación de edad mínima (18 años) para registro
- Respuestas HTTP estandarizadas con códigos adecuados

## Tecnologías utilizadas
- Node.js
- Express.js
- MongoDB con Mongoose
- JSON Web Tokens (JWT)
- bcrypt para hash seguro de contraseñas
- Twilio para verificación por SMS
- MailerSend para envío de correos
- Google OAuth 2.0 para autenticación con cuentas de Google
- API de YouTube para búsqueda de videos
- CORS para acceso entre dominios

## Estructura de carpetas
```
/
├── config/
│   ├── database.js               # Configuración de conexión a la BD
│   └── passport.js               # Configuración de Passport para Google OAuth
│
├── controllers/
│   ├── googleAuthController.js   # Lógica para autenticación con Google
│   ├── playlistController.js     # Lógica para manejo de playlists
│   ├── sessionController.js      # Lógica para manejo de sesiones
│   ├── userController.js         # Lógica para manejo de usuarios
│   ├── videoController.js        # Lógica para manejo de videos
│   ├── restricted_usersController.js  # Lógica para perfiles restringidos
│   └── youtubeController.js      # Lógica para integración con YouTube
│
├── middleware/
│   ├── authMiddleware.js         # Middleware de autenticación con JWT
│   ├── restrictedUserMiddleware.js # Middleware de autenticación por PIN
│   └── errorMiddleware.js        # Middleware para manejo de errores
│
├── models/
│   ├── blacklistedTokenModel.js  # Modelo para tokens revocados
│   ├── playlistModel.js          # Modelo para playlists
│   ├── restricted_usersModel.js  # Modelo para perfiles restringidos
│   ├── sessionModel.js           # Modelo para sesiones 
│   ├── userModel.js              # Modelo para usuarios
│   └── videoModel.js             # Modelo para videos
│
├── routes/
│   ├── authRoutes.js             # Rutas de autenticación con JWT
│   ├── googleAuthRoutes.js       # Rutas de autenticación con Google
│   ├── playlistRoutes.js         # Rutas para playlists
│   ├── publicRoutes.js           # Rutas públicas
│   ├── restrictedUserRoutes.js   # Rutas para perfiles restringidos
│   ├── userRoutes.js             # Rutas para usuarios
│   ├── videoRoutes.js            # Rutas para videos
│   └── youtubeRoutes.js          # Rutas para integración con YouTube
│
├── services/
│   ├── googleAuthService.js      # Servicios para autenticación con Google
│   ├── mailersendService.js      # Servicios para envío de correos
│   ├── twilioService.js          # Servicios para verificación por SMS
│   └── youtubeService.js         # Servicios para integración con YouTube
│
├── .env.template                 # Plantilla para variables de entorno (agregar)
├── .gitignore                    # Archivos y carpetas ignorados por Git
├── index.js                      # Punto de entrada de la aplicación
└── package.json                  # Dependencias y scripts
```

## Instalación

1. Clonar el repositorio
   ```
   git clone <url-del-repositorio>
   cd kidstube-api
   ```

2. Instalar dependencias
   ```
   npm install
   ```

3. Configurar variables de entorno
   - Copiar el archivo `.env.template` a `.env`
   ```
   cp .env.template .env
   ```
   - Editar el archivo `.env` con tus propias credenciales y configuraciones

4. Iniciar el servidor
   - Para desarrollo:
   ```
   npm run dev
   ```
   - Para producción:
   ```
   npm start
   ```

## Flujo de autenticación

### Registro y Login Estándar
1. **Registro**: El usuario proporciona email, contraseña y datos personales.
2. **Verificación de Email**: Se envía un enlace de confirmación al correo.
3. **Login**: Se validan credenciales y se envía código SMS.
4. **Verificación SMS**: Validación del código para completar login.
5. **Token JWT**: Se genera un token de autenticación.

### Autenticación con Google
1. **Inicio de OAuth**: El usuario inicia el flujo de autenticación con Google.
2. **Callback de Google**: Se reciben datos del perfil de Google.
3. **Completar Perfil**: Si es primer acceso, se solicitan datos adicionales.
4. **Verificación SMS**: Se valida el número de teléfono por SMS.
5. **Token JWT**: Se genera un token de autenticación.

## Manejo de perfiles restringidos (niños)

1. El usuario padre crea perfiles con nombre, avatar y PIN.
2. Cada perfil puede acceder solamente a las playlists asignadas.
3. La autenticación de perfiles usa el PIN como método de acceso.
4. Los perfiles restringidos tienen funcionalidad limitada:
   - Solo visualización de videos asignados
   - Búsqueda dentro de playlists permitidas
   - Sin capacidad de edición o creación

## Autenticación y Seguridad

- **Hash de contraseñas**: Implementación de bcrypt para almacenamiento seguro
- **Verificación en dos factores**: SMS con Twilio
- **Revocación de tokens JWT**: Sistema para invalidar tokens tras el cierre de sesión
- **Limpieza automática**: Los tokens revocados se eliminan después de su expiración
- **PIN de acceso**: Sistema de control parental mediante PIN numérico
- **Verificación de edad**: Control para garantizar que los usuarios administradores son mayores de edad

## Servicios externos integrados

### Twilio
Para la verificación en dos pasos mediante SMS.

### MailerSend
Para el envío de correos electrónicos de confirmación.

### Google OAuth 2.0
Para la autenticación mediante cuentas de Google.

### YouTube API
Para la búsqueda e integración de videos.

## API Endpoints

La API está dividida en tres grupos principales:

### 1. Rutas públicas y de autenticación
- `POST /api/users` - Registro de usuario
- `GET /api/users/confirm` - Confirmación de email
- `POST /api/session` - Login (primer paso)
- `POST /api/session/verify` - Verificación de código SMS (segundo paso)
- `DELETE /api/session` - Logout
- `GET /api/auth/google` - Inicio de autenticación con Google
- `GET /api/auth/google/callback` - Callback para autenticación con Google
- `POST /api/auth/complete-profile` - Completar perfil después de autenticación con Google

### 2. Rutas para administradores (requieren JWT)
- `GET/POST/PATCH/DELETE /api/admin/restricted_users` - Gestión de perfiles restringidos
- `GET/POST/PATCH/DELETE /api/admin/playlists` - Gestión de playlists
- `GET/POST/PATCH/DELETE /api/admin/videos` - Gestión de videos
- `GET /api/youtube/search` - Búsqueda de videos en YouTube
- `GET /api/youtube/info` - Obtener información de videos de YouTube

### 3. Rutas para perfiles restringidos (requieren PIN)
- `GET /api/public/profiles` - Listar perfiles disponibles
- `POST /api/public/verify-pin` - Verificar PIN de acceso
- `GET /api/restricted/playlists` - Ver playlists asignadas
- `GET /api/restricted/videos` - Ver videos de una playlist
- `GET /api/restricted/videos?search=query` - Buscar videos permitidos

## Colección de Postman

Para facilitar las pruebas de la API, se incluyen archivos de configuración para Postman:

- `KidsTube API.postman_collection.json`: Colección de endpoints organizados por categorías
- `KidsTube API.postman_environment.json`: Variables de entorno necesarias para las pruebas

### Configuración de Postman

1. Descarga e instala [Postman](https://www.postman.com/downloads/)
2. Importa la colección: `Archivo > Importar > Selecciona KidsTube API.postman_collection.json`
3. Importa el entorno: `Archivo > Importar > Selecciona KidsTube API.postman_environment.json`
4. Selecciona el entorno "KidsTube API" en el desplegable de entornos (esquina superior derecha)

### Flujo de prueba recomendado

1. Registra un usuario padre (Autenticación > Registro de Usuario)
2. Inicia sesión para obtener un token JWT (Autenticación > Login)
3. Crea un perfil restringido (Perfiles Restringidos > Crear Perfil Restringido)
4. Crea una playlist y asígnala al perfil (Playlists > Crear Playlist)
5. Añade videos a la playlist (Videos > Agregar Video a Playlist)
6. Prueba el acceso con PIN (Acceso Perfiles Restringidos > Verificar PIN de Perfil)

## Buenas Prácticas de Seguridad

- **No guardar credenciales en el código**: Todas las claves de API, secretos y credenciales deben almacenarse en variables de entorno.
- **Sanitización de entradas**: Validación de todos los datos recibidos para prevenir inyecciones.
- **Rate limiting**: Implementar limitación de solicitudes para prevenir abusos.
- **HTTPS**: En producción, configurar la API para que solo sea accesible mediante HTTPS.
- **Logs de seguridad**: Mantener registros de intentos de autenticación y acciones sensibles.

## Contribución

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Haz un fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Haz push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request