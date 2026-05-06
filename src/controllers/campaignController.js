const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const authController = require('./authController');
const CampaignEngine = require('../services/CampaignEngine');

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

router.post('/campaign/start', upload.single('file'), async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { name, message, delayMin, delayMax, simulationMode } = req.body;
        let contacts = [];

        // Parse from file if provided
        if (req.file) {
            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            
            // Expected columns: Name, Phone
            contacts = data.map(row => ({
                name: row.Name || row.name || '',
                phone: String(row.Phone || row.phone || row.Number || row.number || '').trim()
            })).filter(c => c.phone);
            
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
        } else if (req.body.manualNumbers) {
            // Parse from manual input (comma or newline separated)
            const lines = req.body.manualNumbers.split(/[\n,]/);
            contacts = lines.map(line => {
                const num = line.trim();
                return { name: 'Customer', phone: num };
            }).filter(c => c.phone.length >= 10);
        }

        // Deduplicate numbers
        const uniqueContactsMap = new Map();
        for (const c of contacts) {
            if (!uniqueContactsMap.has(c.phone)) {
                uniqueContactsMap.set(c.phone, c);
            }
        }
        contacts = Array.from(uniqueContactsMap.values());

        if (contacts.length === 0 || !message) {
            return res.status(400).json({ error: 'Invalid campaign data: no contacts or message' });
        }

        const isSim = simulationMode === 'true' || simulationMode === true;
        const campaignId = crypto.randomUUID();
        const state = {
            id: campaignId,
            userId,
            name: name || 'Unnamed Campaign',
            contacts,
            message,
            delayMin: parseInt(delayMin) || 5,
            delayMax: parseInt(delayMax) || 15,
            simulationMode: isSim,
            currentIndex: 0,
            sent: 0,
            failed: 0,
            status: 'running',
            errors: [],
            createdAt: new Date().toISOString()
        };

        CampaignEngine.saveCampaignState(campaignId, state);
        CampaignEngine.startEngine(campaignId);

        res.json({ message: 'Campaign started', campaignId, totalContacts: contacts.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/campaign/:id/pause', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const campaignId = req.params.id;
    const state = CampaignEngine.getCampaignState(campaignId);

    if (!state || state.userId !== userId) return res.status(404).json({ error: 'Not found' });

    state.status = 'paused';
    CampaignEngine.saveCampaignState(campaignId, state);
    CampaignEngine.stopEngine(campaignId);

    res.json({ message: 'Campaign paused' });
});

router.post('/campaign/:id/resume', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const campaignId = req.params.id;
    const state = CampaignEngine.getCampaignState(campaignId);

    if (!state || state.userId !== userId) return res.status(404).json({ error: 'Not found' });

    if (state.status === 'paused') {
        state.status = 'running';
        CampaignEngine.saveCampaignState(campaignId, state);
        CampaignEngine.startEngine(campaignId);
    }

    res.json({ message: 'Campaign resumed' });
});

router.post('/campaign/:id/stop', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const campaignId = req.params.id;
    const state = CampaignEngine.getCampaignState(campaignId);

    if (!state || state.userId !== userId) return res.status(404).json({ error: 'Not found' });

    state.status = 'stopped';
    CampaignEngine.saveCampaignState(campaignId, state);
    CampaignEngine.stopEngine(campaignId);

    res.json({ message: 'Campaign stopped' });
});

router.get('/campaign/:id/status', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const campaignId = req.params.id;
    const state = CampaignEngine.getCampaignState(campaignId);

    if (!state || state.userId !== userId) return res.status(404).json({ error: 'Not found' });

    res.json(state);
});

router.get('/campaigns/stats', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const campaignsDir = path.join(__dirname, '..', '..', 'campaigns');
    let totalSent = 0;
    let totalFailed = 0;
    let totalMessages = 0;

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
                        totalMessages += (campaign.contacts ? campaign.contacts.length : 0);
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error calculating stats:', e);
    }

    res.json({ totalSent, totalFailed, totalMessages });
});

router.get('/campaigns', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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

module.exports = router;

