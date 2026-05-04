// server.js
const fs = require('fs');
const https = require('https');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();

/*
clients:
ws -> {
   name: "",
   roomId: null
}
*/
const clients = new Map();

/*
rooms:
roomId -> {
   members: Map(name -> ws)
}
*/
const rooms = new Map();

let options;

try {
    options = {
        key: fs.readFileSync('./certs/key.pem'),
        cert: fs.readFileSync('./certs/cert.pem')
    };
} catch (err) {
    console.error('Lỗi SSL:', err.message);
    process.exit(1);
}

app.use(express.static(path.join(__dirname, '../public')));

const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server });

/* =========================
   HELPER
========================= */

function send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function getRoomMembers(roomId) {
    const room = rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.members.keys());
}

function broadcastRoomMembers(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    const payload = {
        type: 'roomMembers',
        roomId,
        members: getRoomMembers(roomId)
    };

    for (const ws of room.members.values()) {
        send(ws, payload);
    }
}

function leaveCurrentRoom(ws) {
    const user = clients.get(ws);
    if (!user || !user.roomId) return;

    const roomId = user.roomId;
    const room = rooms.get(roomId);

    if (!room) {
        user.roomId = null;
        return;
    }

    room.members.delete(user.name);

    // báo người khác
    for (const memberWs of room.members.values()) {
        send(memberWs, {
            type: 'memberLeft',
            roomId,
            name: user.name
        });
    }

    // update danh sách thành viên
    broadcastRoomMembers(roomId);

    // nếu phòng rỗng thì xóa
    if (room.members.size === 0) {
        rooms.delete(roomId);
    }

    user.roomId = null;
}

/* =========================
   WS CONNECTION
========================= */

wss.on('connection', (ws) => {
    clients.set(ws, {
        name: null,
        roomId: null,
        lastPing: Date.now()
    });

    ws.on('message', (message) => {
        let data;

        try {
            data = JSON.parse(message.toString());
        } catch {
            return;
        }

        const user = clients.get(ws);
        if (!user) return;

        switch (data.type) {

            /* =========================
               ping
            ========================= */
            case 'ping': {
                send(ws, { type: 'pong' });
                user.lastPing = Date.now();
                break;
            }

            /* =========================
               register
               {type,name}
            ========================= */
            case 'register': {
                user.name = data.name?.trim() || 'Unknown';

                send(ws, {
                    type: 'registered',
                    name: user.name
                });
                break;
            }

            /* =========================
               createRoom / joinRoom
               {type,roomId,name}
            ========================= */
            case 'createRoom':
            case 'joinRoom': {
                const roomId = data.roomId?.trim();
                const name = data.name?.trim();

                if (!roomId || !name) return;

                // Nếu người dùng có cùng tên đã ở trong phòng, ta ưu tiên kick người cũ ra
                // để người dùng hiện tại có thể re-join thành công (tránh kẹt tên)
                if (rooms.has(roomId)) {
                    const room = rooms.get(roomId);
                    if (room.members.has(name)) {
                        const oldWs = room.members.get(name);
                        if (oldWs && oldWs !== ws) {
                            send(oldWs, { type: 'error', message: 'Bạn đã đăng nhập ở một nơi khác.' });
                            leaveCurrentRoom(oldWs);
                            try { oldWs.close(); } catch (e) {}
                        }
                    }
                }

                user.name = name;

                // rời phòng cũ nếu có
                leaveCurrentRoom(ws);

                if (!rooms.has(roomId)) {
                    rooms.set(roomId, {
                        members: new Map()
                    });
                }

                const room = rooms.get(roomId);

                room.members.set(name, ws);
                user.roomId = roomId;

                broadcastRoomMembers(roomId);
                break;
            }
            case 'startCall': {
                const room = rooms.get(data.roomId);
                if (!room) return;

                // Gửi thông báo "bắt đầu call" cho tất cả mọi người TRỪ người gửi
                for (const [memberName, memberWs] of room.members) {
                    if (memberName !== data.sender) {
                        send(memberWs, {
                            type: 'startCall',
                            sender: data.sender
                        });
                    }
                }
                break;
            }
            /* =========================
               offer
               {type,roomId,sender,target,offer}
            ========================= */
            case 'offer': {
                const room = rooms.get(data.roomId);
                if (!room) return;

                const targetWs = room.members.get(data.target);
                if (!targetWs) return;

                send(targetWs, {
                    type: 'offer',
                    roomId: data.roomId,
                    sender: data.sender,
                    target: data.target,
                    offer: data.offer
                });
                break;
            }
         
            case 'answer': {
                const room = rooms.get(data.roomId);
                if (!room) return;

                const targetWs = room.members.get(data.target);
                if (!targetWs) return;

                send(targetWs, {
                    type: 'answer',
                    roomId: data.roomId,
                    sender: data.sender,
                    target: data.target,
                    answer: data.answer
                });
                break;
            }

            case 'candidate': {
                const room = rooms.get(data.roomId);
                if (!room) return;

                const targetWs = room.members.get(data.target);
                if (!targetWs) return;

                send(targetWs, {
                    type: 'candidate',
                    roomId: data.roomId,
                    sender: data.sender,
                    target: data.target,
                    candidate: data.candidate
                });
                break;
            }
            /* =========================
               leaveRoom
               {type,roomId,sender}
            ========================= */
            case 'leaveRoom': {
                leaveCurrentRoom(ws);
                break;
            }

            /* =========================
               endCall
               {type,roomId,sender}
            ========================= */
            case 'endCall': {
                const room = rooms.get(data.roomId);
                if (!room) return;

                for (const [memberName, memberWs] of room.members) {
                    if (memberName !== data.sender) {
                        send(memberWs, data);
                    }
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        leaveCurrentRoom(ws);
        clients.delete(ws);
    });
});

/* =========================
   START
========================= */

const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        const user = clients.get(ws);
        if (user && Date.now() - user.lastPing > 40000) {
            leaveCurrentRoom(ws);
            clients.delete(ws);
            return ws.terminate();
        }
    });
}, 10000);

wss.on('close', function close() {
    clearInterval(interval);
});

server.listen(3000, () => {
    console.log('HTTPS + WS chạy tại https://localhost:3000');
});

module.exports = { app };