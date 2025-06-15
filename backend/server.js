const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Update with your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// In-memory blockchain
let blockchain = [];
let events = [];

function createBlock(data) {
    const previousBlock = blockchain[blockchain.length - 1];
    const index = blockchain.length;
    const timestamp = new Date().toISOString();
    const previousHash = previousBlock ? previousBlock.hash : "0";
    const hash = `${index}-${timestamp}-${JSON.stringify(data)}-${previousHash}`;

    const newBlock = { index, timestamp, data, previousHash, hash };
    blockchain.push(newBlock);
    return newBlock;
}

// Routes
app.post('/addProduct', (req, res) => {
    try {
        const { productId, description, owner, walletAddress } = req.body;
        
        if (!productId || !description || !owner) {
            return res.status(400).json({ message: "Missing fields" });
        }
        
        // Check for duplicate product ID
        if (blockchain.some(block => block.data.productId === productId)) {
            return res.status(400).json({ message: "Product ID already exists" });
        }

        const block = createBlock({ productId, description, owner, walletAddress });
        res.status(201).json({ message: "Block added", block });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post('/addEvent', (req, res) => {
    try {
        const { productId, eventType, key, value, walletAddress } = req.body;
        
        if (!productId || !eventType) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        
        // Check if product exists
        if (!blockchain.some(block => block.data.productId === productId)) {
            return res.status(404).json({ message: "Product not found" });
        }

        const newEvent = {
            productId,
            eventType,
            key,
            value,
            walletAddress,
            timestamp: new Date().toISOString()
        };
        
        events.push(newEvent);
        res.status(201).json({ message: "Event added", event: newEvent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get('/chain', (req, res) => {
    try {
        res.json(blockchain);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get('/events', (req, res) => {
    try {
        res.json(events);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Try http://localhost:${PORT}/health to test the server`);
});