import axios from 'axios';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipe = promisify(pipeline);

const EXCHANGES = ['NSE', 'BSE', 'NSE_FO', 'MCX'];
const INSTRUMENTS_DIR = path.join(process.cwd(), 'data', 'upstox');

if (!fs.existsSync(INSTRUMENTS_DIR)) {
  fs.mkdirSync(INSTRUMENTS_DIR, { recursive: true });
}

const fetchInstruments = async (exchange: string) => {
  const extensions = ['json.gz', 'csv.gz'];
  
  for (const ext of extensions) {
    const url = `https://assets.upstox.com/market-quote/instruments/exchange/${exchange}.${ext}`;
    const outputPath = path.join(INSTRUMENTS_DIR, `${exchange}.${ext.replace('.gz', '')}`);
    const tempPath = path.join(INSTRUMENTS_DIR, `${exchange}.${ext}`);

    console.log(`Fetching instruments for ${exchange} (${ext})...`);

    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      await pipe(response.data, fs.createWriteStream(tempPath));
      
      console.log(`Downloaded ${exchange}.${ext}`);
      
      // Decompress
      const gunzip = zlib.createGunzip();
      const source = fs.createReadStream(tempPath);
      const destination = fs.createWriteStream(outputPath);
      
      await pipe(source, gunzip, destination);
      
      console.log(`Decompressed ${exchange}.${ext.replace('.gz', '')}`);
      
      // Clean up
      fs.unlinkSync(tempPath);
      
      return outputPath;
    } catch (error: any) {
      console.error(`Error fetching instruments for ${exchange} (${ext}):`, error.message);
      // Continue to next extension
    }
  }
  return null;
};

const run = async () => {
  for (const exchange of EXCHANGES) {
    await fetchInstruments(exchange);
  }
  console.log('All instruments fetched successfully.');
};

run();
