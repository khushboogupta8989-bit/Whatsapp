const express = require('express');
const router = express.Router();
const storage = require('../services/storage');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Very basic token storage in memory for simplicity in this Node Core HTTP setup.
// In a real app, use JWT or store sessions in a file/db.
const activeSessions = {};

router.post('/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const existingUser = storage.getUser(username);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: crypto.randomUUID(),
            username,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        storage.createUser(newUser);
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = storage.getUser(username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        activeSessions[token] = user.id;

        res.json({ message: 'Login successful', token, userId: user.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware helper to check auth
function getAuthenticatedUserId(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    return activeSessions[token] || null;
}

// Attach getAuthenticatedUserId to router so we can require it easily
router.getAuthenticatedUserId = getAuthenticatedUserId;

module.exports = router;
