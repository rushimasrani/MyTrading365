import zlib from 'zlib';

async function run() {
  const url = 'https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz';
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const unzipped = zlib.gunzipSync(Buffer.from(buffer));
  const text = unzipped.toString('utf-8');
  const lines = text.split('\n');
  let headers = lines[0].split(',');
  console.log('HEADERS:', headers);
  
  for(let i=1; i<lines.length; i++) {
     if(lines[i].includes('"MCX_FO"') && (lines[i].includes('"GOLD"') || lines[i].includes('"SILVER"')) && lines[i].includes('"FUTCOM"')) {
         console.log(lines[i]);
     }
  }
}
run();
