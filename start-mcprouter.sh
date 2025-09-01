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
CONFIG_FILE="$SCRIPT_DIR/mcprouter_config.toml"

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

# Copy configuration file
print_status "Copying configuration file..."
if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" ".env.toml"
    print_success "Configuration file copied successfully"
else
    print_error "Configuration file not found at: $CONFIG_FILE"
    exit 1
fi

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
if lsof -Pi :8027 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_error "Port 8027 is already in use"
    echo "Please stop the conflicting service or change the port in config"
    echo ""
    echo "To stop existing MCPRouter processes:"
    echo "  pkill -f mcprouter"
    exit 1
fi

if lsof -Pi :8025 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_error "Port 8025 is already in use"
    echo "Please stop the conflicting service or change the port in config"
    echo ""
    echo "To stop existing MCPRouter processes:"
    echo "  pkill -f mcprouter"
    exit 1
fi

print_success "Ports 8025 and 8027 are available"

# Function to start service
start_service() {
    local service_name="$1"
    local port="$2"
    local command="$3"
    
    print_status "Starting $service_name (port: $port)..."
    nohup $command > "${service_name}.log" 2>&1 &
    local pid=$!
    echo $pid > "${service_name}.pid"
    
    # Wait for service to start
    sleep 3
    
    # Check if service is running
    if kill -0 $pid 2>/dev/null; then
        print_success "$service_name started (PID: $pid)"
    else
        print_error "Failed to start $service_name"
        return 1
    fi
}

# Start API server
if ! start_service "MCPRouter API Server" "8027" "./mcprouter api"; then
    exit 1
fi

# Start Proxy server
if ! start_service "MCPRouter Proxy Server" "8025" "./mcprouter proxy"; then
    exit 1
fi

# Verify services
print_status "Verifying services..."

# Check API server
if curl -s http://localhost:8027/v1/list-servers >/dev/null 2>&1; then
    print_success "API Server is running on http://localhost:8027"
else
    print_warning "API Server may not be ready yet"
fi

# Check Proxy server
if curl -s http://localhost:8025 >/dev/null 2>&1; then
    print_success "Proxy Server is running on http://localhost:8025"
else
    print_warning "Proxy Server may not be ready yet"
fi

echo ""
echo "========================================"
echo "MCPRouter services started successfully!"
echo "========================================"
echo ""
echo "Services:"
echo "  - API Server: http://localhost:8027"
echo "  - Proxy Server: http://localhost:8025"
echo ""
echo "API Endpoints:"
echo "  - List Servers: GET http://localhost:8027/v1/list-servers"
echo "  - List Tools: GET http://localhost:8027/v1/list-tools?server={server}"
echo "  - Call Tool: POST http://localhost:8027/v1/call-tool"
echo ""
echo "Log files:"
echo "  - API Server: $MCPROUTER_DIR/MCPRouter API Server.log"
echo "  - Proxy Server: $MCPROUTER_DIR/MCPRouter Proxy Server.log"
echo ""
echo "To stop services, run:"
echo "  pkill -f mcprouter"
echo "  or"
echo "  kill \$(cat $MCPROUTER_DIR/MCPRouter*.pid)"
echo ""
echo "Press Ctrl+C to stop all services..."

# Function to cleanup on exit
cleanup() {
    echo ""
    print_status "Stopping MCPRouter services..."
    pkill -f mcprouter || true
    rm -f *.pid || true
    print_success "MCPRouter services stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Wait for user input
read -r
cleanup
