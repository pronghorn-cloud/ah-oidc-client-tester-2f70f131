#!/bin/bash
# =============================================================================
# OIDC Testing Client - Stop Script
# =============================================================================
# This script stops the OIDC Testing Client application
# =============================================================================

set -e

# Configuration
MODE="${MODE:-auto}"  # auto, local, docker, or podman
CONTAINER_NAME="oidc-testing-client"

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
    echo "  -m, --mode MODE        Stop mode: auto, local, docker, podman (default: auto)"
    echo "  --remove               Remove container after stopping (for docker/podman)"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                     # Auto-detect and stop"
    echo "  $0 --mode docker       # Stop Docker container"
    echo "  $0 --mode local        # Stop local Node.js process"
}

REMOVE_CONTAINER="false"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        --remove)
            REMOVE_CONTAINER="true"
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
log_info "OIDC Testing Client - Stop Script"
log_info "=================================================="

stop_container() {
    local cli=$1
    
    if $cli ps -q -f name="$CONTAINER_NAME" 2>/dev/null | grep -q .; then
        log_info "Stopping container using $cli..."
        $cli stop "$CONTAINER_NAME"
        
        if [ "$REMOVE_CONTAINER" = "true" ]; then
            log_info "Removing container..."
            $cli rm "$CONTAINER_NAME"
        fi
        
        log_success "Container stopped successfully!"
        return 0
    fi
    return 1
}

stop_local() {
    log_info "Stopping local Node.js processes..."
    
    # Find and kill Node.js processes running our server
    local pids=$(pgrep -f "node.*server/index.js" 2>/dev/null || true)
    
    if [ -n "$pids" ]; then
        log_info "Found processes: $pids"
        kill $pids 2>/dev/null || true
        sleep 1
        
        # Force kill if still running
        for pid in $pids; do
            if kill -0 $pid 2>/dev/null; then
                log_warning "Force killing process $pid..."
                kill -9 $pid 2>/dev/null || true
            fi
        done
        
        log_success "Local processes stopped!"
        return 0
    fi
    
    # Also check for React development server
    local react_pids=$(pgrep -f "react-scripts start" 2>/dev/null || true)
    if [ -n "$react_pids" ]; then
        log_info "Stopping React development server..."
        kill $react_pids 2>/dev/null || true
    fi
    
    return 1
}

case $MODE in
    auto)
        log_info "Auto-detecting running instances..."
        
        stopped=false
        
        # Try Docker
        if command -v docker &> /dev/null; then
            if stop_container docker; then
                stopped=true
            fi
        fi
        
        # Try Podman
        if command -v podman &> /dev/null; then
            if stop_container podman; then
                stopped=true
            fi
        fi
        
        # Try local
        if stop_local; then
            stopped=true
        fi
        
        if [ "$stopped" = "false" ]; then
            log_warning "No running instances found."
        fi
        ;;
    
    docker)
        if command -v docker &> /dev/null; then
            if ! stop_container docker; then
                log_warning "No Docker container found."
            fi
        else
            log_error "Docker not found."
            exit 1
        fi
        ;;
    
    podman)
        if command -v podman &> /dev/null; then
            if ! stop_container podman; then
                log_warning "No Podman container found."
            fi
        else
            log_error "Podman not found."
            exit 1
        fi
        ;;
    
    local)
        if ! stop_local; then
            log_warning "No local processes found."
        fi
        ;;
    
    *)
        log_error "Unknown mode: $MODE"
        print_usage
        exit 1
        ;;
esac

log_info "=================================================="
log_success "Stop script completed!"
