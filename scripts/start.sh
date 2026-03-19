#!/bin/bash
# =============================================================================
# OIDC Testing Client - Start Script
# =============================================================================
# This script starts the OIDC Testing Client application
# Supports local development and container modes
# =============================================================================

set -e

# Configuration
MODE="${MODE:-local}"  # local, docker, or podman
PORT="${PORT:-3001}"
DEV_MODE="${DEV_MODE:-false}"

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
    echo "  -m, --mode MODE        Start mode: local, docker, podman (default: local)"
    echo "  -p, --port PORT        Port number (default: 3001)"
    echo "  -d, --dev              Start in development mode"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                     # Start locally in production mode"
    echo "  $0 --dev               # Start locally in development mode"
    echo "  $0 --mode docker       # Start using Docker"
    echo "  $0 -m podman -p 8080   # Start using Podman on port 8080"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -d|--dev)
            DEV_MODE="true"
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

log_info "=================================================="
log_info "OIDC Testing Client - Start Script"
log_info "=================================================="
log_info "Mode: ${MODE}"
log_info "Port: ${PORT}"
log_info "Development: ${DEV_MODE}"
log_info "=================================================="

case $MODE in
    local)
        # Start locally using npm
        if [ "$DEV_MODE" = "true" ]; then
            log_info "Starting in development mode..."
            
            # Check if dependencies are installed
            if [ ! -d "node_modules" ]; then
                log_info "Installing server dependencies..."
                npm install
            fi
            
            if [ ! -d "client/node_modules" ]; then
                log_info "Installing client dependencies..."
                cd client && npm install && cd ..
            fi
            
            log_info "Starting development servers..."
            log_info "Server will be available at: http://localhost:${PORT}"
            log_info "Client dev server at: http://localhost:3000"
            log_info "Press Ctrl+C to stop"
            
            PORT=$PORT npm run dev
        else
            log_info "Starting in production mode..."
            
            # Check if dependencies are installed
            if [ ! -d "node_modules" ]; then
                log_info "Installing dependencies..."
                npm install --only=production
            fi
            
            # Check if client is built
            if [ ! -d "client/build" ]; then
                log_warning "Client build not found. Building..."
                cd client && npm install && npm run build && cd ..
            fi
            
            log_info "Starting server..."
            log_info "Application will be available at: http://localhost:${PORT}"
            log_info "Press Ctrl+C to stop"
            
            NODE_ENV=production PORT=$PORT npm start
        fi
        ;;
    
    docker|podman)
        CONTAINER_CLI="$MODE"
        IMAGE_NAME="oidc-testing-client"
        CONTAINER_NAME="oidc-testing-client"
        
        # Check if container CLI is available
        if ! command -v $CONTAINER_CLI &> /dev/null; then
            log_error "$CONTAINER_CLI not found. Please install it."
            exit 1
        fi
        
        # Stop existing container if running
        if $CONTAINER_CLI ps -q -f name="$CONTAINER_NAME" | grep -q .; then
            log_info "Stopping existing container..."
            $CONTAINER_CLI stop "$CONTAINER_NAME" || true
            $CONTAINER_CLI rm "$CONTAINER_NAME" || true
        fi
        
        if [ "$DEV_MODE" = "true" ]; then
            IMAGE_TAG="dev"
            
            # Check if dev image exists
            if ! $CONTAINER_CLI images -q "${IMAGE_NAME}:${IMAGE_TAG}" | grep -q .; then
                log_warning "Development image not found. Building..."
                ./scripts/build.sh --dev
            fi
            
            log_info "Starting development container..."
            $CONTAINER_CLI run -d \
                --name "$CONTAINER_NAME" \
                -p ${PORT}:3001 \
                -p 3000:3000 \
                -v "$(pwd):/opt/app-root/src:z" \
                -e NODE_ENV=development \
                "${IMAGE_NAME}:${IMAGE_TAG}"
        else
            IMAGE_TAG="latest"
            
            # Check if image exists
            if ! $CONTAINER_CLI images -q "${IMAGE_NAME}:${IMAGE_TAG}" | grep -q .; then
                log_warning "Production image not found. Building..."
                ./scripts/build.sh
            fi
            
            log_info "Starting production container..."
            $CONTAINER_CLI run -d \
                --name "$CONTAINER_NAME" \
                -p ${PORT}:3001 \
                -e NODE_ENV=production \
                "${IMAGE_NAME}:${IMAGE_TAG}"
        fi
        
        # Wait for container to start
        sleep 2
        
        if $CONTAINER_CLI ps -q -f name="$CONTAINER_NAME" | grep -q .; then
            log_success "Container started successfully!"
            log_info "Application available at: http://localhost:${PORT}"
            log_info "Container logs: $CONTAINER_CLI logs -f $CONTAINER_NAME"
        else
            log_error "Container failed to start. Check logs:"
            $CONTAINER_CLI logs "$CONTAINER_NAME"
            exit 1
        fi
        ;;
    
    *)
        log_error "Unknown mode: $MODE"
        print_usage
        exit 1
        ;;
esac
