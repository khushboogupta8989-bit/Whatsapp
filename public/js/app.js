const API_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('wa_token');
let statusInterval = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showView('app-view');
        checkWaStatus();
        startStatusPolling();
        loadAutoReplies();
        updateDashboardStats();
    } else {
        showView('auth-view');
    }
});

// UI Helpers
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

function switchAppView(viewName) {
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
    
    if (viewName === 'analytics') {
        loadCampaignHistory();
    }
}

function showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// API Helper
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API Error');
        return data;
    } catch (e) {
        showToast(e.message, true);
        if (e.message === 'Unauthorized') logout();
        throw e;
    }
}

// Auth
async function handleAuth(e, type) {
    e.preventDefault();
    const username = document.getElementById(`${type}-username`).value;
    const password = document.getElementById(`${type}-password`).value;

    try {
        const data = await apiCall(`/auth/${type}`, 'POST', { username, password });
        if (type === 'login') {
            authToken = data.token;
            localStorage.setItem('wa_token', authToken);
            showView('app-view');
            showToast('Login successful');
            checkWaStatus();
            startStatusPolling();
            loadAutoReplies();
            updateDashboardStats();
        } else {
            showToast('Registration successful! Please login.');
            switchAuthTab('login');
        }
    } catch (e) {
        // Error handled in apiCall
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('wa_token');
    stopStatusPolling();
    showView('auth-view');
}

// WhatsApp Integration
async function initWhatsApp() {
    try {
        document.getElementById('qr-container').innerHTML = '<div class="loader"></div><p>Generating QR...</p>';
        await apiCall('/whatsapp/init', 'POST');
        showToast('Initializing session...');
        checkWaStatus();
    } catch (e) {
        showToast('Failed to initialize session', true);
    }
}

async function resetWhatsApp() {
    if (!confirm('Are you sure you want to reset your WhatsApp session? This will log you out of all devices on this platform.')) return;
    try {
        document.getElementById('qr-container').innerHTML = '<p>Resetting...</p>';
        await apiCall('/whatsapp/logout', 'POST');
        showToast('Session reset successful');
        checkWaStatus();
    } catch (e) {
        showToast('Failed to reset session', true);
    }
}

async function checkWaStatus() {
    try {
        const data = await apiCall('/whatsapp/status');
        updateStatusBadge(data.status);
        
        const qrContainer = document.getElementById('qr-container');
        if (data.status === 'connected') {
            qrContainer.innerHTML = `
                <div style="text-align:center">
                    <i class="fa-solid fa-circle-check" style="font-size:3rem; color:var(--primary); margin-bottom:1rem"></i>
                    <h3>Connected!</h3>
                    <p style="color:var(--text-muted); font-size:0.8rem">WhatsApp is ready to send messages</p>
                </div>
            `;
        } else if (data.status === 'connecting') {
            if (data.qrCode) {
                qrContainer.innerHTML = `<img src="${data.qrCode}" alt="QR Code"><p style="margin-top:0.5rem">Scan with WhatsApp Linked Devices</p>`;
            } else {
                qrContainer.innerHTML = '<div class="loader"></div><p>Establishing connection...</p>';
            }
        } else {
            qrContainer.innerHTML = `
                <div style="text-align:center">
                    <i class="fa-solid fa-qrcode" style="font-size:3rem; color:var(--text-muted); margin-bottom:1rem"></i>
                    <p>Disconnected</p>
                    <button onclick="initWhatsApp()" class="btn primary-btn mt-1">Generate QR Code</button>
                </div>
            `;
        }
    } catch (e) {
        console.error('Status check failed:', e);
    }
}

function updateStatusBadge(status) {
    const badge = document.getElementById('wa-status-badge');
    const indicator = badge.querySelector('.indicator');
    const text = document.getElementById('wa-status-text');
    
    indicator.className = `indicator ${status}`;
    text.innerText = status.charAt(0).toUpperCase() + status.slice(1);
}

function startStatusPolling() {
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(() => {
        checkWaStatus();
        updateDashboardStats();
    }, 5000);
}

function stopStatusPolling() {
    if (statusInterval) clearInterval(statusInterval);
}

// Campaign
async function startCampaign(e) {
    e.preventDefault();
    const name = document.getElementById('camp-name').value;
    const rawNumbers = document.getElementById('camp-numbers').value;
    const message = document.getElementById('camp-message').value;
    const delayMin = parseInt(document.getElementById('camp-delay-min').value);
    const delayMax = parseInt(document.getElementById('camp-delay-max').value);
    const numbers = rawNumbers.split(/[\n,]/).map(n => n.trim()).filter(n => n);

    try {
        await apiCall('/campaign/start', 'POST', { name, numbers, message, delayMin, delayMax });
        showToast('Campaign started successfully!');
        e.target.reset();
        switchAppView('dashboard');
        // Update stats immediately after starting
        setTimeout(updateDashboardStats, 1000);
    } catch (e) {}
}

// Filter
async function validateNumbers() {
    const rawNumbers = document.getElementById('filter-numbers').value;
    const numbers = rawNumbers.split(/[\n,]/).map(n => n.trim()).filter(n => n);
    
    if (!numbers.length) return showToast('Please enter numbers', true);
    
    const resultsBox = document.getElementById('filter-results');
    resultsBox.innerHTML = '<p>Validating...</p>';
    
    try {
        const data = await apiCall('/whatsapp/validate', 'POST', { numbers });
        let html = '<h4>Results:</h4><ul>';
        for (const [num, isValid] of Object.entries(data.results)) {
            const icon = isValid ? '<i class="fa-solid fa-check" style="color:var(--primary)"></i>' : '<i class="fa-solid fa-xmark" style="color:var(--danger)"></i>';
            html += `<li>${icon} ${num}: ${isValid ? 'Valid' : 'Invalid'}</li>`;
        }
        html += '</ul>';
        resultsBox.innerHTML = html;
    } catch (e) {}
}

// Auto Reply
async function loadAutoReplies() {
    try {
        const data = await apiCall("/autoreply");
        const list = document.getElementById("autoreply-list");
        
        if (!data.replies || data.replies.length === 0) {
            list.innerHTML = "<p>No rules defined yet.</p>";
            return;
        }

        let html = "<ul class=\"ar-list\">";
        data.replies.forEach(rule => {
            html += `
                <li class="glass-card mb-1" style="padding:10px; margin-bottom:10px">
                    <div style="display:flex; justify-content:space-between; align-items:start">
                        <div>
                            <strong>Keyword:</strong> ${rule.keyword}<br>
                            <small>${rule.reply}</small>
                        </div>
                        <button onclick="deleteAutoReply(\"${rule.keyword}\")" class="btn danger-btn" style="padding:4px 8px; font-size:0.7rem"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </li>
            `;
        });
        html += "</ul>";
        list.innerHTML = html;
    } catch (e) {}
}

async function saveAutoReply(e) {
    e.preventDefault();
    const keyword = document.getElementById("ar-keyword").value;
    const reply = document.getElementById("ar-reply").value;

    try {
        await apiCall("/autoreply", "POST", { keyword, reply });
        showToast("Rule saved successfully");
        e.target.reset();
        loadAutoReplies();
    } catch (e) {}
}

async function deleteAutoReply(keyword) {
    if (!confirm(`Delete rule for "${keyword}"?`)) return;
    try {
        await apiCall("/autoreply", "DELETE", { keyword });
        showToast("Rule deleted");
        loadAutoReplies();
    } catch (e) {}
}

// Dashboard Stats
async function updateDashboardStats() {
    try {
        const data = await apiCall('/campaigns/stats');
        document.getElementById('stat-total-sent').innerText = data.totalSent || 0;
        document.getElementById('stat-failed').innerText = data.totalFailed || 0;
    } catch (e) {
        console.error('Failed to fetch stats:', e);
    }
}

// Analytics History
async function loadCampaignHistory() {
    try {
        const data = await apiCall('/campaigns');
        const body = document.getElementById('campaign-history-body');
        
        if (!data.campaigns || data.campaigns.length === 0) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center">No campaigns found.</td></tr>';
            return;
        }

        let html = '';
        data.campaigns.forEach(c => {
            const date = new Date(c.createdAt).toLocaleString();
            html += `
                <tr>
                    <td>${c.name}</td>
                    <td>${date}</td>
                    <td>${c.sent}</td>
                    <td>${c.failed}</td>
                    <td><span class="status-pill ${c.status}">${c.status}</span></td>
                </tr>
            `;
        });
        body.innerHTML = html;
    } catch (e) {
        console.error('Failed to load history:', e);
    }
}
