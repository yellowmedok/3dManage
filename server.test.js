const request = require('supertest');
const fs = require('fs');
const app = require('./server'); // Підключаємо наш сервер
  
describe('API Тестування 3dManage', () => {
  // Тест 1: Перевірка складу (GET)
  it('GET /api/inventory повинен повертати масив (статус 200)', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  // Тест 2: Збереження моделі (POST)
  it('POST /api/models повинен зберігати нову модель', async () => {
    const newModel = { name: "Test_Gear", weight: 50, timeMins: 120 };
    const res = await request(app).post('/api/models').send(newModel);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  // Тест 3: Списання пластику (Негативний тест)
  it('POST /api/checkout повинен повертати 400 при невірному ID матеріалу', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({ materialId: "invalid_id", spoolId: "1", weightUsed: 10 });
    
    expect(res.statusCode).toEqual(400);
    expect(res.text).toBe("Not found");
  });
});

const mongoose = require('mongoose');

afterAll(async () => {
    await mongoose.connection.close();
});