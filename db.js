// db.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Export a query method for use in other files
module.exports = {
  query: (text, params) => pool.query(text, params),
};
