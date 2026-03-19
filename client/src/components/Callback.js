import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ApiService from '../services/api';
import StorageService from '../services/storage';

const Callback = ({ selectedProvider, selectedClient, onTokensReceived }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [tokens, setTokens] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get callback parameters
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for error response
      if (errorParam) {
        throw new Error(`${errorParam}: ${errorDescription || 'Unknown error'}`);
      }

      // Check for authorization code
      if (!code) {
        throw new Error('No authorization code received');
      }

      // Get saved auth state
      const authState = StorageService.getAuthState();
      
      if (!authState) {
        throw new Error('No saved authorization state found. Please start the flow again.');
      }

      // Validate state
      if (state !== authState.state) {
        throw new Error('State mismatch! Possible CSRF attack.');
      }

      // Get provider and client from saved state or props
      const providers = StorageService.getIdentityProviders();
      const clients = StorageService.getClients();
      
      const provider = selectedProvider || providers.find(p => p.id === authState.providerId);
      const client = selectedClient || clients.find(c => c.id === authState.clientId);

      if (!provider?.discoveryDocument?.token_endpoint) {
        throw new Error('Token endpoint not available. Please configure the identity provider.');
      }

      if (!client) {
        throw new Error('Client configuration not found. Please configure the client.');
      }

      // Exchange code for tokens
      const tokenResponse = await ApiService.exchangeToken({
        tokenEndpoint: provider.discoveryDocument.token_endpoint,
        grantType: 'authorization_code',
        code,
        redirectUri: client.redirectUri,
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        codeVerifier: authState.codeVerifier,
        useBasicAuth: client.useBasicAuth
      });

      // Save tokens
      setTokens(tokenResponse);
      onTokensReceived(tokenResponse);
      
      // Clear auth state
      StorageService.clearAuthState();
      
      setStatus('success');
      toast.success('Authorization successful! Tokens received.');

      // Redirect after short delay
      setTimeout(() => {
        navigate('/tokens');
      }, 2000);

    } catch (err) {
      console.error('Callback error:', err);
      setError(err.message);
      setStatus('error');
      toast.error('Authorization failed: ' + err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="callback-container">
      <div className="callback-card">
        {status === 'processing' && (
          <>
            <div className="callback-icon processing">
              <span className="loader-large"></span>
            </div>
            <h1>Processing Authorization</h1>
            <p>Please wait while we exchange the authorization code for tokens...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="callback-icon success">
              ✓
            </div>
            <h1>Authorization Successful!</h1>
            <p>Tokens have been received and saved. Redirecting to Token Inspector...</p>
            
            {tokens && (
              <div className="tokens-preview">
                <h3>Received Tokens:</h3>
                {tokens.access_token && (
                  <div className="token-preview-item">
                    <label>Access Token</label>
                    <div className="token-value">
                      {tokens.access_token.substring(0, 40)}...
                      <button className="copy-btn" onClick={() => copyToClipboard(tokens.access_token)}>Copy</button>
                    </div>
                  </div>
                )}
                {tokens.id_token && (
                  <div className="token-preview-item">
                    <label>ID Token</label>
                    <div className="token-value">
                      {tokens.id_token.substring(0, 40)}...
                      <button className="copy-btn" onClick={() => copyToClipboard(tokens.id_token)}>Copy</button>
                    </div>
                  </div>
                )}
                {tokens.refresh_token && (
                  <div className="token-preview-item">
                    <label>Refresh Token</label>
                    <div className="token-value">
                      {tokens.refresh_token.substring(0, 40)}...
                      <button className="copy-btn" onClick={() => copyToClipboard(tokens.refresh_token)}>Copy</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button className="btn btn-primary mt-2" onClick={() => navigate('/tokens')}>
              Go to Token Inspector
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="callback-icon error">
              ✗
            </div>
            <h1>Authorization Failed</h1>
            <div className="error-details">
              <p>{error}</p>
            </div>
            <div className="btn-group mt-2">
              <button className="btn btn-primary" onClick={() => navigate('/authorize')}>
                Try Again
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                Go Home
              </button>
            </div>
          </>
        )}

        {/* Debug Info */}
        <div className="debug-info">
          <details>
            <summary>Debug Information</summary>
            <div className="debug-content">
              <h4>URL Parameters:</h4>
              <pre>{JSON.stringify(Object.fromEntries(searchParams), null, 2)}</pre>
              
              <h4>Saved Auth State:</h4>
              <pre>{JSON.stringify(StorageService.getAuthState(), null, 2)}</pre>
            </div>
          </details>
        </div>
      </div>

      <style>{`
        .callback-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--background-color);
        }

        .callback-card {
          background: var(--surface-color);
          border-radius: var(--radius);
          box-shadow: var(--shadow-lg);
          padding: 48px;
          max-width: 600px;
          width: 100%;
          text-align: center;
        }

        .callback-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 2.5rem;
        }

        .callback-icon.processing {
          background: var(--background-color);
        }

        .callback-icon.success {
          background: #e8f5e9;
          color: var(--success-color);
        }

        .callback-icon.error {
          background: #ffebee;
          color: var(--error-color);
        }

        .callback-card h1 {
          margin: 0 0 16px 0;
          font-size: 1.5rem;
        }

        .callback-card > p {
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .loader-large {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-radius: 50%;
          border-top-color: var(--primary-color);
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .tokens-preview {
          text-align: left;
          margin-top: 24px;
          padding: 16px;
          background: var(--background-color);
          border-radius: var(--radius);
        }

        .tokens-preview h3 {
          margin: 0 0 16px 0;
          font-size: 1rem;
        }

        .token-preview-item {
          margin-bottom: 12px;
        }

        .token-preview-item label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .token-value {
          font-family: monospace;
          font-size: 0.875rem;
          background: var(--surface-color);
          padding: 8px;
          border-radius: var(--radius-sm);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .error-details {
          background: #ffebee;
          color: #c62828;
          padding: 16px;
          border-radius: var(--radius);
          margin-bottom: 24px;
          text-align: left;
        }

        .error-details p {
          margin: 0;
        }

        .debug-info {
          margin-top: 32px;
          text-align: left;
        }

        .debug-info summary {
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .debug-content {
          margin-top: 12px;
          padding: 12px;
          background: var(--background-color);
          border-radius: var(--radius-sm);
        }

        .debug-content h4 {
          margin: 12px 0 8px 0;
          font-size: 0.875rem;
        }

        .debug-content h4:first-child {
          margin-top: 0;
        }

        .debug-content pre {
          margin: 0;
          font-size: 0.75rem;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
};

export default Callback;
