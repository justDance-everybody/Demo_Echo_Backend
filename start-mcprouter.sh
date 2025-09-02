#!/bin/bash

# MCPRouter Startup Script (Linux/macOS)
# ========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "========================================"
echo "MCPRouter Startup Script (Linux/macOS)"
echo "========================================"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCPROUTER_DIR="$SCRIPT_DIR/mcprouter"

# Check Go environment
if ! command -v go &> /dev/null; then
    print_error "Go not found, please install Go first"
    echo "Download from: https://golang.org/dl/"
    exit 1
fi

print_success "Go environment found: $(go version)"

# Check MCPRouter directory
print_status "Checking MCPRouter directory..."
if [ ! -d "$MCPROUTER_DIR" ]; then
    print_error "MCPRouter directory not found at: $MCPROUTER_DIR"
    echo "Please ensure mcprouter is in the correct location"
    exit 1
fi

# Enter MCPRouter directory
cd "$MCPROUTER_DIR"

# Check configuration file
print_status "Checking configuration file..."
if [ ! -f ".env.toml" ]; then
    print_error "Configuration file .env.toml not found in MCPRouter directory"
    echo "Please ensure .env.toml exists in: $MCPROUTER_DIR"
    exit 1
fi
print_success "Configuration file found"

# Build MCPRouter
print_status "Building MCPRouter..."
if go build -o mcprouter main.go; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    echo "Please check Go environment and dependencies"
    exit 1
fi

# Check port availability
print_status "Checking port availability..."
if lsof -Pi :8028 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_error "Port 8028 is already in use"
    echo "Please stop the conflicting service or change the port in config"
    echo ""
    echo "To stop existing MCPRouter processes:"
    echo "  pkill -f mcprouter"
    exit 1
fi

if lsof -Pi :8026 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_error "Port 8026 is already in use"
    echo "Please stop the conflicting service or change the port in config"
    echo ""
    echo "To stop existing MCPRouter processes:"
    echo "  pkill -f mcprouter"
    exit 1
fi

print_success "Ports 8026 and 8028 are available"

# Start API server
print_status "Starting MCPRouter API server (port: 8028)..."
nohup ./mcprouter api > "api_server.log" 2>&1 &
API_PID=$!
echo $API_PID > "api_server.pid"

# Wait for API server to start
sleep 3

# Check if API server started successfully
if kill -0 $API_PID 2>/dev/null; then
    print_success "API server started successfully"
else
    print_error "API server failed to start"
    exit 1
fi

# Wait for API server to be ready
print_status "Waiting for API server to start..."
sleep 3

# Start Proxy server
print_status "Starting MCPRouter Proxy server (port: 8026)..."
nohup ./mcprouter proxy > "proxy_server.log" 2>&1 &
PROXY_PID=$!
echo $PROXY_PID > "proxy_server.pid"

# Wait for proxy server to start
sleep 3

# Check if proxy server started successfully
if kill -0 $PROXY_PID 2>/dev/null; then
    print_success "Proxy server started successfully"
else
    print_error "Proxy server failed to start"
    exit 1
fi

# Verify services
print_status "Verifying services..."

# Check API server
if curl -s http://localhost:8028/v1/list-servers >/dev/null 2>&1; then
    print_success "API Server is running on http://localhost:8028"
else
    print_warning "API Server may not be ready yet"
fi

# Check Proxy server
if curl -s http://localhost:8026 >/dev/null 2>&1; then
    print_success "Proxy Server is running on http://localhost:8026"
else
    print_warning "Proxy Server may not be ready yet"
fi

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 5

# Sync tools to Backend database
print_status "Syncing tools to Backend database..."
cd "$SCRIPT_DIR/backend"
if python sync_mcp_tools.py; then
    print_success "Tools synced successfully"
else
    print_warning "Tools sync failed, but services are running"
fi

cd "$SCRIPT_DIR/mcprouter"

echo ""
echo "========================================"
echo "MCPRouter services started successfully!"
echo "========================================"
echo ""
echo "Services:"
echo "  - API Server: http://localhost:8028"
echo "  - Proxy Server: http://localhost:8026"
echo ""
echo "API Endpoints:"
echo "  - List Servers: GET http://localhost:8028/v1/list-servers"
echo "  - List Tools: GET http://localhost:8028/v1/list-tools?server={server}"
echo "  - Call Tool: POST http://localhost:8028/v1/call-tool"
echo ""
echo "Log files:"
echo "  - API Server: $MCPROUTER_DIR/api_server.log"
echo "  - Proxy Server: $MCPROUTER_DIR/proxy_server.log"
echo ""
echo "Press any key to stop all services..."

# Function to cleanup on exit
cleanup() {
    echo ""
    print_status "Stopping MCPRouter services..."
    pkill -f mcprouter >/dev/null 2>&1 || true
    rm -f *.pid >/dev/null 2>&1 || true
    print_success "MCPRouter services stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Wait for user input
read -r
cleanup
