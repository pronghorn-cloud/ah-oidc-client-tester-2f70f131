/**
 * Storage Service - Handles all localStorage operations
 * Provides persistence for identity providers, clients, tokens, and settings
 */

const STORAGE_KEYS = {
  IDENTITY_PROVIDERS: 'oidc_testing_client_providers',
  CLIENTS: 'oidc_testing_client_clients',
  SELECTED_PROVIDER: 'oidc_testing_client_selected_provider',
  SELECTED_CLIENT: 'oidc_testing_client_selected_client',
  TOKENS: 'oidc_testing_client_tokens',
  SETTINGS: 'oidc_testing_client_settings',
  AUTH_STATE: 'oidc_testing_client_auth_state'
};

export const StorageService = {
  // Identity Providers
  getIdentityProviders() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IDENTITY_PROVIDERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading identity providers:', error);
      return [];
    }
  },

  saveIdentityProvider(provider) {
    try {
      const providers = this.getIdentityProviders();
      const existingIndex = providers.findIndex(p => p.id === provider.id);
      
      if (existingIndex >= 0) {
        providers[existingIndex] = { ...providers[existingIndex], ...provider, updatedAt: new Date().toISOString() };
      } else {
        providers.push({
          ...provider,
          id: provider.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      localStorage.setItem(STORAGE_KEYS.IDENTITY_PROVIDERS, JSON.stringify(providers));
      return providers[existingIndex >= 0 ? existingIndex : providers.length - 1];
    } catch (error) {
      console.error('Error saving identity provider:', error);
      throw error;
    }
  },

  deleteIdentityProvider(providerId) {
    try {
      const providers = this.getIdentityProviders().filter(p => p.id !== providerId);
      localStorage.setItem(STORAGE_KEYS.IDENTITY_PROVIDERS, JSON.stringify(providers));
    } catch (error) {
      console.error('Error deleting identity provider:', error);
      throw error;
    }
  },

  // Clients
  getClients() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading clients:', error);
      return [];
    }
  },

  saveClient(client) {
    try {
      const clients = this.getClients();
      const existingIndex = clients.findIndex(c => c.id === client.id);
      
      if (existingIndex >= 0) {
        clients[existingIndex] = { ...clients[existingIndex], ...client, updatedAt: new Date().toISOString() };
      } else {
        clients.push({
          ...client,
          id: client.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
      return clients[existingIndex >= 0 ? existingIndex : clients.length - 1];
    } catch (error) {
      console.error('Error saving client:', error);
      throw error;
    }
  },

  deleteClient(clientId) {
    try {
      const clients = this.getClients().filter(c => c.id !== clientId);
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  },

  // Selected Provider/Client
  getSelectedProvider() {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER);
  },

  setSelectedProvider(providerId) {
    if (providerId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_PROVIDER, providerId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_PROVIDER);
    }
  },

  getSelectedClient() {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_CLIENT);
  },

  setSelectedClient(clientId) {
    if (clientId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_CLIENT, clientId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_CLIENT);
    }
  },

  // Tokens
  getTokens() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TOKENS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading tokens:', error);
      return null;
    }
  },

  saveTokens(tokens) {
    try {
      localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify({
        ...tokens,
        receivedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error;
    }
  },

  clearTokens() {
    localStorage.removeItem(STORAGE_KEYS.TOKENS);
  },

  // Auth State (for PKCE flow)
  saveAuthState(state) {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving auth state:', error);
      throw error;
    }
  },

  getAuthState() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading auth state:', error);
      return null;
    }
  },

  clearAuthState() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
  },

  // Settings
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading settings:', error);
      return {};
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },

  // Export/Import
  exportAll() {
    return {
      identityProviders: this.getIdentityProviders(),
      clients: this.getClients(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    };
  },

  importAll(data) {
    try {
      if (data.identityProviders) {
        localStorage.setItem(STORAGE_KEYS.IDENTITY_PROVIDERS, JSON.stringify(data.identityProviders));
      }
      if (data.clients) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(data.clients));
      }
      if (data.settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  },

  // Clear all data
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};

export default StorageService;
