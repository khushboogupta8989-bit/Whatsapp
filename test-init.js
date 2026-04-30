const http = require('http');

const API_URL = 'http://localhost:3000/api';

async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_URL + endpoint);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

(async () => {
    try {
        const username = 'testuser' + Date.now();
        const password = 'password';

        console.log('Registering...');
        await apiCall('/auth/register', 'POST', { username, password });

        console.log('Logging in...');
        const loginRes = await apiCall('/auth/login', 'POST', { username, password });
        const token = loginRes.data.token;
        console.log('Token:', token);

        console.log('Init WhatsApp...');
        const initRes = await apiCall('/whatsapp/init', 'POST', null, token);
        console.log('Init:', initRes.data);

        console.log('Checking status...');
        for(let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await apiCall('/whatsapp/status', 'GET', null, token);
            console.log(`Status [${i}]:`, statusRes.data.status, 'QR length:', statusRes.data.qrCode ? statusRes.data.qrCode.length : 0);
        }

    } catch (e) {
        console.error(e);
    }
})();
