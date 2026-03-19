/**
 * OIDC Testing Client - Backend Server
 * 
 * This server provides:
 * - Proxy endpoints for OIDC operations (to avoid CORS issues)
 * - Token validation and inspection
 * - JWKS verification
 * - Callback handling for authorization flows
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const jose = require('jose');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Discovery endpoint - fetch OIDC configuration
app.post('/api/discovery', async (req, res) => {
  try {
    const { issuerUrl } = req.body;
    
    if (!issuerUrl) {
      return res.status(400).json({ error: 'Issuer URL is required' });
    }

    const wellKnownUrl = issuerUrl.endsWith('/')
      ? `${issuerUrl}.well-known/openid-configuration`
      : `${issuerUrl}/.well-known/openid-configuration`;

    const response = await axios.get(wellKnownUrl, {
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Discovery error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch OIDC configuration',
      details: error.message 
    });
  }
});

// JWKS endpoint - fetch JSON Web Key Set
app.post('/api/jwks', async (req, res) => {
  try {
    const { jwksUri } = req.body;
    
    if (!jwksUri) {
      return res.status(400).json({ error: 'JWKS URI is required' });
    }

    const response = await axios.get(jwksUri, {
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
    });

    res.json(response.data);
  } catch (error) {
    console.error('JWKS fetch error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch JWKS',
      details: error.message 
    });
  }
});

// Token exchange endpoint
app.post('/api/token', async (req, res) => {
  try {
    const { tokenEndpoint, grantType, code, redirectUri, clientId, clientSecret, codeVerifier, refreshToken, scope } = req.body;
    
    if (!tokenEndpoint) {
      return res.status(400).json({ error: 'Token endpoint is required' });
    }

    const params = new URLSearchParams();
    params.append('grant_type', grantType || 'authorization_code');
    
    if (code) params.append('code', code);
    if (redirectUri) params.append('redirect_uri', redirectUri);
    if (clientId) params.append('client_id', clientId);
    if (clientSecret) params.append('client_secret', clientSecret);
    if (codeVerifier) params.append('code_verifier', codeVerifier);
    if (refreshToken) params.append('refresh_token', refreshToken);
    if (scope) params.append('scope', scope);

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    // Support for Basic auth
    if (clientId && clientSecret && req.body.useBasicAuth) {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
      params.delete('client_id');
      params.delete('client_secret');
    }

    const response = await axios.post(tokenEndpoint, params.toString(), {
      headers,
      timeout: 15000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Token exchange failed',
      details: error.response?.data || error.message 
    });
  }
});

// UserInfo endpoint
app.post('/api/userinfo', async (req, res) => {
  try {
    const { userInfoEndpoint, accessToken } = req.body;
    
    if (!userInfoEndpoint || !accessToken) {
      return res.status(400).json({ error: 'UserInfo endpoint and access token are required' });
    }

    const response = await axios.get(userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('UserInfo error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch user info',
      details: error.response?.data || error.message 
    });
  }
});

// Token introspection endpoint
app.post('/api/introspect', async (req, res) => {
  try {
    const { introspectionEndpoint, token, tokenTypeHint, clientId, clientSecret } = req.body;
    
    if (!introspectionEndpoint || !token) {
      return res.status(400).json({ error: 'Introspection endpoint and token are required' });
    }

    const params = new URLSearchParams();
    params.append('token', token);
    if (tokenTypeHint) params.append('token_type_hint', tokenTypeHint);
    if (clientId) params.append('client_id', clientId);
    if (clientSecret) params.append('client_secret', clientSecret);

    const response = await axios.post(introspectionEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Introspection error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Token introspection failed',
      details: error.response?.data || error.message 
    });
  }
});

// Token revocation endpoint
app.post('/api/revoke', async (req, res) => {
  try {
    const { revocationEndpoint, token, tokenTypeHint, clientId, clientSecret } = req.body;
    
    if (!revocationEndpoint || !token) {
      return res.status(400).json({ error: 'Revocation endpoint and token are required' });
    }

    const params = new URLSearchParams();
    params.append('token', token);
    if (tokenTypeHint) params.append('token_type_hint', tokenTypeHint);
    if (clientId) params.append('client_id', clientId);
    if (clientSecret) params.append('client_secret', clientSecret);

    await axios.post(revocationEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    res.json({ success: true, message: 'Token revoked successfully' });
  } catch (error) {
    console.error('Revocation error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Token revocation failed',
      details: error.response?.data || error.message 
    });
  }
});

// Validate JWT token locally
app.post('/api/validate-token', async (req, res) => {
  try {
    const { token, jwksUri, issuer, audience } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Decode token without verification first
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid JWT format' });
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    let verificationResult = { verified: false, error: null };

    // If JWKS URI provided, verify signature
    if (jwksUri) {
      try {
        const JWKS = jose.createRemoteJWKSet(new URL(jwksUri));
        const { payload: verifiedPayload } = await jose.jwtVerify(token, JWKS, {
          issuer: issuer || undefined,
          audience: audience || undefined
        });
        verificationResult = { verified: true, verifiedPayload };
      } catch (verifyError) {
        verificationResult = { verified: false, error: verifyError.message };
      }
    }

    res.json({
      header,
      payload,
      signature: parts[2],
      verification: verificationResult,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
      isExpired: payload.exp ? Date.now() > payload.exp * 1000 : null
    });
  } catch (error) {
    console.error('Token validation error:', error.message);
    res.status(400).json({ 
      error: 'Failed to validate token',
      details: error.message 
    });
  }
});

// Generate PKCE challenge
app.get('/api/pkce', (req, res) => {
  const crypto = require('crypto');
  
  // Generate code verifier
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // Generate code challenge (S256)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  res.json({
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  });
});

// Generate state/nonce
app.get('/api/generate-state', (req, res) => {
  res.json({
    state: uuidv4(),
    nonce: uuidv4()
  });
});

// Catch-all handler for React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OIDC Testing Client server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
