const fs = require('fs');
const path = require('path');
const whatsappManager = require('./whatsappManager');

const activeCampaigns = {}; // Campaign ID -> interval/timeout

// Basic spin-tax processor: "{Hi|Hello} there" -> "Hi there" or "Hello there"
function processSpintax(text) {
    if (!text) return '';
    return text.replace(/\{([^{}]*)\}/g, (match, contents) => {
        const choices = contents.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}

function replaceVariables(text, contact) {
    if (!text) return '';
    let parsedText = text;
    // Replace {{name}}, {{Name}}, etc.
    if (contact.name) {
        parsedText = parsedText.replace(/\{\{\s*name\s*\}\}/ig, contact.name);
    }
    return parsedText;
}

function saveCampaignState(campaignId, state) {
    const filePath = path.join(__dirname, '..', '..', 'campaigns', `${campaignId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

function getCampaignState(campaignId) {
    const filePath = path.join(__dirname, '..', '..', 'campaigns', `${campaignId}.json`);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
}

async function runCampaign(campaignId) {
    const state = getCampaignState(campaignId);
    if (!state || state.status !== 'running') return;

    if (state.currentIndex >= state.contacts.length) {
        state.status = 'completed';
        saveCampaignState(campaignId, state);
        return;
    }

    const contact = state.contacts[state.currentIndex];
    const currentNumber = contact.phone;
    
    let finalMessage = processSpintax(state.message);
    finalMessage = replaceVariables(finalMessage, contact);

    if (state.simulationMode) {
        // Simulation: Just mark as sent
        state.sent++;
    } else {
        // Real Mode
        try {
            await whatsappManager.sendMessage(state.userId, currentNumber, finalMessage);
            state.sent++;
        } catch (e) {
            state.failed++;
            state.errors.push({ number: currentNumber, name: contact.name, error: e.message });
        }
    }

    state.currentIndex++;
    saveCampaignState(campaignId, state);

    if (state.currentIndex < state.contacts.length && state.status === 'running') {
        const delayMs = Math.floor(Math.random() * (state.delayMax - state.delayMin + 1) + state.delayMin) * 1000;
        // In simulation mode, we speed it up so we don't wait forever for 1000 contacts.
        const actualDelay = state.simulationMode ? 100 : delayMs;
        activeCampaigns[campaignId] = setTimeout(() => runCampaign(campaignId), actualDelay);
    } else if (state.currentIndex >= state.contacts.length) {
        state.status = 'completed';
        saveCampaignState(campaignId, state);
    }
}

function startEngine(campaignId) {
    runCampaign(campaignId);
}

function stopEngine(campaignId) {
    if (activeCampaigns[campaignId]) {
        clearTimeout(activeCampaigns[campaignId]);
        delete activeCampaigns[campaignId];
    }
}

module.exports = {
    saveCampaignState,
    getCampaignState,
    startEngine,
    stopEngine
};
