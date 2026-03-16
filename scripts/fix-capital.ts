import { query } from '../services/db';

async function fixCapital() {
    console.log("Fixing user capital baselines...");
    
    // Get all users
    const users = await query('SELECT user_id, assigned_capital FROM capital');
    
    for (const u of users.rows) {
        const userId = u.user_id;
        const assignedCapital = Number(u.assigned_capital);
        
        // Calculate total historical Realized PnL mathematically from fully and partially closed positions
        const posRes = await query(`SELECT buy_qty, buy_avg, sell_qty, sell_avg FROM positions WHERE user_id = $1`, [userId]);
        
        let totalRealizedPnL = 0;
        
        for (const p of posRes.rows) {
            const bQty = Number(p.buy_qty);
            const bAvg = Number(p.buy_avg);
            const sQty = Number(p.sell_qty);
            const sAvg = Number(p.sell_avg);
            
            // The formula for Realized PnL of ANY position (fully or partially closed) is:
            // closed_quantity * (sell_avg - buy_avg)
            const closedQty = Math.min(bQty, sQty);
            if (closedQty > 0) {
                totalRealizedPnL += closedQty * (sAvg - bAvg);
            }
        }
        
        const correctAvailableCapital = assignedCapital + totalRealizedPnL;
        
        console.log(`User: ${userId} | Assigned: ${assignedCapital} | Realized PnL: ${totalRealizedPnL} | New Available: ${correctAvailableCapital}`);
        
        // Update database
        await query(`UPDATE capital SET available_capital = $1 WHERE user_id = $2`, [correctAvailableCapital, userId]);
    }
    
    console.log("Capital fixed successfully.");
    process.exit(0);
}

fixCapital();
