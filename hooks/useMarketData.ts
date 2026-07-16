import { useState, useEffect, useRef } from 'react';
import { StockData, NetPositionRecord, OrderRecord } from '../types';

export const useMarketData = (
  initialStocks: StockData[], 
  positions: NetPositionRecord[], 
  orders: OrderRecord[], 
  onRiskAlert?: (msg: any) => void, 
  onOrderUpdate?: (msg: any) => void
) => {
  const [stocks, setStocks] = useState<StockData[]>(initialStocks);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Track currently active subscriptions on the server for this client
  const activeTokens = useRef<Set<string>>(new Set());

  // We no longer manually call subscribe from the UI. 
  // It is fully derived from UI Watchlist (stocks), positions, and orders.
  const subscribe = (tokens: string[]) => {
    // Kept for backward compatibility if needed, but no-op now since useEffect handles it.
  };

  useEffect(() => {
    // Connect to local WebSocket server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Market Data Stream');
      if (activeTokens.current.size > 0) {
        ws.send(JSON.stringify({ type: 'subscribe', tokens: Array.from(activeTokens.current) }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'tick') {
          const updates = message.data;

          setStocks(currentStocks =>
            currentStocks.map(stock => {
              const update = updates.find((u: any) => u.token === stock.id);
              if (update) {
                return {
                  ...stock,
                  ltp: update.ltp,
                  change: update.change,
                  bid: update.bid !== undefined ? update.bid : stock.bid,
                  ask: update.ask !== undefined ? update.ask : stock.ask,
                  bQty: update.bQty !== undefined ? update.bQty : stock.bQty,
                  aQty: update.aQty !== undefined ? update.aQty : stock.aQty,
                  open: update.open !== undefined ? update.open : stock.open,
                  high: update.high !== undefined ? update.high : stock.high,
                  low: update.low !== undefined ? update.low : stock.low,
                  pClose: update.close !== undefined ? update.close : stock.pClose,
                  volume: update.volume !== undefined ? update.volume : stock.volume,
                  timestamp: update.timestamp,
                };
              }
              return stock;
            })
          );
        } else if (message.type === 'risk_alert') {
          if (onRiskAlert) onRiskAlert(message);
        } else if (message.type === 'order_update') {
          if (onOrderUpdate) onOrderUpdate(message);
        }
      } catch (e) {
        console.error('Error parsing WS message:', e);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from Market Data Stream');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Compute required tokens and send diffs to server
  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const requiredTokens = new Set<string>();
    stocks.forEach(s => requiredTokens.add(s.id));
    positions.filter(p => p.nQty !== 0).forEach(p => requiredTokens.add(p.token));
    orders.filter(o => o.status === 'PENDING').forEach(o => requiredTokens.add(o.token));

    const toSubscribe: string[] = [];
    const toUnsubscribe: string[] = [];

    // Find new tokens to subscribe
    requiredTokens.forEach(t => {
      if (!activeTokens.current.has(t)) {
        toSubscribe.push(t);
        activeTokens.current.add(t);
      }
    });

    // Find old tokens to unsubscribe
    activeTokens.current.forEach(t => {
      if (!requiredTokens.has(t)) {
        toUnsubscribe.push(t);
        activeTokens.current.delete(t);
      }
    });

    if (toSubscribe.length > 0) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', tokens: toSubscribe }));
    }
    if (toUnsubscribe.length > 0) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', tokens: toUnsubscribe }));
    }
  }, [stocks, positions, orders]);

  return { stocks, setStocks, subscribe };
};
