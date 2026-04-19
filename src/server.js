const fs = require('fs');
const https = require('https');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const handlers = require('./Handlers');
const app = express();
const clients = new Map(); // Lưu trữ: id -> { ws, username, status }

let options;
try {
    options = {
        key: fs.readFileSync('./certs/key.pem'),
        cert: fs.readFileSync('./certs/cert.pem')
    };
} catch (error) {
    console.error('Lỗi tải chứng chỉ SSL:', error.message);
    process.exit(1);
}

app.use(express.static(path.join(__dirname, '/../public')));
const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server });

function broadcastUserList() {
    const userList = Array.from(clients.entries()).map(([id, client]) => ({
        id,
        username: client.username,
        status: client.status
    }));
    const message = JSON.stringify({ type: 'user-list', users: userList });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}



wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(2, 9);
    const context = { clients, broadcastUserList };

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const action = handlers[message.type];

            if (action) {
                action(message, ws, clientId, context);
            } else {
                console.warn(`[Warning] Action không xác định: ${message.type}`);
            }
        } catch (e) {
            console.error('[Error] Lỗi format message:', e.message);
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        broadcastUserList();
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Server WebRTC đa người dùng chạy tại https://localhost:3000');
});