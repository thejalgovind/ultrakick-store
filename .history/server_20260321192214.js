const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// TIDB CONNECTION POOL
const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: process.env.TIDB_PORT,
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }, // Required for TiDB Cloud
  waitForConnections: true,
  connectionLimit: 10
});

// INITIALIZE DATABASE TABLES
async function initDB() {
  try {
    const conn = await pool.getConnection();
    // Table for Products
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        img_url TEXT
      )`);
    
    // Table for Orders
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255),
        email VARCHAR(255),
        address TEXT,
        total_price DECIMAL(10,2),
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    
    conn.release();
    console.log("✅ TiDB Tables Ready");
  } catch (err) {
    console.error("❌ DB Init Failed:", err);
  }
}
initDB();

// API: GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM products");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: PLACE ORDER
app.post('/api/orders', async (req, res) => {
  const { name, email, address, total } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO orders (customer_name, email, address, total_price) VALUES (?, ?, ?, ?)",
      [name, email, address, total]
    );
    res.json({ success: true, orderId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));