import fs from 'fs';
import zlib from 'zlib';

async function mapKeys() {
    try {
        console.log("Loading Upstox CSV...");
        const response = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz');
        const buffer = await response.arrayBuffer();
        const unzipped = zlib.unzipSync(Buffer.from(buffer)).toString('utf8');
        const lines = unzipped.split('\n');

        let scripDataContent = fs.readFileSync('scripData.ts', 'utf8');

        scripDataContent = scripDataContent.replace(
            /export interface Scrip \{[\s\S]*?\}/,
            `export interface Scrip {\n  exchange: string;\n  symbol: string;\n  token: string;\n  name: string;\n  expiry?: string;\n  strike?: number;\n  optionType?: 'CE' | 'PE';\n  upstox_key?: string;\n}`
        );

        const arrayMatch = scripDataContent.match(/export const MOCK_SCRIPS: Scrip\[\] = (\[[\s\S]*?\]);/);
        if (!arrayMatch) return console.log("Failed to match MOCK_SCRIPS");

        const jsArrayStr = arrayMatch[1].replace(/Scrip\[\]/g, 'any[]');
        let scrips: any[] = [];
        eval(`scrips = ${jsArrayStr}`);

        for (let scrip of scrips) {
            let foundKey = '';

            if (scrip.exchange === 'NSE') {
                const match = lines.find(l => l.startsWith('"NSE_EQ') && l.includes(`,"${scrip.symbol}",`));
                if (match) foundKey = match.split(',')[0].replace(/"/g, '');
            } else if (scrip.exchange === 'BSE') {
                const match = lines.find(l => l.startsWith('"BSE_EQ') && l.includes(`,"${scrip.symbol}",`));
                if (match) foundKey = match.split(',')[0].replace(/"/g, '');
            } else if (scrip.exchange === 'NFO') {
                if (scrip.optionType) {
                    const match = lines.find(l => l.startsWith('"NSE_FO') && l.includes(`,"${scrip.symbol}",`) && l.includes(`,"${scrip.strike}.0",`) && l.includes(`,"${scrip.optionType}",`));
                    if (match) foundKey = match.split(',')[0].replace(/"/g, '');
                } else {
                    const match = lines.find(l => l.startsWith('"NSE_FO') && l.includes(`,"${scrip.symbol}",`) && l.includes(`,"FUTIDX",`));
                    if (match) foundKey = match.split(',')[0].replace(/"/g, '');
                }
            } else if (scrip.exchange === 'MCX') {
                const match = lines.find(l => l.startsWith('"MCX_FO') && l.includes(`,"${scrip.symbol}",`) && l.includes('"FUTCOM"'));
                if (match) foundKey = match.split(',')[0].replace(/"/g, '');
            }

            if (foundKey) {
                scrip.upstox_key = foundKey;
            } else {
                console.log(`Failed to find key for: ${scrip.name}`);
            }
        }

        const newArrayStr = '[\n' + scrips.map(s => '  ' + JSON.stringify(s)).join(',\n') + '\n]';
        scripDataContent = scripDataContent.replace(arrayMatch[1], newArrayStr);

        fs.writeFileSync('scripData.ts', scripDataContent);
        console.log("Successfully mapped and saved to scripData.ts");

    } catch (e) {
        console.error("Failed:", e);
    }
}

mapKeys();
