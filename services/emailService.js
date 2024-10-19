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
const sendStudentConfirmationEmail = (to, username) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Account Created Successfully",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #4CAF50;">Welcome to Printz!</h2>
        <p>Dear ${username},</p>
        <p>Thank you for signing up! Your account has been successfully created.</p>
        
        <p>We are excited to have you on board. You can now log in and start exploring the services we offer.</p>

        <p style="margin-top: 20px;">If you have any questions or need assistance, please feel free to contact our support team.</p>

        <p>Best Regards,<br>The Printz Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
const sendShopkeeperConfirmationEmail = (to, username) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Account Created Successfully - Shopkeeper",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #4CAF50;">Welcome to Printz!</h2>
        <p>Dear ${username},</p>
        <p>Your shopkeeper account has been successfully created!</p>
        <p>We are excited to have you on board. Now, you can easily manage your printing orders and serve your customers efficiently.</p>
        <p style="margin-top: 20px;">If you have any questions or need assistance, please do not hesitate to contact our support team.</p>

        <p>Best Regards,<br>The Printz Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
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
const sendOrderConfirmationEmail = (to, paymentId, total,username,shopname) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Order Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #4CAF50;">Order Confirmation</h2>
        <p>Dear ${username},</p>
        <p>Thank you for your order! We are pleased to inform you that your payment has been successfully processed.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Shop Name:</th>
            <td style=" padding: 10px; border: 1px solid #ddd;"><strong>${shopname}</strong></td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Payment ID:</th>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${paymentId}</strong></td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Total Amount:</th>
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
const sendOrderStatusUpdateEmail = (
  to,
  paymentId,
  shopName,
  status,
  total,
  orderLink,
  username
) => {
  const subject = `Your Order [${paymentId}] has been ${status}`;

  let statusMessage = "";
  if (status === "Completed") {
    statusMessage =
      `Your order has been successfully completed. Please collect your order from ${shopName}`;
  } else if (status === "Failed") {
    statusMessage = `Unfortunately, your order has failed. Please visit ${shopName} for futher details`;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #4CAF50;">Order Status Update</h2>
        <p>Dear ${username},</p>
        <p>${statusMessage}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Shop Name:</th>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${shopName}</strong></td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Payment ID:</th>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${paymentId}</strong></td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Status:</th>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${status}</strong></td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Total Amount:</th>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${total} Rs</strong></td>
          </tr>
        </table>

        <p style="margin-top: 20px;">You can view your order details <a href="${orderLink}" style="color: #4CAF50;">here</a>.</p>
        <p>If you have any questions or need further assistance, please feel free to contact our support team.</p>

        <p>Best Regards,<br>The Printz Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
module.exports = {
  sendResetPasswordEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendStudentConfirmationEmail,
  sendShopkeeperConfirmationEmail,
};
