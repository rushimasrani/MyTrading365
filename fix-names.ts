import fs from 'fs';

let scripData = fs.readFileSync('scripData.ts', 'utf8');

const changes = [
  // NFO Nifty Base
  { search: `"symbol": "NIFTY", "token": "51714", "name": "NIFTY 30MAR26 FUT", "expiry": "30MAR2026", "upstox_key": "NSE_FO|51714"`, replace: `"symbol": "NIFTY", "token": "51714", "name": "NIFTY 30MAR26 FUT", "expiry": "30MAR2026", "upstox_key": "NSE_FO|51714"` }, // already there? Wait, scripData actually has 51714 but with wrong names. Let me use regex for the whole object.
];

// Let's just rewrite the specific lines we want
// GOLD
scripData = scripData.replace(
    /\{ "exchange": "MCX", "symbol": "GOLD", "token": "234002".*?\}/g,
    `{ "exchange": "MCX", "symbol": "GOLD", "token": "472784", "name": "GOLD 27FEB26 FUT", "expiry": "27FEB2026", "upstox_key": "MCX_FO|472784" }`
);

// SILVER
scripData = scripData.replace(
    /\{ "exchange": "MCX", "symbol": "SILVER", "token": "234003".*?\}/g,
    `{ "exchange": "MCX", "symbol": "SILVER", "token": "458305", "name": "SILVER 27FEB26 FUT", "expiry": "27FEB2026", "upstox_key": "MCX_FO|458305" }`
);

// CRUDEOIL
scripData = scripData.replace(
    /\{ "exchange": "MCX", "symbol": "CRUDEOIL", "token": "234001".*?\}/g,
    `{ "exchange": "MCX", "symbol": "CRUDEOIL", "token": "472789", "name": "CRUDEOIL 19MAR26 FUT", "expiry": "19MAR2026", "upstox_key": "MCX_FO|472789" }`
);

// NATURALGAS
scripData = scripData.replace(
    /\{ "exchange": "MCX", "symbol": "NATURALGAS", "token": "234004".*?\}/g,
    `{ "exchange": "MCX", "symbol": "NATURALGAS", "token": "475111", "name": "NATURALGAS 26MAR26 FUT", "expiry": "26MAR2026", "upstox_key": "MCX_FO|475111" }`
);

// COPPER
scripData = scripData.replace(
    /\{ "exchange": "MCX", "symbol": "COPPER", "token": "234005".*?\}/g,
    `{ "exchange": "MCX", "symbol": "COPPER", "token": "477167", "name": "COPPER 27FEB26 FUT", "expiry": "27FEB2026", "upstox_key": "MCX_FO|477167" }`
);

fs.writeFileSync('scripData.ts', scripData);

let constantsData = fs.readFileSync('constants.ts', 'utf8');

// The single quotes were changed? No, constants.ts uses object syntax. Let me rewrite the objects.
// Let's find Gold object
const goldRegex = /\{\s*id:\s*'454818'[\s\S]*?volume:\s*0\s*\}/;
constantsData = constantsData.replace(goldRegex, `{
    id: '472784',
    symbol: 'GOLD',
    exchange: 'MCX',
    dispName: 'GOLD',
    ltp: 0.00,
    change: 0.00,
    bQty: 0,
    bid: 0,
    ask: 0,
    aQty: 0,
    open: 0.00,
    high: 0.00,
    low: 0.00,
    pClose: 0.00,
    volume: 0
  }`);

const silverConstants = `  {
    id: '458305',
    symbol: 'SILVER',
    exchange: 'MCX',
    dispName: 'SILVER',
    ltp: 0.00,
    change: 0.00,
    bQty: 0,
    bid: 0,
    ask: 0,
    aQty: 0,
    open: 0.00,
    high: 0.00,
    low: 0.00,
    pClose: 0.00,
    volume: 0
  }`;

const crudeConstants = `  {
    id: '472789',
    symbol: 'CRUDEOIL',
    exchange: 'MCX',
    dispName: 'CRUDEOIL',
    ltp: 0.00,
    change: 0.00,
    bQty: 0,
    bid: 0,
    ask: 0,
    aQty: 0,
    open: 0.00,
    high: 0.00,
    low: 0.00,
    pClose: 0.00,
    volume: 0
  }`;

// add silver and crudeoil to INITIAL_STOCKS constants before the closing bracket
constantsData = constantsData.replace(/  \}\n\];/, `  },\n${silverConstants},\n${crudeConstants}\n];`);


// Fix Nifty
constantsData = constantsData.replace(/\{\s*id:\s*'51714'[\s\S]*?volume:\s*0\s*\}/, `{
    id: '51714',
    symbol: 'NIFTY',
    exchange: 'NSE',
    dispName: 'NIFTY',
    ltp: 25800.00,
    change: 0.00,
    bQty: 0,
    bid: 0,
    ask: 0,
    aQty: 0,
    open: 25800.00,
    high: 25800.00,
    low: 25800.00,
    pClose: 25800.00,
    volume: 0
  }`);

// Fix BankNifty
constantsData = constantsData.replace(/\{\s*id:\s*'51701'[\s\S]*?volume:\s*0\s*\}/, `{
    id: '51701',
    symbol: 'BANKNIFTY',
    exchange: 'NSE',
    dispName: 'BANKNIFTY',
    ltp: 60800.00,
    change: 0.00,
    bQty: 0,
    bid: 0,
    ask: 0,
    aQty: 0,
    open: 60800.00,
    high: 60800.00,
    low: 60800.00,
    pClose: 60800.00,
    volume: 0
  }`);


fs.writeFileSync('constants.ts', constantsData);

console.log("Rewrote scripData.ts and constants.ts");
