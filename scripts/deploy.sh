#!/bin/bash
# =============================================================================
# OIDC Testing Client - OpenShift Deployment Script
# =============================================================================
# This script deploys the OIDC Testing Client to OpenShift Container Platform
# Supports deployment via oc CLI or kubectl with OpenShift extensions
# =============================================================================

set -e

# Configuration
NAMESPACE="${NAMESPACE:-oidc-testing-client}"
IMAGE_NAME="oidc-testing-client"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-}"
DEPLOY_METHOD="${DEPLOY_METHOD:-apply}"  # apply or kustomize

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --namespace NS     Kubernetes namespace (default: oidc-testing-client)"
    echo "  -t, --tag TAG          Image tag to deploy (default: latest)"
    echo "  -r, --registry REG     Container registry URL"
    echo "  -m, --method METHOD    Deployment method: apply or kustomize (default: apply)"
    echo "  --create-namespace     Create namespace if it doesn't exist"
    echo "  --dry-run              Show what would be deployed without applying"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy with defaults"
    echo "  $0 -n my-namespace -t v1.0.0         # Deploy specific version"
    echo "  $0 --method kustomize                 # Deploy using Kustomize"
    echo "  $0 --dry-run                          # Preview deployment"
}

CREATE_NAMESPACE="false"
DRY_RUN="false"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -m|--method)
            DEPLOY_METHOD="$2"
            shift 2
            ;;
        --create-namespace)
            CREATE_NAMESPACE="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Determine full image name
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
fi

log_info "=================================================="
log_info "OIDC Testing Client - OpenShift Deployment"
log_info "=================================================="
log_info "Namespace: ${NAMESPACE}"
log_info "Image: ${FULL_IMAGE_NAME}"
log_info "Method: ${DEPLOY_METHOD}"
log_info "Dry Run: ${DRY_RUN}"
log_info "=================================================="

# Check if oc or kubectl is available
if command -v oc &> /dev/null; then
    CLI="oc"
elif command -v kubectl &> /dev/null; then
    CLI="kubectl"
else
    log_error "Neither oc nor kubectl found. Please install OpenShift CLI."
    exit 1
fi

log_info "Using CLI: ${CLI}"

# Check cluster connection
log_info "Checking cluster connection..."
if ! $CLI cluster-info &> /dev/null; then
    log_error "Not connected to a cluster. Please login first."
    log_info "Use: oc login <cluster-url> or kubectl config use-context <context>"
    exit 1
fi

log_success "Connected to cluster"

# Create namespace if requested
if [ "$CREATE_NAMESPACE" = "true" ]; then
    log_info "Creating namespace: ${NAMESPACE}"
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY RUN] Would create namespace: ${NAMESPACE}"
    else
        $CLI create namespace "${NAMESPACE}" --dry-run=client -o yaml | $CLI apply -f - || true
    fi
fi

# Set namespace context
log_info "Setting namespace context to: ${NAMESPACE}"

# Prepare deployment files
DEPLOY_DIR="openshift"

if [ ! -d "$DEPLOY_DIR" ]; then
    log_error "OpenShift deployment directory not found: $DEPLOY_DIR"
    exit 1
fi

# Update image in deployment
log_info "Updating image reference in deployment..."

# Create temporary deployment file with correct image
TMP_DEPLOY=$(mktemp)
cat "${DEPLOY_DIR}/deployment.yaml" | sed "s|image: oidc-testing-client:latest|image: ${FULL_IMAGE_NAME}|g" > "$TMP_DEPLOY"

# Deploy based on method
if [ "$DEPLOY_METHOD" = "kustomize" ]; then
    log_info "Deploying using Kustomize..."
    
    if [ "$DRY_RUN" = "true" ]; then
        $CLI kustomize "${DEPLOY_DIR}" | sed "s|image: oidc-testing-client:latest|image: ${FULL_IMAGE_NAME}|g"
    else
        $CLI kustomize "${DEPLOY_DIR}" | \
            sed "s|image: oidc-testing-client:latest|image: ${FULL_IMAGE_NAME}|g" | \
            $CLI apply -n "${NAMESPACE}" -f -
    fi
else
    log_info "Deploying using kubectl apply..."
    
    # Apply ConfigMap
    if [ -f "${DEPLOY_DIR}/configmap.yaml" ]; then
        log_info "Applying ConfigMap..."
        if [ "$DRY_RUN" = "true" ]; then
            log_info "[DRY RUN] Would apply: ${DEPLOY_DIR}/configmap.yaml"
        else
            $CLI apply -n "${NAMESPACE}" -f "${DEPLOY_DIR}/configmap.yaml"
        fi
    fi
    
    # Apply Deployment, Service, and Route
    log_info "Applying Deployment, Service, and Route..."
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY RUN] Would apply deployment with image: ${FULL_IMAGE_NAME}"
        cat "$TMP_DEPLOY"
    else
        $CLI apply -n "${NAMESPACE}" -f "$TMP_DEPLOY"
    fi
fi

# Cleanup
rm -f "$TMP_DEPLOY"

# Wait for deployment (if not dry run)
if [ "$DRY_RUN" != "true" ]; then
    log_info "Waiting for deployment to be ready..."
    $CLI rollout status deployment/oidc-testing-client -n "${NAMESPACE}" --timeout=300s
    
    if [ $? -eq 0 ]; then
        log_success "Deployment completed successfully!"
    else
        log_error "Deployment failed or timed out"
        exit 1
    fi
    
    # Get route URL
    log_info "=================================================="
    log_info "Deployment Summary"
    log_info "=================================================="
    
    if [ "$CLI" = "oc" ]; then
        ROUTE_URL=$($CLI get route oidc-testing-client -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null || echo "")
        if [ -n "$ROUTE_URL" ]; then
            log_success "Application URL: https://${ROUTE_URL}"
        fi
    fi
    
    log_info "Pods:"
    $CLI get pods -n "${NAMESPACE}" -l app=oidc-testing-client
    
    log_info "Services:"
    $CLI get svc -n "${NAMESPACE}" -l app=oidc-testing-client
    
    if [ "$CLI" = "oc" ]; then
        log_info "Routes:"
        $CLI get routes -n "${NAMESPACE}" -l app=oidc-testing-client
    fi
    
    log_info "=================================================="
fi

log_success "Deployment script completed!"
