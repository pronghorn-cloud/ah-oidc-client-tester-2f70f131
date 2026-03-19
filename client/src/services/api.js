/**
 * API Service - Handles all backend API calls
 * Provides methods for OIDC operations through the proxy server
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    const details = error.response?.data?.details || null;
    return Promise.reject({ message, details, status: error.response?.status });
  }
);

export const ApiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/api/health');
    return response.data;
  },

  // Discovery - fetch OIDC configuration
  async fetchDiscovery(issuerUrl) {
    const response = await api.post('/api/discovery', { issuerUrl });
    return response.data;
  },

  // JWKS - fetch JSON Web Key Set
  async fetchJWKS(jwksUri) {
    const response = await api.post('/api/jwks', { jwksUri });
    return response.data;
  },

  // Token exchange
  async exchangeToken(params) {
    const response = await api.post('/api/token', params);
    return response.data;
  },

  // Refresh token
  async refreshToken(params) {
    const response = await api.post('/api/token', {
      ...params,
      grantType: 'refresh_token'
    });
    return response.data;
  },

  // UserInfo
  async fetchUserInfo(userInfoEndpoint, accessToken) {
    const response = await api.post('/api/userinfo', { userInfoEndpoint, accessToken });
    return response.data;
  },

  // Token introspection
  async introspectToken(params) {
    const response = await api.post('/api/introspect', params);
    return response.data;
  },

  // Token revocation
  async revokeToken(params) {
    const response = await api.post('/api/revoke', params);
    return response.data;
  },

  // Validate JWT
  async validateToken(params) {
    const response = await api.post('/api/validate-token', params);
    return response.data;
  },

  // Generate PKCE
  async generatePKCE() {
    const response = await api.get('/api/pkce');
    return response.data;
  },

  // Generate state/nonce
  async generateState() {
    const response = await api.get('/api/generate-state');
    return response.data;
  }
};

export default ApiService;
