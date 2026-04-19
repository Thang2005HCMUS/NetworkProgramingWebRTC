const handlers = {
    'login': (message, ws, clientId, { clients, broadcastUserList }) => {
        clients.set(clientId, { ws, username: message.username, status: 'idle' });
        ws.send(JSON.stringify({ type: 'login-success', id: clientId }));
        broadcastUserList();
    },

    'request-call': (message, ws, clientId, { clients }) => {
        const target = clients.get(message.targetId);
        const caller = clients.get(clientId);

        if (!target || !caller) return;

        if (target.status === 'busy') {
            ws.send(JSON.stringify({ type: 'call-response', response: 'busy' }));
        } else {
            target.ws.send(JSON.stringify({ 
                type: 'incoming-call', 
                fromId: clientId, 
                fromName: caller.username 
            }));
        }
    },

    'call-response': (message, ws, clientId, { clients, broadcastUserList }) => {
        const caller = clients.get(message.callerId);
        const target = clients.get(clientId);

        if (caller) {
            if (message.response === 'accepted') {
                if (target) target.status = 'busy';
                caller.status = 'busy';
                broadcastUserList();
            }
            caller.ws.send(JSON.stringify({ 
                type: 'call-response', 
                response: message.response, 
                targetId: clientId 
            }));
        }
    },

    'signal': (message, ws, clientId, { clients }) => {
        const peer = clients.get(message.targetId);
        if (peer) {
            peer.ws.send(JSON.stringify({ 
                type: 'signal', 
                data: message.data, 
                fromId: clientId 
            }));
        }
    },

    'end-call': (message, ws, clientId, { clients, broadcastUserList }) => {
        const self = clients.get(clientId);
        const other = clients.get(message.targetId);

        if (self) self.status = 'idle';
        if (other) {
            other.status = 'idle';
            other.ws.send(JSON.stringify({ type: 'end-call' }));
        }
        broadcastUserList();
    }
};

module.exports = handlers;