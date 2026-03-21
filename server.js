require('dotenv').config();
const express = require('express');
const { Pool } = require('pg'); // Switched to PostgreSQL for your project
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the root folder
app.use(express.static(path.join(__dirname, '.')));

// Database Connection to PostgreSQL (Render/TiDB)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Use the full connection string from Render
    ssl: { rejectUnauthorized: false }
});

// --- ROUTES ---

// 1. Home Route: Fixes the "Cannot GET /" error
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. API Route: Fetch Football Products
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. API Route: Handle Orders (Fixed Column Names)
app.post('/api/orders', async (req, res) => {
    const { name, item, quantity } = req.body;
    try {
        // Updated to use 'name' instead of 'customer_name' to fix your error
        const sql = "INSERT INTO orders (name, item, quantity) VALUES ($1, $2, $3) RETURNING id";
        const result = await pool.query(sql, [name, item, quantity]);
        res.json({ message: "Order placed!", orderId: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error: " + err.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 ULTRAKICK running on port ${port}`);
});