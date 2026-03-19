import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import StorageService from '../services/storage';
import ApiService from '../services/api';

const Settings = ({ onClearAll }) => {
  const [serverStatus, setServerStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const fileInputRef = useRef(null);

  const checkServerHealth = async () => {
    setChecking(true);
    try {
      const status = await ApiService.healthCheck();
      setServerStatus(status);
      toast.success('Server is healthy!');
    } catch (error) {
      setServerStatus({ status: 'unhealthy', error: error.message });
      toast.error('Server health check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleExport = () => {
    try {
      const data = StorageService.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oidc-testing-client-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Configuration exported successfully!');
    } catch (error) {
      toast.error('Failed to export: ' + error.message);
    }
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result);
        StorageService.importAll(data);
        toast.success('Configuration imported successfully! Please refresh the page.');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        toast.error('Failed to import: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      onClearAll();
      toast.success('All data cleared!');
    }
  };

  const storageStats = {
    providers: StorageService.getIdentityProviders().length,
    clients: StorageService.getClients().length,
    hasTokens: !!StorageService.getTokens()
  };

  return (
    <div>
      {/* Server Status */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Server Status</h2>
            <p className="card-subtitle">Check the backend server health</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={checkServerHealth}
            disabled={checking}
          >
            {checking ? <span className="loader"></span> : '🔍 Check Health'}
          </button>
        </div>

        {serverStatus && (
          <div className={`alert ${serverStatus.status === 'healthy' ? 'alert-success' : 'alert-error'}`}>
            <span>{serverStatus.status === 'healthy' ? '✅' : '❌'}</span>
            <div>
              <strong>Status: {serverStatus.status}</strong>
              {serverStatus.version && <p>Version: {serverStatus.version}</p>}
              {serverStatus.timestamp && <p>Timestamp: {serverStatus.timestamp}</p>}
              {serverStatus.error && <p>Error: {serverStatus.error}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Storage Statistics */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Storage Statistics</h2>
            <p className="card-subtitle">Current data stored in local storage</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{storageStats.providers}</span>
            <span className="stat-label">Identity Providers</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{storageStats.clients}</span>
            <span className="stat-label">Clients</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{storageStats.hasTokens ? 'Yes' : 'No'}</span>
            <span className="stat-label">Active Tokens</span>
          </div>
        </div>
      </div>

      {/* Export/Import */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Export / Import Configuration</h2>
            <p className="card-subtitle">Backup or restore your identity providers and clients</p>
          </div>
        </div>

        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleExport}>
            📤 Export Configuration
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            📥 Import Configuration
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>

        <p className="form-help mt-2">
          Export includes identity providers, clients, and settings. Tokens are not exported for security reasons.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="card danger-zone">
        <div className="card-header">
          <div>
            <h2 className="card-title">⚠️ Danger Zone</h2>
            <p className="card-subtitle">Irreversible actions</p>
          </div>
        </div>

        <div className="danger-actions">
          <div className="danger-action">
            <div>
              <h4>Clear All Data</h4>
              <p>Remove all identity providers, clients, tokens, and settings from local storage.</p>
            </div>
            <button className="btn btn-danger" onClick={handleClearAll}>
              🗑️ Clear All Data
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">About OIDC Testing Client</h2>
          </div>
        </div>

        <div className="about-content">
          <p>
            OIDC Testing Client is a tool for testing OAuth 2.0 and OpenID Connect flows.
            It allows you to configure identity providers, register clients, and test
            authorization flows including Authorization Code, PKCE, and more.
          </p>

          <h4>Features</h4>
          <ul>
            <li>Identity Provider Management with auto-discovery</li>
            <li>Client Registration with PKCE support</li>
            <li>Authorization Code Flow testing</li>
            <li>Token inspection and validation</li>
            <li>UserInfo endpoint testing</li>
            <li>Token introspection and revocation</li>
            <li>Local storage persistence</li>
            <li>Configuration export/import</li>
          </ul>

          <h4>Technology Stack</h4>
          <div className="tech-stack">
            <span className="badge badge-info">React 18</span>
            <span className="badge badge-info">Node.js</span>
            <span className="badge badge-info">Express</span>
            <span className="badge badge-info">OpenShift</span>
            <span className="badge badge-info">Power Architecture</span>
          </div>
        </div>
      </div>

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .stat-item {
          text-align: center;
          padding: 24px;
          background: var(--background-color);
          border-radius: var(--radius);
        }

        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary-color);
        }

        .stat-label {
          display: block;
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .danger-zone {
          border: 1px solid var(--error-color);
        }

        .danger-zone .card-title {
          color: var(--error-color);
        }

        .danger-actions {
          display: grid;
          gap: 16px;
        }

        .danger-action {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #fff5f5;
          border-radius: var(--radius-sm);
          gap: 16px;
        }

        .danger-action h4 {
          margin: 0 0 4px 0;
          font-size: 1rem;
        }

        .danger-action p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .about-content p {
          margin-bottom: 16px;
          line-height: 1.7;
        }

        .about-content h4 {
          margin: 20px 0 12px 0;
        }

        .about-content ul {
          margin: 0;
          padding-left: 20px;
        }

        .about-content li {
          margin-bottom: 6px;
        }

        .tech-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .danger-action {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;
