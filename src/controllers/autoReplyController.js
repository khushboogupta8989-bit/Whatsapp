const express = require('express');
const router = express.Router();
const storage = require('../services/storage');
const authController = require('./authController');

router.get('/autoreply', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const replies = storage.getAutoReplies(userId);
    res.json({ replies });
});

router.post('/autoreply', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { keyword, reply } = req.body;
    if (!keyword || !reply) {
        return res.status(400).json({ error: 'Keyword and reply are required' });
    }

    const replies = storage.getAutoReplies(userId);
    
    // Update existing or add new
    const existingIndex = replies.findIndex(r => r.keyword.toLowerCase() === keyword.toLowerCase());
    if (existingIndex > -1) {
        replies[existingIndex].reply = reply;
    } else {
        replies.push({ keyword, reply, createdAt: new Date().toISOString() });
    }

    storage.saveAutoReplies(userId, replies);
    res.json({ message: 'Auto-reply saved successfully', replies });
});

router.delete('/autoreply', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { keyword } = req.body;
    if (!keyword) {
        return res.status(400).json({ error: 'Keyword is required' });
    }

    let replies = storage.getAutoReplies(userId);
    replies = replies.filter(r => r.keyword.toLowerCase() !== keyword.toLowerCase());

    storage.saveAutoReplies(userId, replies);
    res.json({ message: 'Auto-reply deleted successfully', replies });
});

module.exports = router;
