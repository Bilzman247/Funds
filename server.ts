import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const DERIV_APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || process.env.VITE_DERIV_APP_ID || '33E1sj7WNaMsjg5MAxPyS';
const DERIV_ENV = process.env.NEXT_PUBLIC_DERIV_ENV || 'production';
const DERIV_OAUTH_URL = DERIV_ENV === 'staging' ? 'https://staging-oauth.deriv.com' : 'https://oauth.deriv.com';
const DERIV_API_URL = DERIV_ENV === 'staging' ? 'https://staging-api.deriv.com' : 'https://api.deriv.com';

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'G-Squad', timestamp: new Date().toISOString() });
});

/**
 * Deriv OAuth 2.0 PKCE Token Exchange Proxy
 * Avoids any browser CORS restrictions when exchanging authorization code for tokens
 */
app.post('/api/deriv/token', async (req, res) => {
  try {
    const { code, code_verifier, client_id, redirect_uri } = req.body;

    if (!code || !code_verifier) {
      return res.status(400).json({ error: 'Missing code or code_verifier' });
    }

    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('client_id', client_id || DERIV_APP_ID);
    params.set('code', code);
    params.set('redirect_uri', redirect_uri || 'https://g-squad.buzz');
    params.set('code_verifier', code_verifier);

    const response = await fetch(`${DERIV_OAUTH_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error exchanging Deriv token:', error);
    res.status(500).json({ error: error.message || 'Internal server error exchanging token' });
  }
});

/**
 * Deriv Accounts List Proxy
 */
app.get('/api/deriv/accounts', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const appId = req.headers['x-deriv-app-id'] || DERIV_APP_ID;

    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const response = await fetch(`${DERIV_API_URL}/trading/v1/options/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Deriv-App-ID': String(appId),
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Error fetching Deriv accounts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Deriv accounts' });
  }
});

/**
 * Deriv WebSocket OTP Proxy
 */
app.post('/api/deriv/otp', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { account_id, app_id } = req.body;

    if (!authHeader || !account_id) {
      return res.status(400).json({ error: 'Missing account_id or Authorization header' });
    }

    const response = await fetch(`${DERIV_API_URL}/trading/v1/options/accounts/${account_id}/otp`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Deriv-App-ID': String(app_id || DERIV_APP_ID),
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Error fetching Deriv OTP:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Deriv OTP' });
  }
});

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`G-Squad Deriv server running on port ${PORT}`);
});
