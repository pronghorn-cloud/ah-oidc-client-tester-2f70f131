import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ApiService from '../services/api';
import StorageService from '../services/storage';

const AuthorizationFlow = ({ selectedProvider, selectedClient, tokens, onTokensReceived }) => {
  const [loading, setLoading] = useState(false);
  const [pkce, setPkce] = useState(null);
  const [authParams, setAuthParams] = useState({
    responseType: 'code',
    scope: '',
    state: '',
    nonce: '',
    prompt: '',
    loginHint: '',
    acrValues: ''
  });
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    if (selectedClient) {
      setAuthParams(prev => ({
        ...prev,
        scope: selectedClient.scopes || 'openid profile email'
      }));
    }
  }, [selectedClient]);

  const generatePKCE = async () => {
    try {
      const pkceData = await ApiService.generatePKCE();
      setPkce(pkceData);
      toast.success('PKCE challenge generated!');
      return pkceData;
    } catch (error) {
      toast.error('Failed to generate PKCE: ' + error.message);
      return null;
    }
  };

  const generateState = async () => {
    try {
      const stateData = await ApiService.generateState();
      setAuthParams(prev => ({
        ...prev,
        state: stateData.state,
        nonce: stateData.nonce
      }));
      toast.success('State and nonce generated!');
    } catch (error) {
      toast.error('Failed to generate state: ' + error.message);
    }
  };

  const buildAuthorizationUrl = async () => {
    if (!selectedProvider?.discoveryDocument) {
      toast.error('Please select an Identity Provider with discovery document');
      return;
    }
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }

    const discovery = selectedProvider.discoveryDocument;
    let currentPkce = pkce;

    // Generate PKCE if enabled and not already generated
    if (selectedClient.usePKCE && !currentPkce) {
      currentPkce = await generatePKCE();
      if (!currentPkce) return;
    }

    // Generate state if not set
    let state = authParams.state;
    let nonce = authParams.nonce;
    if (!state) {
      const stateData = await ApiService.generateState();
      state = stateData.state;
      nonce = stateData.nonce;
      setAuthParams(prev => ({ ...prev, state, nonce }));
    }

    const params = new URLSearchParams({
      response_type: authParams.responseType,
      client_id: selectedClient.clientId,
      redirect_uri: selectedClient.redirectUri,
      scope: authParams.scope,
      state: state
    });

    if (nonce && authParams.scope.includes('openid')) {
      params.append('nonce', nonce);
    }

    if (selectedClient.usePKCE && currentPkce) {
      params.append('code_challenge', currentPkce.codeChallenge);
      params.append('code_challenge_method', currentPkce.codeChallengeMethod);
    }

    if (authParams.prompt) {
      params.append('prompt', authParams.prompt);
    }

    if (authParams.loginHint) {
      params.append('login_hint', authParams.loginHint);
    }

    if (authParams.acrValues) {
      params.append('acr_values', authParams.acrValues);
    }

    const url = `${discovery.authorization_endpoint}?${params.toString()}`;
    setAuthUrl(url);

    // Save auth state for callback
    StorageService.saveAuthState({
      state,
      nonce,
      codeVerifier: currentPkce?.codeVerifier,
      providerId: selectedProvider.id,
      clientId: selectedClient.id
    });

    toast.success('Authorization URL generated!');
  };

  const startAuthorization = () => {
    if (!authUrl) {
      toast.error('Please generate the authorization URL first');
      return;
    }
    window.location.href = authUrl;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleRefreshToken = async () => {
    if (!tokens?.refresh_token) {
      toast.error('No refresh token available');
      return;
    }
    if (!selectedProvider?.discoveryDocument || !selectedClient) {
      toast.error('Please select provider and client');
      return;
    }

    setLoading(true);
    try {
      const newTokens = await ApiService.refreshToken({
        tokenEndpoint: selectedProvider.discoveryDocument.token_endpoint,
        refreshToken: tokens.refresh_token,
        clientId: selectedClient.clientId,
        clientSecret: selectedClient.clientSecret,
        useBasicAuth: selectedClient.useBasicAuth
      });
      onTokensReceived(newTokens);
      toast.success('Tokens refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh token: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!selectedProvider && (
        <div className="alert alert-warning">
          <span>⚠️</span>
          <span>Please select an Identity Provider from the "Identity Providers" tab.</span>
        </div>
      )}

      {!selectedClient && (
        <div className="alert alert-warning">
          <span>⚠️</span>
          <span>Please select a Client from the "Clients" tab.</span>
        </div>
      )}

      {selectedProvider && selectedClient && (
        <>
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Authorization Code Flow</h2>
                <p className="card-subtitle">Configure and initiate the OAuth 2.0 authorization flow</p>
              </div>
            </div>

            <div className="flow-info">
              <div className="info-item">
                <label>Identity Provider</label>
                <span>{selectedProvider.name}</span>
              </div>
              <div className="info-item">
                <label>Client</label>
                <span>{selectedClient.name} ({selectedClient.clientId})</span>
              </div>
            </div>

            <div className="form-section">
              <h3>Authorization Parameters</h3>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Response Type</label>
                  <select
                    className="form-select"
                    value={authParams.responseType}
                    onChange={(e) => setAuthParams(prev => ({ ...prev, responseType: e.target.value }))}
                  >
                    <option value="code">code (Authorization Code)</option>
                    <option value="token">token (Implicit)</option>
                    <option value="id_token">id_token (Implicit)</option>
                    <option value="id_token token">id_token token (Implicit)</option>
                    <option value="code id_token">code id_token (Hybrid)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Scope</label>
                  <input
                    type="text"
                    className="form-input"
                    value={authParams.scope}
                    onChange={(e) => setAuthParams(prev => ({ ...prev, scope: e.target.value }))}
                    placeholder="openid profile email"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">State</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      className="form-input"
                      value={authParams.state}
                      onChange={(e) => setAuthParams(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="Random state value"
                    />
                    <button className="btn btn-secondary btn-sm" onClick={generateState}>
                      Generate
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nonce</label>
                  <input
                    type="text"
                    className="form-input"
                    value={authParams.nonce}
                    onChange={(e) => setAuthParams(prev => ({ ...prev, nonce: e.target.value }))}
                    placeholder="Random nonce value"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prompt</label>
                  <select
                    className="form-select"
                    value={authParams.prompt}
                    onChange={(e) => setAuthParams(prev => ({ ...prev, prompt: e.target.value }))}
                  >
                    <option value="">Default</option>
                    <option value="none">none</option>
                    <option value="login">login</option>
                    <option value="consent">consent</option>
                    <option value="select_account">select_account</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Login Hint</label>
                  <input
                    type="text"
                    className="form-input"
                    value={authParams.loginHint}
                    onChange={(e) => setAuthParams(prev => ({ ...prev, loginHint: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
              </div>
            </div>

            {selectedClient.usePKCE && (
              <div className="form-section">
                <h3>PKCE (Proof Key for Code Exchange)</h3>
                {pkce ? (
                  <div className="pkce-display">
                    <div className="pkce-item">
                      <label>Code Verifier</label>
                      <div className="token-display">
                        {pkce.codeVerifier}
                        <button className="copy-btn" onClick={() => copyToClipboard(pkce.codeVerifier)}>Copy</button>
                      </div>
                    </div>
                    <div className="pkce-item">
                      <label>Code Challenge</label>
                      <div className="token-display">
                        {pkce.codeChallenge}
                        <button className="copy-btn" onClick={() => copyToClipboard(pkce.codeChallenge)}>Copy</button>
                      </div>
                    </div>
                    <div className="pkce-item">
                      <label>Method</label>
                      <span className="badge badge-info">{pkce.codeChallengeMethod}</span>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-secondary" onClick={generatePKCE}>
                    Generate PKCE Challenge
                  </button>
                )}
              </div>
            )}

            <div className="btn-group mt-2">
              <button className="btn btn-primary" onClick={buildAuthorizationUrl}>
                Build Authorization URL
              </button>
              {authUrl && (
                <button className="btn btn-success" onClick={startAuthorization}>
                  🚀 Start Authorization
                </button>
              )}
            </div>

            {authUrl && (
              <div className="form-section mt-2">
                <h3>Authorization URL</h3>
                <div className="url-display">
                  <code>{authUrl}</code>
                  <button className="copy-btn" onClick={() => copyToClipboard(authUrl)}>Copy</button>
                </div>
              </div>
            )}
          </div>

          {tokens && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Current Tokens</h2>
                  <p className="card-subtitle">Tokens received from the authorization flow</p>
                </div>
                {tokens.refresh_token && (
                  <button
                    className="btn btn-primary"
                    onClick={handleRefreshToken}
                    disabled={loading}
                  >
                    {loading ? <span className="loader"></span> : '🔄 Refresh Tokens'}
                  </button>
                )}
              </div>

              <div className="tokens-display">
                {tokens.access_token && (
                  <div className="token-item">
                    <label>Access Token</label>
                    <div className="token-display">
                      {tokens.access_token.substring(0, 50)}...
                      <button className="copy-btn" onClick={() => copyToClipboard(tokens.access_token)}>Copy</button>
                    </div>
                  </div>
                )}
                {tokens.id_token && (
                  <div className="token-item">
                    <label>ID Token</label>
                    <div className="token-display">
                      {tokens.id_token.substring(0, 50)}...
                      <button className="copy-btn" onClick={() => copyToClipboard(tokens.id_token)}>Copy</button>
                    </div>
                  </div>
                )}
                {tokens.refresh_token && (
                  <div className="token-item">
                    <label>Refresh Token</label>
                    <div className="token-display">
                      {tokens.refresh_token.substring(0, 50)}...
                      <button className="copy-btn" onClick={() => copyToClipboard(tokens.refresh_token)}>Copy</button>
                    </div>
                  </div>
                )}
                <div className="token-meta">
                  {tokens.token_type && <span className="badge badge-info">Type: {tokens.token_type}</span>}
                  {tokens.expires_in && <span className="badge badge-warning">Expires in: {tokens.expires_in}s</span>}
                  {tokens.scope && <span className="badge badge-success">Scope: {tokens.scope}</span>}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .flow-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          padding: 16px;
          background: var(--background-color);
          border-radius: var(--radius-sm);
          margin-bottom: 24px;
        }

        .info-item label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .info-item span {
          font-weight: 600;
        }

        .form-section {
          padding: 20px;
          background: var(--background-color);
          border-radius: var(--radius);
          margin-bottom: 20px;
        }

        .form-section h3 {
          margin-bottom: 16px;
          font-size: 1rem;
        }

        .pkce-display {
          display: grid;
          gap: 12px;
        }

        .pkce-item label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .url-display {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 16px;
          border-radius: var(--radius-sm);
          overflow-x: auto;
          word-break: break-all;
          position: relative;
        }

        .url-display code {
          font-size: 0.875rem;
        }

        .url-display .copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          color: white;
        }

        .tokens-display {
          display: grid;
          gap: 16px;
        }

        .token-item label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .token-display {
          position: relative;
          padding-right: 60px;
        }

        .token-display .copy-btn {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
        }

        .token-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};

export default AuthorizationFlow;
