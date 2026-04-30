const router = require('../router');
const whatsappManager = require('../services/whatsappManager');
const { getAuthenticatedUserId } = require('./authController');
const QRCode = require('qrcode');

router.post('/api/whatsapp/init', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    await whatsappManager.initSession(userId);
    res.json({ message: 'Session initialization started' });
});

router.get('/api/whatsapp/status', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

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

router.post('/api/whatsapp/logout', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    try {
        await whatsappManager.logout(userId);
        res.json({ message: 'Logged out successfully' });
    } catch (e) {
        res.json({ error: e.message }, 500);
    }
});

router.post('/api/whatsapp/validate', async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.json({ error: 'Unauthorized' }, 401);

    const { numbers } = req.body; // array of strings
    if (!Array.isArray(numbers)) {
        return res.json({ error: 'Invalid input, expected array of numbers' }, 400);
    }

    try {
        const results = {};
        for (let num of numbers) {
            results[num] = await whatsappManager.validateNumber(userId, num);
        }
        res.json({ results });
    } catch (e) {
        res.json({ error: e.message }, 500);
    }
});
