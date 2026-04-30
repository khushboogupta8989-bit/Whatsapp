const router = require('../router');
const whatsappManager = require('../services/whatsappManager');
const { getAuthenticatedUserId } = require('./authController');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const activeCampaigns = {}; // Campaign ID -> interval/timeout

// Basic spin-tax processor: "{Hi|Hello} there" -> "Hi there" or "Hello there"
function processSpintax(text) {
    if (!text) return '';
    return text.replace(/\{([^{}]*)\}/g, (match, contents) => {
        const choices = contents.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}

function saveCampaignState(campaignId, state) {
    const filePath = path.join(__dirname, '..', '..', 'campaigns', `${campaignId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

function getCampaignState(campaignId) {
    const filePath = path.join(__dirname, '..', '..', 'campaigns', `${campaignId}.json`);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
}

async function runCampaign(campaignId) {
    const state = getCampaignState(campaignId);
    if (!state || state.status !== 'running') return;

    if (state.currentIndex >= state.numbers.length) {
        state.status = 'completed';
        saveCampaignState(campaignId, state);
        return;
    }

    const currentNumber = state.numbers[state.currentIndex];
    const messageTemplate = state.message;
    const finalMessage = processSpintax(messageTemplate);

    try {
        await whatsappManager.sendMessage(state.userId, currentNumber, finalMessage);
        state.sent++;
    } catch (e) {
        state.failed++;
        state.errors.push({ number: currentNumber, error: e.message });
    }

    state.currentIndex++;
    saveCampaignState(campaignId, state);

    if (state.currentIndex < state.numbers.length && state.status === 'running') {
        const delayMs = Math.floor(Math.random() * (state.delayMax - state.delayMin + 1) + state.delayMin) * 1000;
        activeCampaigns[campaignId] = setTimeout(() => runCampaign(campaignId), delayMs);
    } else if (state.currentIndex >= state.numbers.length) {
        state.status = 'completed';
        saveCampaignState(campaignId, state);
    }
}

router.post('/api/campaign/start', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    const { name, numbers, message, delayMin, delayMax } = req.body;

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0 || !message) {
        return res.json({ error: 'Invalid campaign data' }, 400);
    }

    const campaignId = crypto.randomUUID();
    const state = {
        id: campaignId,
        userId,
        name: name || 'Unnamed Campaign',
        numbers,
        message,
        delayMin: delayMin || 5,
        delayMax: delayMax || 15,
        currentIndex: 0,
        sent: 0,
        failed: 0,
        status: 'running',
        errors: [],
        createdAt: new Date().toISOString()
    };

    saveCampaignState(campaignId, state);
    
    // Start running immediately
    runCampaign(campaignId);

    res.json({ message: 'Campaign started', campaignId });
});

router.post('/api/campaign/:id/pause', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    const campaignId = req.url.split('/')[3];
    const state = getCampaignState(campaignId);

    if (!state || state.userId !== userId) return res.json({ error: 'Not found' }, 404);

    state.status = 'paused';
    saveCampaignState(campaignId, state);
    
    if (activeCampaigns[campaignId]) {
        clearTimeout(activeCampaigns[campaignId]);
        delete activeCampaigns[campaignId];
    }

    res.json({ message: 'Campaign paused' });
});

router.post('/api/campaign/:id/resume', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    const campaignId = req.url.split('/')[3];
    const state = getCampaignState(campaignId);

    if (!state || state.userId !== userId) return res.json({ error: 'Not found' }, 404);

    if (state.status === 'paused') {
        state.status = 'running';
        saveCampaignState(campaignId, state);
        runCampaign(campaignId);
    }

    res.json({ message: 'Campaign resumed' });
});

router.get('/api/campaign/:id/status', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    const campaignId = req.url.split('/')[3];
    const state = getCampaignState(campaignId);

    if (!state || state.userId !== userId) return res.json({ error: 'Not found' }, 404);

    res.json(state);
});

router.get('/api/campaigns/stats', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    const campaignsDir = path.join(__dirname, '..', '..', 'campaigns');
    let totalSent = 0;
    let totalFailed = 0;

    try {
        if (fs.existsSync(campaignsDir)) {
            const files = fs.readdirSync(campaignsDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const data = fs.readFileSync(path.join(campaignsDir, file), 'utf8');
                    const campaign = JSON.parse(data);
                    if (campaign.userId === userId) {
                        totalSent += campaign.sent || 0;
                        totalFailed += campaign.failed || 0;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error calculating stats:', e);
    }

    res.json({ totalSent, totalFailed });
});

router.get('/api/campaigns', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    const campaignsDir = path.join(__dirname, '..', '..', 'campaigns');
    const results = [];

    try {
        if (fs.existsSync(campaignsDir)) {
            const files = fs.readdirSync(campaignsDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const data = fs.readFileSync(path.join(campaignsDir, file), 'utf8');
                    const campaign = JSON.parse(data);
                    if (campaign.userId === userId) {
                        results.push(campaign);
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error fetching campaigns:', e);
    }

    // Sort by date descending
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ campaigns: results });
});
