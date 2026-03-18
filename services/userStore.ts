import { query } from './db';
import { User, TradeRecord, NetPositionRecord, RMSRecord, OrderRecord } from '../types';
import bcrypt from 'bcryptjs';

export const getUsers = async (): Promise<User[]> => {
    const res = await query(`
        SELECT u.id, u.username, u.password_hash as password, u.role, u.status, u.created_at, 
               c.assigned_capital, c.available_capital, c.used_capital, c.allocated_m2m
        FROM users u
        LEFT JOIN capital c ON u.id = c.user_id
    `);

    return res.rows.map(r => ({
        id: r.id,
        username: r.username,
        password: r.password,
        role: r.role as 'ADMIN' | 'CLIENT',
        status: r.status as 'ACTIVE' | 'DISABLED',
        capital: Number(r.assigned_capital || 0),
        totalCapital: Number(r.available_capital || 0),
        availableCapital: Number(r.available_capital || 0),
        allocatedM2m: Number(r.allocated_m2m || 0),
        createdAt: r.created_at.toISOString()
    }));
};

export const getUserById = async (id: string): Promise<User | undefined> => {
    const res = await query(`
        SELECT u.id, u.username, u.password_hash as password, u.role, u.status, u.created_at, 
               c.assigned_capital, c.available_capital, c.used_capital, c.allocated_m2m
        FROM users u
        LEFT JOIN capital c ON u.id = c.user_id
        WHERE u.id = $1
    `, [id]);

    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
        id: r.id,
        username: r.username,
        password: r.password,
        role: r.role as 'ADMIN' | 'CLIENT',
        status: r.status as 'ACTIVE' | 'DISABLED',
        capital: Number(r.assigned_capital || 0),
        totalCapital: Number(r.available_capital || 0),
        availableCapital: Number(r.available_capital || 0),
        allocatedM2m: Number(r.allocated_m2m || 0),
        createdAt: r.created_at.toISOString()
    };
};

export const getUserByUsername = async (username: string): Promise<User | undefined> => {
    const res = await query(`
        SELECT u.id, u.username, u.password_hash as password, u.role, u.status, u.created_at, 
               c.assigned_capital, c.available_capital, c.used_capital, c.allocated_m2m
        FROM users u
        LEFT JOIN capital c ON u.id = c.user_id
        WHERE u.username = $1
    `, [username]);

    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
        id: r.id,
        username: r.username,
        password: r.password,
        role: r.role as 'ADMIN' | 'CLIENT',
        status: r.status as 'ACTIVE' | 'DISABLED',
        capital: Number(r.assigned_capital || 0),
        totalCapital: Number(r.available_capital || 0),
        availableCapital: Number(r.available_capital || 0),
        allocatedM2m: Number(r.allocated_m2m || 0),
        createdAt: r.created_at.toISOString()
    };
};

export const addUser = async (user: User) => {
    await query('BEGIN');
    try {
        const hashedPassword = user.password ? await bcrypt.hash(user.password, 10) : '';

        await query(`
            INSERT INTO users (id, username, password_hash, role, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [user.id, user.username, hashedPassword, user.role, user.status, new Date(user.createdAt)]);

        await query(`
            INSERT INTO capital (user_id, assigned_capital, available_capital, used_capital, allocated_m2m)
            VALUES ($1, $2, $3, 0, $4)
        `, [user.id, user.capital, user.totalCapital, user.allocatedM2m || 0]);

        await query('COMMIT');
    } catch (e) {
        await query('ROLLBACK');
        throw e;
    }
};

export const updateUser = async (id: string, updates: Partial<User>) => {
    await query('BEGIN');
    try {
        if (updates.status || updates.role || updates.password) {
            const setFields = [];
            const values = [];
            let i = 1;
            if (updates.status) { setFields.push(`status = $${i++}`); values.push(updates.status); }
            if (updates.role) { setFields.push(`role = $${i++}`); values.push(updates.role); }
            if (updates.password) {
                const hashedPassword = await bcrypt.hash(updates.password, 10);
                setFields.push(`password_hash = $${i++}`);
                values.push(hashedPassword);
            }

            if (setFields.length > 0) {
                values.push(id);
                await query(`UPDATE users SET ${setFields.join(', ')} WHERE id = $${i}`, values);
            }
        }

        if (updates.capital !== undefined || updates.totalCapital !== undefined || updates.allocatedM2m !== undefined) {
            const setFields = [];
            const values = [];
            let i = 1;
            if (updates.capital !== undefined) { setFields.push(`assigned_capital = $${i++}`); values.push(updates.capital); }
            if (updates.totalCapital !== undefined) { setFields.push(`available_capital = $${i++}`); values.push(updates.totalCapital); }
            if (updates.allocatedM2m !== undefined) { setFields.push(`allocated_m2m = $${i++}`); values.push(updates.allocatedM2m); }

            if (setFields.length > 0) {
                values.push(id);
                await query(`UPDATE capital SET ${setFields.join(', ')} WHERE user_id = $${i}`, values);
            }
        }
        await query('COMMIT');
    } catch (e) {
        await query('ROLLBACK');
        throw e;
    }
};

export const deleteUser = async (id: string) => {
    await query(`DELETE FROM users WHERE id = $1`, [id]);
};

// Trades Logic
export const getTrades = async (): Promise<TradeRecord[]> => {
    const res = await query(`SELECT ob.*, u.username FROM order_book ob LEFT JOIN users u ON ob.user_id = u.id WHERE ob.status = 'COMPLETE' OR ob.status = 'EXECUTED' ORDER BY ob.created_at DESC`);
    return res.rows.map(r => ({
        id: r.id,
        exch: r.exch,
        action: r.side as 'BUY' | 'SELL',
        scrip: r.instrument,
        token: r.token,
        tQty: Number(r.quantity),
        tPrice: Number(r.execution_price),
        account: r.username || r.user_id,
        oid: r.oid,
        tid: r.tid,
        eTrdNum: r.eTrdNum,
        eOrdNum: r.eOrdNum,
        trdTime: r.created_at.toLocaleTimeString('en-GB', { hour12: false })
    }));
};

export const getTradesForUser = async (accountId: string): Promise<TradeRecord[]> => {
    const res = await query(
        `SELECT ob.*, u.username FROM order_book ob LEFT JOIN users u ON ob.user_id = u.id WHERE ob.user_id = $1 AND (ob.status = 'COMPLETE' OR ob.status = 'EXECUTED') AND ob.created_at >= CURRENT_DATE ORDER BY ob.created_at DESC`,
        [accountId]
    );
    return res.rows.map(r => ({
        id: r.id,
        exch: r.exch,
        action: r.side as 'BUY' | 'SELL',
        scrip: r.instrument,
        token: r.token,
        tQty: Number(r.quantity),
        tPrice: Number(r.execution_price),
        account: r.username || r.user_id,
        oid: r.oid,
        tid: r.tid,
        eTrdNum: r.eTrdNum,
        eOrdNum: r.eOrdNum,
        trdTime: r.created_at.toLocaleTimeString('en-GB', { hour12: false })
    }));
};

export const executeTradeTransaction = async (trade: TradeRecord, marginImpact: number) => {
    await query('BEGIN');
    try {
        // 1. Insert into order_book
        await query(`
            INSERT INTO order_book (id, user_id, instrument, token, quantity, price, execution_price, side, order_type, status, exch, oid, tid, eTrdNum, eOrdNum, account_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
            trade.id, trade.account, trade.scrip, trade.token, trade.tQty, trade.tPrice, trade.tPrice, trade.action, 'MARKET', 'EXECUTED', trade.exch, trade.oid, trade.tid, trade.eTrdNum, trade.eOrdNum, trade.account
        ]);

        // 2. Insert into trade_history
        await query(`
            INSERT INTO trade_history (id, user_id, instrument, quantity, price, side, pnl)
            VALUES ($1, $2, $3, $4, $5, $6, 0)
        `, [
            trade.id, trade.account, trade.scrip, trade.tQty, trade.tPrice, trade.action
        ]);

        // 3. Upsert into positions
        // We first try to select the existing position for this account + token
        const posRes = await query(`SELECT * FROM positions WHERE user_id = $1 AND token = $2 FOR UPDATE`, [trade.account, trade.token]);
        let pos = posRes.rows[0];

        if (!pos) {
            // Create new position row if doesn't exist
            await query(`
                INSERT INTO positions (user_id, instrument, token, buy_qty, buy_avg, sell_qty, sell_avg, net_quantity, average_price, m2m)
                VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 0)
            `, [trade.account, trade.scrip, trade.token]);

            // Re-fetch to guarantee object layout
            const newPosRes = await query(`SELECT * FROM positions WHERE user_id = $1 AND token = $2 FOR UPDATE`, [trade.account, trade.token]);
            pos = newPosRes.rows[0];
        }

        // Calculate new position math
        let bQty = Number(pos.buy_qty);
        let bAvg = Number(pos.buy_avg);
        let sQty = Number(pos.sell_qty);
        let sAvg = Number(pos.sell_avg);
        let tQty = Number(trade.tQty);
        let tPrice = Number(trade.tPrice);

        let realizedPnL = 0;

        // Current Net Position before trade
        const currentNetQty = bQty - sQty;

        if (trade.action === 'BUY') {
            const totalVal = (bAvg * bQty) + (tPrice * tQty);
            bQty += tQty;
            bAvg = bQty > 0 ? totalVal / bQty : 0;

            // If current position is short, a BUY closes it. Calculate Realized PnL.
            if (currentNetQty < 0) {
                const closedQty = Math.min(Math.abs(currentNetQty), tQty);
                // For a short, profit is when (SellAvg - BuyPrice) > 0
                const shortAvgPrice = Number(pos.sell_avg);
                realizedPnL = (shortAvgPrice - tPrice) * closedQty;
            }
        } else {
            const totalVal = (sAvg * sQty) + (tPrice * tQty);
            sQty += tQty;
            sAvg = sQty > 0 ? totalVal / sQty : 0;

            // If current position is long, a SELL closes it. Calculate Realized PnL.
            if (currentNetQty > 0) {
                const closedQty = Math.min(currentNetQty, tQty);
                // For a long, profit is when (SellPrice - BuyAvg) > 0
                const longAvgPrice = Number(pos.buy_avg);
                realizedPnL = (tPrice - longAvgPrice) * closedQty;
            }
        }

        const nQty = bQty - sQty;
        let nAvg = 0;
        if (nQty > 0) {
            nAvg = bAvg;
        } else if (nQty < 0) {
            nAvg = sAvg;
        }

        await query(`
            UPDATE positions
            SET buy_qty = $1, buy_avg = $2, sell_qty = $3, sell_avg = $4, net_quantity = $5, average_price = $6, updated_at = NOW()
            WHERE id = $7
        `, [bQty, bAvg, sQty, sAvg, nQty, nAvg, pos.id]);

        // 4. Update Capital natively! (We ONLY add realized PnL to totalCapital which maps to available_capital column)
        // Note: available_capital in DB represents Total Capital. used_capital is deprecated physically, computed in memory normally.
        if (realizedPnL !== 0) {
            await query(`
                UPDATE capital 
                SET available_capital = available_capital + $1
                WHERE user_id = $2
             `, [realizedPnL, trade.account]);
        }

        await query('COMMIT');
    } catch (e) {
        await query('ROLLBACK');
        console.error('CRITICAL: Transaction rollback due to error:', e);
        throw e;
    }
};

export const calculatePositionsForUser = async (accountId: string): Promise<NetPositionRecord[]> => {
    const res = await query(`
        SELECT p.id, p.instrument, p.token, p.buy_qty, p.buy_avg, p.sell_qty, p.sell_avg, p.net_quantity, p.average_price, p.m2m,
               u.username, i.exchange
        FROM positions p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN instruments i ON p.token = i.token
        WHERE p.user_id = $1
    `, [accountId]);

    return res.rows.map(r => ({
        id: r.id.toString(),
        exch: r.exchange || 'FONSE',
        scrip: r.instrument,
        token: r.token,
        bQty: Number(r.buy_qty),
        bAvg: Number(r.buy_avg),
        sQty: Number(r.sell_qty),
        sAvg: Number(r.sell_avg),
        account: r.username,
        nQty: Number(r.net_quantity),
        nAvg: Number(r.average_price),
        m2m: Number(r.m2m) || 0
    }));
};

export const cleanupClosedPositions = async () => {
    try {
        const res = await query(`DELETE FROM positions WHERE net_quantity = 0`);
        console.log(`[CLEANUP] Deleted ${res.rowCount} closed positions at Midnight.`);
    } catch (e) {
        console.error('[CLEANUP] Failed to clean up closed positions:', e);
    }
};

export const cleanupOldTradeHistory = async () => {
    try {
        const resTrades = await query(`DELETE FROM trade_history WHERE created_at < NOW() - INTERVAL '60 days'`);
        console.log(`[CLEANUP] Deleted ${resTrades.rowCount} old trade history records.`);
        const resOrders = await query(`DELETE FROM order_book WHERE created_at < NOW() - INTERVAL '60 days'`);
        console.log(`[CLEANUP] Deleted ${resOrders.rowCount} old order book records.`);
    } catch (e) {
        console.error('[CLEANUP] Failed to clean up old records:', e);
    }
};

// RMS Limits Logic
export const getRMSLimits = async (userId: string): Promise<RMSRecord[]> => {
    const res = await query(`
        SELECT id, user_id, instrument, max_order_qty, max_net_qty, exchange, trade_start, trade_end
        FROM rms_limits
        WHERE user_id = $1
    `, [userId]);

    return res.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        instrument: r.instrument,
        maxOrdQty: r.max_order_qty,
        maxNetQty: r.max_net_qty,
        exchange: r.exchange,
        tradeStart: r.trade_start,
        tradeEnd: r.trade_end
    }));
};

export const addRMSLimit = async (limit: RMSRecord) => {
    await query(`
        INSERT INTO rms_limits (user_id, instrument, max_order_qty, max_net_qty, exchange, trade_start, trade_end)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [limit.userId, limit.instrument, limit.maxOrdQty, limit.maxNetQty, limit.exchange, limit.tradeStart, limit.tradeEnd]);
};

export const updateRMSLimit = async (id: number | string, updates: Partial<RMSRecord>) => {
    const setFields = [];
    const values = [];
    let i = 1;

    if (updates.instrument) { setFields.push(`instrument = $${i++}`); values.push(updates.instrument); }
    if (updates.maxOrdQty !== undefined) { setFields.push(`max_order_qty = $${i++}`); values.push(updates.maxOrdQty); }
    if (updates.maxNetQty !== undefined) { setFields.push(`max_net_qty = $${i++}`); values.push(updates.maxNetQty); }
    if (updates.exchange) { setFields.push(`exchange = $${i++}`); values.push(updates.exchange); }
    if (updates.tradeStart) { setFields.push(`trade_start = $${i++}`); values.push(updates.tradeStart); }
    if (updates.tradeEnd) { setFields.push(`trade_end = $${i++}`); values.push(updates.tradeEnd); }

    if (setFields.length > 0) {
        values.push(id);
        await query(`UPDATE rms_limits SET ${setFields.join(', ')} WHERE id = $${i}`, values);
    }
};

export const deleteRMSLimit = async (id: number | string) => {
    await query(`DELETE FROM rms_limits WHERE id = $1`, [id]);
};

// =============================================
// Order Book Logic
// =============================================

const mapOrderRow = (r: any): OrderRecord => ({
    id: r.id,
    exch: r.exchange || 'FONSE',
    action: r.side as 'BUY' | 'SELL',
    scrip: r.instrument,
    token: r.token,
    oQty: Number(r.quantity),
    rQty: Number(r.remaining_qty),
    oPrice: Number(r.price),
    status: r.status as OrderRecord['status'],
    account: r.account_name || r.user_id,
    tQty: r.status === 'EXECUTED' ? Number(r.quantity) : 0,
    dQty: Number(r.disclosed_qty || 0),
    dRemQty: r.status === 'EXECUTED' ? 0 : Number(r.disclosed_qty || 0),
    slPrice: Number(r.sl_price || 0),
    oType: r.order_type as 'MARKET' | 'LIMIT',
    oTerm: 'DAY',
    instrument: r.instrument,
    blockedMargin: Number(r.blocked_margin || 0),
    rejectReason: r.reject_reason || '',
    createdAt: r.created_at ? new Date(r.created_at).toLocaleTimeString('en-GB', { hour12: false }) : '',
    executedAt: r.executed_at ? new Date(r.executed_at).toLocaleTimeString('en-GB', { hour12: false }) : undefined,
});

export const createOrder = async (order: {
    id: string;
    userId: string;
    instrument: string;
    token: string;
    exchange: string;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
    quantity: number;
    price: number;
    status: string;
    disclosedQty?: number;
    slPrice?: number;
    accountName: string;
    oid: string;
    executedPrice?: number;
    blockedMargin?: number;
    rejectReason?: string;
}): Promise<OrderRecord> => {
    const res = await query(`
        INSERT INTO order_book (id, user_id, instrument, token, exchange, side, order_type, quantity, price, executed_price, status, sl_price, disclosed_qty, remaining_qty, account_name, oid, blocked_margin, reject_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
    `, [
        order.id, order.userId, order.instrument, order.token, order.exchange,
        order.side, order.orderType, order.quantity, order.price,
        order.executedPrice || 0, order.status,
        order.slPrice || 0, order.disclosedQty || 0,
        order.status === 'EXECUTED' ? 0 : order.quantity,
        order.accountName, order.oid,
        order.blockedMargin || 0, order.rejectReason || ''
    ]);
    return mapOrderRow(res.rows[0]);
};

export const getOrdersForUser = async (userId: string): Promise<OrderRecord[]> => {
    const res = await query(
        `SELECT * FROM order_book WHERE user_id = $1 AND created_at >= CURRENT_DATE ORDER BY created_at DESC`,
        [userId]
    );
    return res.rows.map(mapOrderRow);
};

export const updateOrderStatus = async (
    id: string,
    status: string,
    executedPrice?: number
): Promise<OrderRecord | null> => {
    const sets = [`status = $1`, `updated_at = NOW()`];
    const vals: any[] = [status];
    let idx = 2;

    if (status === 'EXECUTED') {
        sets.push(`executed_at = NOW()`);
        sets.push(`remaining_qty = 0`);
        sets.push(`blocked_margin = 0`); // Release blocked margin on execution
        if (executedPrice !== undefined) {
            sets.push(`executed_price = $${idx++}`);
            vals.push(executedPrice);
        }
    }

    vals.push(id);
    const res = await query(
        `UPDATE order_book SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        vals
    );
    if (res.rows.length === 0) return null;
    return mapOrderRow(res.rows[0]);
};

export const modifyOrder = async (
    id: string,
    updates: { price?: number; quantity?: number; blockedMargin?: number }
): Promise<OrderRecord | null> => {
    const sets: string[] = [`updated_at = NOW()`];
    const vals: any[] = [];
    let idx = 1;

    if (updates.price !== undefined) {
        sets.push(`price = $${idx++}`);
        vals.push(updates.price);
    }
    if (updates.quantity !== undefined) {
        sets.push(`quantity = $${idx++}`);
        vals.push(updates.quantity);
        sets.push(`remaining_qty = $${idx++}`);
        vals.push(updates.quantity);
    }
    if (updates.blockedMargin !== undefined) {
        sets.push(`blocked_margin = $${idx++}`);
        vals.push(updates.blockedMargin);
    }

    vals.push(id);
    const res = await query(
        `UPDATE order_book SET ${sets.join(', ')} WHERE id = $${idx} AND status = 'PENDING' RETURNING *`,
        vals
    );
    if (res.rows.length === 0) return null;
    return mapOrderRow(res.rows[0]);
};

export const cancelOrder = async (id: string): Promise<OrderRecord | null> => {
    const res = await query(
        `UPDATE order_book SET status = 'CANCELLED', blocked_margin = 0, updated_at = NOW() WHERE id = $1 AND status = 'PENDING' RETURNING *`,
        [id]
    );
    if (res.rows.length === 0) return null;
    return mapOrderRow(res.rows[0]);
};

export const getBlockedMarginForUser = async (userId: string): Promise<number> => {
    const res = await query(
        `SELECT COALESCE(SUM(blocked_margin), 0) as total_blocked FROM order_book WHERE user_id = $1 AND status = 'PENDING'`,
        [userId]
    );
    return Number(res.rows[0].total_blocked);
};

export const getPendingLimitOrders = async (): Promise<any[]> => {
    const res = await query(
        `SELECT ob.*, u.username FROM order_book ob JOIN users u ON ob.user_id = u.id WHERE ob.status = 'PENDING' AND ob.order_type = 'LIMIT'`
    );
    return res.rows;
};
