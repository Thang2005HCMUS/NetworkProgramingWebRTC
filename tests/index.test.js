const request = require('supertest');
const app = require('../src/index');

describe('GET /', () => {
  it('nên trả về thông báo chào mừng và status 200', async () => {
    const response = await request(app).get('/');
    
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Chào bạn! Server ExpressJS đã chạy thành công.');
  });
});