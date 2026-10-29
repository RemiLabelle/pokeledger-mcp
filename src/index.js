#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

// stdout carries the JSON-RPC stream, so all logging goes to stderr.
const server = createServer();
await server.connect(new StdioServerTransport());
console.error("pokeledger-mcp running on stdio");
