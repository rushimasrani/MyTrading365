import fs from 'fs';
import zlib from 'zlib';

// Parse scripData to extract the mock scrips (Regex is easiest since it's TS)
const scripDataContent = fs.readFileSync('scripData.ts', 'utf8');

async function mapKeys() {
    try {
        console.log("Loading Upstox CSV...");
        const response = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz');
        const buffer = await response.arrayBuffer();
        const unzipped = zlib.unzipSync(Buffer.from(buffer)).toString('utf8');
        const lines = unzipped.split('\n');

        console.log("Mapping symbols...");

        let newContent = scripDataContent.replace(/export interface Scrip \{[\s\S]*?\}/,
            `export interface Scrip {
  exchange: string;
  symbol: string;
  token: string;
  name: string;
  expiry?: string;
  strike?: number;
  optionType?: 'CE' | 'PE';
  upstox_key?: string;
}`);

        // A quick hack: evaluate the MOCK_SCRIPS array by stripping exports
        const arrayMatch = scripDataContent.match(/export const MOCK_SCRIPS: Scrip\[\] = (\[[\s\S]*?\]);/);
        if (!arrayMatch) return console.log("Failed to match MOCK_SCRIPS");

        // Remove typing to eval
        const jsArrayStr = arrayMatch[1].replace(/Scrip\[\]/g, 'any[]');
        let scrips;
        eval(`scrips = ${jsArrayStr}`);

        // Map them
        for (let i = 0; i < scrips.length; i++) {
            const scrip = scrips[i];
            let foundKey = '';

            // 1. NSE Equity
            if (scrip.exchange === 'NSE' && scrip.token) {
                // Find NSE_EQ line with this symbol
                const match = lines.find(l => l.startsWith('"NSE_EQ') && l.includes(`,"${scrip.symbol}",`));
                if (match) foundKey = match.split(',')[0].replace(/"/g, '');
            }
            // 2. BSE Equity
            else if (scrip.exchange === 'BSE' && scrip.token) {
                const match = lines.find(l => l.startsWith('"BSE_EQ') && l.includes(`,"${scrip.symbol}",`));
                if (match) foundKey = match.split(',')[0].replace(/"/g, '');
            }
            // 3. NFO
            else if (scrip.exchange === 'NFO') {
                if (scrip.optionType) {
                    const match = lines.find(l => l.startsWith('"NSE_FO') && l.includes(`,"${scrip.symbol}",`) && l.includes(`,"${scrip.strike}.0",`) && l.includes(`,"${scrip.optionType}",`));
                    if (match) foundKey = match.split(',')[0].replace(/"/g, '');
                } else {
                    const match = lines.find(l => l.startsWith('"NSE_FO') && l.includes(`,"${scrip.symbol}",`) && l.includes(`,"FUTIDX",`));
                    if (match) foundKey = match.split(',')[0].replace(/"/g, '');
                }
            }
            // 4. MCX
            else if (scrip.exchange === 'MCX') {
                const match = lines.find(l => l.startsWith('"MCX_FO') && l.includes(`,"${scrip.symbol}",`) && l.includes('"FUTCOM"'));
                if (match) foundKey = match.split(',')[0].replace(/"/g, '');
            }

            if (foundKey) {
                scrip.upstox_key = foundKey;
            } else {
                console.log(`Failed to find key for: ${scrip.name}`);
            }
        }

        // Write the mapped objects back out
        // We'll format it nicely
        const newArrayStr = '[\n' + scrips.map((s: any) => '  ' + JSON.stringify(s)).join(',\n') + '\n]';

        newContent = newContent.replace(arrayMatch[1], newArrayStr);

        fs.writeFileSync('scripData.ts', newContent);
        console.log("Successfully mapped and saved to scripData.ts");

    } catch (e) {
        console.error("Failed:", e);
    }
}

mapKeys();
