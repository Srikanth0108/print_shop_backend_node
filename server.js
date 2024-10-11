const express = require("express");
const cors = require("cors");
require("dotenv").config();
const nodemailer = require("nodemailer");
const crypto = require("crypto"); // For generating the reset token
const db = require("./db"); // Import your database connection
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address from .env
    pass: process.env.EMAIL_PASS, // your Gmail password or App Password from .env
  },
});

// Forgot Password Endpoint
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email, userType } = req.body; // Expecting email and userType in the request body

  // Check if email and userType are provided
  if (!email || !userType) {
    return res.status(400).send("Email and user type are required.");
  }

  // Generate a reset token
  const resetToken = crypto.randomBytes(32).toString("hex"); // Generate a random token
  const resetLink = `http://localhost:3000/reset-password/${resetToken}`; // Use backticks for template literals
  const tokenExpiry = new Date(Date.now() + 3600000); // Set expiry for 1 hour

  try {
    // Save resetToken and expiry to your database
    if (userType === "student") {
      await db.query(
        "UPDATE students SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3",
        [resetToken, tokenExpiry, email]
      );
    } else if (userType === "shopkeeper") {
      await db.query(
        "UPDATE shopkeepers SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3",
        [resetToken, tokenExpiry, email]
      );
    } else {
      return res.status(400).send("Invalid user type.");
    }

    // Send reset email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `Click the link to reset your password: ${resetLink}`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send("Password reset email sent successfully.");
  } catch (error) {
    console.error("Error processing forgot password request:", error);
    res
      .status(500)
      .send("Error sending password reset email or updating database.");
  }
});

// New Endpoint to Get Shop Data
app.get("/api/shops", async (req, res) => {
  try {
    // Query to fetch shopkeeper data
    const result = await db.query(
      "SELECT username, shop_description, shop_details FROM shopkeepers"
    ); // Adjust based on your actual table structure
    res.json(result.rows); // Respond with the fetched data
  } catch (error) {
    console.error("Error fetching shop data:", error);
    res.status(500).send("Error fetching shop data from the database.");
  }
});

// Routes
app.use("/api/auth", authRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send("Authentication Server is Running");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
