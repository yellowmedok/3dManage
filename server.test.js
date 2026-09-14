const mongoose = require('mongoose');
const request = require('supertest');
const fs = require('fs');

// === 1. БЛОКУЄМО РЕАЛЬНЕ ПІДКЛЮЧЕННЯ ДО MONGODB ===
jest.spyOn(mongoose, 'connect').mockResolvedValue(true);
jest.spyOn(mongoose.connection, 'close').mockResolvedValue(true);

// === 2. ІМІТУЄМО ВІДПОВІДІ БД ДЛЯ ТЕСТІВ ===
jest.spyOn(mongoose.Model, 'find').mockResolvedValue([]);
jest.spyOn(mongoose.Model, 'create').mockResolvedValue({});
jest.spyOn(mongoose.Model, 'findOne').mockImplementation((query) => {
  // Повертаємо null для тесту на помилку 400
  if (query && query.id === 'invalid_id') {
    return Promise.resolve(null);
  }
  // Повертаємо фейкову котушку для інших потенційних сценаріїв
  return Promise.resolve({
    spools: [{ id: "1", remainingGrams: 1000 }],
    save: jest.fn().mockResolvedValue(true)
  });
});

// ВАЖЛИВО: Імпорт сервера має бути строго ПІСЛЯ моків!
const app = require('./server'); 
  
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

afterAll(async () => {
    await mongoose.connection.close();
    jest.restoreAllMocks(); // Очищаємо оперативну пам'ять від моків
});