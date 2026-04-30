const http = require('http');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const router = require('./src/router');
const pino = require('pino');

const logger = pino({ level: 'info' });

// Ensure directories exist
const dirs = ['sessions', 'campaigns', 'history', 'public', 'public/css', 'public/js'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Import controllers
// We'll require controllers here so they register their routes with the router
require('./src/controllers/authController');
require('./src/controllers/whatsappController');
require('./src/controllers/campaignController');
require('./src/controllers/autoReplyController');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    // Basic CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    try {
        if (req.url.startsWith('/api/')) {
            const handled = await router.handle(req, res);
            if (!handled) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API route not found' }));
            }
        } else {
            // Serve static files
            let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
            
            // basic security check to avoid directory traversal
            if (!filePath.startsWith(path.join(__dirname, 'public'))) {
                res.writeHead(403);
                return res.end('Forbidden');
            }

            fs.stat(filePath, (err, stats) => {
                if (err || !stats.isFile()) {
                    res.writeHead(404);
                    return res.end('File not found');
                }

                const mimeType = mime.lookup(filePath) || 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': mimeType });
                const readStream = fs.createReadStream(filePath);
                readStream.pipe(res);
            });
        }
    } catch (error) {
        logger.error({ err: error }, 'Server error');
        if (!res.headersSent) {
            res.writeHead(500);
            res.end('Internal Server Error');
        }
    }
});

server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
