const url = require('url');

class Router {
    constructor() {
        this.routes = {
            GET: {},
            POST: {},
            PUT: {},
            DELETE: {}
        };
    }

    get(path, handler) {
        this.routes.GET[path] = handler;
    }

    post(path, handler) {
        this.routes.POST[path] = handler;
    }

    put(path, handler) {
        this.routes.PUT[path] = handler;
    }

    delete(path, handler) {
        this.routes.DELETE[path] = handler;
    }

    async handle(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;
        const method = req.method;

        // Parse JSON body if present
        if (req.method !== 'GET' && req.headers['content-type'] === 'application/json') {
            await new Promise((resolve, reject) => {
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                req.on('end', () => {
                    try {
                        req.body = body ? JSON.parse(body) : {};
                        resolve();
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                        reject(e);
                    }
                });
                req.on('error', reject);
            });
        }

        const handler = this.routes[method][path];
        
        // Setup response helpers
        res.json = (data, statusCode = 200) => {
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        };

        if (handler) {
            try {
                await handler(req, res);
            } catch (error) {
                console.error(`Error handling ${method} ${path}:`, error);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal Server Error' }));
                }
            }
        } else {
            return false; // Route not found, let the server handle static files or 404
        }
        return true;
    }
}

module.exports = new Router();
