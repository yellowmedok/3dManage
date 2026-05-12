const express = require("express");
const app = express();
const PORT = 8080;

app.use(express.json());

// --- БАЗА ДАНИХ (ІНТЕГРОВАНІ ДАНІ З MONGODB) ---

let orders = [
    { id: "ORD-001", customer: "Bohdan Tytskyi", status: "completed", total_price: 450 },
    { id: "ORD-002", customer: "Andriy Shevchenko", status: "in_progress", total_price: 1200 },
    { id: "ORD-003", customer: "Olena Krawz", status: "pending", total_price: 300 },
    { id: "ORD-004", customer: "Dmitro Bondar", status: "completed", total_price: 850 },
    { id: "ORD-005", customer: "Bohdan Tytskyi", status: "pending", total_price: 210 }
];

let filaments = [
    { id: 1, brand: "BambuLab", type: "PLA", color: "Black", remaining_g: 750, price_per_kg: 850 },
    { id: 2, brand: "BambuLab", type: "PLA", color: "White", remaining_g: 1000, price_per_kg: 850 },
    { id: 3, brand: "Prusament", type: "PETG", color: "Orange", remaining_g: 450, price_per_kg: 1100 },
    { id: 4, brand: "Devil Design", type: "PLA", color: "Red", remaining_g: 80, price_per_kg: 700 },
    { id: 5, brand: "Sunlu", type: "ABS", color: "Grey", remaining_g: 900, price_per_kg: 650 }
];

let printers = [
    { id: 1, model: "Bambu Lab A1", hourly_amortization: 15, status: "active" },
    { id: 2, model: "Bambu Lab A1 Mini", hourly_amortization: 10, status: "active" },
    { id: 3, model: "Creality Ender 3", hourly_amortization: 5, status: "maintenance" },
    { id: 4, model: "Bambu Lab P1S", hourly_amortization: 20, status: "active" },
    { id: 5, model: "Voron 2.4", hourly_amortization: 25, status: "offline" }
];

let settings = { electricity_kwh_price: 4.32, currency: "UAH", region: "Lviv" };

let users = [
    { id: 1, name: "Bohdan", role: "Admin" },
    { id: 2, name: "Viktoria", role: "Admin" },
    { id: 3, name: "Jackson", role: "Operator" }
];

// --- ЕНДПОЇНТИ ---

// Отримати всі замовлення
app.get("/api/orders", (req, res) => res.json(orders));

// Редагувати замовлення (PUT)
app.put("/api/orders/:id", (req, res) => {
    const orderId = req.params.id;
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
        orders[index] = { ...orders[index], ...req.body };
        res.json({ message: "Замовлення оновлено", order: orders[index] });
    } else {
        res.status(404).json({ message: "Замовлення не знайдено" });
    }
});

// Видалити замовлення (DELETE)
app.delete("/api/orders/:id", (req, res) => {
    const orderId = req.params.id;
    orders = orders.filter(o => o.id !== orderId);
    res.json({ message: `Замовлення ${orderId} видалено` });
});

// Отримати залишки на складі
app.get("/api/filaments", (req, res) => res.json(filaments));

// Отримати стан принтерів
app.get("/api/printers", (req, res) => res.json(printers));

// Переглянути налаштування та ціну за кВт
app.get("/api/settings", (req, res) => res.json(settings));

// Вивід усіх даних для адміна
app.get("/api/admin/all-data", (req, res) => {
    res.json({
        orders,
        inventory: filaments,
        hardware: printers,
        users,
        config: settings
    });
});

app.listen(PORT, () => {
    console.log(`Сервер 3dManage працює на порту ${PORT}`);
});