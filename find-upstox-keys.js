import fs from 'fs';
import csvParser from 'csv-parser';

async function findActiveFutures() {
    try {
        const response = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz');
        const buffer = await response.arrayBuffer();

        const zlib = await import('zlib');
        const unzipped = zlib.unzipSync(Buffer.from(buffer));

        const text = unzipped.toString('utf8');
        const lines = text.split('\n');

        // CSV Format typically: instrument_key, exchange_token, tradingsymbol, name, last_price, expiry, strike, tick_size, lot_size, instrument_type, option_type, exchange

        const targetCommodities = ['CRUDEOIL', 'GOLD', 'SILVER', 'NATURALGAS', 'COPPER'];

        targetCommodities.forEach(commodity => {
            // Find FUTURES for this commodity
            const futures = lines.filter(l => l.includes('MCX_FO') && l.includes(`,"${commodity}",`) && l.includes('"FUTCOM"'));

            if (futures.length > 0) {
                // sort by expiry (index 5) or just take the first one
                console.log(`\n--- ${commodity} FUTURES ---`);
                console.log(futures.slice(0, 3).join('\n'));
            } else {
                console.log(`\n--- ${commodity} FUTURES NOT FOUND ---`);
                // Try slightly different search
                const alt = lines.filter(l => l.includes('MCX_FO') && l.includes(commodity) && l.includes('FUT'));
                console.log(alt.slice(0, 3).join('\n'));
            }
        });

    } catch (e) {
        console.error("Failed:", e);
    }
}

findActiveFutures();
