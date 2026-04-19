const store = require('../repositories/clientStore');

function createUser(id, ws, username) {
    store.add(id, {
        ws,
        username,
        status: 'idle'
    });
}

function removeUser(id) {
    store.remove(id);
}

function setStatus(id, status) {
    const user = store.get(id);
    if (user) user.status = status;
}

function getUser(id) {
    return store.get(id);
}

function getUserList() {
    return store.all().map(([id, user]) => ({
        id,
        username: user.username,
        status: user.status
    }));
}

module.exports = {
    createUser,
    removeUser,
    setStatus,
    getUser,
    getUserList
};