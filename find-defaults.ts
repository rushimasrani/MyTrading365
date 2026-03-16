import zlib from 'zlib';

async function findDefaults() {
    try {
        const response = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz');
        const buffer = await response.arrayBuffer();
        const unzipped = zlib.gunzipSync(Buffer.from(buffer));
        const text = unzipped.toString('utf-8');
        const lines = text.split('\n');

        let foundNifty = 0;
        let foundBank = 0;
        let foundSensex = 0;
        let foundGold = 0;
        let foundSilver = 0;

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue;
            const parts = lines[i].split(',').map(s => s.replace(/(^"|"$)/g, ''));
            const instType = parts[9] || '';
            const name = parts[3] || '';

            if (instType.startsWith('FUT')) {
                if (name === 'NIFTY' && foundNifty < 2) {
                    console.log('NIFTY FUT:', parts.slice(0, 10));
                    foundNifty++;
                }
                if (name === 'BANKNIFTY' && foundBank < 2) {
                    console.log('BANKNIFTY FUT:', parts.slice(0, 10));
                    foundBank++;
                }
                if (name === 'SENSEX' || name === 'BSESENSEX' || name === 'BSE SENSEX') {
                    if (foundSensex < 2) {
                        console.log('SENSEX FUT:', parts.slice(0, 10));
                        foundSensex++;
                    }
                }
                if (name === 'GOLD' && foundGold < 2) {
                    // There is GOLD, GOLDM, GOLDGUINEA etc. user said GOLD
                    console.log('GOLD FUT:', parts.slice(0, 10));
                    foundGold++;
                }
                if (name === 'SILVER' && foundSilver < 2) {
                    // There is SILVER, SILVERM, SILVERMIC
                    console.log('SILVER FUT:', parts.slice(0, 10));
                    foundSilver++;
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}

findDefaults();
