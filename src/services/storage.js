const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, '..', '..', 'sessions', 'users.json');
const repliesFile = path.join(__dirname, '..', '..', 'sessions', 'autoreplies.json');

// Initialize files if they don't exist
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify({}));
}
if (!fs.existsSync(repliesFile)) {
    fs.writeFileSync(repliesFile, JSON.stringify({}));
}

class Storage {
    getUsers() {
        try {
            const data = fs.readFileSync(usersFile, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            return {};
        }
    }

    saveUsers(users) {
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    }

    getUser(username) {
        if (!username) return null;
        const users = this.getUsers();
        // Case-insensitive lookup
        const foundKey = Object.keys(users).find(k => k.toLowerCase() === username.toLowerCase());
        return users[foundKey];
    }

    createUser(user) {
        const users = this.getUsers();
        if (users[user.username]) {
            throw new Error('User already exists');
        }
        users[user.username] = user;
        this.saveUsers(users);
        return user;
    }

    getAutoReplies(userId) {
        try {
            const data = fs.readFileSync(repliesFile, 'utf8');
            const allReplies = JSON.parse(data);
            return allReplies[userId] || [];
        } catch (e) {
            return [];
        }
    }

    saveAutoReplies(userId, replies) {
        try {
            const data = fs.readFileSync(repliesFile, 'utf8');
            const allReplies = JSON.parse(data);
            allReplies[userId] = replies;
            fs.writeFileSync(repliesFile, JSON.stringify(allReplies, null, 2));
        } catch (e) {
            console.error('Error saving auto-replies:', e);
        }
    }
}

module.exports = new Storage();
