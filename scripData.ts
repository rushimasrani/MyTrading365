export interface Scrip {
  exchange: string;
  symbol: string;
  token: string;
  name: string;
  expiry?: string;
  strike?: number;
  optionType?: 'CE' | 'PE';
  upstox_key?: string;
}

export const MOCK_SCRIPS: Scrip[] = [
  { "exchange": "NSE", "symbol": "RELIANCE", "token": "2885", "name": "RELIANCE INDUSTRIES LTD", "upstox_key": "NSE_EQ|INE002A01018" },
  { "exchange": "NSE", "symbol": "TCS", "token": "11536", "name": "TATA CONSULTANCY SERVICES LTD", "upstox_key": "NSE_EQ|INE467B01029" },
  { "exchange": "NSE", "symbol": "HDFCBANK", "token": "1333", "name": "HDFC BANK LTD", "upstox_key": "NSE_EQ|INE040A01034" },
  { "exchange": "NSE", "symbol": "INFY", "token": "1594", "name": "INFOSYS LTD", "upstox_key": "NSE_EQ|INE009A01021" },
  { "exchange": "NSE", "symbol": "ICICIBANK", "token": "4963", "name": "ICICI BANK LTD", "upstox_key": "NSE_EQ|INE090A01021" },
  { "exchange": "NSE", "symbol": "HINDUNILVR", "token": "1394", "name": "HINDUSTAN UNILEVER LTD", "upstox_key": "NSE_EQ|INE030A01027" },
  { "exchange": "NSE", "symbol": "ITC", "token": "1660", "name": "ITC LTD", "upstox_key": "NSE_EQ|INE154A01025" },
  { "exchange": "NSE", "symbol": "SBIN", "token": "3045", "name": "STATE BANK OF INDIA", "upstox_key": "NSE_EQ|INE062A01020" },
  { "exchange": "NSE", "symbol": "BHARTIARTL", "token": "10604", "name": "BHARTI AIRTEL LTD", "upstox_key": "NSE_EQ|INE397D01024" },
  { "exchange": "NSE", "symbol": "KOTAKBANK", "token": "1922", "name": "KOTAK MAHINDRA BANK LTD", "upstox_key": "NSE_EQ|INE237A01036" },
  { "exchange": "NSE", "symbol": "LTIM", "token": "17818", "name": "LTIMINDTREE LTD", "upstox_key": "NSE_EQ|INE214T01019" },
  { "exchange": "NSE", "symbol": "AXISBANK", "token": "5900", "name": "AXIS BANK LTD", "upstox_key": "NSE_EQ|INE238A01034" },
  { "exchange": "NSE", "symbol": "TATAMOTORS", "token": "3456", "name": "TATA MOTORS LTD" },
  { "exchange": "NSE", "symbol": "LT", "token": "11483", "name": "LARSEN & TOUBRO LTD", "upstox_key": "NSE_EQ|INE018A01030" },
  { "exchange": "NSE", "symbol": "BAJFINANCE", "token": "317", "name": "BAJAJ FINANCE LTD", "upstox_key": "NSE_EQ|INE296A01032" },
  { "exchange": "NSE", "symbol": "MARUTI", "token": "10999", "name": "MARUTI SUZUKI INDIA LTD", "upstox_key": "NSE_EQ|INE585B01010" },
  { "exchange": "NSE", "symbol": "HCLTECH", "token": "7229", "name": "HCL TECHNOLOGIES LTD", "upstox_key": "NSE_EQ|INE860A01027" },
  { "exchange": "NSE", "symbol": "ASIANPAINT", "token": "236", "name": "ASIAN PAINTS LTD", "upstox_key": "NSE_EQ|INE021A01026" },
  { "exchange": "NSE", "symbol": "SUNPHARMA", "token": "3351", "name": "SUN PHARMACEUTICAL IND L", "upstox_key": "NSE_EQ|INE044A01036" },
  { "exchange": "NSE", "symbol": "TITAN", "token": "3506", "name": "TITAN COMPANY LTD", "upstox_key": "NSE_EQ|INE280A01028" },
  { "exchange": "BSE", "symbol": "RELIANCE", "token": "500325", "name": "RELIANCE INDUSTRIES LTD", "upstox_key": "BSE_EQ|INE002A01018" },
  { "exchange": "BSE", "symbol": "TCS", "token": "532540", "name": "TATA CONSULTANCY SERVICES LTD", "upstox_key": "BSE_EQ|INE467B01029" },
  { "exchange": "BSE", "symbol": "HDFCBANK", "token": "500180", "name": "HDFC BANK LTD", "upstox_key": "BSE_EQ|INE040A01034" },
  { "exchange": "BSE", "symbol": "INFY", "token": "500209", "name": "INFOSYS LTD", "upstox_key": "BSE_EQ|INE009A01021" },
  { "exchange": "BSE", "symbol": "ITC", "token": "500875", "name": "ITC LTD", "upstox_key": "BSE_EQ|INE154A01025" },
  { "exchange": "BSE", "symbol": "SBIN", "token": "500112", "name": "STATE BANK OF INDIA", "upstox_key": "BSE_EQ|INE062A01020" },
  { "exchange": "NFO", "symbol": "NIFTY", "token": "51714", "name": "NIFTY 30MAR26 FUT", "expiry": "30MAR2026", "upstox_key": "NSE_FO|51714" },
  { "exchange": "NFO", "symbol": "BANKNIFTY", "token": "51701", "name": "BANKNIFTY 30MAR26 FUT", "expiry": "30MAR2026", "upstox_key": "NSE_FO|51701" },
  { "exchange": "NFO", "symbol": "FINNIFTY", "token": "43629", "name": "FINNIFTY 26FEB26 FUT", "expiry": "26FEB2026", "upstox_key": "NSE_FO|51712" },
  { "exchange": "NFO", "symbol": "RELIANCE", "token": "43630", "name": "RELIANCE 26FEB26 FUT", "expiry": "26FEB2026" },
  { "exchange": "NFO", "symbol": "TCS", "token": "43631", "name": "TCS 26FEB26 FUT", "expiry": "26FEB2026" },
  { "exchange": "NFO", "symbol": "INFY", "token": "43632", "name": "INFY 26FEB26 FUT", "expiry": "26FEB2026" },
  { "exchange": "NFO", "symbol": "NIFTY", "token": "50001", "name": "NIFTY 26FEB26 22000 CE", "expiry": "26FEB2026", "strike": 22000, "optionType": "CE", "upstox_key": "NSE_FO|62920" },
  { "exchange": "NFO", "symbol": "NIFTY", "token": "50002", "name": "NIFTY 26FEB26 22000 PE", "expiry": "26FEB2026", "strike": 22000, "optionType": "PE", "upstox_key": "NSE_FO|86148" },
  { "exchange": "NFO", "symbol": "NIFTY", "token": "50003", "name": "NIFTY 26FEB26 22100 CE", "expiry": "26FEB2026", "strike": 22100, "optionType": "CE" },
  { "exchange": "NFO", "symbol": "NIFTY", "token": "50004", "name": "NIFTY 26FEB26 22100 PE", "expiry": "26FEB2026", "strike": 22100, "optionType": "PE" },
  { "exchange": "NFO", "symbol": "NIFTY", "token": "50005", "name": "NIFTY 26FEB26 22200 CE", "expiry": "26FEB2026", "strike": 22200, "optionType": "CE" },
  { "exchange": "NFO", "symbol": "NIFTY", "token": "50006", "name": "NIFTY 26FEB26 22200 PE", "expiry": "26FEB2026", "strike": 22200, "optionType": "PE" },
  { "exchange": "NFO", "symbol": "BANKNIFTY", "token": "51001", "name": "BANKNIFTY 26FEB26 46000 CE", "expiry": "26FEB2026", "strike": 46000, "optionType": "CE" },
  { "exchange": "NFO", "symbol": "BANKNIFTY", "token": "51002", "name": "BANKNIFTY 26FEB26 46000 PE", "expiry": "26FEB2026", "strike": 46000, "optionType": "PE" },
  { "exchange": "NFO", "symbol": "BANKNIFTY", "token": "51003", "name": "BANKNIFTY 26FEB26 46500 CE", "expiry": "26FEB2026", "strike": 46500, "optionType": "CE", "upstox_key": "NSE_FO|58512" },
  { "exchange": "NFO", "symbol": "BANKNIFTY", "token": "51004", "name": "BANKNIFTY 26FEB26 46500 PE", "expiry": "26FEB2026", "strike": 46500, "optionType": "PE", "upstox_key": "NSE_FO|58513" },
  { "exchange": "MCX", "symbol": "CRUDEOIL", "token": "472789", "name": "CRUDEOIL 19MAR26 FUT", "expiry": "19MAR2026", "upstox_key": "MCX_FO|472789" },
  { "exchange": "MCX", "symbol": "GOLD", "token": "472784", "name": "GOLD 27FEB26 FUT", "expiry": "27FEB2026", "upstox_key": "MCX_FO|472784" },
  { "exchange": "MCX", "symbol": "SILVER", "token": "458305", "name": "SILVER 27FEB26 FUT", "expiry": "27FEB2026", "upstox_key": "MCX_FO|458305" },
  { "exchange": "MCX", "symbol": "NATURALGAS", "token": "475111", "name": "NATURALGAS 26MAR26 FUT", "expiry": "26MAR2026", "upstox_key": "MCX_FO|475111" },
  { "exchange": "MCX", "symbol": "COPPER", "token": "477167", "name": "COPPER 27FEB26 FUT", "expiry": "27FEB2026", "upstox_key": "MCX_FO|477167" }
];
