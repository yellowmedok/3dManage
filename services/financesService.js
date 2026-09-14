const Order = require('../models/Order');

async function getFinancialAnalytics(startDate, endDate, taxGroup = 3) {
    const jobs = await Order.find({ status: 'Готово', completedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } });

    // Виправлено змінну "Order" назад на "job" у колбеку reduce
    const revenue = jobs.reduce((sum, job) => sum + (job.price || 0), 0);
    const materialCost = jobs.reduce((sum, job) => sum + (job.filamentCost || 0), 0);
    const electricityCost = jobs.reduce((sum, job) => sum + (job.electricityCost || 0), 0);
    const depreciation = jobs.reduce((sum, job) => sum + (job.depreciationCost || 0), 0);
    
    const grossProfit = revenue - materialCost - electricityCost - depreciation;

    const minWage = 8000;
    const esv = minWage * 0.22;
    let singleTax = 0;
    
    if (taxGroup === 3) singleTax = revenue * 0.05;
    if (taxGroup === 2) singleTax = minWage * 0.20; 

    const militaryTax = revenue * 0.015; 
    const netProfit = grossProfit - singleTax - esv - militaryTax;

    return { revenue, cogs: { materialCost, electricityCost, depreciation }, grossProfit, taxes: { singleTax, esv, militaryTax }, netProfit };
}

module.exports = { getFinancialAnalytics };