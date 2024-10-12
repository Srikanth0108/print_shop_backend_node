// services/emailService.js
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
    html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #4CAF50;">Password Reset Request</h2>
        <p>Dear Valued User,</p>
        <p>We received a request to reset your password. Please click the link below to create a new password:</p>

        <p style="margin-top: 20px;">
          <a href="${link}" style="text-decoration: none; color: white; background-color: #4CAF50; padding: 10px 15px; border-radius: 5px; display: inline-block;">Reset Password</a>
        </p>

        <p>If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
        <p style="margin-top: 20px;">If you have any questions or need further assistance, feel free to reach out to our support team.</p>

        <p>Best Regards,<br>The Printz Team</p>
      </div>`,
  };

  return transporter.sendMail(mailOptions);
};
const sendOrderConfirmationEmail = (to, paymentId, total) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Order Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #4CAF50;">Order Confirmation</h2>
        <p>Dear Valued Customer,</p>
        <p>Thank you for your order! We are pleased to inform you that your payment has been successfully processed.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Details</th>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Information</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Payment ID:</td>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${paymentId}</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Total Amount:</td>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${total} Rs</strong></td>
          </tr>
        </table>

        <p style="margin-top: 20px;">Your order will be processed shortly, and you will receive further updates via email.</p>
        <p>If you have any questions or need assistance, please do not hesitate to contact our support team.</p>

        <p>Best Regards,<br>The Printz Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
module.exports = { sendResetPasswordEmail, sendOrderConfirmationEmail };
