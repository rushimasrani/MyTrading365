export interface StockData {
  id: string;
  symbol?: string;
  exchange?: string;
  dispName: string;
  ltp: number;
  change: number;
  bQty: number;
  bid: number;
  ask: number;
  aQty: number;
  open: number;
  high: number;
  low: number;
  pClose: number;
  volume: number;
  tsq?: number;
  tbq?: number;
  timestamp?: string;
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  token?: string;
  upstox_key?: string;
}

export interface TradeRecord {
  id: string;
  exch: string;
  action: 'BUY' | 'SELL';
  scrip: string;
  token: string;
  tQty: number;
  tPrice: number;
  account: string;
  oid: string;
  tid: string;
  eTrdNum: string;
  eOrdNum: string;
  trdTime: string;
}

export interface NetPositionRecord {
  id: string;
  exch: string;
  scrip: string;
  token: string;
  bQty: number;
  bAvg: number;
  sQty: number;
  sAvg: number;
  account: string;
  nQty: number;
  nAvg: number;
  m2m: number | null; // null represents empty/dash
}

export interface RMSRecord {
  id?: number | string;
  userId?: string;
  instrument: string;
  maxOrdQty: number;
  maxNetQty: number;
  exchange: string;
  tradeStart: string;
  tradeEnd: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'ADMIN' | 'CLIENT';
  status: 'ACTIVE' | 'DISABLED';
  capital: number;
  totalCapital: number;
  availableCapital?: number;
  allocatedM2m?: number;
  createdAt: string;
  positions?: NetPositionRecord[];
}

export interface OrderRecord {
  id: string;
  exch: string;
  action: 'BUY' | 'SELL';
  scrip: string;
  token: string;
  oQty: number;
  rQty: number;
  oPrice: number;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED';
  account: string;
  tQty: number;
  dQty: number;
  dRemQty: number;
  slPrice: number;
  oType: 'MARKET' | 'LIMIT';
  oTerm: string;
  instrument: string;
  blockedMargin: number;
  rejectReason: string;
  createdAt: string;
  executedAt?: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}
