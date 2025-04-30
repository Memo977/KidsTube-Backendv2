const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const saltRounds = 10;

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Buscar si el usuario ya existe
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Si el usuario existe, verificar si tiene googleId
          if (!user.googleId) {
            // Si no tiene googleId, actualizar el usuario
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        } else {
          // Si no existe, crear un nuevo usuario con datos parciales de Google
          // Generar una contraseña aleatoria segura
          const randomPassword = Math.random().toString(36).slice(-10);
          const hashedPassword = await bcrypt.hash(randomPassword, saltRounds);
          
          const newUser = new User({
            email: profile.emails[0].value,
            name: profile.name.givenName || profile.displayName.split(' ')[0],
            last_name: profile.name.familyName || profile.displayName.split(' ').slice(1).join(' '),
            googleId: profile.id,
            password: hashedPassword,
            repeat_password: hashedPassword,
            state: false // El usuario necesita completar su perfil
          });
          
          await newUser.save();
          return done(null, newUser);
        }
      } catch (err) {
        console.error('Error en autenticación Google:', err);
        return done(err, null);
      }
    }
  )
);

module.exports = passport;