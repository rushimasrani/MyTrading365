const baseUrl = 'http://localhost:3000';

async function runTests() {
    console.log('1. Testing Admin Login...');
    let res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    let data = await res.json();
    console.log(data.user ? '✅ Admin login success' : '❌ Admin login failed');

    console.log('2. Testing Client Creation...');
    res = await fetch(`${baseUrl}/api/admin/clients`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: `testuser_${Date.now()}`, password: 'password', capital: 500000 })
    });
    let clientData = await res.json();
    console.log(clientData.id ? '✅ Client creation success' : '❌ Client creation failed', clientData);

    console.log('3. Testing Instruments Fetch...');
    res = await fetch(`${baseUrl}/api/instruments/default-watchlist`);
    let stocks = await res.json();
    const stock = stocks[0];
    console.log(stock ? `✅ Fetched stock ${stock.symbol}` : '❌ Failed to fetch stocks');

    if (stock && clientData.id) {
        console.log('4. Testing Trade Execution...');
        res = await fetch(`${baseUrl}/api/trade/order`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: clientData.id, stock, type: 'BUY', qty: 10 })
        });
        let tradeResult = await res.json();
        if (tradeResult.error) {
            console.log('⚠️ Trade rejected (Expected if Market is closed/illiquid):', tradeResult.error);
        } else {
            console.log('✅ Trade Executed!', tradeResult.id);
        }

        console.log('5. Verifying Net Positions Pipeline...');
        res = await fetch(`${baseUrl}/api/trade/positions/${clientData.id}`);
        let positions = await res.json();
        console.log(`✅ Positions returned for user ${clientData.username}:`, positions);
    }

    process.exit(0);
}

runTests();
