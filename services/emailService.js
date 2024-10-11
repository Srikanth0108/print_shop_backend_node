// src/emailService.js
const nodemailer = require("nodemailer");

// Create a transporter using Gmail service (or other service)
const transporter = nodemailer.createTransport({
  service: "Gmail", // You can use other services like SendGrid, etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

// Function to send reset password email
const sendResetPasswordEmail = (to, link) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Password Reset Link",
    html: `<p>You requested a password reset. Click the link below to reset your password:</p>
           <a href="${link}">Reset Password</a>`,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendResetPasswordEmail };
