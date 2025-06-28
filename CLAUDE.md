# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon (auto-restart)
- `npm test` - No tests configured (returns error)

### Server Information
- **Port**: 3000 (configurable via PORT environment variable)
- **Health Check**: `GET /health` - System status and diagnostics
- **Main Entry**: `server.js`

## Project Architecture

### Purpose
MQ Importer API is a Node.js middleware service that converts between JSON and fixed-length strings for mainframe integration. It processes Excel files containing message structure definitions and provides bidirectional conversion capabilities.

### Core Components

#### API Endpoints (Routes)
- **`/routes/services.js`** - Primary service endpoints for external consumption
  - `POST /api/services/sendmessage` - JSON to fixed-length string conversion (IDA)
  - `POST /api/services/receivemessage` - Fixed-length string to JSON conversion (VUELTA)
  - `GET /api/services` - List available services
- **`/routes/excel.js`** - Excel file upload and processing
- **`/routes/api.js`** - Legacy API endpoints

#### Business Logic (Utils)
- **`/utils/message-creator.js`** - Core JSON → fixed-string conversion logic
- **`/utils/message-analyzer.js`** - Core fixed-string → JSON parsing logic
- **`/utils/service-lookup.js`** - Service discovery and caching system
- **`/utils/excel-parser.js`** - Excel file structure parsing

#### Data Storage (File-based)
- **`JsonStorage/structures/`** - Parsed message structure definitions
- **`JsonStorage/settings/`** - Service configuration files by channel
- **`JsonStorage/uploads/`** - Original Excel files
- **`JsonStorage/headers/`** - Sample header files

### Frontend Interface
- **`/public/index.html`** - Main web interface with 4 tabs:
  1. CARGA - Excel upload and structure management
  2. CONFIGURACIÓN - Service/channel setup
  3. API - JSON↔String conversion testing
  4. SERVICIOS - Service version management
- **`/public/js/api_client/service-api-client.js`** - Example HTTP client for API consumption

### Performance Features
- **Global Service Cache**: `global.serviceCache` improves lookup performance
- **Structure Caching**: Reduces file I/O operations for frequently accessed services
- **Socket.IO Integration**: Real-time updates for service management

## Key Data Flow

### Service Definition Flow
1. Excel upload → Excel parser → JSON structure → Service registration
2. Channel-specific configuration → Settings files
3. Service lookup via cache system

### Message Processing Flow
- **IDA (Outbound)**: JSON → message-creator.js → Fixed-length string
- **VUELTA (Inbound)**: Fixed-length string → message-analyzer.js → JSON

## Environment Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode
- `FILE_UPLOAD_SIZE_LIMIT` - Max upload size in MB (default: 50)
- `REQUEST_TIMEOUT` - Request timeout in ms (default: 120000)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

### Directory Structure Created Automatically
- `JsonStorage/uploads/`
- `JsonStorage/structures/`
- `logs/`
- `tmp/`

## Dependencies

### Core Dependencies
- **Express.js** - REST API framework
- **Socket.IO** - Real-time communication
- **XLSX** - Excel file processing
- **CORS** - Cross-origin resource sharing
- **express-fileupload** - File upload handling
- **fs-extra** - Enhanced file system operations

### Development
- **nodemon** - Development auto-restart

## Error Handling
- Global uncaught exception handler saves detailed error logs to `logs/` directory
- Comprehensive middleware error handling with development/production modes
- Request logging with timing information

## Integration Notes
This API serves as middleware between modern JSON-based applications and legacy mainframe systems that require fixed-position string formats. The Excel files define the message structures that enable this bidirectional conversion.

## Testing & Validation
Currently no test framework is configured. When adding tests, check the codebase for any existing testing patterns first.