async function loadProcurementModal() {
    const res = await fetch('/api/analytics/procurement/forecast');
    const data = await res.json();
    
    let csvContent = "data:text/csv;charset=utf-8,Material,Color,Status,Days Remaining,Buy Spools\n";
    let html = `<table class="table"><tr><th>Пластик</th><th>Статус</th><th>Залишок (днів)</th><th>Замовити (котушок)</th></tr>`;
    
    data.forEach(row => {
        html += `<tr><td>${row.material} ${row.color}</td><td>${row.status}</td><td>${row.daysRemaining}</td><td>${row.recommendedSpools}</td></tr>`;
        if (row.recommendedSpools > 0) {
            csvContent += `${row.material},${row.color},${row.status},${row.daysRemaining},${row.recommendedSpools}\n`;
        }
    });
    html += `</table><a href="${encodeURI(csvContent)}" download="order.csv" class="btn">Експорт CSV</a>`;
    document.getElementById('procurement-container').innerHTML = html;
}

async function renderFinanceCharts(start, end) {
    const res = await fetch(`/api/analytics/finance?start=${start}&end=${end}&group=3`);
    const data = await res.json();

    new Chart(document.getElementById('cogsChart'), {
        type: 'pie',
        data: {
            labels: ['Пластик', 'Електроенергія', 'Амортизація'],
            datasets: [{ data: [data.cogs.materialCost, data.cogs.electricityCost, data.cogs.depreciation], backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'] }]
        }
    });

    document.getElementById('tax-report').innerHTML = `
        <p>Дохід: ${data.revenue.toFixed(2)} грн</p>
        <p>Єдиний податок (5%): ${data.taxes.singleTax.toFixed(2)} грн</p>
        <p>ЄСВ: ${data.taxes.esv.toFixed(2)} грн</p>
        <p>Військовий збір: ${data.taxes.militaryTax.toFixed(2)} грн</p>
        <p><b>Чистий прибуток: ${data.netProfit.toFixed(2)} грн</b></p>
    `;
}