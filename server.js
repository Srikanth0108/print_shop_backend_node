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

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

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
  const resetLink = `${FRONTEND_URL}/reset-password/${resetToken}`; // Use backticks for template literals
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

app.get("/api/shops/:shopName/prices", async (req, res) => {
  try {
    const { shopName } = req.params;

    const query = `
      SELECT 
        grayscale_a1 as a1_bw,
        grayscale_a2 as a2_bw,
        grayscale_a3 as a3_bw,
        grayscale_a4 as a4_bw,
        grayscale_a5 as a5_bw,
        grayscale_a6 as a6_bw,
        color_a1 as a1_color,
        color_a2 as a2_color,
        color_a3 as a3_color,
        color_a4 as a4_color,
        color_a5 as a5_color,
        color_a6 as a6_color,
        binding_cost
      FROM shopkeepers 
      WHERE username = $1 AND activity = true`;

    const result = await db.query(query, [shopName]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shop not found or is inactive",
      });
    }

    // Format the response to match frontend expectations
    const shopData = result.rows[0];
    const formattedPrices = {
      a1_bw: parseFloat(shopData.a1_bw) || 0,
      a2_bw: parseFloat(shopData.a2_bw) || 0,
      a3_bw: parseFloat(shopData.a3_bw) || 0,
      a4_bw: parseFloat(shopData.a4_bw) || 0,
      a5_bw: parseFloat(shopData.a5_bw) || 0,
      a6_bw: parseFloat(shopData.a6_bw) || 0,
      a1_color: parseFloat(shopData.a1_color) || 0,
      a2_color: parseFloat(shopData.a2_color) || 0,
      a3_color: parseFloat(shopData.a3_color) || 0,
      a4_color: parseFloat(shopData.a4_color) || 0,
      a5_color: parseFloat(shopData.a5_color) || 0,
      a6_color: parseFloat(shopData.a6_color) || 0,
      binding_cost: parseFloat(shopData.binding_cost) || 0,
    };

    res.json({
      success: true,
      data: formattedPrices,
    });
  } catch (error) {
    console.error("Error fetching shop prices:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching shop prices",
    });
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
    frontAndBack,
    total,
    payment_id,
  } = req.body;
   const status='Processing';
  const query = `
    INSERT INTO orders 
      (username, shopName, copies, pageType, pagesToPrint, specificPages, orientation, binding, documents, comments, grayscale, frontPagePrint,frontAndBack, total, payment_id,status) 
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,$15,$16)
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
    frontAndBack,
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
      await sendOrderConfirmationEmail(studentEmail, payment_id, total,username,shopName);
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
    const query = 'SELECT username, shop_description, shop_details,grayscale_a1, grayscale_a2, grayscale_a3, grayscale_a4, grayscale_a5, grayscale_a6,color_a1, color_a2, color_a3, color_a4, color_a5, color_a6,binding_cost FROM shopkeepers WHERE username = $1';
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
  const {
    username,
    shop_description, // Changed to match frontend
    shop_details, // Changed to match frontend
    grayscale_a1,
    grayscale_a2,
    grayscale_a3,
    grayscale_a4,
    grayscale_a5,
    grayscale_a6,
    color_a1,
    color_a2,
    color_a3,
    color_a4,
    color_a5,
    color_a6,
    binding_cost,
  } = req.body;

  if (
    !username ||
    !shop_description || // Changed
    !shop_details || // Changed
    grayscale_a1 === undefined ||
    grayscale_a2 === undefined ||
    grayscale_a3 === undefined ||
    grayscale_a4 === undefined ||
    grayscale_a5 === undefined ||
    grayscale_a6 === undefined ||
    color_a1 === undefined ||
    color_a2 === undefined ||
    color_a3 === undefined ||
    color_a4 === undefined ||
    color_a5 === undefined ||
    color_a6 === undefined ||
    binding_cost === undefined
  ) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  try {
    const query = `
      UPDATE shopkeepers 
      SET 
        shop_description = $1, 
        shop_details = $2,
        grayscale_a1 = $3,
        grayscale_a2 = $4,
        grayscale_a3 = $5,
        grayscale_a4 = $6,
        grayscale_a5 = $7,
        grayscale_a6 = $8,
        color_a1 = $9,
        color_a2 = $10,
        color_a3 = $11,
        color_a4 = $12,
        color_a5 = $13,
        color_a6 = $14,
        binding_cost = $15
      WHERE username = $16
    `;

    const values = [
      shop_description, // Changed
      shop_details, // Changed
      grayscale_a1,
      grayscale_a2,
      grayscale_a3,
      grayscale_a4,
      grayscale_a5,
      grayscale_a6,
      color_a1,
      color_a2,
      color_a3,
      color_a4,
      color_a5,
      color_a6,
      binding_cost,
      username,
    ];

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
      `SELECT o.username, o.copies, o.documents, o.total, o.created_at, o.payment_id, o.status, o.pagetype, 
              o.pagestoprint, o.specificpages, o.orientation, o.binding, o.frontpageprint, o.comments, 
              o.grayscale, o.frontandback
       FROM orders o
       LEFT JOIN teachers t ON o.username = t.username  -- Join to check if the order is from a teacher
       WHERE o.shopName = $1
       ORDER BY 
         CASE WHEN t.username IS NOT NULL THEN 0 ELSE 1 END,  -- Teachers first
         o.created_at ASC`,
      [username]
    );
    res.json(orders.rows);
  } catch (err) {
    console.error("Error fetching shopkeeper orders:", err.message);
    res.status(500).send("Server Error");
  }
});

app.get("/api/shopkeeper/insights/:username", async (req, res) => {
  const { username } = req.params;
  const { timeRange } = req.query; // Get timeRange from query params

  try {
    // Calculate the date range based on timeRange
    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "1h":
        startDate.setHours(now.getHours() - 1);
        break;
      case "4h":
        startDate.setHours(now.getHours() - 4);
        break;
      case "8h":
        startDate.setHours(now.getHours() - 8);
        break;
      case "12h":
        startDate.setHours(now.getHours() - 12);
        break;
      case "1d":
        startDate.setDate(now.getDate() - 1);
        break;
      case "1w":
        startDate.setDate(now.getDate() - 7);
        break;
      case "1m":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 1); // Default to 1 day
    }

    // Get overall stats
    const statsQuery = await db.query(
      `SELECT 
         COUNT(*) as total_orders,
         SUM(total) as total_earnings,
         COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders,
         COUNT(CASE WHEN status = 'Processing' THEN 1 END) as pending_orders,
         COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_orders
       FROM orders 
       WHERE shopName = $1 
       AND created_at >= $2;`,
      [username, startDate]
    );

    // Get time series data for the chart
    const chartQuery = await db.query(
      `WITH time_series AS (
        SELECT 
          date_trunc($1, created_at) as time_slot,
          COUNT(*) as orders,
          SUM(total) as earnings,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'Processing' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_orders
        FROM orders 
        WHERE shopName = $2 
        AND created_at >= $3
        GROUP BY time_slot
        ORDER BY time_slot ASC
      )
      SELECT 
        to_char(time_slot, 'YYYY-MM-DD HH24:MI') as time,
        orders,
        earnings,
        completed_orders,
        pending_orders,
        failed_orders
      FROM time_series`,
      [
        // Select appropriate time grouping based on timeRange
        timeRange === "1h"
          ? "minute"
          : timeRange === "4h" || timeRange === "8h" || timeRange === "12h"
          ? "hour"
          : timeRange === "1d"
          ? "hour"
          : timeRange === "1w"
          ? "day"
          : timeRange === "1m"
          ? "day"
          : "month",
        username,
        startDate,
      ]
    );

    // Format response
    const response = {
      stats: {
        totalOrders: parseInt(statsQuery.rows[0].total_orders),
        totalEarnings: parseFloat(statsQuery.rows[0].total_earnings) || 0,
        completedOrders: parseInt(statsQuery.rows[0].completed_orders),
        pendingOrders: parseInt(statsQuery.rows[0].pending_orders),
        failedOrders: parseInt(statsQuery.rows[0].failed_orders), // Added failed orders
      },
      chartData: chartQuery.rows.map((row) => ({
        time: row.time,
        orders: parseInt(row.orders) || 0,
        earnings: parseFloat(row.earnings) || 0,
        completedOrders: parseInt(row.completed_orders) || 0,
        pendingOrders: parseInt(row.pending_orders) || 0,
        failedOrders: parseInt(row.failed_orders) || 0,
      })),
    };

    res.json(response);
  } catch (err) {
    console.error("Error fetching shopkeeper insights:", err.message);
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
    const shopName = updatedOrder.shopname || "Your Shop";

    // Construct the order link (adjust URL as needed)
    const orderLink = `${FRONTEND_URL}/order-history`; // Replace with your frontend domain

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

app.get("/api/shopkeeper/:username/activity", async (req, res) => {
  const { username } = req.params;

  try {
    const result = await db.query(
      "SELECT activity FROM shopkeepers WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Shopkeeper not found." });
    }

    res.json({ active: result.rows[0].activity });
  } catch (error) {
    console.error("Error fetching shopkeeper activity status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// New Endpoint to Update Shopkeeper Activity Status
app.put("/api/shopkeeper/:username/activity", async (req, res) => {
  const { username } = req.params;
  const { activity } = req.body;

  // Validate active status
  if (typeof activity !== "boolean") {
    return res
      .status(400)
      .json({ message: "Active status must be a boolean." });
  }

  try {
    const result = await db.query(
      "UPDATE shopkeepers SET activity = $1 WHERE username = $2",
      [activity, username]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Shopkeeper not found." });
    }

    res.json({ message: "Activity status updated successfully." });
  } catch (error) {
    console.error("Error updating shopkeeper activity status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// New endpoint to check shop activity status
app.get("/api/shop/:username/activity", async (req, res) => {
  const { username } = req.params;

  try {
    const result = await db.query(
      "SELECT activity FROM shopkeepers WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Shop not found." });
    }

    res.json({ active: result.rows[0].activity }); // Ensure the column name is correct
  } catch (error) {
    console.error("Error fetching shop activity status:", error);
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
