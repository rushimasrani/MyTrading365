import fs from 'fs';
import zlib from 'zlib';

async function findExpiries() {
    try {
        console.log("Downloading Upstox CSV...");
        const response = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz');
        const buffer = await response.arrayBuffer();
        const unzipped = zlib.unzipSync(Buffer.from(buffer)).toString('utf8');
        const lines = unzipped.split('\n');

        const getContracts = (exchange, nameFilter, typeFilter) => {
            const matches = lines.filter(l => {
                if (!l.includes(exchange)) return false;
                const cols = l.split(',');
                if (cols.length < 10) return false;
                const name = cols[3].replace(/"/g, '');
                const type = cols[9].replace(/"/g, '');

                if (name === nameFilter && type === typeFilter) {
                    return true;
                }
                return false;
            });

            // Sort by expiry
            matches.sort((a, b) => {
                const expA = a.split(',')[5].replace(/"/g, '');
                const expB = b.split(',')[5].replace(/"/g, '');
                return expA.localeCompare(expB);
            });

            console.log(`\n--- [${exchange}] ${nameFilter} ${typeFilter} ---`);
            matches.slice(0, 15).forEach(m => {
                const cols = m.split(',');
                console.log(`Key: ${cols[0]}, Symbol: ${cols[2]}, Expiry: ${cols[5]}`);
            });
        };

        getContracts('MCX_FO', 'GOLD', 'FUTCOM');
        getContracts('MCX_FO', 'SILVER', 'FUTCOM');

    } catch (e) {
        console.error(e);
    }
}

findExpiries();
