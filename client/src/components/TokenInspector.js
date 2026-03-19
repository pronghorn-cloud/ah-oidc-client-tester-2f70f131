import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ApiService from '../services/api';

const TokenInspector = ({ tokens, selectedProvider, onClearTokens, onTokensReceived }) => {
  const [activeToken, setActiveToken] = useState('access_token');
  const [decodedToken, setDecodedToken] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [introspectionResult, setIntrospectionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualToken, setManualToken] = useState('');

  const currentToken = manualToken || tokens?.[activeToken];

  useEffect(() => {
    if (currentToken) {
      decodeToken(currentToken);
    } else {
      setDecodedToken(null);
      setValidationResult(null);
    }
  }, [currentToken]);

  const decodeToken = (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        setDecodedToken({ error: 'Invalid JWT format - expected 3 parts' });
        return;
      }

      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

      setDecodedToken({
        header,
        payload,
        signature: parts[2]
      });
    } catch (error) {
      setDecodedToken({ error: 'Failed to decode token: ' + error.message });
    }
  };

  const validateToken = async () => {
    if (!currentToken) {
      toast.error('No token to validate');
      return;
    }

    setLoading(true);
    try {
      const result = await ApiService.validateToken({
        token: currentToken,
        jwksUri: selectedProvider?.discoveryDocument?.jwks_uri,
        issuer: selectedProvider?.discoveryDocument?.issuer
      });
      setValidationResult(result);
      toast.success('Token validation complete!');
    } catch (error) {
      toast.error('Validation failed: ' + error.message);
      setValidationResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const introspectToken = async () => {
    if (!currentToken) {
      toast.error('No token to introspect');
      return;
    }

    if (!selectedProvider?.discoveryDocument?.introspection_endpoint) {
      toast.error('Introspection endpoint not available for this provider');
      return;
    }

    setLoading(true);
    try {
      const result = await ApiService.introspectToken({
        introspectionEndpoint: selectedProvider.discoveryDocument.introspection_endpoint,
        token: currentToken,
        tokenTypeHint: activeToken === 'refresh_token' ? 'refresh_token' : 'access_token'
      });
      setIntrospectionResult(result);
      toast.success('Token introspection complete!');
    } catch (error) {
      toast.error('Introspection failed: ' + error.message);
      setIntrospectionResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const revokeToken = async () => {
    if (!currentToken) {
      toast.error('No token to revoke');
      return;
    }

    if (!selectedProvider?.discoveryDocument?.revocation_endpoint) {
      toast.error('Revocation endpoint not available for this provider');
      return;
    }

    if (!window.confirm('Are you sure you want to revoke this token?')) {
      return;
    }

    setLoading(true);
    try {
      await ApiService.revokeToken({
        revocationEndpoint: selectedProvider.discoveryDocument.revocation_endpoint,
        token: currentToken,
        tokenTypeHint: activeToken === 'refresh_token' ? 'refresh_token' : 'access_token'
      });
      toast.success('Token revoked successfully!');
      onClearTokens();
    } catch (error) {
      toast.error('Revocation failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const isExpired = (exp) => {
    if (!exp) return null;
    return Date.now() > exp * 1000;
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Token Inspector</h2>
            <p className="card-subtitle">Decode, validate, and inspect JWT tokens</p>
          </div>
          {tokens && (
            <button className="btn btn-danger btn-sm" onClick={onClearTokens}>
              Clear All Tokens
            </button>
          )}
        </div>

        {/* Token Selection */}
        {tokens && (
          <div className="token-selector">
            <label>Select Token:</label>
            <div className="token-tabs">
              {tokens.access_token && (
                <button
                  className={`token-tab ${activeToken === 'access_token' ? 'active' : ''}`}
                  onClick={() => { setActiveToken('access_token'); setManualToken(''); }}
                >
                  Access Token
                </button>
              )}
              {tokens.id_token && (
                <button
                  className={`token-tab ${activeToken === 'id_token' ? 'active' : ''}`}
                  onClick={() => { setActiveToken('id_token'); setManualToken(''); }}
                >
                  ID Token
                </button>
              )}
              {tokens.refresh_token && (
                <button
                  className={`token-tab ${activeToken === 'refresh_token' ? 'active' : ''}`}
                  onClick={() => { setActiveToken('refresh_token'); setManualToken(''); }}
                >
                  Refresh Token
                </button>
              )}
            </div>
          </div>
        )}

        {/* Manual Token Input */}
        <div className="form-group mt-2">
          <label className="form-label">Or paste a token manually:</label>
          <textarea
            className="form-textarea"
            placeholder="Paste your JWT token here..."
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            rows={3}
          />
        </div>

        {/* Raw Token Display */}
        {currentToken && (
          <div className="form-group">
            <label className="form-label">Raw Token</label>
            <div className="token-raw">
              <code>{currentToken}</code>
              <button className="copy-btn" onClick={() => copyToClipboard(currentToken)}>Copy</button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {currentToken && (
          <div className="btn-group mt-2">
            <button
              className="btn btn-primary"
              onClick={validateToken}
              disabled={loading}
            >
              {loading ? <span className="loader"></span> : '🔍 Validate Signature'}
            </button>
            {selectedProvider?.discoveryDocument?.introspection_endpoint && (
              <button
                className="btn btn-secondary"
                onClick={introspectToken}
                disabled={loading}
              >
                📋 Introspect
              </button>
            )}
            {selectedProvider?.discoveryDocument?.revocation_endpoint && (
              <button
                className="btn btn-danger"
                onClick={revokeToken}
                disabled={loading}
              >
                🗑️ Revoke
              </button>
            )}
          </div>
        )}
      </div>

      {/* Decoded Token */}
      {decodedToken && !decodedToken.error && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Decoded Token</h2>
          </div>

          <div className="decoded-sections">
            {/* Header */}
            <div className="decoded-section">
              <h3 className="section-title header-color">Header</h3>
              <div className="json-display">
                <pre>{JSON.stringify(decodedToken.header, null, 2)}</pre>
              </div>
            </div>

            {/* Payload */}
            <div className="decoded-section">
              <h3 className="section-title payload-color">Payload</h3>
              <div className="json-display">
                <pre>{JSON.stringify(decodedToken.payload, null, 2)}</pre>
              </div>

              {/* Claims Analysis */}
              <div className="claims-analysis mt-2">
                <h4>Claims Analysis</h4>
                <div className="claims-grid">
                  {decodedToken.payload.iss && (
                    <div className="claim-item">
                      <label>Issuer (iss)</label>
                      <span>{decodedToken.payload.iss}</span>
                    </div>
                  )}
                  {decodedToken.payload.sub && (
                    <div className="claim-item">
                      <label>Subject (sub)</label>
                      <span>{decodedToken.payload.sub}</span>
                    </div>
                  )}
                  {decodedToken.payload.aud && (
                    <div className="claim-item">
                      <label>Audience (aud)</label>
                      <span>{Array.isArray(decodedToken.payload.aud) ? decodedToken.payload.aud.join(', ') : decodedToken.payload.aud}</span>
                    </div>
                  )}
                  {decodedToken.payload.exp && (
                    <div className="claim-item">
                      <label>Expiration (exp)</label>
                      <span>
                        {formatTimestamp(decodedToken.payload.exp)}
                        {isExpired(decodedToken.payload.exp) !== null && (
                          <span className={`badge ${isExpired(decodedToken.payload.exp) ? 'badge-error' : 'badge-success'} ml-1`}>
                            {isExpired(decodedToken.payload.exp) ? 'Expired' : 'Valid'}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {decodedToken.payload.iat && (
                    <div className="claim-item">
                      <label>Issued At (iat)</label>
                      <span>{formatTimestamp(decodedToken.payload.iat)}</span>
                    </div>
                  )}
                  {decodedToken.payload.nbf && (
                    <div className="claim-item">
                      <label>Not Before (nbf)</label>
                      <span>{formatTimestamp(decodedToken.payload.nbf)}</span>
                    </div>
                  )}
                  {decodedToken.payload.azp && (
                    <div className="claim-item">
                      <label>Authorized Party (azp)</label>
                      <span>{decodedToken.payload.azp}</span>
                    </div>
                  )}
                  {decodedToken.payload.scope && (
                    <div className="claim-item">
                      <label>Scope</label>
                      <span>{decodedToken.payload.scope}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="decoded-section">
              <h3 className="section-title signature-color">Signature</h3>
              <div className="token-raw">
                <code>{decodedToken.signature}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {decodedToken?.error && (
        <div className="alert alert-error">
          <span>❌</span>
          <span>{decodedToken.error}</span>
        </div>
      )}

      {/* Validation Result */}
      {validationResult && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Validation Result</h2>
            {validationResult.verification && (
              <span className={`badge ${validationResult.verification.verified ? 'badge-success' : 'badge-error'}`}>
                {validationResult.verification.verified ? '✓ Signature Valid' : '✗ Signature Invalid'}
              </span>
            )}
          </div>
          <div className="json-display">
            <pre>{JSON.stringify(validationResult, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Introspection Result */}
      {introspectionResult && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Introspection Result</h2>
            {introspectionResult.active !== undefined && (
              <span className={`badge ${introspectionResult.active ? 'badge-success' : 'badge-error'}`}>
                {introspectionResult.active ? '✓ Token Active' : '✗ Token Inactive'}
              </span>
            )}
          </div>
          <div className="json-display">
            <pre>{JSON.stringify(introspectionResult, null, 2)}</pre>
          </div>
        </div>
      )}

      <style>{`
        .token-selector {
          margin-bottom: 20px;
        }

        .token-selector label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .token-tabs {
          display: flex;
          gap: 8px;
        }

        .token-tab {
          padding: 8px 16px;
          border: 1px solid var(--border-color);
          background: var(--surface-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .token-tab:hover {
          border-color: var(--primary-color);
        }

        .token-tab.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .token-raw {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 16px;
          border-radius: var(--radius-sm);
          overflow-x: auto;
          word-break: break-all;
          position: relative;
          font-size: 0.75rem;
          max-height: 150px;
        }

        .token-raw .copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          color: white;
        }

        .decoded-sections {
          display: grid;
          gap: 20px;
        }

        .decoded-section {
          padding: 16px;
          background: var(--background-color);
          border-radius: var(--radius);
        }

        .section-title {
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid;
        }

        .header-color {
          color: #ff6b6b;
          border-color: #ff6b6b;
        }

        .payload-color {
          color: #9775fa;
          border-color: #9775fa;
        }

        .signature-color {
          color: #51cf66;
          border-color: #51cf66;
        }

        .claims-analysis h4 {
          font-size: 0.875rem;
          margin-bottom: 12px;
        }

        .claims-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }

        .claim-item {
          padding: 10px;
          background: var(--surface-color);
          border-radius: var(--radius-sm);
        }

        .claim-item label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .claim-item span {
          font-size: 0.875rem;
          word-break: break-all;
        }

        .ml-1 {
          margin-left: 8px;
        }
      `}</style>
    </div>
  );
};

export default TokenInspector;
