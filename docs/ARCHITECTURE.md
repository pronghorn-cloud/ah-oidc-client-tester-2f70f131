# OIDC Testing Client - Architecture Documentation

## Overview

The OIDC Testing Client is designed as a modern, single-page application (SPA) with a Node.js backend proxy. This architecture provides a secure and flexible solution for testing OAuth 2.0 and OpenID Connect flows.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              User Browser                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                         React SPA (Port 3000 dev / served by Node)  ││
│  │                                                                      ││
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ ││
│  │   │    App.js    │  │   Router     │  │     State Management     │ ││
│  │   │  (Main Hub)  │──│  (6 Routes)  │──│   (React Hooks + LS)    │ ││
│  │   └──────────────┘  └──────────────┘  └──────────────────────────┘ ││
│  │          │                                         │                 ││
│  │          ▼                                         ▼                 ││
│  │   ┌──────────────────────────────────────────────────────────────┐ ││
│  │   │                        Components                             │ ││
│  │   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │ ││
│  │   │  │  Identity  │ │   Client   │ │   Auth     │ │   Token    │ │ ││
│  │   │  │ Providers  │ │ Registration│ │   Flow    │ │ Inspector  │ │ ││
│  │   │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ │ ││
│  │   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │ ││
│  │   │  │  UserInfo  │ │  Settings  │ │  Callback  │ │   Header   │ │ ││
│  │   │  │            │ │            │ │            │ │ Navigation │ │ ││
│  │   │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ │ ││
│  │   └──────────────────────────────────────────────────────────────┘ ││
│  │          │                                                          ││
│  │          │  API Calls                                               ││
│  │          ▼                                                          ││
│  │   ┌──────────────────────────────────────────────────────────────┐ ││
│  │   │                      Services Layer                           │ ││
│  │   │  ┌────────────────────────┐  ┌────────────────────────────┐  │ ││
│  │   │  │      API Service       │  │     Storage Service        │  │ ││
│  │   │  │  (Axios HTTP Client)   │  │   (LocalStorage CRUD)      │  │ ││
│  │   │  └────────────────────────┘  └────────────────────────────┘  │ ││
│  │   └──────────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/S (Port 3001)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Node.js Express Server                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                          Middleware Stack                            ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────────────┐││
│  │  │  CORS   │──│  JSON   │──│URL Enc. │──│   Static File Serving   │││
│  │  │         │  │ Parser  │  │ Parser  │  │   (Production Only)     │││
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                           API Routes                                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 ││
│  │  │ /api/health │  │/api/discover│  │  /api/jwks  │                 ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 ││
│  │  │ /api/token  │  │/api/userinfo│  │/api/introspect│               ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ ││
│  │  │ /api/revoke │  │  /api/pkce  │  │   /api/validate-token       │ ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    External Identity Provider                            │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        OIDC Endpoints                                ││
│  │  • /.well-known/openid-configuration                                ││
│  │  • /authorize                                                       ││
│  │  • /token                                                           ││
│  │  • /userinfo                                                        ││
│  │  • /jwks                                                            ││
│  │  • /introspect                                                      ││
│  │  • /revoke                                                          ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Components

#### 1. App.js (Main Application)
- Central state management for providers, clients, and tokens
- Routing configuration
- Props drilling to child components

#### 2. IdentityProviders Component
- CRUD operations for identity providers
- Auto-discovery integration
- Provider selection management

#### 3. ClientRegistration Component
- OAuth client configuration
- PKCE and authentication method settings
- Client-provider association

#### 4. AuthorizationFlow Component
- Authorization URL construction
- PKCE challenge generation
- State and nonce management
- Token refresh functionality

#### 5. TokenInspector Component
- JWT decoding and display
- Signature validation
- Token introspection
- Token revocation

#### 6. UserInfo Component
- UserInfo endpoint testing
- User profile display
- Custom endpoint support

#### 7. Settings Component
- Configuration export/import
- Health check monitoring
- Data management

#### 8. Callback Component
- OAuth callback handling
- Authorization code exchange
- State validation

### Backend Services

#### Express Server (index.js)
```javascript
Endpoints:
├── GET  /api/health          - Server health check
├── POST /api/discovery       - Fetch OIDC discovery document
├── POST /api/jwks            - Fetch JWKS
├── POST /api/token           - Token exchange/refresh
├── POST /api/userinfo        - Fetch user info
├── POST /api/introspect      - Token introspection
├── POST /api/revoke          - Token revocation
├── POST /api/validate-token  - JWT validation
├── GET  /api/pkce            - Generate PKCE challenge
└── GET  /api/generate-state  - Generate state/nonce
```

## Data Flow

### Authorization Code Flow with PKCE

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │  React   │     │  Node.js │     │   IdP    │
│ Browser  │     │   SPA    │     │  Server  │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  1. Click     │                │                │
     │  "Authorize"  │                │                │
     │───────────────>                │                │
     │                │                │                │
     │                │  2. Generate   │                │
     │                │     PKCE       │                │
     │                │───────────────>│                │
     │                │<───────────────│                │
     │                │                │                │
     │                │  3. Build auth │                │
     │                │     URL        │                │
     │                │                │                │
     │  4. Redirect  │                │                │
     │<───────────────│                │                │
     │                │                │                │
     │  5. Login at IdP               │                │
     │────────────────────────────────────────────────>│
     │                │                │                │
     │  6. Callback with code         │                │
     │<────────────────────────────────────────────────│
     │                │                │                │
     │  7. Code to   │                │                │
     │     React     │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │  8. Exchange   │                │
     │                │     code       │                │
     │                │───────────────>│  9. Token     │
     │                │                │     request   │
     │                │                │───────────────>│
     │                │                │<───────────────│
     │                │  10. Tokens    │  10. Tokens   │
     │                │<───────────────│                │
     │                │                │                │
     │  11. Display  │                │                │
     │      tokens   │                │                │
     │<───────────────│                │                │
     │                │                │                │
```

## Storage Architecture

### LocalStorage Schema

```javascript
{
  "oidc_testing_client_providers": [
    {
      "id": "uuid",
      "name": "Provider Name",
      "issuerUrl": "https://idp.example.com",
      "discoveryDocument": { /* OIDC config */ },
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    }
  ],
  
  "oidc_testing_client_clients": [
    {
      "id": "uuid",
      "name": "Client Name",
      "clientId": "client-id",
      "clientSecret": "secret",
      "redirectUri": "http://localhost:3000/callback",
      "scopes": "openid profile email",
      "grantTypes": ["authorization_code"],
      "usePKCE": true,
      "useBasicAuth": false,
      "providerId": "uuid",
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    }
  ],
  
  "oidc_testing_client_tokens": {
    "access_token": "...",
    "id_token": "...",
    "refresh_token": "...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "receivedAt": "ISO timestamp"
  },
  
  "oidc_testing_client_auth_state": {
    "state": "random-state",
    "nonce": "random-nonce",
    "codeVerifier": "pkce-verifier",
    "providerId": "uuid",
    "clientId": "uuid"
  },
  
  "oidc_testing_client_selected_provider": "uuid",
  "oidc_testing_client_selected_client": "uuid"
}
```

## Deployment Architecture

### OpenShift Deployment

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OpenShift Container Platform                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Namespace: oidc-testing-client             │  │
│  │                                                                 │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐│  │
│  │  │   Route     │───>│   Service   │───>│     Deployment      ││  │
│  │  │ (HTTPS)     │    │ (ClusterIP) │    │  ┌───────────────┐  ││  │
│  │  │             │    │  Port 3001  │    │  │     Pod       │  ││  │
│  │  └─────────────┘    └─────────────┘    │  │ ┌───────────┐ │  ││  │
│  │                                         │  │ │ Container │ │  ││  │
│  │                                         │  │ │  Node.js  │ │  ││  │
│  │                                         │  │ │ +React    │ │  ││  │
│  │  ┌─────────────┐                       │  │ └───────────┘ │  ││  │
│  │  │ ConfigMap   │───────────────────────│  └───────────────┘  ││  │
│  │  │ Environment │                       └─────────────────────┘│  │
│  │  └─────────────┘                                               │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                    ImageStream                           │  │  │
│  │  │  oidc-testing-client:latest (ppc64le)                   │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                              ▲                                 │  │
│  │                              │                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                    BuildConfig                           │  │  │
│  │  │  Docker Build Strategy                                   │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Container Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Container: oidc-testing-client                 │
│           Base: UBI9 Node.js 18 Minimal                 │
│           Architecture: ppc64le (Power)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  /opt/app-root/src/                                     │
│  ├── server/                                            │
│  │   └── index.js          # Express server             │
│  ├── client/                                            │
│  │   └── build/            # React production build     │
│  ├── node_modules/         # Production dependencies    │
│  └── package.json                                       │
│                                                          │
│  Process: node server/index.js                          │
│  Port: 3001                                             │
│  User: 1001 (non-root)                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Security Considerations

### Frontend Security
- State parameter validation for CSRF protection
- Nonce validation for replay attack prevention
- PKCE for authorization code interception protection
- Sensitive data stored only in browser localStorage

### Backend Security
- CORS enabled with configurable origins
- No sensitive data persisted on server
- Proxy pattern prevents token exposure in browser network tab
- Input validation on all endpoints

### Container Security
- Non-root user (UID 1001)
- Minimal base image (UBI9 Minimal)
- Security context restrictions
- No privilege escalation

## Performance Considerations

### Frontend
- React 18 with concurrent features
- Code splitting via React Router
- LocalStorage for fast data access
- Minimal dependencies

### Backend
- Stateless design for horizontal scaling
- Connection pooling via Axios
- Efficient JSON parsing
- Health check endpoint for load balancers

### Container
- Multi-stage build for minimal image size
- Production dependencies only
- Static file serving from Express
- Resource limits configured in deployment
