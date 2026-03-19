# OIDC Testing Client - Dockerfile for Power Architecture (ppc64le)
# Multi-stage build for optimized production image

# =============================================================================
# Stage 1: Build the React frontend
# =============================================================================
FROM --platform=linux/ppc64le registry.access.redhat.com/ubi9/nodejs-18:latest AS frontend-builder

# Set working directory
WORKDIR /opt/app-root/src

# Copy client package files
COPY client/package*.json ./client/

# Install client dependencies
WORKDIR /opt/app-root/src/client
RUN npm ci --only=production=false

# Copy client source code
COPY client/ ./

# Build the React application
ENV NODE_ENV=production
RUN npm run build

# =============================================================================
# Stage 2: Build the production image
# =============================================================================
FROM --platform=linux/ppc64le registry.access.redhat.com/ubi9/nodejs-18-minimal:latest AS production

# Labels for OpenShift
LABEL name="oidc-testing-client" \
      vendor="OIDC Testing Client" \
      version="1.0.0" \
      release="1" \
      summary="OIDC Testing Client for OAuth 2.0 and OpenID Connect flow testing" \
      description="A comprehensive tool for testing OAuth 2.0 and OpenID Connect flows" \
      io.k8s.display-name="OIDC Testing Client" \
      io.k8s.description="OIDC Testing Client for OAuth 2.0 and OpenID Connect flow testing" \
      io.openshift.tags="nodejs,oauth,oidc,testing" \
      io.openshift.expose-services="3001:http" \
      architecture="ppc64le"

# Set working directory
WORKDIR /opt/app-root/src

# Copy server package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy server source code
COPY server/ ./server/

# Copy built React app from frontend-builder stage
COPY --from=frontend-builder /opt/app-root/src/client/build ./client/build

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    NPM_CONFIG_LOGLEVEL=warn

# Expose port
EXPOSE 3001

# Create non-root user for OpenShift compatibility
# Note: OpenShift will run with arbitrary user ID
USER 1001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["node", "server/index.js"]
