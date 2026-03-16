import 'dotenv/config';
import { initUpstoxWS } from './services/upstoxWebSocket';

const UPSTOX_ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN;

async function run() {
    if (!UPSTOX_ACCESS_TOKEN) {
        console.error("No token");
        return;
    }

    // Subscribe to Gold and Nifty explicitly to see feed structure
    // MCX_FO|454818 (GOLD 02APR FUT)
    // NSE_FO|51714 (NIFTY 26MAR FUT)
    const testKeys = ['MCX_FO|454818', 'NSE_FO|51714'];
    
    let tickCount = 0;
    
    console.log("Connecting to WebSocket to dump 2 ticks of raw data...");
    
    initUpstoxWS(UPSTOX_ACCESS_TOKEN, testKeys, (feed: any) => {
        console.dir(feed, { depth: null });
        tickCount++;
        if (tickCount >= 2) {
            console.log("Got enough ticks, exiting...");
            process.exit(0);
        }
    });
}

run();
