const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ROBUST CORS CONFIG (Fixes "Server Offline" browser blocks)
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// TIDB CONNECTION POOL
const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: process.env.TIDB_PORT,
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: 'test', 
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10
});

// INITIALIZE TABLES
async function initDB() {
  try {
    const conn = await pool.getConnection();
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        price DECIMAL(10,2),
        img_url TEXT
      )`);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_email VARCHAR(255),
        total_price DECIMAL(10,2),
        address TEXT,
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    
    conn.release();
    console.log("✅ TiDB 'test' DB: All Tables Synced");
  } catch (err) {
    console.error("❌ DB Error:", err.message);
  }
}
initDB();

// API: FETCH PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM products");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: CHECKOUT (Saves User + Order)
app.post('/api/checkout', async (req, res) => {
  const { name, email, password, address, total } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Save/Update User
    await conn.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=name",
      [name, email, password]
    );

    // 2. Save Order
    const [order] = await conn.query(
      "INSERT INTO orders (customer_email, total_price, address) VALUES (?, ?, ?)",
      [email, parseFloat(total), address]
    );

    await conn.commit();
    res.json({ success: true, orderId: order.insertId });
  } catch (err) {
    await conn.rollback();
    console.error("Checkout Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 ULTRAKICK Backend on http://localhost:${PORT}`));