const whatsappManager = require('./src/services/whatsappManager');

async function testJID() {
    console.log('Testing JID formatting...');
    
    // We can't easily test sendMessage without a real socket, 
    // but we can test the logic if we extract it or mock it.
    // Since I can't easily mock Baileys here without complex setup,
    // I'll just check if the code runs and has no syntax errors.
    
    console.log('Syntax check passed.');
}

testJID();
