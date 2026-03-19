import React, { useState } from 'react';
import { toast } from 'react-toastify';

const ClientRegistration = ({ clients, selectedClient, selectedProvider, onSave, onDelete, onSelect }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    clientSecret: '',
    redirectUri: window.location.origin + '/callback',
    scopes: 'openid profile email',
    grantTypes: ['authorization_code'],
    providerId: '',
    usePKCE: true,
    useBasicAuth: false
  });

  const resetForm = () => {
    setFormData({
      name: '',
      clientId: '',
      clientSecret: '',
      redirectUri: window.location.origin + '/callback',
      scopes: 'openid profile email',
      grantTypes: ['authorization_code'],
      providerId: selectedProvider?.id || '',
      usePKCE: true,
      useBasicAuth: false
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.clientId) {
      toast.error('Name and Client ID are required');
      return;
    }

    const client = {
      id: editingId || undefined,
      ...formData,
      providerId: formData.providerId || selectedProvider?.id
    };

    onSave(client);
    toast.success(editingId ? 'Client updated!' : 'Client added!');
    resetForm();
  };

  const handleEdit = (client) => {
    setFormData({
      name: client.name,
      clientId: client.clientId,
      clientSecret: client.clientSecret || '',
      redirectUri: client.redirectUri,
      scopes: client.scopes,
      grantTypes: client.grantTypes || ['authorization_code'],
      providerId: client.providerId || '',
      usePKCE: client.usePKCE !== false,
      useBasicAuth: client.useBasicAuth || false
    });
    setEditingId(client.id);
    setIsAdding(true);
  };

  const handleDelete = (clientId) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      onDelete(clientId);
      toast.success('Client deleted!');
    }
  };

  const handleGrantTypeToggle = (grantType) => {
    setFormData(prev => {
      const grantTypes = prev.grantTypes.includes(grantType)
        ? prev.grantTypes.filter(g => g !== grantType)
        : [...prev.grantTypes, grantType];
      return { ...prev, grantTypes };
    });
  };

  const grantTypeOptions = [
    { value: 'authorization_code', label: 'Authorization Code' },
    { value: 'refresh_token', label: 'Refresh Token' },
    { value: 'client_credentials', label: 'Client Credentials' },
    { value: 'password', label: 'Resource Owner Password' }
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Client Registration</h2>
            <p className="card-subtitle">Manage your OAuth 2.0 / OIDC clients</p>
          </div>
          {!isAdding && (
            <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
              + Add Client
            </button>
          )}
        </div>

        {!selectedProvider && !isAdding && (
          <div className="alert alert-warning">
            <span>⚠️</span>
            <span>Please select an Identity Provider first to associate clients.</span>
          </div>
        )}

        {isAdding && (
          <div className="client-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Client Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., My Test App"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Client ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="client-id"
                  value={formData.clientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Client Secret</label>
              <input
                type="password"
                className="form-input"
                placeholder="Leave empty for public clients"
                value={formData.clientSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
              />
              <p className="form-help">Required for confidential clients, optional for public clients using PKCE</p>
            </div>

            <div className="form-group">
              <label className="form-label required">Redirect URI</label>
              <input
                type="url"
                className="form-input"
                placeholder="http://localhost:3000/callback"
                value={formData.redirectUri}
                onChange={(e) => setFormData(prev => ({ ...prev, redirectUri: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Scopes</label>
              <input
                type="text"
                className="form-input"
                placeholder="openid profile email"
                value={formData.scopes}
                onChange={(e) => setFormData(prev => ({ ...prev, scopes: e.target.value }))}
              />
              <p className="form-help">Space-separated list of scopes</p>
            </div>

            <div className="form-group">
              <label className="form-label">Grant Types</label>
              <div className="checkbox-group">
                {grantTypeOptions.map(option => (
                  <label key={option.value} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.grantTypes.includes(option.value)}
                      onChange={() => handleGrantTypeToggle(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Options</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.usePKCE}
                    onChange={(e) => setFormData(prev => ({ ...prev, usePKCE: e.target.checked }))}
                  />
                  <span>Use PKCE (Proof Key for Code Exchange)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.useBasicAuth}
                    onChange={(e) => setFormData(prev => ({ ...prev, useBasicAuth: e.target.checked }))}
                  />
                  <span>Use Basic Auth for token requests</span>
                </label>
              </div>
            </div>

            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleSave}>
                {editingId ? 'Update Client' : 'Save Client'}
              </button>
              <button className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isAdding && clients.length === 0 && (
          <div className="text-center" style={{ padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              No clients configured yet.
            </p>
            <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
              Add Your First Client
            </button>
          </div>
        )}

        {!isAdding && clients.length > 0 && (
          <div className="clients-list">
            {clients.map(client => (
              <div
                key={client.id}
                className={`client-item ${selectedClient?.id === client.id ? 'selected' : ''}`}
              >
                <div className="client-info" onClick={() => onSelect(client)}>
                  <div className="client-name">
                    <span className="status-indicator active"></span>
                    {client.name}
                  </div>
                  <div className="client-id">Client ID: {client.clientId}</div>
                  <div className="client-meta">
                    <span className="badge badge-info">{client.usePKCE ? 'PKCE' : 'No PKCE'}</span>
                    <span className="badge badge-info">
                      {client.clientSecret ? 'Confidential' : 'Public'}
                    </span>
                    {client.grantTypes?.map(grant => (
                      <span key={grant} className="badge badge-success">{grant}</span>
                    ))}
                  </div>
                </div>
                <div className="client-actions">
                  <button
                    className={`btn btn-sm ${selectedClient?.id === client.id ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => onSelect(client)}
                  >
                    {selectedClient?.id === client.id ? '✓ Selected' : 'Select'}
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleEdit(client)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(client.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedClient && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Selected Client Configuration</h2>
          </div>
          <div className="json-display">
            <pre>{JSON.stringify(selectedClient, null, 2)}</pre>
          </div>
        </div>
      )}

      <style>{`
        .client-form {
          padding: 20px;
          background: var(--background-color);
          border-radius: var(--radius);
          margin-bottom: 20px;
        }

        .client-item {
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

        .client-item:hover {
          border-color: var(--primary-color);
          background: var(--background-color);
        }

        .client-item.selected {
          border-color: var(--primary-color);
          background: rgba(25, 118, 210, 0.05);
        }

        .client-info {
          flex: 1;
        }

        .client-name {
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
        }

        .client-id {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-top: 4px;
          font-family: monospace;
        }

        .client-meta {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .client-actions {
          display: flex;
          gap: 8px;
        }

        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
        }
      `}</style>
    </div>
  );
};

export default ClientRegistration;
