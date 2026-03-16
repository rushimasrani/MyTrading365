import zlib from 'zlib';

async function findIndices() {
    try {
        const response = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz');
        const buffer = await response.arrayBuffer();
        const unzipped = zlib.gunzipSync(Buffer.from(buffer));
        const text = unzipped.toString('utf-8');
        const lines = text.split('\n');

        let foundSensex = 0;

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue;

            const upper = lines[i].toUpperCase();

            // SENSEX index key search
            if (upper.includes('BSE_INDEX') && upper.includes('SENSEX')) {
                if (foundSensex < 5) {
                    console.log('SENSEX Match:', lines[i]);
                    foundSensex++;
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}

findIndices();
