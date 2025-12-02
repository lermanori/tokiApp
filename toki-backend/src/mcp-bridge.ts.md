# File: mcp-bridge.ts

### Summary
This file implements an MCP bridge that adapts Claude Desktop's stdio MCP transport to our HTTP/SSE MCP server. It reads JSON-RPC messages from stdin, forwards them to the HTTP server via POST requests using Node.js built-in http/https modules, parses SSE (Server-Sent Events) responses, and writes JSON-RPC messages back to stdout. **CRITICAL: This bridge is a TRANSPARENT pipe that does NOT modify JSON-RPC messages.**

### Fixes Applied log
- Converted bridge from JavaScript to TypeScript for better type safety and integration with the TypeScript project
- Fixed Accept header from 'text/event-stream' to 'application/json, text/event-stream' to match server requirements (fixes 406 error)
- Replaced fetch API with Node.js built-in http/https modules for better compatibility
- Used readline for proper stdin line-by-line processing
- **URGENT FIX: Made bridge transparent - removed all message modification, now passes JSON-RPC messages through EXACTLY as received**
- **URGENT FIX: Simplified SSE parsing to extract JSON directly from "data: " lines without re-parsing or modification**
- **URGENT FIX: Changed to return exact JSON strings instead of parsed/typed objects to prevent structure corruption**
- Updated Claude Desktop config to point to compiled dist/mcp-bridge.js

### How Fixes Were Implemented
- **TypeScript Conversion**: Created src/mcp-bridge.ts with proper TypeScript types, but using `unknown` for messages to avoid type coercion
- **Accept Header Fix**: Changed Accept header to exactly 'application/json, text/event-stream' as required by the server to prevent 406 errors
- **HTTP Module Replacement**: Replaced fetch API with Node.js built-in http and https modules, using http.request() or https.request() based on URL protocol
- **Transparent Message Passing**: 
  - Messages are parsed from stdin as `unknown` type (no forced structure)
  - Forwarded EXACTLY via JSON.stringify() with no modification
  - SSE responses extract JSON directly from "data: " lines and output as exact strings
  - No re-parsing, no type coercion, no field addition/removal
- **SSE Stream Handling**: Simplified to directly extract JSON from "data: " lines:
  - Lines starting with "data: " have JSON extracted via `line.slice(5).trim()`
  - JSON is output EXACTLY as received from server
  - No intermediate parsing or object reconstruction
- **Stdin/Stdout Handling**: Used readline interface with output set to stderr to avoid interfering with JSON-RPC messages on stdout, and process.stdout.write() for direct output
- **Error Handling**: Comprehensive error handling for network errors, HTTP status errors, JSON parse errors, and stream errors, all returning proper JSON-RPC error responses
- **Build Integration**: File compiles to dist/mcp-bridge.js via TypeScript compiler, and Claude Desktop config updated to use absolute path to compiled version

### Critical Design Principles
1. **Transparency**: Bridge does NOT modify JSON-RPC messages at any point
2. **Exact Forwarding**: Messages are stringified and forwarded exactly as received
3. **Exact Extraction**: SSE data lines are extracted and output exactly as received
4. **No Type Coercion**: Messages handled as `unknown` to prevent structure changes
5. **Direct String Output**: Responses written as exact JSON strings, not re-parsed objects
