const express = require('express');
const router = express.Router();
const procurementService = require('../../services/procurementService');
const financeService = require('../../services/financesService');

router.get('/procurement/forecast', async (req, res) => {
    try {
        const data = await procurementService.getProcurementForecast();
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/finance', async (req, res) => {
    try {
        const { start, end, group } = req.query;
        const data = await financeService.getFinancialAnalytics(start, end, parseInt(group));
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;