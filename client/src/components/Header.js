import React from 'react';

const Header = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          OIDC Testing Client
        </h1>
        <div className="header-info">
          <span className="badge badge-info">v1.0.0</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
