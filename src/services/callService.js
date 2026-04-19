const userService = require('./userService');

function requestCall(fromId, targetId) {
    const caller = userService.getUser(fromId);
    const target = userService.getUser(targetId);

    if (!caller || !target) return null;

    if (target.status === 'busy') {
        return { busy: true };
    }

    return {
        busy: false,
        caller,
        target
    };
}

function acceptCall(callerId, targetId) {
    userService.setStatus(callerId, 'busy');
    userService.setStatus(targetId, 'busy');
}

function endCall(userId, targetId) {
    userService.setStatus(userId, 'idle');
    userService.setStatus(targetId, 'idle');
}

module.exports = {
    requestCall,
    acceptCall,
    endCall
};