const express = require("express");
const cors = require("cors");
require("dotenv").config();
const nodemailer = require("nodemailer");
const crypto = require("crypto"); // For generating the reset token
const db = require("./db"); // Import your database connection
const authRoutes = require("./routes/auth");
const {
  sendOrderConfirmationEmail,
  sendResetPasswordEmail,
  sendOrderStatusUpdateEmail,
} = require("./services/emailService");
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
    await sendResetPasswordEmail(email, resetLink);
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
app.post("/api/save-order", async (req, res) => {
  const {
    username,
    shopName,
    copies,
    pageType,
    pagesToPrint,
    specificPages,
    orientation,
    binding,
    documents,
    comments,
    grayscale,
    frontPagePrint,
    total,
    payment_id,
  } = req.body;
   const status='Processing';
  const query = `
    INSERT INTO orders 
      (username, shopName, copies, pageType, pagesToPrint, specificPages, orientation, binding, documents, comments, grayscale, frontPagePrint, total, payment_id,status) 
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,$15)
    RETURNING id`;

  const values = [
    username,
    shopName,
    copies,
    pageType,
    pagesToPrint,
    specificPages,
    orientation,
    binding,
    documents,
    comments,
    grayscale,
    frontPagePrint,
    total,
    payment_id,
    status,
  ];

  try {
    const result = await db.query(query, values);
    const orderId = result.rows[0].id; // Get the new order ID

    // Fetch the student's email
    const emailQuery = "SELECT email FROM students WHERE username = $1";
    const emailResult = await db.query(emailQuery, [username]);

    if (emailResult.rows.length > 0) {
      const studentEmail = emailResult.rows[0].email;

      // Send order confirmation email
      await sendOrderConfirmationEmail(studentEmail, payment_id, total,username);
    } else {
      console.error("Student not found with username:", username);
    }

    res.status(201).send({ success: true, orderId }); // Respond with the new order ID
  } catch (error) {
    console.error("Error saving order:", error);
    res.status(500).send("Error saving order to the database.");
  }
});
app.get("/api/orders/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const orders = await db.query(
      "SELECT shopName, copies, documents, total, created_at,payment_id,status FROM orders WHERE username = $1 ORDER BY created_at DESC",
      [username]
    );
    res.json(orders.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
// Update shopkeeper profile
// Assuming you have set up your Express app and database connection

app.get('/api/shopkeeper/profile', async (req, res) => {
  const { username } = req.query; // Get username from query parameter

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    const query = 'SELECT username, shop_description, shop_details FROM shopkeepers WHERE username = $1';
    const values = [username];
    const { rows } = await db.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Shopkeeper not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching shopkeeper profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.put("/api/shopkeeper/profile", async (req, res) => {
  const { username, shopDescription, shopDetails } = req.body; // Get data from request body

  if (!username || !shopDescription || !shopDetails) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  try {
    const query = `
      UPDATE shopkeepers 
      SET shop_description = $1, shop_details = $2 
      WHERE username = $3
    `;
    const values = [shopDescription, shopDetails, username];
    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Shopkeeper not found" });
    }

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating shopkeeper profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/shopkeeper/orders/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const orders = await db.query(
      "SELECT username, copies, documents, total, created_at, payment_id, status,pagetype,pagestoprint,specificpages,orientation,binding,frontpageprint,comments,grayscale FROM orders WHERE shopName = $1 ORDER BY created_at DESC",
      [username]
    );
    res.json(orders.rows);
  } catch (err) {
    console.error("Error fetching shopkeeper orders:", err.message);
    res.status(500).send("Server Error");
  }
});

// Update Order Status Endpoint
// Update Order Status Endpoint
app.put("/api/shopkeeper/orders/:payment_id/status", async (req, res) => {
  const { payment_id } = req.params;
  const { status } = req.body;

  // Validate the status
  const validStatuses = ["Completed", "Failed"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid or missing status." });
  }

  try {
    // Update the order status and retrieve the updated order
    const query = "UPDATE orders SET status = $1 WHERE payment_id = $2 RETURNING *";
    const values = [status, payment_id];
    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Order not found." });
    }

    const updatedOrder = result.rows[0];

    // Fetch the student's email based on the username in the order
    const studentQuery = "SELECT email, username FROM students WHERE username = $1";
    const studentValues = [updatedOrder.username];
    const studentResult = await db.query(studentQuery, studentValues);

    if (studentResult.rowCount === 0) {
      console.error(`Student with username ${updatedOrder.username} not found.`);
      return res.status(500).json({ message: "Student associated with order not found." });
    }

    const student = studentResult.rows[0];
    const studentEmail = student.email;
    const studentUsername = student.username;

    // Fetch the shop name from the order (assuming it's stored as shopName)
    const shopName = updatedOrder.shopName || "Your Shop";

    // Construct the order link (adjust URL as needed)
    const orderLink = `http://localhost:3000/orders/${payment_id}`; // Replace with your frontend domain

    // Send the email notification
    await sendOrderStatusUpdateEmail(
      studentEmail,
      payment_id,
      shopName,
      status,
      updatedOrder.total,
      orderLink,
      studentUsername
    );

    res.status(200).json({
      message: "Order status updated successfully and email sent.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal server error." });
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
