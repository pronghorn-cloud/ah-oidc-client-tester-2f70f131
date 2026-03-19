import React, { useState } from 'react';
import { toast } from 'react-toastify';
import ApiService from '../services/api';

const UserInfo = ({ tokens, selectedProvider }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customAccessToken, setCustomAccessToken] = useState('');

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
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">UserInfo Endpoint</h2>
            <p className="card-subtitle">Fetch user claims from the UserInfo endpoint</p>
          </div>
        </div>

        {!tokens?.access_token && !customAccessToken && (
          <div className="alert alert-warning">
            <span>⚠️</span>
            <span>No access token available. Complete the authorization flow first or enter a token manually below.</span>
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
