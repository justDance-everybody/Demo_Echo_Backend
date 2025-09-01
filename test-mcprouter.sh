#!/bin/bash

# MCPRouter Test Script
# ====================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
echo "MCPRouter Test Script"
echo "========================================"

# Test API Server
print_status "Testing MCPRouter API Server..."

# Test list servers endpoint
print_status "Testing /v1/list-servers endpoint..."
if response=$(curl -s -w "%{http_code}" http://localhost:8027/v1/list-servers 2>/dev/null); then
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        print_success "API Server is responding (HTTP $http_code)"
        echo "Response: $body"
    else
        print_warning "API Server responded with HTTP $http_code"
        echo "Response: $body"
    fi
else
    print_error "Failed to connect to API Server"
fi

# Test proxy server
print_status "Testing MCPRouter Proxy Server..."
if curl -s http://localhost:8025 >/dev/null 2>&1; then
    print_success "Proxy Server is responding"
else
    print_error "Failed to connect to Proxy Server"
fi

# Test specific tool endpoints (if servers are available)
print_status "Testing tool endpoints..."

# Test list tools for a specific server
if response=$(curl -s -w "%{http_code}" "http://localhost:8027/v1/list-tools?server=amap-maps" 2>/dev/null); then
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        print_success "List tools endpoint working (HTTP $http_code)"
        echo "Response: $body"
    else
        print_warning "List tools endpoint responded with HTTP $http_code"
        echo "Response: $body"
    fi
else
    print_warning "List tools endpoint not responding"
fi

echo ""
echo "========================================"
echo "Test completed!"
echo "========================================"
echo ""
echo "If all tests passed, MCPRouter is working correctly."
echo "If some tests failed, check:"
echo "  1. MCPRouter services are running"
echo "  2. Ports 8025 and 8027 are not blocked"
echo "  3. Configuration file is correct"
echo "  4. MCP servers are properly configured"
