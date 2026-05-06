const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const pino = require('pino');

const logger = pino({ level: 'info' });

// Ensure directories exist
const dirs = ['sessions', 'campaigns', 'history', 'public', 'public/css', 'public/js', 'uploads'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const app = express();

// Basic Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./src/controllers/authController');
const whatsappRoutes = require('./src/controllers/whatsappController');
const campaignRoutes = require('./src/controllers/campaignController');
const autoReplyRoutes = require('./src/controllers/autoReplyController');

app.use('/api', authRoutes);
app.use('/api', whatsappRoutes);
app.use('/api', campaignRoutes);
app.use('/api', autoReplyRoutes);

// Serve Static React Build
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    logger.error({ err }, 'Server error');
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
    // Auto-restore WhatsApp sessions on startup
    const whatsappManager = require('./src/services/whatsappManager');
    await whatsappManager.autoRestoreSessions();

    // Auto-resume running campaigns
    const CampaignEngine = require('./src/services/CampaignEngine');
    await CampaignEngine.autoResumeCampaigns();
});
