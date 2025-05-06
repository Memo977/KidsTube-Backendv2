require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const User = require("../models/userModel");
const Restricted_users = require("../models/restricted_usersModel");
const { deleteSession } = require('./sessionController');
const { sendConfirmationEmail } = require('../services/mailerSendService');

/**
 * Verifica si el usuario tiene al menos 18 años
 * @param {Date} birthdate - Fecha de nacimiento
 * @returns {Boolean} - True si tiene al menos 18 años
 */
const isAtLeast18YearsOld = (birthdate) => {
  const today = new Date();
  const birthdateObj = new Date(birthdate);
  
  let age = today.getFullYear() - birthdateObj.getFullYear();
  const monthDifference = today.getMonth() - birthdateObj.getMonth();
  
  // Si el cumpleaños aún no ha ocurrido este año, resta un año
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthdateObj.getDate())) {
    age--;
  }
  
  return age >= 18;
};

/**
 * Crea un usuario nuevo
 * @param {*} req - Objeto de solicitud
 * @param {*} res - Objeto de respuesta
 */
const userPost = async (req, res) => {
  let user = new User();
  user.email = req.body.email;
  user.phone_number = req.body.phone_number;
  user.pin = req.body.pin;
  user.name = req.body.name;
  user.last_name = req.body.last_name;
  user.country = req.body.country;
  user.birthdate = req.body.birthdate;
  user.state = req.body.state !== undefined ? req.body.state : false;

  // Verifica que las contraseñas coincidan antes de hash
  if (req.body.password !== req.body.repeat_password) {
    return res.status(422).json({
      error: 'Passwords do not match'
    });
  }

  // Verifica si el usuario tiene al menos 18 años
  if (!isAtLeast18YearsOld(user.birthdate)) {
    return res.status(422).json({
      error: 'User must be at least 18 years old'
    });
  }

  if (user.email && req.body.password && user.phone_number && user.pin && user.name && user.last_name && user.birthdate) {
    try {
      // Primero verifica si el correo electrónico ya está registrado
      const existingUser = await User.findOne({ email: user.email });
      if (existingUser) {
        return res.status(422).json({
          error: 'Email already registered'
        });
      }
      
      // Hash de contraseña con bcrypt
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
      user.password = hashedPassword;
      user.repeat_password = hashedPassword;
      
      // Guarda el usuario
      const savedUser = await user.save();
      
      if (savedUser.state === false) {
        try {
          await sendConfirmationEmail(savedUser);
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
          // Continuamos con el proceso aunque falle el envío del email
        }
      }
      
      res.status(201).header({
        'location': `/api/users/?id=${savedUser.id}`
      }).json(savedUser);
    } catch (err) {
      console.error('Error while saving the user:', err);
      res.status(422).json({
        error: 'There was an error saving the user'
      });
    }
  } else {
    res.status(422).json({
      error: 'No valid data provided for user'
    });
  }
};

/** 
 * Obtiene uno o todos los usuarios
 * @param {*} req - Objeto de solicitud 
 * @param {*} res - Objeto de respuesta
 */
const userGet = (req, res) => {
  if (req.query && req.query.id) {
    // Filtra y obtiene un usuario
    User.findById(req.query.id)
      .then((user) => {
        res.json(user);
      })
      .catch(err => {
        console.error('Error while querying the user:', err);
        res.status(404).json({ error: "User doesn't exist" });
      });
  } else {
    // Obtiene todos los usuarios
    User.find()
      .then(user => {
        res.json(user);
      })
      .catch(err => {
        res.status(422).json({ error: err.message });
      });
  }
};

/**
 * Encuentra un usuario por su email
 * @param {string} email - Email del usuario
 * @returns {Promise} - Promesa con el usuario encontrado
 */
const userGetEmail = function (email) {
  return User.findOne({ email });
};

/**
 * Confirma el email del usuario
 * @param {*} req - Objeto de solicitud
 * @param {*} res - Objeto de respuesta 
 */
const confirmEmail = async (req, res) => {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: "ID parameter is required" });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    user.state = true;
    await user.save();
    
    // Devolver una respuesta JSON
    return res.status(200).json({ 
      success: true, 
      message: "Email verified successfully" 
    });

  } catch (err) {
    console.error('Error while confirming the email:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  userPost,
  userGet,
  userGetEmail,
  confirmEmail
};