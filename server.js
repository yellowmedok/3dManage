require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = require('./middleware/auth');
const User = require('./models/User');
const Order = require('./models/Order');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-3dmanage';

app.use(express.json());

// Маршрути аналітики захищені всередині файлу або під час підключення
app.use('/api/analytics', require('./routes/api/analyticsRoutes'));

app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
    );
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(204).end(); 
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/3dmanage';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Підключено до бази даних MongoDB'))
    .catch(err => console.error('❌ Помилка підключення до MongoDB:', err));

// ==========================================
// СХЕМИ ТА МОДЕЛІ MONGODB (Внутрішні)
// ==========================================

const SpoolSchema = new mongoose.Schema({
    id: String,
    remainingGrams: Number
}, { _id: false });

const InventorySchema = new mongoose.Schema({
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userId: { type: String, required: true },
    material: String,
    color: String,
    pricePerSpool: Number,
    weightPerSpool: Number,
    spools: [SpoolSchema],
    notes: String
}, { versionKey: false });

const ModelSchema = new mongoose.Schema({
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userId: { type: String, required: true },
    name: String,
    weight: Number,
    timeMins: Number
}, { versionKey: false });

const SettingsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    amort: Number,
    kwPrice: Number,
    printerKw: Number
}, { versionKey: false });

const Inventory = mongoose.model('Inventory', InventorySchema);
const SavedModel = mongoose.model('SavedModel', ModelSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

// ==========================================
// АВТЕНТИФІКАЦІЯ (AUTH)
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, farmName } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Користувач з таким email вже існує.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({ email, password: hashedPassword, farmName });
        const token = jwt.sign({ id: user._id, email: user.email, farmName: user.farmName }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ token, farmName: user.farmName });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Невірний email або пароль.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Невірний email або пароль.' });

        const token = jwt.sign({ id: user._id, email: user.email, farmName: user.farmName }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, farmName: user.farmName });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// ЗАХИЩЕНІ REST API МАРШРУТИ
// ==========================================

// --- НАЛАШТУВАННЯ (SETTINGS) ---
app.get('/api/settings', auth, async (req, res) => {
    try {
        const settings = await Settings.findOne({ userId: req.user.id });
        res.json(settings || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', auth, async (req, res) => {
    try {
        await Settings.findOneAndUpdate(
            { userId: req.user.id }, 
            { ...req.body, userId: req.user.id }, 
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- СКЛАД (INVENTORY) ---
app.get('/api/inventory', auth, async (req, res) => {
    try {
        const items = await Inventory.find({ userId: req.user.id }, '-_id');
        res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory', auth, async (req, res) => {
    try {
        await Inventory.create({ ...req.body, userId: req.user.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/inventory/:id', auth, async (req, res) => {
    try {
        await Inventory.findOneAndUpdate({ id: req.params.id, userId: req.user.id }, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/inventory/:id', auth, async (req, res) => {
    try {
        await Inventory.findOneAndDelete({ id: req.params.id, userId: req.user.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- МОДЕЛІ (MODELS) ---
app.get('/api/models', auth, async (req, res) => {
    try {
        const models = await SavedModel.find({ userId: req.user.id }, '-_id').sort({ _id: -1 });
        res.json(models);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/models', auth, async (req, res) => {
    try {
        await SavedModel.create({ ...req.body, userId: req.user.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/models/:id', auth, async (req, res) => {
    try {
        await SavedModel.findOneAndUpdate({ id: req.params.id, userId: req.user.id }, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/models/:id', auth, async (req, res) => {
    try {
        await SavedModel.findOneAndDelete({ id: req.params.id, userId: req.user.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ЗАМОВЛЕННЯ (ORDERS) ---
app.get('/api/orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id }, '-_id').sort({ _id: -1 });
        res.json(orders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders', auth, async (req, res) => {
    try {
        await Order.create({ ...req.body, userId: req.user.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/orders/:id', auth, async (req, res) => {
    try {
        await Order.findOneAndUpdate({ id: req.params.id, userId: req.user.id }, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/orders/:id', auth, async (req, res) => {
    try {
        await Order.findOneAndDelete({ id: req.params.id, userId: req.user.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- СПИСАННЯ ПЛАСТИКУ (CHECKOUT) ---
app.post('/api/checkout', auth, async (req, res) => {
    try {
        const { materialId, spoolId, weightUsed } = req.body;
        
        const mat = await Inventory.findOne({ id: materialId, userId: req.user.id });
        if (!mat) return res.status(400).send("Not found");
        
        const spool = mat.spools.find(s => s.id === spoolId);
        if (!spool) return res.status(400).send("Not found");

        spool.remainingGrams -= weightUsed;
        
        await mat.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер 3DManage запущено: http://localhost:${PORT}`);
    });
}