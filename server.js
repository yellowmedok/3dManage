require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/analytics', require('./routes/api/analyticsRoutes'));

// 1. Налаштування CSP (Content Security Policy)
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
    );
    next();
});

// ВАЖЛИВО: Вказуємо шлях до папки public
app.use(express.static(path.join(__dirname, 'public')));

// 2. Виправлення 404 для Chrome DevTools
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(204).end(); 
});

// ==========================================
// 3. ПІДКЛЮЧЕННЯ ДО MONGODB
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/3dmanage';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Підключено до бази даних MongoDB'))
    .catch(err => console.error('Помилка підключення до MongoDB:', err));

// ==========================================
// 4. СХЕМИ ТА МОДЕЛІ MONGODB
// ==========================================

const SpoolSchema = new mongoose.Schema({
    id: String,
    remainingGrams: Number
}, { _id: false }); // Відключаємо _id для вкладених документів (щоб використовувати кастомний id)

const InventorySchema = new mongoose.Schema({
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    material: String,
    color: String,
    pricePerSpool: Number,
    weightPerSpool: Number,
    spools: [SpoolSchema],
    notes: String
}, { versionKey: false });

const ModelSchema = new mongoose.Schema({
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    name: String,
    weight: Number,
    timeMins: Number
}, { versionKey: false });

const OrderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    modelName: String,
    client: String,
    weight: Number,
    price: Number,
    notes: String,
    status: String,
    createdAt: String
}, { versionKey: false });

const SettingsSchema = new mongoose.Schema({
    singleton: { type: String, default: 'settings', unique: true },
    amort: Number,
    kwPrice: Number,
    printerKw: Number
}, { versionKey: false });

const Inventory = mongoose.model('Inventory', InventorySchema);
const SavedModel = mongoose.model('SavedModel', ModelSchema);
const Order = require('./models/Order');
const Settings = mongoose.model('Settings', SettingsSchema);


// ==========================================
// 5. REST API МАРШРУТИ
// ==========================================

// --- НАЛАШТУВАННЯ (SETTINGS) ---
app.get('/api/settings', async (req, res) => {
    try {
        const settings = await Settings.findOne({ singleton: 'settings' });
        res.json(settings || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
    try {
        await Settings.findOneAndUpdate({ singleton: 'settings' }, req.body, { upsert: true, new: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// --- СКЛАД (INVENTORY) ---
app.get('/api/inventory', async (req, res) => {
    try {
        const items = await Inventory.find({}, '-_id');
        res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory', async (req, res) => {
    try {
        await Inventory.create(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/inventory/:id', async (req, res) => {
    try {
        await Inventory.findOneAndUpdate({ id: req.params.id }, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await Inventory.findOneAndDelete({ id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// --- МОДЕЛІ (MODELS) ---
app.get('/api/models', async (req, res) => {
    try {
        const models = await SavedModel.find({}, '-_id').sort({ _id: -1 });
        res.json(models);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/models', async (req, res) => {
    try {
        await SavedModel.create(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/models/:id', async (req, res) => {
    try {
        await SavedModel.findOneAndUpdate({ id: req.params.id }, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/models/:id', async (req, res) => {
    try {
        await SavedModel.findOneAndDelete({ id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// --- ЗАМОВЛЕННЯ (ORDERS) ---
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find({}, '-_id').sort({ _id: -1 });
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders', async (req, res) => {
    try {
        await Order.create(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        await Order.findOneAndUpdate({ id: req.params.id }, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findOneAndDelete({ id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// --- СПИСАННЯ ПЛАСТИКУ (CHECKOUT) ---
app.post('/api/checkout', async (req, res) => {
    try {
        const { materialId, spoolId, weightUsed } = req.body;
        
        const mat = await Inventory.findOne({ id: materialId });
        if (!mat) return res.status(400).send("Not found");
        
        const spool = mat.spools.find(s => s.id === spoolId);
        if (!spool) return res.status(400).send("Not found");

        spool.remainingGrams -= weightUsed;
        
        await mat.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Експортуємо додаток для тестів
module.exports = app;

// Запускаємо сервер ТІЛЬКИ якщо файл запускається напряму (node server.js)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Сервер 3DManage запущено: http://localhost:${PORT}`);
    });
}