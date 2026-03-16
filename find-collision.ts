import zlib from 'zlib';

async function verifyToken() {
    try {
        const response = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz');
        const buffer = await response.arrayBuffer();
        const unzipped = zlib.gunzipSync(Buffer.from(buffer));
        const text = unzipped.toString('utf-8');
        const lines = text.split('\n');

        let found = 0;
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue;
            const parts = lines[i].split(',').map(s => s.replace(/(^"|"$)/g, ''));
            // parts[1] is token
            if (parts[1] === '1') {
                console.log('MATCH FOR TOKEN 1:', parts);
            }
            if (parts[1] === '26000') {
                console.log('MATCH FOR TOKEN 26000:', parts);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

verifyToken();
