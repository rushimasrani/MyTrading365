import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { logTick } from './utils/logger';
import { initUpstoxWS, closeUpstoxWS, subscribeToInstruments } from './services/upstoxWebSocket';
import zlib from 'zlib';
import bcrypt from 'bcryptjs';
import { getUsers, getUserById, getUserByUsername, addUser, updateUser, deleteUser, executeTradeTransaction, getTradesForUser, calculatePositionsForUser, getRMSLimits, addRMSLimit, updateRMSLimit, deleteRMSLimit, cleanupClosedPositions, cleanupOldTradeHistory, createOrder, getOrdersForUser, updateOrderStatus, modifyOrder, cancelOrder, getPendingLimitOrders, getBlockedMarginForUser } from './services/userStore';
import { getClient } from './services/db';
import cron from 'node-cron';
import format from 'pg-format';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Prevent browsers from caching authenticated API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// In-memory session store: token -> { userId, role, createdAt }
const activeSessions = new Map<string, { userId: string; role: string; createdAt: number }>();

function getSessionUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  return activeSessions.get(token) || null;
}

async function getTargetMasterId(req: express.Request, res: express.Response): Promise<string | null> {
  const session = getSessionUser(req);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  if (session.role === 'SUPER_MASTER') {
    const delegateId = req.query.masterId as string;
    if (!delegateId) {
      res.status(400).json({ error: 'masterId required' });
      return null;
    }
    const master = await getUserById(delegateId);
    if (!master || master.parentUserId !== session.userId) {
      res.status(401).json({ error: 'Unauthorized. Not your Master.' });
      return null;
    }
    return delegateId;
  }

  if (session.role === 'MASTER') return session.userId;

  res.status(401).json({ error: 'Unauthorized' });
  return null;
}

console.log('Environment Variables Check:');
console.log('UPSTOX_ACCESS_TOKEN:', process.env.UPSTOX_ACCESS_TOKEN ? 'Set' : 'Missing');

const UPSTOX_ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN;

let activeProvider: 'UPSTOX' | null = null;
const setActiveProvider = (provider: 'UPSTOX') => {
  if (activeProvider && activeProvider !== provider) {
    throw new Error(`CRITICAL: Attempted to start ${provider} while ${activeProvider} is already active.`);
  }
  activeProvider = provider;
};

// Global Store for ALL Upstox Instruments
let globalInstruments: any[] = [];
let latestMarketData: Record<string, any> = {};

// Download Upstox Master CSV Sequence
function formatFutName(tradingsymbol: string, name: string, expiry: string, instrument_type: string) {
  if (!instrument_type || !instrument_type.startsWith('FUT')) {
    return tradingsymbol;
  }

  const match = tradingsymbol.match(/^([A-Z]+)\d{2}[A-Z]{3}FUT$/);
  const prefix = match ? match[1] : name;

  if (expiry) {
    const date = new Date(expiry);
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const monthStr = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      return `${prefix} ${day}${monthStr} FUT`;
    }
  }

  return tradingsymbol;
}

async function refreshInstruments() {
  try {
    console.log("[INSTRUMENT REFRESH] Starting refresh...");
    console.log("[INSTRUMENT REFRESH] Downloading Upstox complete master CSV...");
    const url = 'https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz';
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    console.log("[INSTRUMENT REFRESH] Download completed. Parsing CSV...");
    const buffer = await response.arrayBuffer();
    const unzipped = zlib.gunzipSync(Buffer.from(buffer));
    const text = unzipped.toString('utf-8');
    const lines = text.split('\n');

    const parsedGlobalInstruments = [];
    const dbRows: any[][] = [];
    const seenTokens = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const parts = lines[i].split(',').map(s => s.replace(/(^"|"$)/g, ''));
      if (parts.length < 12) continue;

      const upstox_key = parts[0];
      const token = parts[1];

      if (seenTokens.has(token)) continue;
      seenTokens.add(token);

      const tradingsymbol = parts[2];
      const name = parts[3];
      const expiry = parts[5];
      const strike = parseFloat(parts[6]) || 0;
      const tick_size = parseFloat(parts[7]) || 0;
      const lot_size = parseInt(parts[8]) || 1;
      const instrument_type = parts[9];
      const option_type = parts[10];
      const exchange = parts[11];

      parsedGlobalInstruments.push({
        upstox_key,
        token,
        tradingsymbol,
        name,
        expiry,
        strike,
        instrument_type,
        option_type,
        exchange,
        dispName: formatFutName(tradingsymbol, name, expiry, instrument_type) // Formatted cleanly using the real Expiry day
      });

      dbRows.push([
        token,
        tradingsymbol,
        exchange,
        expiry || null,
        instrument_type || null,
        lot_size
      ]);
    }

    console.log(`[INSTRUMENT REFRESH] CSV parsed: ${parsedGlobalInstruments.length} rows`);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Create temporary table with exact same schema
      await client.query(`
        CREATE TEMP TABLE instruments_temp (
          token VARCHAR(50) PRIMARY KEY,
          tradingsymbol VARCHAR(100) NOT NULL,
          exchange VARCHAR(20) NOT NULL,
          expiry VARCHAR(50),
          instrument_type VARCHAR(20),
          lot_size INT NOT NULL DEFAULT 1
        ) ON COMMIT DROP;
      `);

      // Batch insert into temporary table using pg-format
      // Chunking to avoid exceeding postgres parameter query limits if rows > 65k
      const chunkSize = 10000;
      for (let i = 0; i < dbRows.length; i += chunkSize) {
        const chunk = dbRows.slice(i, i + chunkSize);
        const query = format(
          'INSERT INTO instruments_temp (token, tradingsymbol, exchange, expiry, instrument_type, lot_size) VALUES %L',
          chunk
        );
        await client.query(query);
      }

      // Swap!
      await client.query('DELETE FROM instruments');
      await client.query('INSERT INTO instruments SELECT * FROM instruments_temp');

      await client.query('COMMIT');
      console.log(`[INSTRUMENT REFRESH] Database update complete`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`[INSTRUMENT REFRESH] CRITICAL: Transaction failed! Database Rolled Back.`, e);
      throw e;
    } finally {
      client.release();
    }

    globalInstruments = parsedGlobalInstruments;
    console.log(`[INSTRUMENT REFRESH] Memory cache reloaded. Successfully loaded ${parsedGlobalInstruments.length} active global instruments.`);
  } catch (err) {
    console.error("[INSTRUMENT REFRESH] Failed to refresh Upstox instruments:", err);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', instrumentsLoaded: globalInstruments.length > 0 });
});

app.get('/api/instruments/search', (req, res) => {
  const query = (req.query.query as string || '').toUpperCase();
  const exchange = req.query.exchange as string;
  const now = Date.now();

  let matches = globalInstruments.filter(inst => {
    if (exchange && exchange !== 'ALL') {
      if (exchange === 'NFO' && inst.exchange !== 'NSE_FO' && inst.exchange !== 'BSE_FO') return false;
      if (exchange === 'MCX' && inst.exchange !== 'MCX_FO') return false;
      if (exchange === 'NSE' && inst.exchange !== 'NSE_EQ') return false;
      if (exchange === 'BSE' && inst.exchange !== 'BSE_EQ') return false;
    }

    // Only include valid/non-expired contracts
    if (inst.expiry) {
      const expTime = new Date(inst.expiry).getTime();
      // Add 24 hours to ensure it is visible until end of expiry day
      if (expTime + 86400000 < now) return false;
    }

    return inst.tradingsymbol.includes(query) || inst.name.includes(query);
  });

  // Sort: Futures first, then by Nearest Expiry, then Alphabetical
  matches.sort((a, b) => {
    const aIsFut = a.instrument_type?.startsWith('FUT') || false;
    const bIsFut = b.instrument_type?.startsWith('FUT') || false;

    // 1. Prioritize Futures
    if (aIsFut && !bIsFut) return -1;
    if (!aIsFut && bIsFut) return 1;

    // 2. Sort by Nearest Expiry
    if (a.expiry && b.expiry) {
      const timeA = new Date(a.expiry).getTime();
      const timeB = new Date(b.expiry).getTime();
      if (timeA !== timeB) return timeA - timeB;
    }

    // 3. Fallback to alphabetically by trading symbol
    return a.tradingsymbol.localeCompare(b.tradingsymbol);
  });

  matches = matches.slice(0, 100);
  res.json(matches);
});

app.get('/api/instruments/default-watchlist', (req, res) => {
  const now = Date.now();
  const targetNames = ['NIFTY', 'BANKNIFTY', 'SENSEX'];
  const defaults: any[] = [];

  for (const targetName of targetNames) {
    let bestMatch = null;
    let closestExpiryTime = Infinity;

    for (const inst of globalInstruments) {
      if (!inst.instrument_type || !inst.instrument_type.startsWith('FUT')) continue;

      // Strict regex matching to avoid variants like GOLDM, SILVERMIC, GOLDTEN
      // We extract the base string out of things like "NIFTY26MARFUT" using regex
      const match = inst.tradingsymbol.match(/^([A-Z]+)\d{2}[A-Z]{3}FUT$/);
      if (!match || match[1] !== targetName) continue;

      if (!inst.expiry) continue;
      const expTime = new Date(inst.expiry).getTime();

      // Add 24 hours to ensure it is visible until end of expiry day
      if (expTime + 86400000 < now) continue;

      if (expTime < closestExpiryTime) {
        closestExpiryTime = expTime;
        bestMatch = inst;
      }
    }

    if (bestMatch) {
      defaults.push({
        id: bestMatch.token,
        symbol: bestMatch.tradingsymbol,
        exchange: bestMatch.exchange,
        dispName: bestMatch.dispName,
        upstox_key: bestMatch.upstox_key,
        ltp: 0,
        change: 0,
        bQty: 0,
        bid: 0,
        ask: 0,
        aQty: 0,
        open: 0,
        high: 0,
        low: 0,
        pClose: 0,
        volume: 0
      });
    }
  }

  res.json(defaults);
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await getUserByUsername(username);

  if (user) {
    const isValid = await bcrypt.compare(password, user.password || '');
    if (isValid || user.password === password) { // Fallback for raw passwords during transition
      if (user.status === 'DISABLED') {
        return res.status(403).json({ error: 'Account disabled' });
      }
      // Generate a unique session token and store it server-side
      const sessionToken = crypto.randomUUID();
      activeSessions.set(sessionToken, {
        userId: user.id,
        role: user.role,
        createdAt: Date.now()
      });
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        token: sessionToken
      });
      return;
    }
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// Validate an existing session token
app.get('/api/auth/validate', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ valid: false, error: 'Invalid or expired session' });
  }

  const session = activeSessions.get(token)!;
  const user = await getUserById(session.userId);
  if (!user || user.status === 'DISABLED') {
    activeSessions.delete(token);
    return res.status(401).json({ valid: false, error: 'User not found or disabled' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ valid: true, user: userWithoutPassword });
});

// Logout — invalidate the session server-side
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

app.post('/api/auth/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const user = await getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isValid = await bcrypt.compare(currentPassword, user.password || '');
  if (!isValid && user.password !== currentPassword) {
    return res.status(401).json({ error: 'Incorrect current password' });
  }

  await updateUser(userId, { password: newPassword });
  res.json({ success: true });
});

app.get('/api/admin/clients', async (req, res) => {
  const targetMasterId = await getTargetMasterId(req, res);
  if (!targetMasterId) return;

  // Return non-admin users along with their live positions
  const users = await getUsers();
  // Filter clients to only those belonging to this MASTER (or orphans for backward compatibility fallback)
  const clientUsers = users.filter(u => u.role === 'CLIENT' && (u.parentUserId === targetMasterId || !u.parentUserId));

  const clients = await Promise.all(clientUsers.map(async (c) => {
    const positions = await calculatePositionsForUser(c.id);
    return { ...c, positions };
  }));
  res.json(clients);
});

app.post('/api/admin/clients', async (req, res) => {
  const targetMasterId = await getTargetMasterId(req, res);
  if (!targetMasterId) return;

  const data = req.body;

  if (await getUserByUsername(data.username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const newClient = {
    id: `client-${Date.now()}`,
    username: data.username,
    password: data.password,
    role: 'CLIENT' as const,
    status: 'ACTIVE' as const,
    parentUserId: targetMasterId,
    capital: Number(data.capital),
    totalCapital: Number(data.capital),
    createdAt: new Date().toISOString()
  };

  await addUser(newClient);

  const { password: _, ...clientWithoutPassword } = newClient;
  res.json(clientWithoutPassword);
});

app.put('/api/admin/clients/:id', async (req, res) => {
  const targetMasterId = await getTargetMasterId(req, res);
  if (!targetMasterId) return;

  const { id } = req.params;
  const updates = req.body;

  const user = await getUserById(id);
  if (!user || (user.parentUserId && user.parentUserId !== targetMasterId)) {
    return res.status(404).json({ error: 'User not found or unauthorized' });
  }

  await updateUser(id, updates);
  res.json(await getUserById(id));
});

app.delete('/api/admin/clients/:id', async (req, res) => {
  const targetMasterId = await getTargetMasterId(req, res);
  if (!targetMasterId) return;

  const { id } = req.params;
  const user = await getUserById(id);
  if (!user || (user.parentUserId && user.parentUserId !== targetMasterId)) {
    return res.status(404).json({ error: 'User not found or unauthorized' });
  }

  await deleteUser(id);
  res.json({ success: true });
});

// ==== Super Master Routes ====
app.get('/api/supermaster/masters', async (req, res) => {
  const session = getSessionUser(req);
  if (!session || session.role !== 'SUPER_MASTER') {
    return res.status(401).json({ error: 'Unauthorized. Only SUPER_MASTER allowed.' });
  }

  const users = await getUsers();
  const masters = users.filter(u => u.role === 'MASTER' && u.parentUserId === session.userId);

  // For each Master, calculate total clients, total allocated capital, etc.
  const populatedMasters = masters.map(m => {
    const myClients = users.filter(u => u.role === 'CLIENT' && u.parentUserId === m.id);
    let totalClientCapital = 0;
    myClients.forEach(c => totalClientCapital += (c.totalCapital || 0));
    return {
      ...m,
      totalClients: myClients.length,
      totalClientCapital
    };
  });

  res.json(populatedMasters);
});

app.post('/api/supermaster/create-master', async (req, res) => {
  const session = getSessionUser(req);
  if (!session || session.role !== 'SUPER_MASTER') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const data = req.body;
  if (await getUserByUsername(data.username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  // Validate limits (Max 20 Masters per Super Master)
  const users = await getUsers();
  const myMastersCount = users.filter(u => u.role === 'MASTER' && u.parentUserId === session.userId).length;
  if (myMastersCount >= 20) {
    return res.status(400).json({ error: 'Maximum 20 Master accounts allowed per Super Master' });
  }

  const newMaster = {
    id: `master-${Date.now()}`,
    username: data.username,
    password: data.password,
    role: 'MASTER' as const,
    status: 'ACTIVE' as const,
    parentUserId: session.userId,
    capital: 0,
    totalCapital: 0,
    createdAt: new Date().toISOString()
  };

  await addUser(newMaster);
  const { password: _, ...masterWithoutPassword } = newMaster;
  res.json({ ...masterWithoutPassword, totalClients: 0, totalClientCapital: 0 });
});

app.get('/api/supermaster/master/:id/clients', async (req, res) => {
  const session = getSessionUser(req);
  if (!session || session.role !== 'SUPER_MASTER') return res.status(401).json({ error: 'Unauthorized.' });

  const masterId = req.params.id;
  const master = await getUserById(masterId);

  if (!master || master.role !== 'MASTER' || master.parentUserId !== session.userId) {
    return res.status(404).json({ error: 'Master not found or unauthorized' });
  }

  const users = await getUsers();
  const clientUsers = users.filter(u => u.role === 'CLIENT' && u.parentUserId === masterId);

  // Populate positions so super master can see margin used
  const clients = await Promise.all(clientUsers.map(async (c) => {
    const positions = await calculatePositionsForUser(c.id);
    return { ...c, positions };
  }));

  res.json(clients);
});

app.put('/api/supermaster/master/:id/status', async (req, res) => {
  const session = getSessionUser(req);
  if (!session || session.role !== 'SUPER_MASTER') return res.status(401).json({ error: 'Unauthorized.' });

  const masterId = req.params.id;
  const updates = req.body;

  const master = await getUserById(masterId);
  if (!master || master.parentUserId !== session.userId) {
    return res.status(404).json({ error: 'Master not found or unauthorized' });
  }

  await updateUser(masterId, { status: updates.status });
  res.json(await getUserById(masterId));
});

app.delete('/api/supermaster/master/:id', async (req, res) => {
  const session = getSessionUser(req);
  if (!session || session.role !== 'SUPER_MASTER') return res.status(401).json({ error: 'Unauthorized.' });

  const masterId = req.params.id;
  const master = await getUserById(masterId);
  if (!master || master.parentUserId !== session.userId) {
    return res.status(404).json({ error: 'Master not found or unauthorized' });
  }

  // Check if they have clients before deleting
  const users = await getUsers();
  const myClients = users.filter(u => u.role === 'CLIENT' && u.parentUserId === masterId);
  if (myClients.length > 0) {
    return res.status(400).json({ error: 'Cannot delete a Master that has active Client accounts. Disable it instead or delete the clients first.' });
  }

  await deleteUser(masterId);
  res.json({ success: true });
});


async function squareOffClient(clientId: string) {
  const user = await getUserById(clientId);
  if (!user) return { success: false, error: 'User not found' };

  const positions = await calculatePositionsForUser(clientId);
  const executedTrades = [];

  for (const pos of positions) {
    if (pos.nQty === 0) continue;

    const action = pos.nQty > 0 ? 'SELL' : 'BUY';
    const qty = Math.abs(pos.nQty);

    let executionPrice = 0;
    const liveQuote = latestMarketData[pos.token];

    if (!liveQuote) continue;

    if (action === 'BUY') {
      if (!liveQuote.ask || liveQuote.ask <= 0) continue;
      executionPrice = liveQuote.ask;
    } else {
      if (!liveQuote.bid || liveQuote.bid <= 0) continue;
      executionPrice = liveQuote.bid;
    }

    const trade = {
      id: Math.random().toString(36).substr(2, 9),
      exch: pos.exch,
      action: action as 'BUY' | 'SELL',
      scrip: pos.scrip,
      token: pos.token,
      tQty: qty,
      tPrice: executionPrice,
      account: clientId,
      oid: Math.random().toString().substr(2, 6),
      tid: Math.random().toString().substr(2, 6),
      eTrdNum: Math.random().toString().substr(2, 6),
      eOrdNum: `202602${Math.random().toString().substr(2, 6)}`,
      trdTime: new Date().toLocaleTimeString('en-GB', { hour12: false })
    };

    await executeTradeTransaction(trade, 0);
    executedTrades.push(trade);
  }

  return { success: true, squaredOffCount: executedTrades.length, trades: executedTrades };
}

app.post('/api/admin/clients/:id/squareoff', async (req, res) => {
  const targetMasterId = await getTargetMasterId(req, res);
  if (!targetMasterId) return;

  try {
    const { id } = req.params;
    const user = await getUserById(id);
    if (!user || (user.parentUserId && user.parentUserId !== targetMasterId)) {
      return res.status(404).json({ error: 'User not found or unauthorized' });
    }

    const result = await squareOffClient(id);
    if (!result.success) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch (error: any) {
    console.error('[SQUARE-OFF] Unhandled error:', error);
    res.status(500).json({ error: 'Square-off failed', details: error?.message || 'Internal server error' });
  }
});

// RMS Limit Administration Routes
app.get('/api/admin/clients/:clientId/rms-limits', async (req, res) => {
  const targetMasterId = await getTargetMasterId(req, res);
  if (!targetMasterId) return;

  const user = await getUserById(req.params.clientId);
  if (!user || (user.parentUserId && user.parentUserId !== targetMasterId)) return res.status(404).json({ error: 'User not found or unauthorized' });

  const limits = await getRMSLimits(req.params.clientId);
  res.json(limits);
});

app.post('/api/admin/clients/:clientId/rms-limits', async (req, res) => {
  const targetMasterId = await getTargetMasterId(req, res);
  if (!targetMasterId) return;

  const user = await getUserById(req.params.clientId);
  if (!user || (user.parentUserId && user.parentUserId !== targetMasterId)) return res.status(404).json({ error: 'User not found or unauthorized' });

  await addRMSLimit({ ...req.body, userId: req.params.clientId });
  res.json({ success: true });
});

app.put('/api/admin/rms-limits/:id', async (req, res) => {
  const targetMasterId = await getTargetMasterId(req, res);
  if (!targetMasterId) return;

  await updateRMSLimit(req.params.id, req.body);
  res.json({ success: true });
});

app.delete('/api/admin/rms-limits/:id', async (req, res) => {
  const targetMasterId = await getTargetMasterId(req, res);
  if (!targetMasterId) return;

  await deleteRMSLimit(req.params.id);
  res.json({ success: true });
});

app.post('/api/admin/refresh-instruments', async (req, res) => {
  const session = getSessionUser(req);
  if (!session || (session.role !== 'MASTER' && session.role !== 'SUPER_MASTER')) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  console.log(`[ADMIN] Manual Instrument Refresh triggered via API`);
  try {
    await refreshInstruments();
    res.json({ success: true, message: `Instruments refreshed successfully. Loaded ${globalInstruments.length} items.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to refresh instruments' });
  }
});

app.get('/api/user/rms-limits/:userId', async (req, res) => {
  try {
    const limits = await getRMSLimits(req.params.userId);
    const user = await getUserById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const positions = await calculatePositionsForUser(req.params.userId);
    const blockedMargin = await getBlockedMarginForUser(req.params.userId);
    let usedMargin = 0;
    let runningM2M = 0;

    positions.forEach(p => {
      const cached = latestMarketData[p.token];
      const ltp = cached ? (cached.ltp || cached.ask || cached.bid || p.nAvg) : p.nAvg;
      if (p.nQty !== 0) {
        usedMargin += (p.nAvg * Math.abs(p.nQty));
        runningM2M += (ltp - p.nAvg) * p.nQty;
      }
    });

    res.json({
      totalCapital: user.totalCapital,
      availableCapital: user.totalCapital - usedMargin - blockedMargin,
      usedCapital: usedMargin,
      blockedMargin: blockedMargin,
      allocM2M: user.allocatedM2m || 0,
      usedMargin,
      runningM2M,
      limits: limits || []
    });
  } catch (error) {
    console.error("RMS Limits API Error:", error);
    res.status(500).json({ error: "Failed to fetch RMS limits" });
  }
});

// ===== Order Book System =====

// Helper: Validate trading session hours and weekend closure
function validateTradingSession(exchange: string): string | null {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Weekend check — all exchanges closed
  if (day === 0 || day === 6) {
    return 'Market is closed today. Please place the order during trading days.';
  }

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  // MCX: 09:00 – 23:30 IST
  if (exchange === 'MCX_FO') {
    const start = 9 * 60;       // 540
    const end = 23 * 60 + 30;   // 1410
    if (currentMinutes < start || currentMinutes >= end) {
      return 'MCX trading session is closed. Please place the order during trading hours (09:00 AM – 11:30 PM IST).';
    }
    return null;
  }

  // NSE / BSE / NFO: 09:15 – 15:30 IST
  const start = 9 * 60 + 15;   // 555
  const end = 15 * 60 + 30;    // 930
  if (currentMinutes < start || currentMinutes >= end) {
    return 'Trading time is over. Please retry during the trading session (09:15 AM – 03:30 PM IST).';
  }
  return null;
}

// Helper: Run RMS validations (shared between trade/order endpoint and matching engine)
async function validateRMS(accountId: string, stock: { id: string; exchange?: string; dispName: string; symbol?: string }, type: 'BUY' | 'SELL', qty: number, executionPrice: number): Promise<string | null> {
  const user = await getUserById(accountId);
  if (!user) return 'User not found';
  if (user.status === 'DISABLED') return 'Account disabled';

  const limits = await getRMSLimits(accountId);

  // 1. Time Validation
  const exchangeRule = limits.find(l => l.exchange === stock.exchange && (!l.instrument || l.instrument === 'ALL'));
  let activeRule = exchangeRule;
  if (exchangeRule) {
    const currentStr = new Date().toTimeString().split(' ')[0];
    if (currentStr < exchangeRule.tradeStart || currentStr > exchangeRule.tradeEnd) {
      return 'Trading not allowed for this exchange';
    }
  }

  // 2. Instrument Validation
  const instRule = limits.find(l => l.instrument === stock.dispName || l.instrument === stock.symbol);
  if (instRule) activeRule = instRule;

  if (activeRule) {
    if (activeRule.maxOrdQty > 0 && qty > activeRule.maxOrdQty) {
      return 'Order exceeds Max Order Quantity';
    }
    if (activeRule.maxNetQty > 0) {
      const positions = await calculatePositionsForUser(accountId);
      const pos = positions.find(p => p.token === stock.id);
      const currentNet = pos ? pos.nQty : 0;
      const newNet = type === 'BUY' ? currentNet + qty : currentNet - qty;
      if (Math.abs(newNet) > activeRule.maxNetQty) {
        return 'Order exceeds Max Net Quantity limit';
      }
    }
  }

  // 3. M2M Check
  if (user.allocatedM2m && user.allocatedM2m > 0) {
    let runningM2M = 0;
    const positions = await calculatePositionsForUser(accountId);
    positions.forEach(p => {
      const cached = latestMarketData[p.token];
      const ltp = cached ? (cached.ltp || cached.ask || cached.bid || p.nAvg) : p.nAvg;
      if (p.nQty !== 0) {
        runningM2M += (ltp - p.nAvg) * p.nQty;
      }
    });
    if (runningM2M <= -user.allocatedM2m) {
      return 'M2M loss exceeded Allocated M2M limit. Trading blocked.';
    }
  }

  // 4. Capital Check (includes blocked margin from pending limit orders)
  const marginRequired = executionPrice * qty;
  const positions = await calculatePositionsForUser(accountId);
  const blockedMargin = await getBlockedMarginForUser(accountId);
  let currentUsedMargin = 0;
  let currentNetQtyForStock = 0;
  positions.forEach(p => {
    currentUsedMargin += (p.nAvg * Math.abs(p.nQty));
    if (p.token === stock.id) currentNetQtyForStock = p.nQty;
  });
  const newNet = type === 'BUY' ? currentNetQtyForStock + qty : currentNetQtyForStock - qty;
  const isIncreasingExposure = Math.abs(newNet) > Math.abs(currentNetQtyForStock);
  if (isIncreasingExposure) {
    const totalCommitted = currentUsedMargin + blockedMargin;
    const availableMargin = user.totalCapital - totalCommitted;
    if (marginRequired > availableMargin) {
      return `Insufficient Capital. Required: ₹${marginRequired.toFixed(2)}, Available: ₹${availableMargin.toFixed(2)} (Used: ₹${currentUsedMargin.toFixed(2)}, Blocked: ₹${blockedMargin.toFixed(2)})`;
    }
  }

  return null; // No error
}

// Helper: Execute an order (creates trade record + updates position + updates order status)
async function executeOrder(orderId: string, accountId: string, instrument: string, token: string, side: 'BUY' | 'SELL', qty: number, executionPrice: number, exchange: string = 'NSE_FO') {
  const trade = {
    id: Math.random().toString(36).substr(2, 9),
    exch: exchange,
    action: side,
    scrip: instrument,
    token: token,
    tQty: qty,
    tPrice: executionPrice,
    account: accountId,
    oid: Math.random().toString().substr(2, 6),
    tid: Math.random().toString().substr(2, 6),
    eTrdNum: Math.random().toString().substr(2, 6),
    eOrdNum: `202602${Math.random().toString().substr(2, 6)}`,
    trdTime: new Date().toLocaleTimeString('en-GB', { hour12: false })
  };

  await executeTradeTransaction(trade, 0);
  await updateOrderStatus(orderId, 'EXECUTED', executionPrice);
  return trade;
}

app.post('/api/trade/order', async (req, res) => {
  try {
    const { accountId, stock, type, orderType } = req.body;
    const qty = Number(req.body.qty);
    const limitPrice = Number(req.body.price) || 0;

    const user = await getUserById(accountId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'DISABLED') return res.status(403).json({ error: 'Account disabled' });

    const liveQuote = latestMarketData[stock.id];
    if (!liveQuote) {
      return res.status(400).json({ error: 'Live market data unavailable for this instrument.' });
    }

    const orderId = Math.random().toString(36).substr(2, 9);
    const oid = Math.random().toString().substr(2, 6);

    // ===== Trading Session Validation =====
    const resolvedExchange = stock.exchange || stock.exch || stock.segment || 'NSE_FO';

    // Input validation — prevent null inserts
    if (!stock.id) return res.status(400).json({ error: 'Missing instrument token.' });
    if (!stock.dispName) return res.status(400).json({ error: 'Missing instrument name.' });
    if (!qty || qty <= 0) return res.status(400).json({ error: 'Invalid quantity.' });

    const sessionError = validateTradingSession(resolvedExchange);
    if (sessionError) {
      const orderRecord = await createOrder({
        id: orderId, userId: accountId, instrument: stock.dispName, token: stock.id,
        exchange: resolvedExchange, side: type, orderType: orderType || 'MARKET',
        quantity: qty, price: limitPrice, status: 'REJECTED',
        accountName: user.username, oid, rejectReason: sessionError
      });
      console.log(`[ORDER] REJECTED ${type} ${stock.dispName} x${qty}: ${sessionError}`);
      const wsMsg = JSON.stringify({ type: 'order_update', order: orderRecord, accountId });
      wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(wsMsg); });
      return res.json({ orderId: orderRecord.id, orderStatus: 'REJECTED', order: orderRecord, error: sessionError });
    }

    // ===== MARKET ORDER: Execute immediately =====
    if (!orderType || orderType === 'MARKET') {
      let executionPrice = 0;
      if (type === 'BUY') {
        if (!liveQuote.ask || liveQuote.ask <= 0) {
          return res.status(400).json({ error: 'No Ask price available (Market Depth empty or Illiquid).' });
        }
        executionPrice = liveQuote.ask;
      } else {
        if (!liveQuote.bid || liveQuote.bid <= 0) {
          return res.status(400).json({ error: 'No Bid price available (Market Depth empty or Illiquid).' });
        }
        executionPrice = liveQuote.bid;
      }

      const rmsError = await validateRMS(accountId, stock, type, qty, executionPrice);
      if (rmsError) return res.status(403).json({ error: rmsError });

      // Create order record as EXECUTED
      const orderRecord = await createOrder({
        id: orderId, userId: accountId, instrument: stock.dispName, token: stock.id,
        exchange: resolvedExchange, side: type, orderType: 'MARKET',
        quantity: qty, price: 0, executedPrice: executionPrice,
        status: 'EXECUTED', accountName: user.username, oid
      });

      // Execute the trade
      const trade = await executeOrder(orderId, accountId, stock.dispName, stock.id, type, qty, executionPrice, resolvedExchange);

      // Broadcast order update
      const wsMsg = JSON.stringify({ type: 'order_update', order: orderRecord, accountId });
      wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(wsMsg); });

      return res.json({ ...trade, orderId: orderRecord.id, orderStatus: 'EXECUTED' });
    }

    // ===== LIMIT ORDER: Create as PENDING or REJECTED =====
    if (orderType === 'LIMIT') {
      if (!limitPrice || limitPrice <= 0) {
        return res.status(400).json({ error: 'Invalid limit price.' });
      }

      // Calculate required margin for this order
      const requiredMargin = limitPrice * qty;

      // Check if limit order can be filled immediately
      let canFillNow = false;
      let fillPrice = 0;
      if (type === 'BUY' && liveQuote.ask > 0 && liveQuote.ask <= limitPrice) {
        canFillNow = true;
        fillPrice = liveQuote.ask;
      } else if (type === 'SELL' && liveQuote.bid > 0 && liveQuote.bid >= limitPrice) {
        canFillNow = true;
        fillPrice = liveQuote.bid;
      }

      if (canFillNow) {
        // Validate RMS for immediate execution
        const rmsError = await validateRMS(accountId, stock, type, qty, fillPrice);
        if (rmsError) {
          // Create REJECTED order record
          const orderRecord = await createOrder({
            id: orderId, userId: accountId, instrument: stock.dispName, token: stock.id,
            exchange: resolvedExchange, side: type, orderType: 'LIMIT',
            quantity: qty, price: limitPrice, status: 'REJECTED',
            accountName: user.username, oid, rejectReason: rmsError
          });
          console.log(`[ORDER] REJECTED ${type} LIMIT ${stock.dispName} x${qty} @ ${limitPrice}: ${rmsError}`);
          const wsMsg = JSON.stringify({ type: 'order_update', order: orderRecord, accountId });
          wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(wsMsg); });
          return res.json({ orderId: orderRecord.id, orderStatus: 'REJECTED', order: orderRecord, error: rmsError });
        }

        // Execute immediately
        const orderRecord = await createOrder({
          id: orderId, userId: accountId, instrument: stock.dispName, token: stock.id,
          exchange: resolvedExchange, side: type, orderType: 'LIMIT',
          quantity: qty, price: limitPrice, executedPrice: fillPrice,
          status: 'EXECUTED', accountName: user.username, oid
        });

        const trade = await executeOrder(orderId, accountId, stock.dispName, stock.id, type, qty, fillPrice, resolvedExchange);

        const wsMsg = JSON.stringify({ type: 'order_update', order: orderRecord, accountId });
        wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(wsMsg); });

        return res.json({ ...trade, orderId: orderRecord.id, orderStatus: 'EXECUTED' });
      }

      // --- PENDING LIMIT ORDER: Block margin ---
      // RMS validation (includes blocked margin check)
      const rmsError = await validateRMS(accountId, stock, type, qty, limitPrice);
      if (rmsError) {
        // Create REJECTED order record with reason
        const orderRecord = await createOrder({
          id: orderId, userId: accountId, instrument: stock.dispName, token: stock.id,
          exchange: resolvedExchange, side: type, orderType: 'LIMIT',
          quantity: qty, price: limitPrice, status: 'REJECTED',
          accountName: user.username, oid, rejectReason: rmsError
        });
        console.log(`[ORDER] REJECTED ${type} LIMIT ${stock.dispName} x${qty} @ ${limitPrice}: ${rmsError}`);
        const wsMsg = JSON.stringify({ type: 'order_update', order: orderRecord, accountId });
        wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(wsMsg); });
        return res.json({ orderId: orderRecord.id, orderStatus: 'REJECTED', order: orderRecord, error: rmsError });
      }

      // Place as PENDING with blocked margin
      const orderRecord = await createOrder({
        id: orderId, userId: accountId, instrument: stock.dispName, token: stock.id,
        exchange: resolvedExchange, side: type, orderType: 'LIMIT',
        quantity: qty, price: limitPrice, status: 'PENDING',
        accountName: user.username, oid, blockedMargin: requiredMargin
      });

      console.log(`[ORDER] PENDING ${type} LIMIT ${stock.dispName} x${qty} @ ${limitPrice} | Margin Blocked: ₹${requiredMargin.toFixed(2)}`);

      // Broadcast order update
      const wsMsg = JSON.stringify({ type: 'order_update', order: orderRecord, accountId });
      wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(wsMsg); });

      return res.json({ orderId: orderRecord.id, orderStatus: 'PENDING', order: orderRecord });
    }

    return res.status(400).json({ error: 'Invalid order type.' });
  } catch (error: any) {
    console.error('[ORDER] Unhandled error:', error);
    return res.status(500).json({ error: 'Order execution failed', details: error?.message || 'Internal server error' });
  }
});

// Order Book APIs
app.get('/api/orders/:accountId', async (req, res) => {
  const orders = await getOrdersForUser(req.params.accountId);
  res.json(orders);
});

app.put('/api/orders/:id/modify', async (req, res) => {
  const { price, quantity, accountId } = req.body;

  // Get the current order to calculate margin difference
  const currentOrders = await getOrdersForUser(accountId);
  const currentOrder = currentOrders.find(o => o.id === req.params.id);
  if (!currentOrder || currentOrder.status !== 'PENDING') {
    return res.status(400).json({ error: 'Order not found or not in PENDING state.' });
  }

  const newPrice = price !== undefined ? price : currentOrder.oPrice;
  const newQty = quantity !== undefined ? quantity : currentOrder.oQty;
  const newMargin = newPrice * newQty;
  const oldMargin = currentOrder.blockedMargin;
  const marginDiff = newMargin - oldMargin;

  // If margin is increasing, validate the user has enough funds
  if (marginDiff > 0) {
    const user = await getUserById(accountId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const positions = await calculatePositionsForUser(accountId);
    const blockedMarginTotal = await getBlockedMarginForUser(accountId);
    let usedMargin = 0;
    positions.forEach(p => { usedMargin += (p.nAvg * Math.abs(p.nQty)); });

    const availableMargin = user.totalCapital - usedMargin - blockedMarginTotal;
    if (marginDiff > availableMargin) {
      return res.status(400).json({ error: `Insufficient funds to modify. Additional margin needed: ₹${marginDiff.toFixed(2)}, Available: ₹${availableMargin.toFixed(2)}` });
    }
  }

  const updated = await modifyOrder(req.params.id, { price, quantity, blockedMargin: newMargin });
  if (!updated) return res.status(400).json({ error: 'Order not found or not in PENDING state.' });

  console.log(`[ORDER] MODIFIED ${currentOrder.action} LIMIT ${currentOrder.scrip}: Price ${currentOrder.oPrice} → ${newPrice}, Qty ${currentOrder.oQty} → ${newQty}, Blocked ₹${oldMargin.toFixed(2)} → ₹${newMargin.toFixed(2)}`);

  const wsMsg = JSON.stringify({ type: 'order_update', order: updated, accountId });
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(wsMsg); });

  res.json(updated);
});

app.put('/api/orders/:id/cancel', async (req, res) => {
  const cancelled = await cancelOrder(req.params.id);
  if (!cancelled) return res.status(400).json({ error: 'Order not found or not in PENDING state.' });

  console.log(`[ORDER] CANCELLED ${cancelled.action} LIMIT ${cancelled.scrip} | Margin Released: ₹${cancelled.blockedMargin.toFixed(2)}`);

  const wsMsg = JSON.stringify({ type: 'order_update', order: cancelled, accountId: req.body.accountId });
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(wsMsg); });

  res.json(cancelled);
});

app.get('/api/trade/positions/:accountId', async (req, res) => {
  const { accountId } = req.params;
  const positions = await calculatePositionsForUser(accountId);
  res.json(positions);
});

app.get('/api/trade/list/:accountId', async (req, res) => {
  const { accountId } = req.params;
  const trades = await getTradesForUser(accountId);
  res.json(trades);
});

// ===== Limit Order Matching Engine =====
function startOrderMatchingEngine() {
  console.log('[MATCHING ENGINE] Started. Checking pending limit orders every 1s.');
  setInterval(async () => {
    try {
      const pendingOrders = await getPendingLimitOrders();
      for (const row of pendingOrders) {
        const liveQuote = latestMarketData[row.token];
        if (!liveQuote) continue;

        const side = row.side as 'BUY' | 'SELL';
        const limitPrice = Number(row.price);
        const qty = Number(row.quantity);
        let shouldFill = false;
        let fillPrice = 0;

        // BUY LIMIT: execute when Ask <= limit price
        if (side === 'BUY' && liveQuote.ask > 0 && liveQuote.ask <= limitPrice) {
          shouldFill = true;
          fillPrice = liveQuote.ask;
        }
        // SELL LIMIT: execute when Bid >= limit price
        if (side === 'SELL' && liveQuote.bid > 0 && liveQuote.bid >= limitPrice) {
          shouldFill = true;
          fillPrice = liveQuote.bid;
        }

        if (shouldFill) {
          // Validate trading session before execution
          const sessionError = validateTradingSession(row.exchange || 'NSE_FO');
          if (sessionError) {
            // Market is closed — skip this order, leave it pending
            continue;
          }

          // Re-validate RMS before execution
          const rmsError = await validateRMS(
            row.user_id,
            { id: row.token, exchange: row.exchange, dispName: row.instrument, symbol: row.instrument },
            side, qty, fillPrice
          );
          if (rmsError) {
            console.log(`[MATCHING ENGINE] RMS rejected order ${row.id}: ${rmsError}`);
            continue;
          }

          console.log(`[MATCHING ENGINE] Filling ${side} LIMIT order ${row.id} for ${row.instrument} @ ${fillPrice}`);
          await executeOrder(row.id, row.user_id, row.instrument, row.token, side, qty, fillPrice, row.exchange || 'NSE_FO');

          // Fetch updated order for broadcast
          const updatedOrders = await getOrdersForUser(row.user_id);
          const updatedOrder = updatedOrders.find(o => o.id === row.id);

          const wsMsg = JSON.stringify({ type: 'order_update', order: updatedOrder, accountId: row.user_id });
          wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(wsMsg); });
        }
      }
    } catch (e) {
      console.error('[MATCHING ENGINE] Error:', e);
    }
  }, 1000);
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

let configuredUpstoxKeys = new Set<string>();

// Known index instruments that may not exist in the Upstox CSV
const INDEX_INSTRUMENTS: Record<string, { token: string; upstox_key: string }> = {
  'BSE_INDEX|SENSEX': { token: 'BSE_INDEX|SENSEX', upstox_key: 'BSE_INDEX|SENSEX' },
  'NSE_INDEX|Nifty 50': { token: 'NSE_INDEX|Nifty 50', upstox_key: 'NSE_INDEX|Nifty 50' },
};

const connectToUpstoxWS = () => {
  if (!UPSTOX_ACCESS_TOKEN) {
    console.error('CRITICAL: UPSTOX_ACCESS_TOKEN is missing in environment variables.');
    return;
  }
  setActiveProvider('UPSTOX');

  // Start with empty subscriptions, frontend dictates dynamically
  initUpstoxWS(UPSTOX_ACCESS_TOKEN, [], (feed: any) => {
    const ff = feed.ff || feed.fullFeed;
    const ffData = ff ? (ff.marketFF || ff.indexFF) : null;

    if (ffData && ffData.ltpc && ffData.ltpc.ltp) {
      const ltp = ffData.ltpc.ltp;
      const instrumentKey = feed.instrumentKey;
      const scrip = globalInstruments.find(s => s.upstox_key === instrumentKey)
        || INDEX_INSTRUMENTS[instrumentKey];

      if (scrip) {
        const update: any = {
          token: scrip.token,
          upstox_key: instrumentKey,
          ltp: ltp,
          timestamp: new Date().toISOString()
        };

        if (ffData.ltpc.cp) {
          update.close = ffData.ltpc.cp;
        }

        if (ffData.marketOHLC && ffData.marketOHLC.ohlc && ffData.marketOHLC.ohlc.length > 0) {
          // Look for '1d' interval which represents the day's OHLC
          const dayOhlc = ffData.marketOHLC.ohlc.find((o: any) => o.interval === '1d') || ffData.marketOHLC.ohlc[0];
          if (dayOhlc.open) update.open = dayOhlc.open;
          if (dayOhlc.high) update.high = dayOhlc.high;
          if (dayOhlc.low) update.low = dayOhlc.low;
        }

        if (ffData.marketLevel && ffData.marketLevel.bidAskQuote && ffData.marketLevel.bidAskQuote.length > 0) {
          const topQuote = ffData.marketLevel.bidAskQuote[0];
          update.bid = topQuote.bidP;
          update.bQty = topQuote.bidQ;
          update.ask = topQuote.askP;
          update.aQty = topQuote.askQ;
        }

        if (ffData.vtt) {
          update.volume = ffData.vtt;
        }

        latestMarketData[scrip.token] = { ...latestMarketData[scrip.token], ...update };
        const cached = latestMarketData[scrip.token];

        // Accurate market Change calculation = LTP - Previous Close
        cached.change = (cached.ltp && cached.close) ? (cached.ltp - cached.close) : 0;

        const message = JSON.stringify({ type: 'tick', data: [cached] });
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    }
  });
};

wss.on('connection', (ws) => {
  console.log('Frontend connected to WebSocket');
  ws.send(JSON.stringify({ type: 'connection', status: 'connected' }));

  const cachedUpdates = Object.values(latestMarketData);
  if (cachedUpdates.length > 0) {
    ws.send(JSON.stringify({ type: 'tick', data: cachedUpdates }));
  }

  // Listen for frontend subscribe requests
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'subscribe') {
        const tokens: string[] = data.tokens || [];
        const keysToSub: string[] = [];
        for (const token of tokens) {
          const scrip = token.includes('|')
            ? globalInstruments.find(s => s.upstox_key === token)
            : globalInstruments.find(s => s.token === token);
          const upstoxKey = scrip?.upstox_key || INDEX_INSTRUMENTS[token]?.upstox_key;
          if (upstoxKey && !configuredUpstoxKeys.has(upstoxKey)) {
            keysToSub.push(upstoxKey);
            configuredUpstoxKeys.add(upstoxKey);
          }
        }
        if (keysToSub.length > 0) {
          subscribeToInstruments(keysToSub);
        }
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  });
});

function startRiskEngine() {
  console.log("Starting Risk Monitoring Engine...");
  setInterval(async () => {
    try {
      const users = await getUsers();
      for (const user of users) {
        if (user.role !== 'CLIENT' || user.status === 'DISABLED') continue;

        const positions = await calculatePositionsForUser(user.id);
        let currentRunningM2M = 0;

        positions.forEach(p => {
          const cached = latestMarketData[p.token];
          const ltp = cached ? (cached.ltp || cached.ask || cached.bid || p.nAvg) : p.nAvg;
          if (p.nQty !== 0) {
            currentRunningM2M += (ltp - p.nAvg) * p.nQty;
          }
        });

        if (currentRunningM2M <= -user.totalCapital && user.totalCapital > 0) {
          console.log(`[RISK ENGINE] Auto Square-Off Triggered for ${user.username}. M2M: ${currentRunningM2M}, Capital: ${user.totalCapital}`);
          await squareOffClient(user.id);
          await updateUser(user.id, { status: 'DISABLED' });

          const message = JSON.stringify({ type: 'risk_alert', accountId: user.id, alertType: 'SQUARE_OFF', message: 'Your account has reached the maximum loss limit. All positions have been squared off and trading is disabled.' });
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(message);
          });
        }
        else if (currentRunningM2M <= -0.9 * user.totalCapital && user.totalCapital > 0) {
          const message = JSON.stringify({ type: 'risk_alert', accountId: user.id, alertType: 'WARNING', message: 'Warning: Your account is approaching the maximum loss limit. Please manage your positions.' });
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(message);
          });
        }
      }
    } catch (e) {
      console.error("[RISK ENGINE] Error:", e);
    }
  }, 2000); // Check every 2 seconds
}

// =============================================
// Daily Maintenance System (IST — Asia/Kolkata)
// =============================================

// 01:00 AM IST — New Trading Day Session Reset
// Order Book & Trade Book auto-filter by CURRENT_DATE in queries, 
// so no delete is needed. This job logs the session start and
// releases any stale blocked margin from yesterday's PENDING orders.
cron.schedule('0 1 * * *', async () => {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n=================================================`);
  console.log(`[CRON] 01:00 AM IST — Daily Session Reset`);
  console.log(`[CRON] Timestamp: ${timestamp}`);
  console.log(`[CRON] Order Book & Trade Book will show today's records only.`);
  console.log(`=================================================\n`);
}, { timezone: 'Asia/Kolkata' });

// 02:00 AM IST — Net Position Cleanup (remove closed positions where net_qty = 0)
cron.schedule('0 2 * * *', async () => {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[CRON] 02:00 AM IST — Net Position Cleanup | ${timestamp}`);
  await cleanupClosedPositions();
}, { timezone: 'Asia/Kolkata' });

// 03:00 AM IST — 60-Day Historical Data Retention (delete old order_book + trade_history)
cron.schedule('0 3 * * *', async () => {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[CRON] 03:00 AM IST — 60-Day Data Retention Cleanup | ${timestamp}`);
  await cleanupOldTradeHistory();
}, { timezone: 'Asia/Kolkata' });

// 04:00 AM IST — Automated Instrument Master Refresh
cron.schedule('0 4 * * *', async () => {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[CRON] 04:00 AM IST — Instrument Refresh | ${timestamp}`);
  await refreshInstruments();
}, { timezone: 'Asia/Kolkata' });

console.log('[MAINTENANCE] Daily maintenance jobs scheduled (IST):');
console.log('  • 01:00 AM — Session Reset (Order Book + Trade Book)');
console.log('  • 02:00 AM — Net Position Cleanup (net_qty = 0)');
console.log('  • 03:00 AM — 60-Day Data Retention (order_book + trade_history)');
console.log('  • 04:00 AM — Automatic Instrument Master Refresh');

async function startServer() {
  try {
    // Await instrument fetch before HTTP and WebSocket launch
    await refreshInstruments();

    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: { server: server } },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static('dist'));
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      connectToUpstoxWS();
      startRiskEngine();
      startOrderMatchingEngine();
    });
  } catch (e) {
    console.error("Failed to start server:", e);
    process.exit(1);
  }
}

startServer();
