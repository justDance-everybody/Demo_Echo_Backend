# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI voice assistant platform called "Echo" built with:
- **Backend**: Python/FastAPI with MySQL database
- **Frontend**: React with TypeScript
- **MCP Integration**: Model Context Protocol for external tool integration
- **LLM Support**: OpenAI and Anthropic APIs

## Common Commands

### Development Setup
```bash
# Install backend dependencies
source .venv/bin/activate
pip install -r backend/requirements.txt

# Start backend service
source .venv/bin/activate
./start-backend.sh start

# Run tests
source .venv/bin/activate
cd backend
python run_tests.py --help  # See all test options
python run_tests.py         # Run all tests
```

### Testing Commands
```bash
# Run specific test categories
python run_tests.py --auth            # Authentication tests
python run_tests.py --core            # Core functionality tests
python run_tests.py --dev             # Developer features tests
python run_tests.py --performance     # Performance tests
python run_tests.py --errors          # Error handling tests

# Run with options
python run_tests.py --quick           # Skip slow tests
python run_tests.py --verbose         # Detailed output
python run_tests.py --coverage        # Generate coverage report
```

### Service Management
```bash
# Backend service management
./start-backend.sh start        # Start service
./start-backend.sh stop         # Stop service
./start-backend.sh restart      # Restart service
./start-backend.sh status       # Check status
./start-backend.sh monitor      # Monitor service
./start-backend.sh safe-start   # Safe start with cleanup
```

## Code Architecture

### Backend Structure (`backend/`)
- `app/main.py` - Application entry point
- `app/routers/` - API route definitions
- `app/controllers/` - Request handling logic
- `app/services/` - Business logic implementation
- `app/models/` - Database models (SQLAlchemy)
- `app/schemas/` - Pydantic data validation schemas
- `app/utils/` - Utility functions and helpers
- `app/tests/` - Test suite

### Key Components
1. **MCP Integration**: Multi-chain protocol for external tool execution
2. **LLM Services**: Intent recognition and natural language processing
3. **Database**: MySQL with SQLAlchemy ORM
4. **Authentication**: JWT-based user authentication
5. **Developer Portal**: API for tool developers to publish tools

### MCP System
- `MCP_Client/` - Python MCP client implementation
- `MCP_server/` - MCP server implementations (Web3, Playwright, etc.)
- Configured via `MCP_Client/config/mcp_servers.json`

## Development Workflow

1. **Backend Development**:
   - Work in `backend/app/` directory
   - Follow existing patterns for routers, controllers, services
   - Add database migrations when changing models
   - Write tests in `backend/app/tests/`

2. **Testing**:
   - Unit tests: Test individual functions and classes
   - Integration tests: Test API endpoints and service interactions
   - Use `run_tests.py` script for test execution

3. **Database Changes**:
   - Update models in `app/models/`
   - Create Alembic migration scripts
   - Apply migrations with `alembic upgrade head`

4. **API Documentation**:
   - Access at `http://localhost:3000/docs` when running
   - Follow OpenAPI/Swagger specifications

## Environment Setup

1. **Required Environment Variables** (in `.env`):
   - Database connection details
   - LLM API keys (OpenAI/Anthropic)
   - JWT secret key
   - MCP server configurations

2. **Dependencies**:
   - Python 3.8+
   - MySQL database
   - Node.js 16+ (for frontend)
   - Virtual environment recommended

## Common Development Tasks

### Adding New API Endpoints
1. Create schema in `app/schemas/`
2. Create router in `app/routers/`
3. Create controller in `app/controllers/`
4. Implement service logic in `app/services/`
5. Add tests in `app/tests/`
6. Register router in `app/main.py`

### Adding Database Models
1. Define model in `app/models/`
2. Create Alembic migration
3. Update database with `alembic upgrade head`
4. Create CRUD operations in services
5. Add tests

### Working with MCP Tools
1. Configure servers in `MCP_Client/config/mcp_servers.json`
2. Use `app/utils/mcp_client.py` for MCP interactions
3. Tools are registered via MCP protocol
4. Handle tool execution in `execute_service.py`

## Testing Strategy

- **Unit Tests**: Individual function and class testing
- **Integration Tests**: API endpoint and service interaction testing
- **Performance Tests**: Load and response time testing
- **Error Handling Tests**: Exception and edge case testing

Run tests with the `run_tests.py` script in the backend directory.
