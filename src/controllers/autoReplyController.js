const router = require('../router');
const storage = require('../services/storage');
const { getAuthenticatedUserId } = require('./authController');

router.get('/api/autoreply', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    const replies = storage.getAutoReplies(userId);
    res.json({ replies });
});

router.post('/api/autoreply', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    const { keyword, reply } = req.body;
    if (!keyword || !reply) {
        return res.json({ error: 'Keyword and reply are required' }, 400);
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

router.delete('/api/autoreply', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    const { keyword } = req.body;
    if (!keyword) {
        return res.json({ error: 'Keyword is required' }, 400);
    }

    let replies = storage.getAutoReplies(userId);
    replies = replies.filter(r => r.keyword.toLowerCase() !== keyword.toLowerCase());

    storage.saveAutoReplies(userId, replies);
    res.json({ message: 'Auto-reply deleted successfully', replies });
});
