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
        this.errors = {};    // userId -> last error message
    }

    _cleanNumber(number) {
        if (!number) return '';
        let cleaned = String(number).replace(/\D/g, '');
        
        // If 10 digits, assume India and add 91
        if (cleaned.length === 10) {
            cleaned = '91' + cleaned;
        } 
        // If 11 digits and starts with 0, assume it's a 0-prefixed 10-digit number
        else if (cleaned.length === 11 && cleaned.startsWith('0')) {
            cleaned = '91' + cleaned.substring(1);
        }
        
        return cleaned;
    }

    async initSession(userId) {
        console.log(`initSession called for ${userId}`);
        if (!makeWASocket) {
            console.log('makeWASocket is undefined!');
            this.status[userId] = 'disconnected';
            this.errors[userId] = 'WhatsApp engine (@whiskeysockets/baileys) is not installed on the server.';
            return;
        }

        const sessionDir = path.join(__dirname, '..', '..', 'sessions', userId);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        let version = [2, 3000, 1015901307]; // Default fallback
        try {
            const latest = await fetchLatestBaileysVersion();
            version = latest.version;
        } catch (e) {
            console.warn(`[WhatsApp] Failed to fetch latest version, using fallback: ${e.message}`);
        }

        this.status[userId] = 'connecting';
        delete this.errors[userId];

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger,
            browser: ['macOS', 'Chrome', '121.0.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 60000,
            syncFullHistory: false,
            markOnlineOnConnect: true,
            getMessage: async () => ({ text: 'hi' }) // Dummy getMessage to prevent some internal Baileys errors
        });

        this.instances[userId] = sock;

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log(`[WhatsApp] New QR code generated for ${userId}`);
                this.qrCodes[userId] = qr;
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log(`[WhatsApp] Connection closed for ${userId}. Reason: ${statusCode}, Reconnecting: ${shouldReconnect}`);
                
                this.status[userId] = 'disconnected';
                this.qrCodes[userId] = null;

                if (shouldReconnect) {
                    // Add a small delay before reconnecting to avoid spamming
                    console.log(`[WhatsApp] Reconnecting in 5s...`);
                    setTimeout(() => {
                        this.initSession(userId);
                    }, 5000);
                } else {
                    console.log(`[WhatsApp] Logged out ${userId}. Clearing session directory.`);
                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                    }
                    delete this.instances[userId];
                    delete this.qrCodes[userId];
                }
            } else if (connection === 'open') {
                console.log(`[WhatsApp] Connection opened for ${userId} as ${sock.user?.id}`);
                this.status[userId] = 'connected';
                this.qrCodes[userId] = null;
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
        const sock = this.instances[userId];
        const status = this.status[userId] || 'disconnected';
        
        return {
            status,
            user: sock?.user ? {
                id: sock.user.id,
                name: sock.user.name || sock.user.verifiedName || 'WhatsApp User'
            } : null
        };
    }

    getError(userId) {
        return this.errors[userId] || null;
    }

    async sendMessage(userId, to, text) {
        const sock = this.instances[userId];
        if (!sock || this.status[userId] !== 'connected') {
            throw new Error('WhatsApp not connected');
        }
        
        const cleanNumber = this._cleanNumber(to);
        const jid = cleanNumber.includes('@s.whatsapp.net') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;
        
        try {
            console.log(`[WhatsApp] Sending message to ${jid}...`);
            const result = await sock.sendMessage(jid, { text });
            console.log(`[WhatsApp] Message sent successfully to ${jid}`);
            return result;
        } catch (e) {
            console.error(`[WhatsApp] Send error for ${jid}:`, e);
            throw new Error(`Failed to send to ${cleanNumber}: ${e.message}`);
        }
    }

    async validateNumbers(userId, numbers) {
        const sock = this.instances[userId];
        if (!sock || this.status[userId] !== 'connected') {
            throw new Error('WhatsApp not connected');
        }

        const jids = numbers.map(num => {
            const cleanNumber = this._cleanNumber(num);
            return cleanNumber.includes('@s.whatsapp.net') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;
        });

        // Baileys onWhatsApp can take an array but it's more reliable in small batches
        // or individually if checking existence. However, passing the whole array is faster.
        const results = await sock.onWhatsApp(...jids);
        
        const resultMap = {};
        // Initialize all as false
        numbers.forEach(num => resultMap[num] = false);
        
        // Mark existing ones as true
        results.forEach(res => {
            // Find which input number matches this jid
            const matchedNum = numbers.find(n => {
                let clean = n.replace(/\D/g, '');
                if (clean.length === 10) clean = '91' + clean;
                return res.jid.startsWith(clean);
            });
            if (matchedNum) {
                resultMap[matchedNum] = res.exists;
            }
        });

        return resultMap;
    }

    async validateNumber(userId, number) {
        const results = await this.validateNumbers(userId, [number]);
        return results[number] || false;
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

    async autoRestoreSessions() {
        const sessionsDir = path.join(__dirname, '..', '..', 'sessions');
        if (!fs.existsSync(sessionsDir)) return;

        const files = fs.readdirSync(sessionsDir);
        for (const file of files) {
            const fullPath = path.join(sessionsDir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                // If it's a UUID folder, it's a session
                const userId = file;
                console.log(`[WhatsApp] Auto-restoring session for ${userId}...`);
                try {
                    await this.initSession(userId);
                } catch (e) {
                    console.error(`[WhatsApp] Failed to restore session for ${userId}:`, e.message);
                }
            }
        }
    }
}

module.exports = new WhatsAppManager();
