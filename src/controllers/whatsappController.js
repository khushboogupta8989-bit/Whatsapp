const express = require('express');
const router = express.Router();
const whatsappManager = require('../services/whatsappManager');
const authController = require('./authController');
const QRCode = require('qrcode');

router.post('/whatsapp/init', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        await whatsappManager.initSession(userId);
        res.json({ message: 'Session initialization started' });
    } catch (e) {
        console.error('Session init error:', e);
        res.status(500).json({ error: 'Failed to start WhatsApp engine: ' + e.message });
    }
});

router.get('/whatsapp/status', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const status = whatsappManager.getStatus(userId);
    const qrText = whatsappManager.getQR(userId);

    let qrCodeBase64 = null;
    if (qrText && status === 'connecting') {
        try {
            qrCodeBase64 = await QRCode.toDataURL(qrText);
        } catch (e) {
            console.error('QR generation error:', e);
        }
    }

    res.json({ status, qrCode: qrCodeBase64 });
});

router.post('/whatsapp/logout', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        await whatsappManager.logout(userId);
        res.json({ message: 'Logged out successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/whatsapp/validate', async (req, res) => {
    const userId = authController.getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { numbers } = req.body; // array of strings
    if (!Array.isArray(numbers)) {
        return res.status(400).json({ error: 'Invalid input, expected array of numbers' });
    }

    try {
        const results = await whatsappManager.validateNumbers(userId, numbers);
        res.json({ results });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
