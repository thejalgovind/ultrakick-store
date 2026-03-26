require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS) from the root directory
app.use(express.static(path.join(__dirname, '.')));

// TiDB Cloud Database Connection
const db = mysql.createConnection({
    host: process.env.TIDB_HOST,
    port: process.env.TIDB_PORT,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: 'test', 
    ssl: { 
        minVersion: 'TLSv1.2', 
        rejectUnauthorized: true 
    }
});

db.connect((err) => {
    if (err) {
        console.error('❌ TiDB Connection Error:', err.message);
        return;
    }
    console.log("✅ Connected to TiDB Cloud Database");
});

// --- ROUTES ---

// 1. Serve the Main Unified Portfolio/Store File
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. API: Fetch All Products from TiDB
app.get('/api/products', (req, res) => {
    const sql = "SELECT * FROM products";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch Products Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 3. API: Handle Checkout and Save Order to TiDB
app.post('/api/checkout', (req, res) => {
    const { name, email, password, address, total } = req.body;
    
    // Ensure these column names match your TiDB 'orders' table exactly
    const sql = "INSERT INTO orders (name, email, password, address, total) VALUES (?, ?, ?, ?, ?)";
    
    db.query(sql, [name, email, password, address, total], (err, result) => {
        if (err) {
            console.error("Checkout/Insert Error:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Order Placed: ID ${result.insertId} by ${name}`);
        res.json({ 
            success: true, 
            message: "Order recorded in TiDB!", 
            orderId: result.insertId 
        });
    });
});

// Start the Server
app.listen(port, () => {
    console.log(`🚀 Portfolio Server is LIVE on port ${port}`);
    console.log(`🔗 Local URL: http://localhost:${port}`);
});