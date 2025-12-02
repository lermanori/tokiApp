#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from './server';

async function main() {
  try {
    const server = createMCPServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Keep process alive while transport is connected
  } catch (error) {
    console.error('Failed to start Toki MCP server:', error);
    process.exit(1);
  }
}

void main();


