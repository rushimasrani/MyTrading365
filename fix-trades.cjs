const fs = require('fs');
const path = require('path');

const TRADES_PATH = path.join(__dirname, 'data', 'trades.json');

try {
    let trades = JSON.parse(fs.readFileSync(TRADES_PATH, 'utf-8'));
    const beforeLength = trades.length;

    // 1. Convert all tQty to Numbers to fix legacy concatenations
    trades = trades.map(t => {
        if (typeof t.tQty === 'string') {
            t.tQty = Number(t.tQty);
        }
        return t;
    });

    // 2. Remove corrupted trades for 'GOLD 02APR FUT' for 'rushi' (id: client-1772794992483)
    trades = trades.filter(t => !(t.account === 'client-1772794992483' && t.scrip === 'GOLD 02APR FUT'));

    fs.writeFileSync(TRADES_PATH, JSON.stringify(trades, null, 2));

    console.log('Fixed trades.json! Removing corrupted specific trades ->', beforeLength - trades.length, 'trades removed.');
} catch (e) {
    console.error("Failed:", e);
}
