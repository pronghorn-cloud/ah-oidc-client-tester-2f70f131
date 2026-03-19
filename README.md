# OIDC Testing Client

A comprehensive OpenID Connect (OIDC) testing client built with Node.js and React, designed to run on OpenShift with Power Architecture (ppc64le) support.

## Features

- **Identity Provider Management**: Configure and manage multiple OIDC identity providers
- **Client Registration**: Store and manage OAuth2/OIDC client configurations
- **Authorization Flows**: Support for Authorization Code, Authorization Code with PKCE, Implicit, and Client Credentials flows
- **Token Inspector**: Decode and validate JWT tokens, view claims, and check signatures
- **UserInfo Endpoint**: Fetch and display user information from the IdP
- **Token Operations**: Refresh, introspect, and revoke tokens
- **PKCE Support**: Automatic generation of code verifier and code challenge
- **Local Storage**: Persist configurations and tokens in browser storage

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OIDC Testing Client                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)           │  Backend (Node.js/Express)    │
│  - Identity Providers       │  - OIDC Proxy Endpoints       │
│  - Client Registration      │  - Token Exchange             │
│  - Authorization Flow       │  - JWKS Verification          │
│  - Token Inspector          │  - UserInfo Proxy             │
│  - UserInfo Display         │  - PKCE Generation            │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+ (with ppc64le support for Power Architecture)
- npm or yarn
- OpenShift CLI (oc) for deployment
- Access to an OpenShift cluster

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd oidc-testing-client
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env as needed
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Backend server on http://localhost:3001
   - Frontend dev server on http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

## OpenShift Deployment

### Using Scripts

```bash
# Build the container image
./scripts/build.sh

# Deploy to OpenShift
./scripts/deploy.sh
```

### Manual Deployment

1. **Login to OpenShift**
   ```bash
   oc login <cluster-url>
   ```

2. **Create a new project (optional)**
   ```bash
   oc new-project oidc-testing
   ```

3. **Apply Kubernetes/OpenShift manifests**
   ```bash
   oc apply -k openshift/
   ```

4. **Start the build**
   ```bash
   oc start-build oidc-testing-client --from-dir=. --follow
   ```

5. **Get the route URL**
   ```bash
   oc get route oidc-testing-client -o jsonpath='{.spec.host}'
   ```

## Project Structure

```
oidc-testing-client/
├── client/                    # React frontend
│   ├── public/               # Static assets
│   └── src/
│       ├── components/       # React components
│       │   ├── AuthorizationFlow.js
│       │   ├── Callback.js
│       │   ├── ClientRegistration.js
│       │   ├── Header.js
│       │   ├── IdentityProviders.js
│       │   ├── Navigation.js
│       │   ├── Settings.js
│       │   ├── TokenInspector.js
│       │   └── UserInfo.js
│       ├── services/         # API and storage services
│       ├── App.js
│       └── index.js
├── server/                    # Node.js backend
│   └── index.js              # Express server
├── openshift/                 # OpenShift deployment configs
│   ├── buildconfig.yaml
│   ├── configmap.yaml
│   ├── deployment.yaml
│   └── kustomization.yaml
├── scripts/                   # Build and deploy scripts
├── Dockerfile                 # Production Dockerfile
├── Dockerfile.dev            # Development Dockerfile
└── package.json
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check endpoint |
| `/api/discovery` | POST | Fetch OIDC discovery document |
| `/api/jwks` | POST | Fetch JWKS from IdP |
| `/api/token` | POST | Exchange authorization code for tokens |
| `/api/userinfo` | POST | Fetch user info from IdP |
| `/api/introspect` | POST | Introspect a token |
| `/api/revoke` | POST | Revoke a token |
| `/api/validate-token` | POST | Validate and decode JWT locally |
| `/api/pkce` | GET | Generate PKCE code verifier and challenge |
| `/api/generate-state` | GET | Generate state and nonce values |

## Usage Guide

### 1. Add an Identity Provider

1. Navigate to "Identity Providers" tab
2. Enter the Issuer URL (e.g., `https://login.microsoftonline.com/{tenant}/v2.0`)
3. Click "Discover" to auto-populate endpoints
4. Save the provider configuration

### 2. Register a Client

1. Navigate to "Clients" tab
2. Enter Client ID and optional Client Secret
3. Configure redirect URIs and scopes
4. Associate with an Identity Provider
5. Save the client configuration

### 3. Perform Authorization

1. Navigate to "Authorize" tab
2. Select an Identity Provider and Client
3. Choose the authorization flow (Code, Code+PKCE, Implicit, etc.)
4. Configure scopes and optional parameters
5. Click "Authorize" to initiate the flow
6. Complete authentication at the IdP
7. Tokens will be captured and displayed

### 4. Inspect Tokens

1. Navigate to "Tokens" tab
2. View decoded JWT headers and payloads
3. Verify token signatures against JWKS
4. Check expiration and other claims
5. Refresh or revoke tokens as needed

### 5. Fetch User Info

1. Navigate to "UserInfo" tab
2. Click "Fetch UserInfo" to retrieve claims from the IdP
3. View user profile information

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `API_TIMEOUT` | `30000` | API request timeout (ms) |

## Security Considerations

- Tokens are stored in browser localStorage - suitable for testing only
- Use HTTPS in production (handled by OpenShift Route TLS)
- Client secrets should be treated as sensitive data
- This tool is intended for testing and debugging, not production authentication

## Power Architecture (ppc64le) Support

The Dockerfile is configured to work with Power Architecture:
- Uses `node:18-alpine` as base (multi-arch support)
- No architecture-specific native dependencies
- Tested on OpenShift running on IBM Power Systems

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Troubleshooting

### Common Issues

**CORS Errors**: The backend proxies all IdP requests to avoid CORS issues. Ensure requests go through `/api/*` endpoints.

**Token Exchange Failures**: Verify client credentials and redirect URI match the IdP configuration.

**PKCE Failures**: Some IdPs require specific PKCE configurations. Try with S256 challenge method.

**Build Failures on OpenShift**: Ensure sufficient resources and check build logs:
```bash
oc logs -f bc/oidc-testing-client
```
