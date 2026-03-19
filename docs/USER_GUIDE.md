# OIDC Testing Client - User Guide

This guide explains how to use the OIDC Testing Client to test OAuth 2.0 and OpenID Connect flows.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Identity Providers](#identity-providers)
3. [Client Registration](#client-registration)
4. [Authorization Flow](#authorization-flow)
5. [Token Inspector](#token-inspector)
6. [UserInfo Testing](#userinfo-testing)
7. [Settings](#settings)

## Getting Started

### Accessing the Application

1. Open your web browser
2. Navigate to the application URL (e.g., `http://localhost:3000` for development)
3. You'll see the main dashboard with navigation tabs

### Workflow Overview

```
1. Add Identity Provider → 2. Register Client → 3. Start Auth Flow → 4. Inspect Tokens → 5. Test UserInfo
```

## Identity Providers

The Identity Providers tab allows you to manage OIDC providers (IdPs) like Keycloak, Okta, Azure AD, etc.

### Adding a Provider

1. Click **"+ Add Provider"**
2. Enter a **Name** for the provider (e.g., "My Keycloak")
3. Enter the **Issuer URL** (e.g., `https://keycloak.example.com/realms/master`)
4. Click **"Discover"** to automatically fetch the OIDC configuration
5. Review the discovered endpoints
6. Click **"Save Provider"**

### Discovery Document

The discovery process fetches the `.well-known/openid-configuration` document which contains:

- Authorization endpoint
- Token endpoint
- UserInfo endpoint
- JWKS URI
- Supported scopes
- Supported grant types

### Selecting a Provider

Click **"Select"** on any provider to make it the active provider for testing.

### Editing/Deleting Providers

- Click **"Edit"** to modify provider settings
- Click **"Delete"** to remove a provider

## Client Registration

The Clients tab manages OAuth 2.0/OIDC client configurations.

### Adding a Client

1. Click **"+ Add Client"**
2. Fill in the required fields:

| Field | Description | Example |
|-------|-------------|---------|
| Client Name | Display name | "My Test App" |
| Client ID | OAuth client identifier | "my-client-id" |
| Client Secret | OAuth client secret (optional for public clients) | "secret123" |
| Redirect URI | Callback URL | `http://localhost:3000/callback` |
| Scopes | Space-separated scopes | "openid profile email" |

3. Configure options:
   - **Use PKCE**: Enable for public clients (recommended)
   - **Use Basic Auth**: Send credentials in Authorization header

4. Select grant types:
   - Authorization Code (most common)
   - Refresh Token
   - Client Credentials

5. Click **"Save Client"**

### Client Types

#### Public Client
- No client secret
- Must use PKCE
- Used for SPAs, mobile apps

#### Confidential Client
- Has client secret
- PKCE optional but recommended
- Used for server-side applications

## Authorization Flow

The Authorization tab allows you to initiate and test OAuth 2.0 flows.

### Prerequisites

1. Select an Identity Provider
2. Select a Client

### Configuring the Flow

#### Response Type

| Type | Flow | Use Case |
|------|------|----------|
| `code` | Authorization Code | Most secure, recommended |
| `token` | Implicit | Legacy, not recommended |
| `id_token` | Implicit | OpenID Connect only |
| `code id_token` | Hybrid | Advanced scenarios |

#### Parameters

| Parameter | Description |
|-----------|-------------|
| Scope | Permissions requested (e.g., "openid profile email") |
| State | CSRF protection token (auto-generated) |
| Nonce | Replay attack protection (auto-generated) |
| Prompt | Login behavior (none, login, consent, select_account) |
| Login Hint | Pre-fill username |

### Starting the Flow

1. Configure parameters
2. Click **"Build Authorization URL"**
3. Review the generated URL
4. Click **"Start Authorization"**
5. Login at the Identity Provider
6. You'll be redirected back with tokens

### PKCE Flow

When PKCE is enabled:

1. A code verifier is generated (random string)
2. A code challenge is derived (SHA-256 hash)
3. The challenge is sent with the authorization request
4. The verifier is sent with the token request

### Refreshing Tokens

If you have a refresh token:

1. Click **"Refresh Tokens"**
2. New tokens will be obtained

## Token Inspector

The Token Inspector allows you to decode, validate, and manage tokens.

### Viewing Tokens

After authorization, you'll have:

- **Access Token**: Used to access protected resources
- **ID Token**: Contains user identity claims
- **Refresh Token**: Used to obtain new tokens

Click on each token type to view it.

### Decoded View

The inspector shows:

#### Header
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id"
}
```

#### Payload
```json
{
  "iss": "https://idp.example.com",
  "sub": "user-id",
  "aud": "client-id",
  "exp": 1234567890,
  "iat": 1234567800,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Claims Analysis

| Claim | Description |
|-------|-------------|
| iss | Issuer - who created the token |
| sub | Subject - unique user identifier |
| aud | Audience - intended recipient |
| exp | Expiration time |
| iat | Issued at time |
| nbf | Not before time |
| azp | Authorized party |

### Validating Tokens

Click **"Validate Signature"** to:

1. Fetch the JWKS from the IdP
2. Find the matching key by `kid`
3. Verify the signature
4. Check expiration

### Token Introspection

Click **"Introspect"** to:

1. Send the token to the IdP's introspection endpoint
2. Get real-time token status
3. See if the token is still active

### Token Revocation

Click **"Revoke"** to:

1. Invalidate the token at the IdP
2. The token will no longer be usable

### Manual Token Input

You can paste any JWT token to decode it, even without going through the authorization flow.

## UserInfo Testing

The UserInfo tab tests the OIDC UserInfo endpoint.

### Fetching UserInfo

1. Ensure you have an access token
2. Click **"Fetch UserInfo"**
3. View the returned claims

### User Profile Display

If available, you'll see:

- Profile picture
- Full name
- Email (with verification status)
- Username

### All Claims

The full response is displayed with all claims:

| Claim | Description |
|-------|-------------|
| sub | Subject identifier |
| name | Full name |
| given_name | First name |
| family_name | Last name |
| preferred_username | Username |
| email | Email address |
| email_verified | Email verification status |
| picture | Profile picture URL |

### Custom Endpoint

You can test a custom UserInfo endpoint by entering:

1. Custom endpoint URL
2. Custom access token

## Settings

The Settings tab provides application management features.

### Server Health Check

Click **"Check Health"** to verify the backend server is running.

### Storage Statistics

View counts of:

- Identity Providers
- Clients
- Active Tokens

### Export Configuration

Click **"Export Configuration"** to:

1. Download all providers and clients as JSON
2. Use for backup or migration

**Note**: Tokens are not exported for security reasons.

### Import Configuration

Click **"Import Configuration"** to:

1. Select a previously exported JSON file
2. Restore providers and clients

### Clear All Data

**Warning**: This action is irreversible!

Click **"Clear All Data"** to:

1. Remove all providers
2. Remove all clients
3. Remove all tokens
4. Reset the application

## Tips and Best Practices

### Security

1. Always use PKCE for public clients
2. Use HTTPS in production
3. Don't share exported configurations with secrets
4. Clear tokens when done testing

### Testing

1. Start with discovery to auto-configure endpoints
2. Use the token inspector to understand token contents
3. Test token refresh before expiration
4. Verify UserInfo returns expected claims

### Troubleshooting

1. Check the browser console for errors
2. Verify redirect URI matches client configuration at IdP
3. Ensure scopes are supported by the IdP
4. Check token expiration if requests fail

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + C` | Copy selected text |
| `Tab` | Navigate between fields |
| `Enter` | Submit forms |

## Support

For issues or questions:

1. Check the browser console for errors
2. Review the application logs
3. Consult the architecture documentation
4. Open an issue in the repository
