import zlib from 'zlib';

function formatFutName(inst: any) {
  if (!inst.instrument_type || !inst.instrument_type.startsWith('FUT')) {
      return inst.tradingsymbol;
  }
  
  const match = inst.tradingsymbol.match(/^([A-Z]+)\d{2}[A-Z]{3}FUT$/);
  const prefix = match ? match[1] : inst.name;
  
  if (inst.expiry) {
      const date = new Date(inst.expiry);
      const day = date.getDate().toString().padStart(2, '0');
      const monthStr = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      return `${prefix} ${day}${monthStr} FUT`;
  }
  
  return inst.tradingsymbol;
}

async function run() {
  const url = 'https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz';
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const unzipped = zlib.gunzipSync(Buffer.from(buffer));
  const text = unzipped.toString('utf-8');
  const lines = text.split('\n');
  
  let count = 0;
  for(let i=1; i<lines.length; i++) {
     if(lines[i].includes('"MCX_FO"') && lines[i].includes('"GOLD"') && lines[i].includes('"FUTCOM"')) {
         const parts = lines[i].split(',').map(s => s.replace(/(^"|"$)/g, ''));
         const inst = { tradingsymbol: parts[2], name: parts[3], expiry: parts[5], instrument_type: parts[9] };
         console.log(inst.tradingsymbol, "=>", formatFutName(inst));
         count++;
         if (count > 5) break;
     }
  }
}
run();
