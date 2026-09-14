const financeService = require('../services/financesService');
const Order = require('../models/Order');

jest.mock('../models/Order');

describe('Finance Service FOP Calculation', () => {
    it('calculates net profit and taxes correctly for Group 3', async () => {
        Order.find.mockResolvedValue([
            { price: 10000, filamentCost: 2000, electricityCost: 500, depreciationCost: 500 }
        ]);

        const result = await financeService.getFinancialAnalytics('2026-09-01', '2026-09-30', 3);
        
        expect(result.revenue).toBe(10000);
        expect(result.grossProfit).toBe(7000); 
        expect(result.taxes.singleTax).toBe(500); 
        expect(result.taxes.esv).toBe(1760); 
        expect(result.taxes.militaryTax).toBe(150); 
        expect(result.netProfit).toBe(4590); 
    });
});