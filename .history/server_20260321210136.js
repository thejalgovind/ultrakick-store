const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 1. THe Connection - Get these from your TiDB Dashboard "Connect" button
const pool = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com', // Check your screenshot/dashboard for this
    user: 'your_username.root', 
    password: 'your_password',
    database: 'test',
    port: 4000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

// 2. Fetch Products for the Grid
app.get('/api/products', (req, res) => {
    pool.query('SELECT * FROM products', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 3. The Checkout Route (Fixes the "Offline" error)
app.post('/api/checkout', (req, res) => {
    const { email, total, address } = req.body;
    const sql = 'INSERT INTO orders (customer_email, total_price, address) VALUES (?, ?, ?)';
    
    pool.query(sql, [email, total, address], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database Insert Failed" });
        }
        res.json({ message: "Order Saved", orderId: result.insertId });
    });
});

app.listen(5000, () => console.log('BRIDGE ACTIVE ON PORT 5000'));