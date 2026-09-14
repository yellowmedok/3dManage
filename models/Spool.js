const mongoose = require('mongoose');

const spoolSchema = new mongoose.Schema({
    material: String,
    color: String,
    currentWeight: Number,
    pricePerKg: Number,
    initialWeight: Number
}, { timestamps: true });

module.exports = mongoose.model('Spool', spoolSchema);