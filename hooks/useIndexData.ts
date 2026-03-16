import { useState, useEffect, useRef } from 'react';
import { MarketIndex } from '../types';
import { INDICES as INITIAL_INDICES } from '../constants';

export const useIndexData = () => {
    const [indices, setIndices] = useState<MarketIndex[]>(INITIAL_INDICES);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Only subscribe to explicit upstox keys to avoid token collisions
        const indexKeys = ['BSE_INDEX|SENSEX', 'NSE_INDEX|Nifty 50'];

        // Connect to local WebSocket server just for indices
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to Index Data Stream');
            ws.send(JSON.stringify({ type: 'subscribe', tokens: indexKeys }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'tick') {
                    const updates = message.data;

                    setIndices(currentIndices =>
                        currentIndices.map(index => {
                            // The backend pushes uniquely identifiable 'upstox_key' payloads
                            const update = updates.find((u: any) => u.upstox_key === index.upstox_key);
                            if (update) {
                                return {
                                    ...index,
                                    value: update.ltp,
                                    change: update.change
                                };
                            }
                            return index;
                        })
                    );
                }
            } catch (e) {
                console.error('Error parsing WS message in useIndexData:', e);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from Index Data Stream');
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, []);

    return { indices };
};
