require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const db = mysql.createConnection({
    host: process.env.TIDB_HOST,
    port: process.env.TIDB_PORT,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

db.connect((err) => {
    if (err) {
        console.error('❌ TiDB Connection Error:', err.message);
        return;
    }
    console.log("✅ Connected to TiDB");
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/products', (req, res) => {
    db.query("SELECT * FROM products", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/orders', (req, res) => {
    const { name, item, quantity } = req.body;
    // Updated columns to match your 'orders' table exactly
    const sql = "INSERT INTO orders (name, item, quantity) VALUES (?, ?, ?)";
    db.query(sql, [name, item, quantity], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Order placed!", orderId: result.insertId });
    });
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});