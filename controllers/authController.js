// controllers/authController.js
const db = require("../db");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const emailService = require("../services/emailService");

require("dotenv").config();

// Helper function to generate JWT
const generateToken = (user, userType) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    userType,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Student Signup
exports.studentSignup = async (req, res) => {
  const { username, email, phone, password, confirmPassword } = req.body;

  try {
    // Validate required fields
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if password matches
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Check if username or email already exists
    const userExists = await db.query(
      "SELECT * FROM students WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Username or email already exists." });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert into database
    const newUser = await db.query(
      "INSERT INTO students (username, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING *",
      [username, email, phone, password_hash]
    );

    // Generate token
    const token = generateToken(newUser.rows[0], "student");

    res.status(201).json({
      message: "Student signed up successfully.",
      token,
      user: {
        id: newUser.rows[0].id,
        username: newUser.rows[0].username,
        email: newUser.rows[0].email,
      },
    });
  } catch (error) {
    console.error("Error in studentSignup:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Student Login
exports.studentLogin = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Validate fields
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Find user
    const userResult = await db.query(
      "SELECT * FROM students WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const user = userResult.rows[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Generate token
    const token = generateToken(user, "student");

    res.status(200).json({
      message: "Student logged in successfully.",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error in studentLogin:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Shopkeeper Signup
exports.shopkeeperSignup = async (req, res) => {
  const {
    username,
    email,
    phone,
    password,
    confirmPassword,
    shopDescription,
    shopDetails,
  } = req.body;

  try {
    // Validate required fields
    if (
      !username ||
      !email ||
      !password ||
      !confirmPassword ||
      !shopDescription ||
      !shopDetails
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if password matches
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Check if username or email already exists
    const userExists = await db.query(
      "SELECT * FROM shopkeepers WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Username or email already exists." });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert into database
    const newUser = await db.query(
      "INSERT INTO shopkeepers (username, email, phone, shop_description, shop_details, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [username, email, phone, shopDescription, shopDetails, password_hash]
    );

    // Generate token
    const token = generateToken(newUser.rows[0], "shopkeeper");

    res.status(201).json({
      message: "Shopkeeper signed up successfully.",
      token,
      user: {
        id: newUser.rows[0].id,
        username: newUser.rows[0].username,
        email: newUser.rows[0].email,
      },
    });
  } catch (error) {
    console.error("Error in shopkeeperSignup:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Shopkeeper Login
exports.shopkeeperLogin = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Validate fields
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Find user
    const userResult = await db.query(
      "SELECT * FROM shopkeepers WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const user = userResult.rows[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Generate token
    const token = generateToken(user, "shopkeeper");

    res.status(200).json({
      message: "Shopkeeper logged in successfully.",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error in shopkeeperLogin:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// controllers/authController.js

exports.forgotPassword = async (req, res) => {
  const { email, userType } = req.body;

  try {
    if (!email || !userType) {
      return res
        .status(400)
        .json({ message: "Email and user type are required." });
    }

    let user;

    if (userType === "student") {
      const userResult = await db.query(
        "SELECT * FROM students WHERE email = $1",
        [email]
      );
      if (userResult.rows.length === 0) {
        return res
          .status(400)
          .json({ message: "No student found with that email." });
      }
      user = userResult.rows[0];
    } else if (userType === "shopkeeper") {
      const userResult = await db.query(
        "SELECT * FROM shopkeepers WHERE email = $1",
        [email]
      );
      if (userResult.rows.length === 0) {
        return res
          .status(400)
          .json({ message: "No shopkeeper found with that email." });
      }
      user = userResult.rows[0];
    } else {
      return res.status(400).json({ message: "Invalid user type." });
    }

    // Create a reset token and set expiration
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour expiry

    // Store the resetToken and expiry in the database
    if (userType === "student") {
      await db.query(
        "UPDATE students SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3",
        [resetToken, tokenExpiry, email]
      );
    } else {
      await db.query(
        "UPDATE shopkeepers SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3",
        [resetToken, tokenExpiry, email]
      );
    }

    // Create the reset link
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    // Send email with reset link
    await emailService.sendResetPasswordEmail(email, resetLink);

    res
      .status(200)
      .json({ message: "Password reset link has been sent to your email." });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ message: "Server error." });
  }
};



// Reset Password
// controllers/authController.js

exports.resetPassword = async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  try {
    // Check for required fields
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if the new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    let userResult;
    let userType;

    // Check the students table for the reset token
    userResult = await db.query(
      "SELECT * FROM students WHERE reset_token = $1",
      [token]
    );
    userType = userResult.rows.length > 0 ? "student" : null;

    // If not found in students, check the shopkeepers table
    if (!userType) {
      userResult = await db.query(
        "SELECT * FROM shopkeepers WHERE reset_token = $1",
        [token]
      );
      userType = userResult.rows.length > 0 ? "shopkeeper" : null;
    }

    // If no user is found, return an error
    if (!userType) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const user = userResult.rows[0];

    // Check if the token has expired
    if (new Date(user.reset_token_expiry) < new Date()) {
      return res.status(400).json({ message: "Token has expired." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and clear reset token and expiry
    if (userType === "student") {
      await db.query(
        "UPDATE students SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2",
        [hashedPassword, user.id]
      );
    } else if (userType === "shopkeeper") {
      await db.query(
        "UPDATE shopkeepers SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2",
        [hashedPassword, user.id]
      );
    }

    // Respond with a success message
    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Server error." });
  }
};
