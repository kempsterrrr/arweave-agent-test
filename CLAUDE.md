# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an external test project for the `agent0-sdk` library, specifically designed to test Arweave tagging functionality and agent registration from outside the main SDK codebase. The project demonstrates how to use the SDK after packaging with `npm pack`.

## Development Commands

- **Run the test**: `npm start` (executes `tsx index.ts`)
- **Build SDK dependency** (in parent agent0-ts project): `npm run build && npm pack`

## Architecture

### SDK Integration Pattern

This project consumes the agent0-sdk as a local .tgz package (`agent0-sdk-0.2.1.tgz` from `../agent0-ts/`). This tests the real-world installation experience rather than development workspace linking.

### Test Flow (index.ts)

The single test script follows this workflow:

1. **Configuration**: Initializes SDK with Sepolia testnet, Arweave enabled, and local subgraph endpoint
2. **Agent Creation**: Creates an agent with randomized ID to avoid conflicts
3. **Capability Configuration**: Adds MCP endpoint, A2A endpoint, wallet, and active status
4. **Arweave Registration**: Calls `agent.registerArweave()` which generates comprehensive tags:
   - Standard tags: Content-Type, App-Name, Protocol, Chain-Id, Agent-Id, Timestamp
   - Capability tags: Has-MCP, Has-A2A, Has-Wallet, Active
5. **Verification**: Queries Arweave GraphQL API to verify tags, retrieves data from gateway, and tests agent reload

### Environment Requirements

The script expects a `.env` file with:
- `RPC_URL`: Ethereum RPC endpoint for Sepolia testnet
- `PRIVATE_KEY`: Private key for transaction signing

### Key Dependencies

- `agent0-sdk`: Local package file, the SDK being tested
- `dotenv`: Environment variable management
- `tsx`: TypeScript execution (used over ts-node for better ESM support)
- TypeScript 5.9+ with ESNext modules and node resolution

### Arweave Integration Details

The test demonstrates:
- Arweave client initialization through SDK config (`arweave: true`)
- Automatic tag generation based on agent capabilities
- Transaction ID extraction from `ar://` URIs
- GraphQL querying against Arweave's indexer
- Gateway data retrieval and caching behavior (30-60s delay typical)
- Agent reload from Arweave storage

Note: Turbo caching and indexing introduce delays (5-60s) which the test accommodates with wait periods and graceful error handling.
