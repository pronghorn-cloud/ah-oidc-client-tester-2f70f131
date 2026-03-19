import React, { useState } from 'react';
import { toast } from 'react-toastify';
import ApiService from '../services/api';

const IdentityProviders = ({ providers, selectedProvider, onSave, onDelete, onSelect }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    issuerUrl: '',
    discoveryDocument: null
  });

  const resetForm = () => {
    setFormData({ name: '', issuerUrl: '', discoveryDocument: null });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleDiscovery = async () => {
    if (!formData.issuerUrl) {
      toast.error('Please enter an Issuer URL');
      return;
    }

    setLoading(true);
    try {
      const discovery = await ApiService.fetchDiscovery(formData.issuerUrl);
      setFormData(prev => ({
        ...prev,
        discoveryDocument: discovery,
        name: prev.name || discovery.issuer || formData.issuerUrl
      }));
      toast.success('Discovery document fetched successfully!');
    } catch (error) {
      toast.error(`Failed to fetch discovery: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.issuerUrl) {
      toast.error('Name and Issuer URL are required');
      return;
    }

    const provider = {
      id: editingId || undefined,
      name: formData.name,
      issuerUrl: formData.issuerUrl,
      discoveryDocument: formData.discoveryDocument
    };

    onSave(provider);
    toast.success(editingId ? 'Provider updated!' : 'Provider added!');
    resetForm();
  };

  const handleEdit = (provider) => {
    setFormData({
      name: provider.name,
      issuerUrl: provider.issuerUrl,
      discoveryDocument: provider.discoveryDocument
    });
    setEditingId(provider.id);
    setIsAdding(true);
  };

  const handleDelete = (providerId) => {
    if (window.confirm('Are you sure you want to delete this provider?')) {
      onDelete(providerId);
      toast.success('Provider deleted!');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Identity Providers</h2>
            <p className="card-subtitle">Manage your OIDC Identity Providers</p>
          </div>
          {!isAdding && (
            <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
              + Add Provider
            </button>
          )}
        </div>

        {isAdding && (
          <div className="provider-form">
            <div className="form-group">
              <label className="form-label required">Provider Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., My Keycloak Server"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Issuer URL</label>
              <div className="flex gap-1">
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://your-idp.example.com/realms/master"
                  value={formData.issuerUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuerUrl: e.target.value }))}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleDiscovery}
                  disabled={loading || !formData.issuerUrl}
                >
                  {loading ? <span className="loader"></span> : 'Discover'}
                </button>
              </div>
              <p className="form-help">
                The issuer URL will be used to fetch the OIDC discovery document
              </p>
            </div>

            {formData.discoveryDocument && (
              <div className="form-group">
                <label className="form-label">Discovery Document</label>
                <div className="json-display">
                  <pre>{JSON.stringify(formData.discoveryDocument, null, 2)}</pre>
                </div>
              </div>
            )}

            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleSave}>
                {editingId ? 'Update Provider' : 'Save Provider'}
              </button>
              <button className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isAdding && providers.length === 0 && (
          <div className="text-center" style={{ padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              No identity providers configured yet.
            </p>
            <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
              Add Your First Provider
            </button>
          </div>
        )}

        {!isAdding && providers.length > 0 && (
          <div className="providers-list">
            {providers.map(provider => (
              <div
                key={provider.id}
                className={`provider-item ${selectedProvider?.id === provider.id ? 'selected' : ''}`}
              >
                <div className="provider-info" onClick={() => onSelect(provider)}>
                  <div className="provider-name">
                    <span className={`status-indicator ${provider.discoveryDocument ? 'active' : 'pending'}`}></span>
                    {provider.name}
                  </div>
                  <div className="provider-url">{provider.issuerUrl}</div>
                  {provider.discoveryDocument && (
                    <div className="provider-endpoints">
                      <span className="badge badge-success">Discovery OK</span>
                    </div>
                  )}
                </div>
                <div className="provider-actions">
                  <button
                    className={`btn btn-sm ${selectedProvider?.id === provider.id ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => onSelect(provider)}
                  >
                    {selectedProvider?.id === provider.id ? '✓ Selected' : 'Select'}
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleEdit(provider)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(provider.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProvider?.discoveryDocument && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Selected Provider Details</h2>
          </div>
          <div className="provider-details">
            <h3>{selectedProvider.name}</h3>
            <div className="details-grid">
              <div className="detail-item">
                <label>Issuer</label>
                <span>{selectedProvider.discoveryDocument.issuer}</span>
              </div>
              <div className="detail-item">
                <label>Authorization Endpoint</label>
                <span>{selectedProvider.discoveryDocument.authorization_endpoint}</span>
              </div>
              <div className="detail-item">
                <label>Token Endpoint</label>
                <span>{selectedProvider.discoveryDocument.token_endpoint}</span>
              </div>
              <div className="detail-item">
                <label>UserInfo Endpoint</label>
                <span>{selectedProvider.discoveryDocument.userinfo_endpoint}</span>
              </div>
              <div className="detail-item">
                <label>JWKS URI</label>
                <span>{selectedProvider.discoveryDocument.jwks_uri}</span>
              </div>
              {selectedProvider.discoveryDocument.introspection_endpoint && (
                <div className="detail-item">
                  <label>Introspection Endpoint</label>
                  <span>{selectedProvider.discoveryDocument.introspection_endpoint}</span>
                </div>
              )}
              {selectedProvider.discoveryDocument.revocation_endpoint && (
                <div className="detail-item">
                  <label>Revocation Endpoint</label>
                  <span>{selectedProvider.discoveryDocument.revocation_endpoint}</span>
                </div>
              )}
            </div>

            <div className="mt-2">
              <h4>Supported Features</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedProvider.discoveryDocument.grant_types_supported?.map(grant => (
                  <span key={grant} className="badge badge-info">{grant}</span>
                ))}
              </div>
            </div>

            <div className="mt-2">
              <h4>Supported Scopes</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedProvider.discoveryDocument.scopes_supported?.map(scope => (
                  <span key={scope} className="badge badge-info">{scope}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .provider-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .provider-item:hover {
          border-color: var(--primary-color);
          background: var(--background-color);
        }

        .provider-item.selected {
          border-color: var(--primary-color);
          background: rgba(25, 118, 210, 0.05);
        }

        .provider-info {
          flex: 1;
        }

        .provider-name {
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
        }

        .provider-url {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-top: 4px;
        }

        .provider-endpoints {
          margin-top: 8px;
        }

        .provider-actions {
          display: flex;
          gap: 8px;
        }

        .provider-details {
          padding: 16px 0;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .detail-item {
          padding: 12px;
          background: var(--background-color);
          border-radius: var(--radius-sm);
        }

        .detail-item label {
          display: block;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .detail-item span {
          word-break: break-all;
          font-size: 0.875rem;
        }

        .provider-form {
          padding: 20px;
          background: var(--background-color);
          border-radius: var(--radius);
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default IdentityProviders;
