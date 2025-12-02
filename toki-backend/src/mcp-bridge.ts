#!/usr/bin/env node

/**
 * MCP Bridge: stdio ↔ HTTP/SSE Adapter
 * 
 * This script bridges Claude Desktop's stdio MCP transport to our HTTP/SSE MCP server.
 * It reads JSON-RPC messages from stdin, forwards them to the HTTP server via POST,
 * parses SSE responses, and writes JSON-RPC messages back to stdout.
 * 
 * CRITICAL: This bridge is a TRANSPARENT pipe - it does NOT modify JSON-RPC messages.
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import * as readline from 'readline';

/**
 * Create a JSON-RPC 2.0 error response
 * Returns null if message was a notification (no id) - notifications don't get error responses
 */
function createErrorResponse(message: unknown, code: number, messageText: string): string | null {
  const messageId = (message as { id?: unknown }).id;
  
  // If message was a notification (no id), don't send error response
  if (messageId === undefined) {
    return null;
  }
  
  // Ensure id is valid (string or number, not null)
  if (messageId === null) {
    return null; // Can't send error for null id
  }
  
  const errorResponse = {
    jsonrpc: '2.0',
    id: messageId, // Use the exact id from the request
    error: {
      code,
      message: messageText,
    },
  };
  
  return JSON.stringify(errorResponse);
}

/**
 * Send JSON-RPC request to HTTP MCP server and handle SSE response
 * Message is passed through EXACTLY as received - no modification
 */
function forwardRequest(message: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3002/api/mcp/toki';
    const mcpApiKey = process.env.MCP_API_KEY;

    let url: URL;
    try {
      url = new URL(mcpServerUrl);
    } catch (error) {
      reject(new Error(`Invalid URL: ${mcpServerUrl}`));
      return;
    }

    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    // Stringify EXACTLY as received - no modification
    const postData = JSON.stringify(message);

    const headers: http.OutgoingHttpHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(postData),
    };

    if (mcpApiKey) {
      headers['Authorization'] = `Bearer ${mcpApiKey}`;
    }

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers,
    };

    const req = httpModule.request(options, (res) => {
      const statusCode = res.statusCode || 0;

      if (statusCode < 200 || statusCode >= 300) {
        let errorBody = '';
        res.on('data', (chunk: Buffer) => {
          errorBody += chunk.toString();
        });
        res.on('end', () => {
          console.error(`[BRIDGE] HTTP error ${statusCode}: ${errorBody}`);
          // Return error as JSON-RPC error response (only if message had an id)
          const errorJson = createErrorResponse(message, statusCode, `HTTP ${statusCode}: ${errorBody}`);
          resolve(errorJson || ''); // Empty string for notifications
        });
        return;
      }

      const contentType = res.headers['content-type'] || '';
      
      if (contentType.includes('text/event-stream')) {
        // Handle SSE stream - extract JSON from complete SSE events
        // SSE events are delimited by empty lines, data may span multiple lines
        let buffer = '';
        let responseJson: string | null = null;
        let currentEvent: { event?: string; data?: string } = {};

        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            // Don't trim yet - we need to check for empty line first
            const isEmpty = line.trim() === '';
            
            // Empty line indicates end of SSE event - process if we have data
            if (isEmpty) {
              if (currentEvent.data) {
                const jsonStr = currentEvent.data.trim();
                if (jsonStr && !responseJson) {
                  // Validate JSON is complete before storing
                  try {
                    const parsed = JSON.parse(jsonStr);
                    // JSON is valid and complete
                    responseJson = jsonStr;
                    
                    // Check if this matches our request ID
                    const messageId = (message as { id?: unknown }).id;
                    if (parsed && typeof parsed === 'object' && 'id' in parsed && parsed.id === messageId) {
                      res.destroy(); // Stop reading
                      resolve(jsonStr); // Return EXACT JSON string
                      return;
                    }
                  } catch (e) {
                    // Incomplete or invalid JSON, continue waiting
                    console.error(`[BRIDGE] Invalid JSON in SSE data: ${e instanceof Error ? e.message : String(e)}`);
                    console.error(`[BRIDGE] JSON string was: ${jsonStr.substring(0, 200)}${jsonStr.length > 200 ? '...' : ''}`);
                  }
                }
              }
              currentEvent = {}; // Reset for next event
              continue;
            }

            const trimmed = line.trim();
            
            // Skip keep-alive comments
            if (trimmed.startsWith(':')) {
              continue;
            }

            // Extract event type
            if (trimmed.startsWith('event:')) {
              currentEvent.event = trimmed.slice(6).trim();
            }
            // Extract data - handle "data:" prefix correctly
            else if (line.startsWith('data:')) {
              // Extract after "data:" - may have leading space, trim only the start
              const dataPart = line.slice(5).trimStart(); // Remove "data:" prefix, keep content
              if (dataPart) { // Only add if there's actual data
                if (currentEvent.data) {
                  currentEvent.data += dataPart; // Append (no newline for JSON)
                } else {
                  currentEvent.data = dataPart;
                }
              }
            }
            // Ignore other SSE metadata lines
          }
        });

        res.on('end', () => {
          // Process any remaining buffer through the same logic
          if (buffer) {
            const remainingLines = buffer.split('\n');
            for (const line of remainingLines) {
              if (line.trim() === '') {
                // Empty line - process current event
                if (currentEvent.data) {
                  const jsonStr = currentEvent.data.trim();
                  if (jsonStr && !responseJson) {
                    try {
                      JSON.parse(jsonStr);
                      responseJson = jsonStr;
                    } catch (e) {
                      console.error(`[BRIDGE] Incomplete JSON at end: ${e instanceof Error ? e.message : String(e)}`);
                    }
                  }
                }
                currentEvent = {};
              } else if (line.startsWith('data:')) {
                const dataPart = line.slice(5).trimStart();
                if (dataPart) {
                  if (currentEvent.data) {
                    currentEvent.data += dataPart;
                  } else {
                    currentEvent.data = dataPart;
                  }
                }
              }
            }
          }
          
          // Process final event if we have data
          if (currentEvent.data && !responseJson) {
            const jsonStr = currentEvent.data.trim();
            if (jsonStr) {
              try {
                JSON.parse(jsonStr); // Validate complete
                responseJson = jsonStr;
              } catch (e) {
                // Incomplete JSON - log but don't fail
                console.error(`[BRIDGE] Incomplete JSON at end of stream: ${e instanceof Error ? e.message : String(e)}`);
                console.error(`[BRIDGE] JSON string was: ${jsonStr.substring(0, 200)}${jsonStr.length > 200 ? '...' : ''}`);
              }
            }
          }

          if (responseJson) {
            resolve(responseJson); // Return EXACT JSON string
          } else {
            // No response received - send error only if message had an id
            const errorJson = createErrorResponse(message, -32603, 'No valid JSON-RPC response received from server');
            resolve(errorJson || ''); // Empty string for notifications
          }
        });

        res.on('error', (error: Error) => {
          console.error(`[BRIDGE] Response stream error: ${error.message}`);
          const errorJson = createErrorResponse(message, -32603, `Stream error: ${error.message}`);
          resolve(errorJson || ''); // Empty string for notifications
        });
      } else {
        // Handle direct JSON response (non-SSE)
        let jsonBody = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          jsonBody += chunk;
        });
        res.on('end', () => {
          // Return EXACT JSON string as received
          resolve(jsonBody.trim());
        });
      }
    });

    req.on('error', (error: Error) => {
      console.error(`[BRIDGE] Network error: ${error.message}`);
      const errorJson = createErrorResponse(message, -32603, `Network error: ${error.message}`);
      resolve(errorJson || ''); // Empty string for notifications
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main bridge loop: read from stdin, forward to HTTP, write to stdout
 * Acts as a TRANSPARENT pipe - no message modification
 */
async function main(): Promise<void> {
  const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3002/api/mcp/toki';
  const mcpApiKey = process.env.MCP_API_KEY;

  // Log startup to stderr
  console.error(`[BRIDGE] MCP Bridge started, connecting to ${mcpServerUrl}`);
  if (mcpApiKey) {
    console.error('[BRIDGE] API key authentication enabled');
  }

  // Set up stdin reading using readline for line-by-line processing
  // Output is set to stderr to avoid interfering with JSON-RPC messages on stdout
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: false,
  });

  rl.on('line', async (line: string) => {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      return;
    }

    try {
      // Parse JSON - but keep as unknown to avoid type coercion
      const message = JSON.parse(trimmed);
      
      // Basic validation - check for jsonrpc field
      if (!message || typeof message !== 'object' || !('jsonrpc' in message)) {
        console.error(`[BRIDGE] Invalid JSON-RPC message: missing jsonrpc field`);
        return;
      }

      // Forward request and get response as EXACT JSON string
      const responseJson = await forwardRequest(message);
      
      // Only write if we have a response (notifications with errors return empty string)
      if (responseJson) {
        // Write EXACT JSON string to stdout (newline ensures line-buffered flush)
        // MCP client expects complete JSON-RPC messages on separate lines
        process.stdout.write(responseJson + '\n');
      }
    } catch (parseError) {
      console.error(`[BRIDGE] Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      console.error(`[BRIDGE] Invalid JSON: ${trimmed}`);
      
      // Send error response if we can extract an id
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && 'id' in parsed) {
          const errorResponse = {
            jsonrpc: '2.0',
            id: parsed.id,
            error: {
              code: -32700,
              message: `Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            },
          };
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
        }
      } catch (e) {
        // Can't even parse to get id, skip
      }
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });

  // Handle process signals
  process.on('SIGINT', () => {
    rl.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    rl.close();
    process.exit(0);
  });

  process.on('SIGPIPE', () => {
    // Ignore SIGPIPE (broken pipe) - common when stdout is closed
    process.exit(0);
  });
}

// Start the bridge
void main().catch((error: Error) => {
  console.error(`[BRIDGE] Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
