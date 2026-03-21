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

// Serve static files (CSS, JS, Images) from the root folder
app.use(express.static(path.join(__dirname, '.')));

// Database Connection to TiDB
const db = mysql.createConnection({
    host: process.env.TIDB_HOST,
    port: process.env.TIDB_PORT,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,
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
    console.log("✅ TiDB 'test' DB: All Tables Synced");
});

// --- ROUTES ---

// 1. Home Route: Serves your index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. API Route: Fetch Football Products (Jerseys, Boots, Balls)
app.get('/api/products', (req, res) => {
    const sql = "SELECT * FROM products";
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 3. API Route: Handle Orders/Contact
app.post('/api/orders', (req, res) => {
    const { name, item, quantity } = req.body;
    const sql = "INSERT INTO orders (customer_name, product_name, quantity) VALUES (?, ?, ?)";
    db.query(sql, [name, item, quantity], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Order placed successfully!", orderId: result.insertId });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`🚀 ULTRAKICK Backend running on port ${port}`);
});