const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    modelName: String,
    client: String,
    weight: Number,
    timeMins: Number,
    notes: String,
    material: String,
    color: String,
    usedWeight: Number, 
    price: Number,
    filamentCost: Number, 
    electricityCost: Number,
    depreciationCost: Number,
    status: { type: String, enum: ['new', 'progress', 'done', 'Нові', 'В роботі', 'Готово'], default: 'new' },
    completedAt: Date
}, { timestamps: true });

// Перевірка: якщо модель вже існує в пам'яті — використовуємо її, якщо ні — створюємо нову
module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);