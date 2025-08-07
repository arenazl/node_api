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
MQ Importer API is a Node.js middleware service that converts between JSON and fixed-length strings for mainframe integration. It processes Excel files containing message structure definitions and provides bidirectional conversion capabilities. Now includes integration with Mora.Sim-api for persistent storage of Excel structures and configurations.

### Core Components

#### New Architecture (api/ folder)
- **`/api/core-processing/routes/services.js`** - Primary service endpoints for external consumption
  - `POST /api/services/sendmessage` - JSON to fixed-length string conversion (IDA)
  - `POST /api/services/receivemessage` - Fixed-length string to JSON conversion (VUELTA)
  - `GET /api/services` - List available services
- **`/api/core-processing/routes/excel.js`** - Excel file upload and processing with Mora.Sim-api integration
- **`/api/core-processing/routes/service-config.js`** - Service configuration with Mora.Sim-api integration
- **`/api/orchestrator/api-orchestrator.js`** - **NUEVO v3.0**: Network Visibility Orchestrator
  - `POST /api-orchestrator/step1-upload` - File system upload (visible in Network)
  - `POST /api-orchestrator/step2-mora-sim-api` - BD storage via Mora.Sim-api (visible in Network)
  - **Purpose**: Expone 2 endpoints separados para que el frontend vea ambas llamadas en Network tab
- **`/api/external-integrations/sim-integration/`** - Mora.Sim-api integration components
  - `mora-sim-api-client.js` - HTTP client for Mora.Sim-api endpoints
  - `mora-sim-database-helper.js` - Wrapper for consistent integration interface
- **`/api/external-integrations/shared/`** - Shared utilities for external APIs
  - `http-client.js` - Generic HTTP client with retry logic and error handling

#### Legacy Routes (still active)
- **`/routes/services.js`** - Legacy service endpoints (still functional)
- **`/routes/excel.js`** - Legacy Excel upload (still functional)
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
- **EventBus Integration**: Local event communication system for tab synchronization

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

#### Mora.Sim-api Integration
- `MORA_SIM_API_ENABLED` - Enable/disable integration (default: false)
- `MORA_SIM_API_URL` - Base URL for Mora.Sim-api (default: http://localhost:5000/api/SimImporter)
- `MORA_SIM_API_TIMEOUT` - Request timeout in ms (default: 30000)
- `MORA_SIM_API_RETRIES` - Number of retry attempts (default: 3)
- `VERBOSE_LOGS` - Enable detailed logging (default: false). When false, shows clean emoji-based summaries

### Directory Structure Created Automatically
- `JsonStorage/uploads/`
- `JsonStorage/structures/`
- `logs/`
- `tmp/`

## Dependencies

### Core Dependencies
- **Express.js** - REST API framework
- **EventBus** - Local event communication system
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

## Logging Configuration

### Clean Startup (default)
When `VERBOSE_LOGS=false` (default), the application shows:
- 🚀 Clean startup banner with emojis
- ⏱️ Periodic summaries every 5 minutes (uptime, requests, errors)
- ⚠️ Compact error messages

### Verbose Mode
Set `VERBOSE_LOGS=true` for detailed logging:
- Full request/response logging
- Detailed error stack traces
- Excel processing details
- Database connection status

### Client-Side Logging
JavaScript logs are also controlled by `VERBOSE_LOGS` in localStorage:
```javascript
// Enable verbose logs in browser console
localStorage.setItem('VERBOSE_LOGS', 'true');
```

## Integration Notes
This API serves as middleware between modern JSON-based applications and legacy mainframe systems that require fixed-position string formats. The Excel files define the message structures that enable this bidirectional conversion.

## Testing & Validation
Currently no test framework is configured. When adding tests, check the codebase for any existing testing patterns first.

## 🎯 Network Visibility Feature (v3.0)

### Problem Solved
**Issue**: When frontend uploaded Excel files, only 1 HTTP call was visible in browser's Network tab, making debugging difficult despite multiple internal operations occurring.

**Solution**: API Orchestrator that exposes separate endpoints for each operation step.

### Implementation Details

#### API Orchestrator Architecture
```
/api/orchestrator/api-orchestrator.js
├── step1-upload: File system operations (internal responsibility)
└── step2-mora-sim-api: Database operations (external responsibility)
```

#### Frontend Integration
```javascript
// BEFORE: Single invisible call
await uploadExcelFile(formData); // → 1 call to /excel/upload

// AFTER: Two visible calls (automatic within uploadExcelFile)
// 1. POST /api-orchestrator/step1-upload
// 2. POST /api-orchestrator/step2-mora-sim-api
```

#### Developer Experience
- **Frontend code**: NO CHANGES required - same `uploadExcelFile()` function
- **Network tab**: Shows 2 separate HTTP calls for full visibility
- **Debugging**: Can inspect each step independently in DevTools
- **Compatibility**: 100% backward compatible with existing code

#### Architecture Benefits
- **Clean separation**: File system vs database responsibilities
- **Proper location**: Orchestrator at `/api/orchestrator/` (not in external-integrations)
- **Network visibility**: Each step appears as separate HTTP call
- **Maintainability**: Clear boundaries between internal and external operations

### Usage in Production
1. Frontend continues using existing upload functionality
2. Open F12 → Network tab before uploading Excel
3. Upload file through normal UI
4. Observe 2 separate HTTP calls instead of 1
5. Better debugging and request tracing capabilities

This feature significantly improves the debugging experience for developers while maintaining full compatibility with existing frontend code.