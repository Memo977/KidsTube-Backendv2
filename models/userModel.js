const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userModel = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    repeat_password: { type: String, required: true },
    phone_number: { type: String, required: function() { return !this.googleId; } }, // No requerido inicialmente para Google
    pin: { type: String, required: function() { return !this.googleId; } }, // No requerido inicialmente para Google
    name: { type: String, required: true },
    last_name: { type: String, required: true },
    country: { type: String, required: function() { return !this.googleId; } }, // No requerido inicialmente para Google
    birthdate: { type: Date, required: function() { return !this.googleId; } }, // No requerido inicialmente para Google
    state: { type: Boolean, default: false },
    googleId: { type: String } // Nuevo campo para identificación de Google
});

module.exports = mongoose.model('user', userModel);