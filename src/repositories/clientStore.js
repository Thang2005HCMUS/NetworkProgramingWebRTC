class ClientStore {
    constructor() {
        this.clients = new Map();
    }

    add(id, client) {
        this.clients.set(id, client);
    }

    get(id) {
        return this.clients.get(id);
    }

    remove(id) {
        this.clients.delete(id);
    }

    all() {
        return Array.from(this.clients.entries());
    }

    values() {
        return this.clients.values();
    }
}

module.exports = new ClientStore();