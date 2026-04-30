const fs = require('fs');
const path = require('path');
const pino = require('pino');
const storage = require('./storage');

// Conditionally require baileys so server can start even if not installed yet
let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion;
try {
    const baileys = require('@whiskeysockets/baileys');
    makeWASocket = baileys.default;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
} catch (e) {
    console.warn("WARNING: @whiskeysockets/baileys not installed. WhatsApp features will be disabled.");
}

const logger = pino({ level: 'trace' });

class WhatsAppManager {
    constructor() {
        this.instances = {}; // userId -> socket
        this.qrCodes = {};   // userId -> qr string
        this.status = {};    // userId -> status ('connecting', 'connected', 'disconnected')
    }

    async initSession(userId) {
        console.log(`initSession called for ${userId}`);
        if (!makeWASocket) {
            console.log('makeWASocket is undefined!');
            this.status[userId] = 'disconnected';
            return;
        }

        const sessionDir = path.join(__dirname, '..', '..', 'sessions', userId);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        this.status[userId] = 'connecting';

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger
        });

        this.instances[userId] = sock;

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                this.qrCodes[userId] = qr;
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
                this.status[userId] = 'disconnected';
                if (shouldReconnect) {
                    this.initSession(userId);
                } else {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    delete this.instances[userId];
                }
            } else if (connection === 'open') {
                this.status[userId] = 'connected';
                delete this.qrCodes[userId];
            }
        });

        // Basic auto-reply logic stub
        sock.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify') {
                for (let msg of m.messages) {
                    if (!msg.key.fromMe && msg.message) {
                        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                        if (!messageText) continue;

                        const sender = msg.key.remoteJid;
                        const replies = storage.getAutoReplies(userId);
                        
                        for (const rule of replies) {
                            const keyword = rule.keyword.toLowerCase();
                            if (messageText.toLowerCase().includes(keyword)) {
                                console.log(`Auto-reply match: "${keyword}" for sender ${sender}`);
                                await sock.sendMessage(sender, { text: rule.reply });
                                break; // Only one reply per message
                            }
                        }
                    }
                }
            }
        });

        return sock;
    }

    getQR(userId) {
        return this.qrCodes[userId] || null;
    }

    getStatus(userId) {
        return this.status[userId] || 'disconnected';
    }

    async sendMessage(userId, to, text) {
        const sock = this.instances[userId];
        if (!sock || this.status[userId] !== 'connected') {
            throw new Error('WhatsApp not connected');
        }
        
        // Ensure jid format and country code (defaulting to 91 for India if 10 digits)
        let cleanNumber = to.replace(/\D/g, '');
        if (cleanNumber.length === 10) {
            cleanNumber = '91' + cleanNumber;
        }
        const jid = cleanNumber.includes('@s.whatsapp.net') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;
        console.log(`Attempting to send message to: ${jid}`);
        
        const [result] = await sock.onWhatsApp(jid);
        console.log(`onWhatsApp check for ${jid}:`, result);
        
        if (result && result.exists) {
            await sock.sendMessage(jid, { text });
            console.log(`Message successfully sent to ${jid}`);
            return true;
        }
        throw new Error(`Number ${cleanNumber} is not registered on WhatsApp`);
    }

    async validateNumber(userId, number) {
        const sock = this.instances[userId];
        if (!sock || this.status[userId] !== 'connected') {
            throw new Error('WhatsApp not connected');
        }
        
        let cleanNumber = number.replace(/\D/g, '');
        if (cleanNumber.length === 10) {
            cleanNumber = '91' + cleanNumber;
        }
        const jid = cleanNumber.includes('@s.whatsapp.net') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;
        const [result] = await sock.onWhatsApp(jid);
        return result?.exists || false;
    }

    async logout(userId) {
        const sock = this.instances[userId];
        if (sock) {
            try {
                await sock.logout();
            } catch (e) {
                console.warn("Logout error (likely already disconnected):", e.message);
            }
        }
        
        // Always try to clear the session directory
        const sessionDir = path.join(__dirname, '..', '..', 'sessions', userId);
        if (fs.existsSync(sessionDir)) {
            try {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log(`Cleared session directory for ${userId}`);
            } catch (e) {
                console.error(`Error clearing session directory: ${e.message}`);
            }
        }
        
        delete this.instances[userId];
        this.status[userId] = 'disconnected';
        delete this.qrCodes[userId];
    }
}

module.exports = new WhatsAppManager();
