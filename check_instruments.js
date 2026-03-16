import fs from 'fs';
import zlib from 'zlib';

async function fetchInstruments() {
  const url = 'https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz';
  const response = await fetch(url);
  
  if (!response.ok) {
    console.error(`HTTP error! status: ${response.status}`);
    return;
  }
  
  const buffer = await response.arrayBuffer();
  console.log("Downloaded buffer size:", buffer.byteLength);
  
  try {
    const unzipped = zlib.gunzipSync(Buffer.from(buffer));
    const text = unzipped.toString('utf-8');
    const lines = text.split('\n');
    
    console.log("HEADERS:", lines[0]);
    
    // Find some sample data
    let foundSilver = 0;
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length > 5 && parts[1] === 'MCX_FO' && parts[3].includes('SILVER') && parts[4] === 'FUTCOM' && foundSilver < 5) {
            console.log("SILVER SAMPLE:", parts[2], parts[3]);
            foundSilver++;
        }
    }
  } catch (e) {
    console.error("Unzip error:", e);
    // Maybe it's not gzipped?
    const text = Buffer.from(buffer).toString('utf-8');
    console.log("First 100 chars:", text.substring(0, 100));
  }
}

fetchInstruments();
