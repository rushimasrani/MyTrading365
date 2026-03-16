import { useState, useEffect, useRef } from 'react';
import { StockData } from '../types';

export const useMarketData = (initialStocks: StockData[], onRiskAlert?: (msg: any) => void, onOrderUpdate?: (msg: any) => void) => {
  const [stocks, setStocks] = useState<StockData[]>(initialStocks);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingTokens = useRef<Set<string>>(new Set(initialStocks.map(s => s.id)));

  const subscribe = (tokens: string[]) => {
    tokens.forEach(t => pendingTokens.current.add(t));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', tokens: Array.from(pendingTokens.current) }));
    }
  };

  useEffect(() => {
    // Connect to local WebSocket server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Market Data Stream');
      if (pendingTokens.current.size > 0) {
        ws.send(JSON.stringify({ type: 'subscribe', tokens: Array.from(pendingTokens.current) }));
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

  return { stocks, setStocks, subscribe };
};
