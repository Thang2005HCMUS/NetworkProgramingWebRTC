const request = require('supertest');
const { expect } = require('chai');
// Lưu ý: Bạn cần xuất (export) `app` từ server.js để test
// Trong server.js hãy thêm: module.exports = { app };

describe('Express Server API Tests', () => {
    it('should serve the index.html file', (done) => {
        // Giả sử bạn import app từ server.js
        const { app } = require('../src/server'); 
        request(app)
            .get('/')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                done();
            });
    });
});