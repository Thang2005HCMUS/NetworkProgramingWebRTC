const EVENTS = require('./events');
const loginHandler = require('../handlers/loginHandler');
const callHandler = require('../handlers/callHandler');

const routes = {
    [EVENTS.LOGIN]: loginHandler,
    [EVENTS.REQUEST_CALL]: callHandler.requestCall,
    [EVENTS.CALL_RESPONSE]: callHandler.callResponse,
    [EVENTS.SIGNAL]: callHandler.signal,
    [EVENTS.END_CALL]: callHandler.endCall
};

module.exports = function route(message, ws, clientId, ctx) {
    const handler = routes[message.type];

    if (handler) {
        handler(message, ws, clientId, ctx);
    }
};