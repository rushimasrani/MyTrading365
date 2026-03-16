import { useState, useEffect } from 'react';
import { TradeRecord, NetPositionRecord, StockData, OrderRecord } from '../types';

export const useOrderManager = (accountId: string | null) => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [positions, setPositions] = useState<NetPositionRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [liveCapital, setLiveCapital] = useState<number | null>(null);

  useEffect(() => {
    if (accountId) {
      fetchData();
    }
  }, [accountId]);

  const fetchData = async () => {
    try {
      if (!accountId) return;
      const tRes = await fetch(`/api/trade/list/${accountId}`);
      const tData = await tRes.json();
      setTrades(tData);

      const pRes = await fetch(`/api/trade/positions/${accountId}`);
      const pData = await pRes.json();
      setPositions(pData);

      const oRes = await fetch(`/api/orders/${accountId}`);
      const oData = await oRes.json();
      setOrders(oData);

      const rmsRes = await fetch(`/api/user/rms-limits/${accountId}`);
      if (rmsRes.ok) {
        const rmsData = await rmsRes.json();
        setLiveCapital(rmsData.totalCapital);
      }
    } catch (e) {
      console.error('Failed to fetch trades', e);
    }
  };

  const placeOrder = async (stock: StockData, type: 'BUY' | 'SELL', qty: number, price: number, orderType: 'MARKET' | 'LIMIT' = 'MARKET') => {
    if (!accountId) return null;

    try {
      const res = await fetch('/api/trade/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, stock, type, qty, price, orderType })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to place order');
        return null;
      }

      // Re-fetch data to sync with backend
      await fetchData();
      return data;
    } catch (e) {
      console.error(e);
      alert('Network error placing order');
      return null;
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to cancel order');
        return;
      }
      await fetchData();
    } catch (e) {
      console.error('Cancel order error:', e);
      alert('Network error cancelling order');
    }
  };

  const modifyOrder = async (orderId: string, price: number, quantity: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/modify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price, quantity, accountId })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to modify order');
        return;
      }
      await fetchData();
    } catch (e) {
      console.error('Modify order error:', e);
      alert('Network error modifying order');
    }
  };

  // Handle WebSocket order updates
  const handleOrderUpdate = () => {
    fetchData();
  };

  return { trades, positions, orders, placeOrder, cancelOrder, modifyOrder, liveCapital, handleOrderUpdate };
};
