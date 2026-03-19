# OIDC Testing Client - Deployment Guide

This guide covers deploying the OIDC Testing Client to OpenShift Container Platform on Power Architecture (ppc64le).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Process](#build-process)
3. [Deployment Options](#deployment-options)
4. [Configuration](#configuration)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **OpenShift CLI (oc)**: Version 4.x or later
- **Docker or Podman**: For building container images
- **Git**: For source code management

### OpenShift Requirements

- OpenShift Container Platform 4.x on Power Architecture (ppc64le)
- Namespace/Project with appropriate permissions
- Route capability for external access

### Verify Prerequisites

```bash
# Check oc CLI
oc version

# Check Docker/Podman
docker --version  # or: podman --version

# Verify cluster connection
oc cluster-info
oc whoami
```

## Build Process

### Option 1: Build Locally and Push

```bash
# Build the image for Power Architecture
./scripts/build.sh -t v1.0.0 -r <registry-url>/<namespace>

# Push to registry
./scripts/build.sh -t v1.0.0 -r <registry-url>/<namespace> --push

# Example with internal OpenShift registry
./scripts/build.sh -t v1.0.0 -r default-route-openshift-image-registry.apps.cluster.example.com/oidc-testing-client --push
```

### Option 2: Build on OpenShift (S2I)

```bash
# Create project
oc new-project oidc-testing-client

# Create ImageStream
oc create -f openshift/buildconfig.yaml

# Update BuildConfig with your Git repository
oc patch bc/oidc-testing-client -p '{"spec":{"source":{"git":{"uri":"https://github.com/your-org/oidc-testing-client.git"}}}}'

# Start build
oc start-build oidc-testing-client --follow
```

### Option 3: Using Dockerfile Build in OpenShift

```bash
# Create build from Dockerfile
oc new-build --strategy=docker --binary --name=oidc-testing-client

# Start build from local directory
oc start-build oidc-testing-client --from-dir=. --follow
```

## Deployment Options

### Option 1: Using Deploy Script (Recommended)

```bash
# Basic deployment
./scripts/deploy.sh -n oidc-testing-client --create-namespace

# With custom image
./scripts/deploy.sh -n oidc-testing-client -t v1.0.0 -r my-registry.io/myns

# Dry run to preview
./scripts/deploy.sh --dry-run
```

### Option 2: Using oc apply

```bash
# Create namespace
oc new-project oidc-testing-client

# Apply ConfigMap
oc apply -f openshift/configmap.yaml

# Apply Deployment, Service, and Route
oc apply -f openshift/deployment.yaml

# Verify deployment
oc rollout status deployment/oidc-testing-client
```

### Option 3: Using Kustomize

```bash
# Deploy using kustomize
oc apply -k openshift/

# With custom namespace
cd openshift && kustomize edit set namespace my-custom-namespace && cd ..
oc apply -k openshift/
```

### Option 4: Using Helm (if chart available)

```bash
# Install via Helm
helm install oidc-testing-client ./helm-chart \
  --namespace oidc-testing-client \
  --create-namespace \
  --set image.tag=v1.0.0
```

## Configuration

### Environment Variables

Edit `openshift/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: oidc-testing-client-config
data:
  NODE_ENV: "production"
  PORT: "3001"
  # Add custom configuration
  LOG_LEVEL: "info"
```

Apply changes:

```bash
oc apply -f openshift/configmap.yaml
oc rollout restart deployment/oidc-testing-client
```

### Resource Limits

Edit `openshift/deployment.yaml`:

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Scaling

```bash
# Manual scaling
oc scale deployment/oidc-testing-client --replicas=3

# Autoscaling
oc autoscale deployment/oidc-testing-client --min=1 --max=5 --cpu-percent=80
```

### TLS Configuration

The default Route uses edge TLS termination. For custom certificates:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: oidc-testing-client
spec:
  tls:
    termination: edge
    certificate: |
      -----BEGIN CERTIFICATE-----
      ...
      -----END CERTIFICATE-----
    key: |
      -----BEGIN RSA PRIVATE KEY-----
      ...
      -----END RSA PRIVATE KEY-----
    caCertificate: |
      -----BEGIN CERTIFICATE-----
      ...
      -----END CERTIFICATE-----
```

## Monitoring

### Health Checks

The application exposes `/api/health` for monitoring:

```bash
# Check health endpoint
curl https://<route-url>/api/health

# Response:
# {"status":"healthy","timestamp":"2024-01-01T00:00:00.000Z","version":"1.0.0"}
```

### Viewing Logs

```bash
# Stream logs
oc logs -f deployment/oidc-testing-client

# View previous container logs
oc logs deployment/oidc-testing-client --previous

# Logs from specific pod
oc logs <pod-name>
```

### Metrics

```bash
# View pod metrics
oc adm top pods -l app=oidc-testing-client

# View node metrics
oc adm top nodes
```

### Events

```bash
# View events
oc get events --sort-by='.lastTimestamp' | grep oidc-testing-client

# Watch events
oc get events -w
```

## Troubleshooting

### Common Issues

#### Pod Not Starting

```bash
# Check pod status
oc get pods -l app=oidc-testing-client

# Describe pod for events
oc describe pod <pod-name>

# Check logs
oc logs <pod-name>
```

#### Image Pull Errors

```bash
# Check image stream
oc get is oidc-testing-client

# Check if image exists
oc get istag oidc-testing-client:latest

# For external registries, create pull secret
oc create secret docker-registry my-registry-secret \
  --docker-server=<registry-url> \
  --docker-username=<username> \
  --docker-password=<password>

oc secrets link default my-registry-secret --for=pull
```

#### Route Not Accessible

```bash
# Check route
oc get route oidc-testing-client

# Check service
oc get svc oidc-testing-client

# Check endpoints
oc get endpoints oidc-testing-client

# Test service internally
oc run test --rm -it --restart=Never --image=curlimages/curl -- \
  curl http://oidc-testing-client:3001/api/health
```

#### Application Errors

```bash
# Check application logs
oc logs -f deployment/oidc-testing-client

# Execute into container for debugging
oc rsh deployment/oidc-testing-client

# Check environment variables
oc set env deployment/oidc-testing-client --list
```

### Rollback

```bash
# View rollout history
oc rollout history deployment/oidc-testing-client

# Rollback to previous version
oc rollout undo deployment/oidc-testing-client

# Rollback to specific revision
oc rollout undo deployment/oidc-testing-client --to-revision=2
```

### Cleanup

```bash
# Delete all resources
oc delete all -l app=oidc-testing-client

# Delete namespace
oc delete project oidc-testing-client

# Using kustomize
oc delete -k openshift/
```

## Security Considerations

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: oidc-testing-client-policy
spec:
  podSelector:
    matchLabels:
      app: oidc-testing-client
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              network.openshift.io/policy-group: ingress
      ports:
        - protocol: TCP
          port: 3001
  egress:
    - to: []
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 80
```

### Pod Security

The deployment uses security best practices:

- Non-root user (UID 1001)
- No privilege escalation
- Dropped capabilities
- Read-only root filesystem (optional)

## Backup and Recovery

### Export Configuration

```bash
# Export all resources
oc get all,configmap,secret -l app=oidc-testing-client -o yaml > backup.yaml

# Export specific resources
oc get deployment,service,route,configmap -l app=oidc-testing-client -o yaml > backup.yaml
```

### Restore Configuration

```bash
# Restore from backup
oc apply -f backup.yaml
```
