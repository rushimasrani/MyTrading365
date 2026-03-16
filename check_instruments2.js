import fs from 'fs';
import zlib from 'zlib';

async function fetchInstruments() {
  const url = 'https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz';
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  
  const unzipped = zlib.gunzipSync(Buffer.from(buffer));
  const text = unzipped.toString('utf-8');
  const lines = text.split('\n');
  
  console.log('HEADERS:', lines[0]);
  
  let foundSilver = 0;
  for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('"SILVER"') && line.includes('"FUTCOM"') && line.includes('"MCX_FO"')) {
          console.log(line);
          foundSilver++;
          if (foundSilver > 5) break;
      }
  }
}

fetchInstruments();
