const Order = require('../models/Order');
const Spool = require('../models/Spool');

async function getProcurementForecast(userId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completedJobs = await Order.aggregate([
        { $match: { userId: userId, status: 'Готово', completedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { material: '$material', color: '$color' }, totalUsed: { $sum: '$usedWeight' } } }
    ]);

    const activeJobs = await Order.aggregate([
        { $match: { userId: userId, status: { $in: ['Нові', 'В роботі'] } } },
        { $group: { _id: { material: '$material', color: '$color' }, reserved: { $sum: '$usedWeight' } } }
    ]);

    const spools = await Spool.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: { material: '$material', color: '$color' }, currentStock: { $sum: '$currentWeight' }, pricePerKg: { $first: '$pricePerKg' } } }
    ]);

    return spools.map(spool => {
        const material = spool._id.material;
        const color = spool._id.color;
        
        const completedMatch = completedJobs.find(j => j._id.material === material && j._id.color === color);
        const dailyBurnRate = completedMatch ? (completedMatch.totalUsed / 30) : 0.1; 

        const activeMatch = activeJobs.find(j => j._id.material === material && j._id.color === color);
        const reservedGrams = activeMatch ? activeMatch.reserved : 0;

        const effectiveStock = Math.max(0, spool.currentStock - reservedGrams);
        const daysRemaining = dailyBurnRate > 0 ? (effectiveStock / dailyBurnRate) : 999;

        let status = '⚪ OVERSTOCK';
        if (daysRemaining <= 3) status = '🔴 CRITICAL';
        else if (daysRemaining <= 8) status = '🟡 WARNING';
        else if (daysRemaining <= 30) status = '🟢 OPTIMAL';

        const neededFor14Days = dailyBurnRate * 14;
        const recommendedSpools = effectiveStock < neededFor14Days ? Math.ceil((neededFor14Days - effectiveStock) / 1000) : 0;

        return {
            material, color, currentStock: spool.currentStock, reservedGrams, effectiveStock,
            dailyBurnRate: dailyBurnRate.toFixed(2), daysRemaining: Math.floor(daysRemaining),
            status, recommendedSpools, purchaseCost: recommendedSpools * spool.pricePerKg
        };
    });
}

module.exports = { getProcurementForecast };