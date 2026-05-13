const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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

const DATA_FILE = path.join(__dirname, 'data.json');

// База даних
let db = {
    filaments: [],
    orders: [],
    inventory: [],
    savedModels: []
};

// Завантаження даних
if (fs.existsSync(DATA_FILE)) {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        db = { ...db, ...JSON.parse(fileData) };
    } catch (e) {
        console.error("Помилка читання data.json", e);
    }
}

const saveData = () => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
};

// --- API Маршрути ---

// ІНВЕНТАР
app.get('/api/inventory', (req, res) => res.json(db.inventory));
app.post('/api/inventory', (req, res) => {
    db.inventory = req.body;
    saveData();
    res.json({ success: true });
});
app.post('/api/inventory/bulk', (req, res) => {
    db.inventory = req.body; // Для повного перезапису (видалення/оновлення)
    saveData();
    res.json({ success: true });
});

// МОДЕЛІ
app.get('/api/models', (req, res) => res.json(db.savedModels));
app.post('/api/models', (req, res) => {
    const newModel = req.body;
    if (!db.savedModels.find(m => m.name === newModel.name)) {
        db.savedModels.unshift(newModel);
        saveData();
    }
    res.json({ success: true });
});
app.post('/api/models/bulk', (req, res) => {
    db.savedModels = req.body; // Для оновлення після видалення чи редагування
    saveData();
    res.json({ success: true });
});

// ЗАМОВЛЕННЯ (КАНБАН)
app.get('/api/orders', (req, res) => res.json(db.orders));
app.post('/api/orders/bulk', (req, res) => {
    db.orders = req.body; // Зберігаємо весь масив замовлень (додавання, статус, видалення)
    saveData();
    res.json({ success: true });
});

// СПИСАННЯ
app.post('/api/checkout', (req, res) => {
    const { materialId, spoolId, weightUsed } = req.body;
    const mat = db.inventory.find(m => m.id === materialId);
    if (mat) {
        const spool = mat.spools.find(s => s.id === spoolId);
        if (spool) {
            spool.remainingGrams -= weightUsed;
            saveData();
            return res.json({ success: true });
        }
    }
    res.status(400).send("Not found");
});

// Експортуємо додаток для тестів
module.exports = app;

// Запускаємо сервер ТІЛЬКИ якщо файл запускається напряму (node server.js), 
// а не через тести (jest)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Сервер 3DManage запущено: http://localhost:${PORT}`);
    });
}