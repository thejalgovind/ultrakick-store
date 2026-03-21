const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// TIDB CONNECTION POOL (Using 'test' database)
const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: process.env.TIDB_PORT,
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: 'test', 
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// INITIALIZE TABLES IN 'test' DB
async function initDB() {
  try {
    const conn = await pool.getConnection();
    console.log("Connected to TiDB - Database: test");

    // Create Products Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        img_url TEXT
      )`);
    
    // Create Orders Table (Includes email/pass for the "sign-in" simulation)
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
    console.log("✅ Tables verified in 'test' database");
  } catch (err) {
    console.error("❌ DB Initialization Error:", err.message);
  }
}
initDB();

// API: FETCH ALL PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM products");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// API: PLACE NEW ORDER
app.post('/api/orders', async (req, res) => {
  const { name, email, address, total } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO orders (customer_name, email, address, total_price) VALUES (?, ?, ?, ?)",
      [name, email, address, total]
    );
    console.log(`New Order #${result.insertId} from ${name}`);
    res.json({ success: true, orderId: result.insertId });
  } catch (err) {
    console.error("Order Error:", err.message);
    res.status(500).json({ error: "Failed to save order" });
  }
});

// API: VIEW ALL ORDERS (ADMIN)
app.get('/api/admin/orders', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM orders ORDER BY order_date DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Unauthorized or server error" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 ULTRAKICK Backend running on http://localhost:${PORT}`);
});