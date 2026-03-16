import WebSocket from 'ws';
import protobuf from 'protobufjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let ws: WebSocket | null = null;
let root: protobuf.Root | null = null;

export const initUpstoxWS = async (
  accessToken: string,
  instrumentKeys: string[],
  onTick: (data: any) => void
) => {
  try {
    // 1️⃣ Load protobuf schema (ONCE)
    if (!root) {
      root = await protobuf.load(
        path.join(__dirname, 'MarketDataFeedV3.proto')
      );
    }

    // 2️⃣ Correct package + message name (VERY IMPORTANT)
    const FeedResponse = root.lookupType(
      'com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse'
    );

    console.log('Authorizing Upstox WebSocket...');

    // 3️⃣ REST authorize call (MANDATORY)
    const authResp = await fetch(
      'https://api.upstox.com/v3/feed/market-data-feed/authorize',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Api-Version': '3.0',
          'Accept': 'application/json'
        },
      }
    );

    if (!authResp.ok) {
      throw new Error(`Upstox authorize failed: ${authResp.status}`);
    }

    const authJson = await authResp.json();
    const wsUrl = authJson.data.authorized_redirect_uri;

    console.log('Connecting to Upstox WebSocket...');

    // 4️⃣ Connect to AUTHORIZED WebSocket URL (NO HEADERS)
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.log('UPSTOX: CONNECTED');

      // 5️⃣ Subscribe to instruments
      const subscribePayload = {
        guid: 'upstox-feed',
        method: 'sub',
        data: {
          instrumentKeys,
          mode: 'full', // can be "ltpc" also
        },
      };

      ws?.send(Buffer.from(JSON.stringify(subscribePayload)));
    });

    ws.on('message', (data: Buffer) => {
      try {
        // 6️⃣ Decode protobuf binary data
        const decoded = FeedResponse.decode(data);
        const message = FeedResponse.toObject(decoded, {
          longs: Number,
          enums: String,
        });

        // 7️⃣ Emit each feed to caller
        if (message.feeds) {
          Object.entries(message.feeds).forEach(([key, feed]: [string, any]) => {
            feed.instrumentKey = key;
            onTick(feed);
          });
        }
      } catch (err) {
        console.error('Decode error:', err);
      }
    });

    ws.on('close', () => {
      console.log('UPSTOX: DISCONNECTED');
    });

    ws.on('error', (err) => {
      console.error('UPSTOX ERROR:', err);
    });
  } catch (error) {
    console.error('Failed to initialize Upstox WebSocket:', error);
  }
};

export const closeUpstoxWS = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
};

export const subscribeToInstruments = (instrumentKeys: string[]) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const subscribePayload = {
      guid: 'upstox-feed',
      method: 'sub',
      data: {
        instrumentKeys,
        mode: 'full', // can be "ltpc" also
      },
    };
    ws.send(Buffer.from(JSON.stringify(subscribePayload)));
    console.log(`Subscribed dynamically to ${instrumentKeys.length} instruments.`);
  }
};