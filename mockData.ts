import { TradeRecord, NetPositionRecord, RMSRecord } from './types';

// Mock data for Trade Book based on the screenshot
export const MOCK_TRADES: TradeRecord[] = [
  { id: '1', exch: 'FONSE', action: 'SELL', scrip: 'MCX26FEB2025FUT', token: 'mock', tQty: 100, tPrice: 2441.6, account: 'JLRVTRVI01', oid: '4026', tid: '3032', eTrdNum: '4032', eOrdNum: '20260212004026', trdTime: '14:06:51' },
  { id: '2', exch: 'FONSE', action: 'SELL', scrip: 'MCX26FEB2025FUT', token: 'mock', tQty: 100, tPrice: 2430.5, account: 'JLRVTRVI01', oid: '3598', tid: '2669', eTrdNum: '3669', eOrdNum: '20260212003598', trdTime: '13:19:13' },
  { id: '3', exch: 'FONSE', action: 'BUY', scrip: 'HDFCLIFE26FEB2025FUT', token: 'mock', tQty: 1500, tPrice: 699.35, account: 'JLRVTRVI01', oid: '3207', tid: '2355', eTrdNum: '3355', eOrdNum: '20260212003207', trdTime: '12:12:52' },
  { id: '4', exch: 'FONSE', action: 'SELL', scrip: 'HDFCLIFE26FEB2025FUT', token: 'mock', tQty: 500, tPrice: 699.75, account: 'JLRVTRVI01', oid: '3161', tid: '2323', eTrdNum: '3323', eOrdNum: '20260212003161', trdTime: '12:07:06' },
  { id: '5', exch: 'FONSE', action: 'SELL', scrip: 'HDFCLIFE26FEB2025FUT', token: 'mock', tQty: 1000, tPrice: 700.3, account: 'JLRVTRVI01', oid: '3082', tid: '2256', eTrdNum: '3256', eOrdNum: '20260212003082', trdTime: '12:00:18' },
  { id: '6', exch: 'FONSE', action: 'SELL', scrip: 'MCX26FEB2025FUT', token: 'mock', tQty: 250, tPrice: 2390.2, account: 'JLRVTRVI01', oid: '2320', tid: '1690', eTrdNum: '2690', eOrdNum: '20260212002320', trdTime: '10:42:48' },
  { id: '7', exch: 'FONSE', action: 'BUY', scrip: 'LAURUSLABS26FEB2025FUT', token: 'mock', tQty: 500, tPrice: 1011.45, account: 'JLRVTRVI01', oid: '1110', tid: '805', eTrdNum: '1805', eOrdNum: '20260212001110', trdTime: '09:38:04' },
  { id: '8', exch: 'FONSE', action: 'BUY', scrip: 'LAURUSLABS26FEB2025FUT', token: 'mock', tQty: 500, tPrice: 1011.65, account: 'JLRVTRVI01', oid: '1107', tid: '804', eTrdNum: '1804', eOrdNum: '20260212001107', trdTime: '09:38:01' },
];

// Mock data for Net Position based on screenshot
export const MOCK_NET_POSITIONS: NetPositionRecord[] = [
  { id: '1', exch: 'FONSE', scrip: 'HDFCLIFE26FEB2025FUT', token: 'mock', bQty: 1500, bAvg: 699.3500, sQty: 1500, sAvg: 700.1167, account: 'JLRVTRVI01', nQty: 0, nAvg: 0, m2m: 1150 },
  { id: '2', exch: 'FONSE', scrip: 'MCX26FEB2025FUT', token: 'mock', bQty: 0, bAvg: 0.0000, sQty: 450, sAvg: 2410.5778, account: 'JLRVTRVI01', nQty: -450, nAvg: 2410.5778, m2m: null },
  { id: '3', exch: 'FONSE', scrip: 'LAURUSLABS26FEB2025FUT', token: 'mock', bQty: 1000, bAvg: 1011.5500, sQty: 0, sAvg: 0.0000, account: 'JLRVTRVI01', nQty: 1000, nAvg: 1011.5500, m2m: null },
  { id: '4', exch: 'FONSE', scrip: 'BANKNIFTY26FEB2025FUT', token: 'mock', bQty: 300, bAvg: 60757.5000, sQty: 300, sAvg: 60766.4000, account: 'JLRVTRVI01', nQty: 0, nAvg: 0, m2m: 2670 },
  { id: '5', exch: 'FONSE', scrip: 'JINDALSTEL26FEB2025FUT', token: 'mock', bQty: 2500, bAvg: 1193.2000, sQty: 0, sAvg: 0.0000, account: 'JLRVTRVI01', nQty: 2500, nAvg: 1193.2000, m2m: 0 },
  { id: '6', exch: 'FONSE', scrip: 'NIFTY26FEB2025FUT', token: 'mock', bQty: 500, bAvg: 26007.0000, sQty: 500, sAvg: 26015.0000, account: 'JLRVTRVI01', nQty: 0, nAvg: 0, m2m: 4000 },
];

const p = { exchange: 'NSE', tradeStart: '09:00:00', tradeEnd: '23:55:00' };
export const MOCK_RMS_RECORDS: RMSRecord[] = [
  { id: '1', instrument: 'AUROPHARMA26FEBFUT', maxOrdQty: 500, maxNetQty: 1000, ...p },
  { id: '2', instrument: 'AXISBANK26FEBFUT', maxOrdQty: 5000, maxNetQty: 5000, ...p },
  { id: '3', instrument: 'BANKNIFTY26FEBFUT', maxOrdQty: 200, maxNetQty: 1000, ...p },
  { id: '4', instrument: 'BHARTIARTL26FEBFUT', maxOrdQty: 2500, maxNetQty: 2500, ...p },
  { id: '5', instrument: 'BIOCON26FEBFUT', maxOrdQty: 250, maxNetQty: 1000, ...p },
  { id: '6', instrument: 'BPCL26FEBFUT', maxOrdQty: 250, maxNetQty: 1000, ...p },
  { id: '7', instrument: 'HCLTECH26FEBFUT', maxOrdQty: 250, maxNetQty: 750, ...p },
  { id: '8', instrument: 'HDFCBANK26FEBFUT', maxOrdQty: 2500, maxNetQty: 2500, ...p },
  { id: '9', instrument: 'HEROMOTOCO26FEBFUT', maxOrdQty: 250, maxNetQty: 750, ...p },
  { id: '10', instrument: 'HINDALCO26FEBFUT', maxOrdQty: 5000, maxNetQty: 5000, ...p },
  { id: '11', instrument: 'HINDUNILVR26FEBFUT', maxOrdQty: 250, maxNetQty: 750, ...p },
  { id: '12', instrument: 'ICICIBANK26FEBFUT', maxOrdQty: 5000, maxNetQty: 5000, ...p },
  { id: '13', instrument: 'INDUSINDBK26FEBFUT', maxOrdQty: 1250, maxNetQty: 2500, ...p },
  { id: '14', instrument: 'INFY26FEBFUT', maxOrdQty: 1000, maxNetQty: 1000, ...p },
  { id: '15', instrument: 'JINDALSTEL26FEBFUT', maxOrdQty: 2500, maxNetQty: 5000, ...p },
  { id: '16', instrument: 'JSWSTEEL26FEBFUT', maxOrdQty: 2500, maxNetQty: 5000, ...p },
  { id: '17', instrument: 'KOTAKBANK26FEBFUT', maxOrdQty: 500, maxNetQty: 1250, ...p },
  { id: '18', instrument: 'LICHSGFIN26FEBFUT', maxOrdQty: 1500, maxNetQty: 1500, ...p },
  { id: '19', instrument: 'LT26FEBFUT', maxOrdQty: 500, maxNetQty: 2500, ...p },
  { id: '20', instrument: 'INDHOTEL26FEBFUT', maxOrdQty: 2000, maxNetQty: 2000, ...p },
  { id: '21', instrument: 'INDUSTOWER26FEBFUT', maxOrdQty: 3000, maxNetQty: 3000, ...p },
  { id: '22', instrument: 'IRCTC26FEBFUT', maxOrdQty: 1500, maxNetQty: 1500, ...p },
  { id: '23', instrument: 'JIOFIN26FEBFUT', maxOrdQty: 3000, maxNetQty: 3000, ...p },
  { id: '24', instrument: 'BHEL26FEBFUT', maxOrdQty: 3000, maxNetQty: 3000, ...p },
  { id: '25', instrument: 'ASTRAL26FEBFUT', maxOrdQty: 1000, maxNetQty: 1000, ...p },
  { id: '26', instrument: 'COPPER26FEBFUT', maxOrdQty: 12500, maxNetQty: 12500, ...p },
  { id: '27', instrument: 'NATURALGAS26FEBFUT', maxOrdQty: 6250, maxNetQty: 6250, ...p },
  { id: '28', instrument: 'GOLD26APRFUT', maxOrdQty: 500, maxNetQty: 500, ...p },
  { id: '29', instrument: 'SILVER26MARFUT', maxOrdQty: 150, maxNetQty: 150, ...p },
  { id: '30', instrument: 'CRUDEOIL26FEBFUT', maxOrdQty: 500, maxNetQty: 500, ...p },
  { id: '31', instrument: 'MCX26FEBFUT', maxOrdQty: 1000, maxNetQty: 1000, ...p },
];
