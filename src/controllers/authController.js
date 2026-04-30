const router = require('../router');
const storage = require('../services/storage');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Very basic token storage in memory for simplicity in this Node Core HTTP setup.
// In a real app, use JWT or store sessions in a file/db.
const activeSessions = {};

router.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.json({ error: 'Username and password required' }, 400);
        }

        const existingUser = storage.getUser(username);
        if (existingUser) {
            return res.json({ error: 'User already exists' }, 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: crypto.randomUUID(),
            username,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        storage.createUser(newUser);
        res.json({ message: 'User created successfully' }, 201);
    } catch (error) {
        res.json({ error: error.message }, 500);
    }
});

router.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = storage.getUser(username);

        if (!user) {
            return res.json({ error: 'Invalid credentials' }, 401);
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.json({ error: 'Invalid credentials' }, 401);
        }

        const token = crypto.randomBytes(32).toString('hex');
        activeSessions[token] = user.id;

        res.json({ message: 'Login successful', token, userId: user.id });
    } catch (error) {
        res.json({ error: error.message }, 500);
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

module.exports = { getAuthenticatedUserId };
