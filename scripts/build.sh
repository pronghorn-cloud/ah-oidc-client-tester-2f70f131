#!/bin/bash
# =============================================================================
# OIDC Testing Client - Build Script
# =============================================================================
# This script builds the Docker image for the OIDC Testing Client
# Supports both local development and production builds
# =============================================================================

set -e

# Configuration
IMAGE_NAME="oidc-testing-client"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
PLATFORM="${PLATFORM:-linux/ppc64le}"
REGISTRY="${REGISTRY:-}"
PUSH_IMAGE="${PUSH_IMAGE:-false}"

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
    echo "  -t, --tag TAG          Image tag (default: latest)"
    echo "  -f, --file FILE        Dockerfile to use (default: Dockerfile)"
    echo "  -p, --platform PLAT    Target platform (default: linux/ppc64le)"
    echo "  -r, --registry REG     Container registry URL"
    echo "  --push                 Push image to registry after build"
    echo "  --dev                  Build development image"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Build production image"
    echo "  $0 --dev                              # Build development image"
    echo "  $0 -t v1.0.0 -r my-registry.io/myns   # Build and tag for registry"
    echo "  $0 -t v1.0.0 --push                   # Build and push to registry"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -f|--file)
            DOCKERFILE="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        --push)
            PUSH_IMAGE="true"
            shift
            ;;
        --dev)
            DOCKERFILE="Dockerfile.dev"
            IMAGE_TAG="dev"
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
log_info "OIDC Testing Client - Build Script"
log_info "=================================================="
log_info "Image: ${FULL_IMAGE_NAME}"
log_info "Dockerfile: ${DOCKERFILE}"
log_info "Platform: ${PLATFORM}"
log_info "=================================================="

# Check if Docker/Podman is available
if command -v podman &> /dev/null; then
    CONTAINER_CLI="podman"
elif command -v docker &> /dev/null; then
    CONTAINER_CLI="docker"
else
    log_error "Neither Docker nor Podman found. Please install one of them."
    exit 1
fi

log_info "Using container CLI: ${CONTAINER_CLI}"

# Check if Dockerfile exists
if [ ! -f "$DOCKERFILE" ]; then
    log_error "Dockerfile not found: $DOCKERFILE"
    exit 1
fi

# Build the image
log_info "Building image..."

BUILD_ARGS=""
if [ "$CONTAINER_CLI" = "docker" ]; then
    BUILD_ARGS="--platform ${PLATFORM}"
fi

$CONTAINER_CLI build \
    $BUILD_ARGS \
    -t "${FULL_IMAGE_NAME}" \
    -f "${DOCKERFILE}" \
    .

if [ $? -eq 0 ]; then
    log_success "Image built successfully: ${FULL_IMAGE_NAME}"
else
    log_error "Failed to build image"
    exit 1
fi

# Push to registry if requested
if [ "$PUSH_IMAGE" = "true" ]; then
    if [ -z "$REGISTRY" ]; then
        log_warning "No registry specified. Skipping push."
    else
        log_info "Pushing image to registry..."
        $CONTAINER_CLI push "${FULL_IMAGE_NAME}"
        
        if [ $? -eq 0 ]; then
            log_success "Image pushed successfully: ${FULL_IMAGE_NAME}"
        else
            log_error "Failed to push image"
            exit 1
        fi
    fi
fi

# Print image info
log_info "=================================================="
log_info "Build completed successfully!"
log_info "=================================================="
log_info "Image: ${FULL_IMAGE_NAME}"
$CONTAINER_CLI images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
log_info "=================================================="
