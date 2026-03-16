import 'dotenv/config';

const UPSTOX_ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN;

async function testAuth() {
    if (!UPSTOX_ACCESS_TOKEN) {
        console.error('No token found');
        return;
    }

    try {
        console.log('Testing v2 authorize...');
        const authRespV2 = await fetch('https://api.upstox.com/v2/feed/market-data-feed/authorize', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${UPSTOX_ACCESS_TOKEN}`,
                'Api-Version': '2.0',
                'Accept': 'application/json'
            },
        });

        console.log(`v2 Status: ${authRespV2.status}`);
        const v2Text = await authRespV2.text();
        console.log(`v2 Response: ${v2Text}`);

        console.log('\nTesting v3 authorize...');
        const authRespV3 = await fetch('https://api.upstox.com/v3/feed/market-data-feed/authorize', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${UPSTOX_ACCESS_TOKEN}`,
                'Api-Version': '3.0',
                'Accept': 'application/json'
            },
        });

        console.log(`v3 Status: ${authRespV3.status}`);
        const v3Text = await authRespV3.text();
        console.log(`v3 Response: ${v3Text}`);

    } catch (err) {
        console.error('Error:', err);
    }
}

testAuth();
