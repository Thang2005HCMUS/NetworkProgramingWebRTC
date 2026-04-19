const fs = require('fs');
const https = require('https');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const route = require('./websocket/router');
const userService = require('./services/userService');

const app = express();

const options = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem')
};

app.use(express.static(path.join(__dirname, '/../public')));

const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server });

function broadcastUserList() {
    const users = userService.getUserList();

    const msg = JSON.stringify({
        type: 'user-list',
        users
    });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

wss.on('connection', ws => {
    const clientId = Math.random().toString(36).substring(2, 9);

    const ctx = { broadcastUserList };

    ws.on('message', raw => {
        try {
            const message = JSON.parse(raw);
            route(message, ws, clientId, ctx);
        } catch (err) {
            console.error(err.message);
        }
    });

    ws.on('close', () => {
        userService.removeUser(clientId);
        broadcastUserList();
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('https://localhost:3000');
});