const { MailerSend, EmailParams, Recipient, Sender } = require('mailersend');
require('dotenv').config();

const DOMAIN = process.env.MAILERSEND_DOMAIN;
const API_KEY = process.env.MAILERSEND_API_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Verificar que tenemos la clave API
if (!API_KEY) {
  console.error('ERROR: MAILERSEND_API_KEY no está definida en el archivo .env');
}

// Instancia del cliente MailerSend
const mailersend = new MailerSend({
  apiKey: API_KEY,
});

/**
 * Envía un correo de confirmación al usuario registrado
 * @param {Object} user - Objeto con los datos del usuario
 * @returns {Promise} - Promesa que resuelve con la respuesta del envío de correo
 */
const sendConfirmationEmail = async (user) => {
  try {
    // URL de confirmación (apunta al frontend usando Live Server)
    const confirmationUrl = `${FRONTEND_URL}/views/shared/verificacion.html?id=${user._id}&token=${user._id}`;
    
    // Crear remitente con el dominio verificado
    const sender = new Sender(
      `no-reply@${DOMAIN}`,
      'KidsTube Verification'
    );
    
    // Crear destinatario
    const recipients = [
      new Recipient(user.email, `${user.name} ${user.last_name}`),
    ];
    
    // Preparar el contenido del email
    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setSubject('Confirma tu correo electrónico - KidsTube')
      .setHtml(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #8e44ad;">KidsTube</h1>
          </div>
          <div style="margin-bottom: 30px;">
            <h2>Confirma tu correo electrónico</h2>
            <p>Gracias por registrarte en KidsTube. Para completar tu registro, por favor confirma tu correo electrónico haciendo clic en el siguiente enlace:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" style="background-color: #8e44ad; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirmar Email</a>
            </div>
            <p>Si no solicitaste este registro, puedes ignorar este correo.</p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #666;">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          </div>
        </div>
      `)
      .setText("Gracias por registrarte en KidsTube. Para completar tu registro, por favor visita el siguiente enlace: " + confirmationUrl);
    
    // Enviar el email
    const response = await mailersend.email.send(emailParams);
    return response;
  } catch (error) {
    // Verificar problemas comunes
    if (error.statusCode === 401) {
      console.error('Error de autenticación: Verifica tu API_KEY de MailerSend');
    } else if (error.statusCode === 403) {
      console.error('Error de permisos: Verifica que tu dominio esté verificado en MailerSend');
    }
    
    throw error;
  }
};

module.exports = {
  sendConfirmationEmail
};