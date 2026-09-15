const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    farmName: { type: String, required: true, default: 'Моя 3D Ферма' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);