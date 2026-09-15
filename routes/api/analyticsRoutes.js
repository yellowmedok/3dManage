const express = require('express');
const router = express.Router();
const procurementService = require('../../services/procurementService');
const financeService = require('../../services/financesService');
const auth = require('../../middleware/auth');

router.get('/procurement/forecast', auth, async (req, res) => {
    try {
        const data = await procurementService.getProcurementForecast(req.user.id);
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/finance', auth, async (req, res) => {
    try {
        const { start, end, group } = req.query;
        const data = await financeService.getFinancialAnalytics(req.user.id, start, end, parseInt(group));
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;