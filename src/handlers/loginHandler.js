const userService = require('../services/userService');

module.exports = function (message, ws, clientId, ctx) {
    userService.createUser(clientId, ws, message.username);

    ws.send(JSON.stringify({
        type: 'login-success',
        id: clientId
    }));

    ctx.broadcastUserList();
};