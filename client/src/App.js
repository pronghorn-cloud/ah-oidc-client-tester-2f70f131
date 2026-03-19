import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Navigation from './components/Navigation';
import IdentityProviders from './components/IdentityProviders';
import ClientRegistration from './components/ClientRegistration';
import AuthorizationFlow from './components/AuthorizationFlow';
import TokenInspector from './components/TokenInspector';
import UserInfo from './components/UserInfo';
import Settings from './components/Settings';
import Callback from './components/Callback';
import { StorageService } from './services/storage';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('providers');
  const [identityProviders, setIdentityProviders] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [tokens, setTokens] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Load data from localStorage on mount
  useEffect(() => {
    const savedProviders = StorageService.getIdentityProviders();
    const savedClients = StorageService.getClients();
    const savedSelectedProvider = StorageService.getSelectedProvider();
    const savedSelectedClient = StorageService.getSelectedClient();
    const savedTokens = StorageService.getTokens();

    setIdentityProviders(savedProviders);
    setClients(savedClients);
    setTokens(savedTokens);

    if (savedSelectedProvider) {
      const provider = savedProviders.find(p => p.id === savedSelectedProvider);
      setSelectedProvider(provider || null);
    }

    if (savedSelectedClient) {
      const client = savedClients.find(c => c.id === savedSelectedClient);
      setSelectedClient(client || null);
    }
  }, []);

  // Update active tab based on route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/callback') return;
    
    const tabMap = {
      '/': 'providers',
      '/providers': 'providers',
      '/clients': 'clients',
      '/authorize': 'authorize',
      '/tokens': 'tokens',
      '/userinfo': 'userinfo',
      '/settings': 'settings'
    };
    setActiveTab(tabMap[path] || 'providers');
  }, [location]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const routeMap = {
      'providers': '/providers',
      'clients': '/clients',
      'authorize': '/authorize',
      'tokens': '/tokens',
      'userinfo': '/userinfo',
      'settings': '/settings'
    };
    navigate(routeMap[tab] || '/');
  };

  const handleProviderSave = (provider) => {
    const updated = StorageService.saveIdentityProvider(provider);
    setIdentityProviders(StorageService.getIdentityProviders());
    return updated;
  };

  const handleProviderDelete = (providerId) => {
    StorageService.deleteIdentityProvider(providerId);
    setIdentityProviders(StorageService.getIdentityProviders());
    if (selectedProvider?.id === providerId) {
      setSelectedProvider(null);
      StorageService.setSelectedProvider(null);
    }
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    StorageService.setSelectedProvider(provider?.id);
  };

  const handleClientSave = (client) => {
    const updated = StorageService.saveClient(client);
    setClients(StorageService.getClients());
    return updated;
  };

  const handleClientDelete = (clientId) => {
    StorageService.deleteClient(clientId);
    setClients(StorageService.getClients());
    if (selectedClient?.id === clientId) {
      setSelectedClient(null);
      StorageService.setSelectedClient(null);
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    StorageService.setSelectedClient(client?.id);
  };

  const handleTokensReceived = (newTokens) => {
    setTokens(newTokens);
    StorageService.saveTokens(newTokens);
  };

  const handleClearTokens = () => {
    setTokens(null);
    StorageService.clearTokens();
  };

  // Callback route handling
  if (location.pathname === '/callback') {
    return (
      <Callback
        selectedProvider={selectedProvider}
        selectedClient={selectedClient}
        onTokensReceived={handleTokensReceived}
      />
    );
  }

  return (
    <div className="app-container">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <IdentityProviders
                providers={identityProviders}
                selectedProvider={selectedProvider}
                onSave={handleProviderSave}
                onDelete={handleProviderDelete}
                onSelect={handleProviderSelect}
              />
            }
          />
          <Route
            path="/providers"
            element={
              <IdentityProviders
                providers={identityProviders}
                selectedProvider={selectedProvider}
                onSave={handleProviderSave}
                onDelete={handleProviderDelete}
                onSelect={handleProviderSelect}
              />
            }
          />
          <Route
            path="/clients"
            element={
              <ClientRegistration
                clients={clients}
                selectedClient={selectedClient}
                selectedProvider={selectedProvider}
                onSave={handleClientSave}
                onDelete={handleClientDelete}
                onSelect={handleClientSelect}
              />
            }
          />
          <Route
            path="/authorize"
            element={
              <AuthorizationFlow
                selectedProvider={selectedProvider}
                selectedClient={selectedClient}
                tokens={tokens}
                onTokensReceived={handleTokensReceived}
              />
            }
          />
          <Route
            path="/tokens"
            element={
              <TokenInspector
                tokens={tokens}
                selectedProvider={selectedProvider}
                onClearTokens={handleClearTokens}
                onTokensReceived={handleTokensReceived}
              />
            }
          />
          <Route
            path="/userinfo"
            element={
              <UserInfo
                tokens={tokens}
                selectedProvider={selectedProvider}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <Settings
                onClearAll={() => {
                  StorageService.clearAll();
                  setIdentityProviders([]);
                  setClients([]);
                  setSelectedProvider(null);
                  setSelectedClient(null);
                  setTokens(null);
                }}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
