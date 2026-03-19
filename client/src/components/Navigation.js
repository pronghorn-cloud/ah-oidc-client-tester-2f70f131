import React from 'react';

const Navigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'providers', label: 'Identity Providers', icon: '🔐' },
    { id: 'clients', label: 'Clients', icon: '📱' },
    { id: 'authorize', label: 'Authorization', icon: '🚀' },
    { id: 'tokens', label: 'Token Inspector', icon: '🔍' },
    { id: 'userinfo', label: 'UserInfo', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav className="nav-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="nav-tab-icon">{tab.icon}</span>
          <span className="nav-tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
