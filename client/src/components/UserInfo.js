import React, { useState } from 'react';
import { toast } from 'react-toastify';
import ApiService from '../services/api';

const UserInfo = ({ tokens, selectedProvider, selectedClient, onTokensReceived }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customAccessToken, setCustomAccessToken] = useState('');

  // Token Exchange State
  const [tokenExchangeLoading, setTokenExchangeLoading] = useState(false);
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [tokenEndpoint, setTokenEndpoint] = useState('');
  const [exchangeClientId, setExchangeClientId] = useState('');
  const [exchangeClientSecret, setExchangeClientSecret] = useState('');
  const [exchangeRedirectUri, setExchangeRedirectUri] = useState('');
  const [codeVerifier, setCodeVerifier] = useState('');
  const [useBasicAuth, setUseBasicAuth] = useState(false);
  const [exchangedTokens, setExchangedTokens] = useState(null);

  const exchangeCodeForToken = async () => {
    const endpoint = tokenEndpoint || selectedProvider?.discoveryDocument?.token_endpoint;
    const clientId = exchangeClientId || selectedClient?.clientId;
    const clientSecret = exchangeClientSecret || selectedClient?.clientSecret;
    const redirectUri = exchangeRedirectUri || selectedClient?.redirectUri;

    if (!authorizationCode) {
      toast.error('Please enter an authorization code');
      return;
    }

    if (!endpoint) {
      toast.error('Token endpoint not available. Please enter it manually.');
      return;
    }

    if (!clientId) {
      toast.error('Client ID is required');
      return;
    }

    if (!redirectUri) {
      toast.error('Redirect URI is required');
      return;
    }

    setTokenExchangeLoading(true);
    try {
      const result = await ApiService.exchangeToken({
        tokenEndpoint: endpoint,
        code: authorizationCode,
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: redirectUri,
        codeVerifier: codeVerifier || undefined,
        useBasicAuth: useBasicAuth,
        grantType: 'authorization_code'
      });
      setExchangedTokens(result);
      
      // Also set the access token for UserInfo fetching
      if (result.access_token) {
        setCustomAccessToken(result.access_token);
      }
      
      // Notify parent component if callback exists
      if (onTokensReceived) {
        onTokensReceived(result);
      }
      
      toast.success('Token exchange successful!');
    } catch (error) {
      toast.error('Failed to exchange code for token: ' + error.message);
      setExchangedTokens({ error: error.message, details: error.details });
    } finally {
      setTokenExchangeLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    const endpoint = customEndpoint || selectedProvider?.discoveryDocument?.userinfo_endpoint;
    const accessToken = customAccessToken || tokens?.access_token;

    if (!endpoint) {
      toast.error('UserInfo endpoint not available. Please enter it manually.');
      return;
    }

    if (!accessToken) {
      toast.error('Access token not available. Please complete authorization flow or enter token manually.');
      return;
    }

    setLoading(true);
    try {
      const result = await ApiService.fetchUserInfo(endpoint, accessToken);
      setUserInfo(result);
      toast.success('UserInfo fetched successfully!');
    } catch (error) {
      toast.error('Failed to fetch UserInfo: ' + error.message);
      setUserInfo({ error: error.message, details: error.details });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    toast.success('Copied to clipboard!');
  };

  const renderUserInfoField = (key, value) => {
    if (value === null || value === undefined) return null;

    // Handle nested objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      return (
        <div key={key} className="userinfo-field nested">
          <label>{formatFieldName(key)}</label>
          <div className="nested-content">
            {Object.entries(value).map(([k, v]) => renderUserInfoField(k, v))}
          </div>
        </div>
      );
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return (
        <div key={key} className="userinfo-field">
          <label>{formatFieldName(key)}</label>
          <div className="array-values">
            {value.map((v, i) => (
              <span key={i} className="badge badge-info">{String(v)}</span>
            ))}
          </div>
        </div>
      );
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return (
        <div key={key} className="userinfo-field">
          <label>{formatFieldName(key)}</label>
          <span className={`badge ${value ? 'badge-success' : 'badge-error'}`}>
            {value ? 'Yes' : 'No'}
          </span>
        </div>
      );
    }

    // Handle special fields
    if (key === 'picture' && typeof value === 'string' && value.startsWith('http')) {
      return (
        <div key={key} className="userinfo-field">
          <label>{formatFieldName(key)}</label>
          <div className="picture-container">
            <img src={value} alt="Profile" className="profile-picture" />
            <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>
          </div>
        </div>
      );
    }

    if (key === 'email' || key === 'preferred_username') {
      return (
        <div key={key} className="userinfo-field highlight">
          <label>{formatFieldName(key)}</label>
          <span>{String(value)}</span>
        </div>
      );
    }

    // Default rendering
    return (
      <div key={key} className="userinfo-field">
        <label>{formatFieldName(key)}</label>
        <span>{String(value)}</span>
      </div>
    );
  };

  const formatFieldName = (name) => {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div>
      {/* Token Exchange Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">🔑 Exchange Authorization Code for Token</h2>
            <p className="card-subtitle">Exchange an authorization code obtained from browser authentication</p>
          </div>
        </div>

        <div className="alert alert-info">
          <span>💡</span>
          <span>Authenticate in your browser separately, copy the authorization code from the callback URL, and paste it here to exchange for an access token.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Authorization Code *</label>
          <textarea
            className="form-textarea"
            placeholder="Paste your authorization code here"
            value={authorizationCode}
            onChange={(e) => setAuthorizationCode(e.target.value)}
            rows={2}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Token Endpoint</label>
            <input
              type="url"
              className="form-input"
              placeholder={selectedProvider?.discoveryDocument?.token_endpoint || 'https://your-idp.com/oauth/token'}
              value={tokenEndpoint}
              onChange={(e) => setTokenEndpoint(e.target.value)}
            />
            {selectedProvider?.discoveryDocument?.token_endpoint && (
              <p className="form-help">Default: {selectedProvider.discoveryDocument.token_endpoint}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Redirect URI *</label>
            <input
              type="url"
              className="form-input"
              placeholder={selectedClient?.redirectUri || 'https://your-app.com/callback'}
              value={exchangeRedirectUri}
              onChange={(e) => setExchangeRedirectUri(e.target.value)}
            />
            {selectedClient?.redirectUri && (
              <p className="form-help">Default: {selectedClient.redirectUri}</p>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Client ID *</label>
            <input
              type="text"
              className="form-input"
              placeholder={selectedClient?.clientId || 'your-client-id'}
              value={exchangeClientId}
              onChange={(e) => setExchangeClientId(e.target.value)}
            />
            {selectedClient?.clientId && (
              <p className="form-help">Default: {selectedClient.clientId}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Client Secret</label>
            <input
              type="password"
              className="form-input"
              placeholder={selectedClient?.clientSecret ? '••••••••' : 'Optional for public clients'}
              value={exchangeClientSecret}
              onChange={(e) => setExchangeClientSecret(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Code Verifier (for PKCE)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Enter code verifier if using PKCE"
            value={codeVerifier}
            onChange={(e) => setCodeVerifier(e.target.value)}
          />
          <p className="form-help">Required if the authorization request used PKCE (code_challenge)</p>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={useBasicAuth}
              onChange={(e) => setUseBasicAuth(e.target.checked)}
            />
            <span>Use Basic Authentication (send credentials in header instead of body)</span>
          </label>
        </div>

        <button
          className="btn btn-primary"
          onClick={exchangeCodeForToken}
          disabled={tokenExchangeLoading}
        >
          {tokenExchangeLoading ? <span className="loader"></span> : '🔄 Exchange Code for Token'}
        </button>

        {/* Exchanged Tokens Display */}
        {exchangedTokens && !exchangedTokens.error && (
          <div className="exchanged-tokens mt-2">
            <h3>Received Tokens</h3>
            <div className="tokens-grid">
              {exchangedTokens.access_token && (
                <div className="token-item">
                  <label>Access Token</label>
                  <div className="token-display">
                    <code>{exchangedTokens.access_token.substring(0, 60)}...</code>
                    <button className="copy-btn" onClick={() => copyToClipboard(exchangedTokens.access_token)}>Copy</button>
                  </div>
                </div>
              )}
              {exchangedTokens.id_token && (
                <div className="token-item">
                  <label>ID Token</label>
                  <div className="token-display">
                    <code>{exchangedTokens.id_token.substring(0, 60)}...</code>
                    <button className="copy-btn" onClick={() => copyToClipboard(exchangedTokens.id_token)}>Copy</button>
                  </div>
                </div>
              )}
              {exchangedTokens.refresh_token && (
                <div className="token-item">
                  <label>Refresh Token</label>
                  <div className="token-display">
                    <code>{exchangedTokens.refresh_token.substring(0, 60)}...</code>
                    <button className="copy-btn" onClick={() => copyToClipboard(exchangedTokens.refresh_token)}>Copy</button>
                  </div>
                </div>
              )}
            </div>
            <div className="token-meta">
              {exchangedTokens.token_type && <span className="badge badge-info">Type: {exchangedTokens.token_type}</span>}
              {exchangedTokens.expires_in && <span className="badge badge-warning">Expires in: {exchangedTokens.expires_in}s</span>}
              {exchangedTokens.scope && <span className="badge badge-success">Scope: {exchangedTokens.scope}</span>}
            </div>
            <div className="mt-2">
              <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(exchangedTokens)}>
                Copy Full Response as JSON
              </button>
            </div>
          </div>
        )}

        {exchangedTokens?.error && (
          <div className="alert alert-error mt-2">
            <span>❌</span>
            <div>
              <strong>{exchangedTokens.error}</strong>
              {exchangedTokens.details && <p>{JSON.stringify(exchangedTokens.details)}</p>}
            </div>
          </div>
        )}
      </div>

      {/* UserInfo Endpoint Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">👤 UserInfo Endpoint</h2>
            <p className="card-subtitle">Fetch user claims from the UserInfo endpoint</p>
          </div>
        </div>

        {!tokens?.access_token && !customAccessToken && (
          <div className="alert alert-warning">
            <span>⚠️</span>
            <span>No access token available. Complete the authorization flow first, exchange a code above, or enter a token manually below.</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">UserInfo Endpoint</label>
          <input
            type="url"
            className="form-input"
            placeholder={selectedProvider?.discoveryDocument?.userinfo_endpoint || 'https://your-idp.com/userinfo'}
            value={customEndpoint}
            onChange={(e) => setCustomEndpoint(e.target.value)}
          />
          <p className="form-help">
            {selectedProvider?.discoveryDocument?.userinfo_endpoint 
              ? `Default: ${selectedProvider.discoveryDocument.userinfo_endpoint}`
              : 'Enter the UserInfo endpoint URL'}
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Access Token</label>
          <textarea
            className="form-textarea"
            placeholder={tokens?.access_token ? 'Using token from authorization flow...' : 'Paste your access token here'}
            value={customAccessToken}
            onChange={(e) => setCustomAccessToken(e.target.value)}
            rows={3}
          />
          {tokens?.access_token && !customAccessToken && (
            <p className="form-help">Using access token from authorization flow</p>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={fetchUserInfo}
          disabled={loading}
        >
          {loading ? <span className="loader"></span> : '👤 Fetch UserInfo'}
        </button>
      </div>

      {userInfo && !userInfo.error && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">User Information</h2>
              <p className="card-subtitle">Claims returned from the UserInfo endpoint</p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => copyToClipboard(userInfo)}
            >
              Copy JSON
            </button>
          </div>

          {/* User Profile Card */}
          {(userInfo.name || userInfo.preferred_username || userInfo.email) && (
            <div className="user-profile-card">
              {userInfo.picture && (
                <img src={userInfo.picture} alt="Profile" className="profile-avatar" />
              )}
              <div className="profile-info">
                {userInfo.name && <h3>{userInfo.name}</h3>}
                {userInfo.preferred_username && <p className="username">@{userInfo.preferred_username}</p>}
                {userInfo.email && (
                  <p className="email">
                    {userInfo.email}
                    {userInfo.email_verified && (
                      <span className="badge badge-success ml-1">Verified</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* All Claims */}
          <div className="userinfo-grid">
            {Object.entries(userInfo).map(([key, value]) => renderUserInfoField(key, value))}
          </div>

          {/* Raw JSON */}
          <div className="mt-3">
            <h3>Raw Response</h3>
            <div className="json-display mt-1">
              <pre>{JSON.stringify(userInfo, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {userInfo?.error && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Error Response</h2>
          </div>
          <div className="alert alert-error">
            <span>❌</span>
            <div>
              <strong>{userInfo.error}</strong>
              {userInfo.details && <p>{JSON.stringify(userInfo.details)}</p>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .user-profile-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px;
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
          border-radius: var(--radius);
          color: white;
          margin-bottom: 24px;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid white;
          object-fit: cover;
        }

        .profile-info h3 {
          margin: 0 0 4px 0;
          font-size: 1.5rem;
        }

        .profile-info .username {
          opacity: 0.9;
          margin: 0 0 4px 0;
        }

        .profile-info .email {
          opacity: 0.9;
          margin: 0;
          display: flex;
          align-items: center;
        }

        .userinfo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .userinfo-field {
          padding: 16px;
          background: var(--background-color);
          border-radius: var(--radius-sm);
        }

        .userinfo-field.highlight {
          background: rgba(25, 118, 210, 0.1);
          border-left: 3px solid var(--primary-color);
        }

        .userinfo-field.nested {
          grid-column: span 2;
        }

        .userinfo-field label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 6px;
          font-weight: 600;
        }

        .userinfo-field span {
          word-break: break-word;
        }

        .nested-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 8px;
        }

        .array-values {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .picture-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .profile-picture {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-sm);
          object-fit: cover;
        }

        .picture-container a {
          font-size: 0.75rem;
          color: var(--primary-color);
          word-break: break-all;
        }

        .ml-1 {
          margin-left: 8px;
        }

        .mt-2 {
          margin-top: 16px;
        }

        .mt-3 {
          margin-top: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .form-checkbox input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .exchanged-tokens {
          padding: 20px;
          background: var(--background-color);
          border-radius: var(--radius);
        }

        .exchanged-tokens h3 {
          margin-bottom: 16px;
          color: var(--success-color);
        }

        .tokens-grid {
          display: grid;
          gap: 12px;
        }

        .token-item {
          padding: 12px;
          background: white;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .token-item label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 6px;
          font-weight: 600;
        }

        .token-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .token-display code {
          font-family: monospace;
          font-size: 0.85rem;
          word-break: break-all;
          flex: 1;
        }

        .copy-btn {
          padding: 4px 12px;
          font-size: 0.75rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          white-space: nowrap;
        }

        .copy-btn:hover {
          background: var(--primary-dark);
        }

        .token-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .alert-info {
          background: rgba(25, 118, 210, 0.1);
          border: 1px solid rgba(25, 118, 210, 0.3);
          color: #1565c0;
        }

        @media (max-width: 768px) {
          .user-profile-card {
            flex-direction: column;
            text-align: center;
          }

          .userinfo-field.nested {
            grid-column: span 1;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default UserInfo;

          align-items: center;
          gap: 20px;
          padding: 24px;
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
          border-radius: var(--radius);
          color: white;
          margin-bottom: 24px;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid white;
          object-fit: cover;
        }

        .profile-info h3 {
          margin: 0 0 4px 0;
          font-size: 1.5rem;
        }

        .profile-info .username {
          opacity: 0.9;
          margin: 0 0 4px 0;
        }

        .profile-info .email {
          opacity: 0.9;
          margin: 0;
          display: flex;
          align-items: center;
        }

        .userinfo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .userinfo-field {
          padding: 16px;
          background: var(--background-color);
          border-radius: var(--radius-sm);
        }

        .userinfo-field.highlight {
          background: rgba(25, 118, 210, 0.1);
          border-left: 3px solid var(--primary-color);
        }

        .userinfo-field.nested {
          grid-column: span 2;
        }

        .userinfo-field label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 6px;
          font-weight: 600;
        }

        .userinfo-field span {
          word-break: break-word;
        }

        .nested-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 8px;
        }

        .array-values {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .picture-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .profile-picture {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-sm);
          object-fit: cover;
        }

        .picture-container a {
          font-size: 0.75rem;
          color: var(--primary-color);
          word-break: break-all;
        }

        .ml-1 {
          margin-left: 8px;
        }

        @media (max-width: 768px) {
          .user-profile-card {
            flex-direction: column;
            text-align: center;
          }

          .userinfo-field.nested {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
};

export default UserInfo;
