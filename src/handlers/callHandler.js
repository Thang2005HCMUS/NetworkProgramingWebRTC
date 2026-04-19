const callService = require('../services/callService');
const userService = require('../services/userService');

module.exports = {
    requestCall(message, ws, clientId) {
        const result = callService.requestCall(clientId, message.targetId);

        if (!result) return;

        if (result.busy) {
            ws.send(JSON.stringify({
                type: 'call-response',
                response: 'busy'
            }));
            return;
        }

        result.target.ws.send(JSON.stringify({
            type: 'incoming-call',
            fromId: clientId,
            fromName: result.caller.username
        }));
    },

    callResponse(message, ws, clientId, ctx) {
        const caller = userService.getUser(message.callerId);

        if (!caller) return;

        if (message.response === 'accepted') {
            callService.acceptCall(message.callerId, clientId);
            ctx.broadcastUserList();
        }

        caller.ws.send(JSON.stringify({
            type: 'call-response',
            response: message.response,
            targetId: clientId
        }));
    },

    signal(message, ws, clientId) {
        const peer = userService.getUser(message.targetId);

        if (!peer) return;

        peer.ws.send(JSON.stringify({
            type: 'signal',
            data: message.data,
            fromId: clientId
        }));
    },

    endCall(message, ws, clientId, ctx) {
        const other = userService.getUser(message.targetId);

        callService.endCall(clientId, message.targetId);

        if (other) {
            other.ws.send(JSON.stringify({
                type: 'end-call'
            }));
        }

        ctx.broadcastUserList();
    }
};