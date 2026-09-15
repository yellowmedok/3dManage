const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
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

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);