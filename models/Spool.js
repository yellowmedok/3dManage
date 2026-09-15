const mongoose = require('mongoose');

const spoolSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    material: String,
    color: String,
    currentWeight: Number,
    pricePerKg: Number,
    initialWeight: Number
}, { timestamps: true });

module.exports = mongoose.models.Spool || mongoose.model('Spool', spoolSchema);