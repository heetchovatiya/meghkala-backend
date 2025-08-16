import nodemailer from 'nodemailer';

/**
 * Interface defining the options for the sendEmail utility.
 */
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Asynchronously sends an email using Nodemailer.
 * It configures a transporter using credentials from environment variables.
 * 
 * @param {EmailOptions} options - An object containing the recipient, subject, and HTML content.
 */
export const sendEmail = async (options: EmailOptions) => {
  // 1. Create a transporter object using SMTP transport.
  // This object is what actually sends the email.
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 2. Define the email options.
  const mailOptions = {
    from: process.env.EMAIL_FROM, // Sender address (must be a verified address with your email service)
    to: options.to,               // Recipient's email address
    subject: options.subject,     // Subject line
    html: options.html,           // HTML body of the email
  };

  // 3. Send the email and handle the result.
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully. Message ID: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    // In a production environment, you might want to use a more robust logging service
    // and re-throw the error to be handled by your global error handler.
    throw new Error('Email could not be sent.');
  }
};