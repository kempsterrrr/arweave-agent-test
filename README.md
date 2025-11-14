# Arweave Agent Test Project

External test project for the `agent0-sdk` library, specifically designed to test Arweave integration and tagging functionality.

## Purpose

This project tests the agent0-sdk after packaging with `npm pack`, simulating real-world installation and usage patterns. It validates:

- Arweave client initialization and uploads
- Comprehensive tag generation for searchability
- Agent registration with Arweave storage
- Feedback submission with Arweave storage
- Subgraph indexing of Arweave data
- End-to-end integration flows

## Project Structure

```
arweave-agent-test/
├── index.ts                          # Main test: Agent registration with Arweave
├── tests/
│   ├── check-arweave-tags.ts         # Verify tags on Arweave transactions
│   ├── test-complete-arweave-feedback-flow.ts  # End-to-end feedback test
│   └── verify-complete-flow.ts       # Comprehensive verification script
├── archive/
│   ├── old-tests/                    # Historical test files
│   └── old-docs/                     # Previous documentation
├── ARWEAVE-TAGS-FIX-SUMMARY.md      # Tags bug fix documentation
├── FINAL-DEPLOYMENT-SUMMARY.md       # Production deployment checklist
├── CLAUDE.md                         # Claude Code instructions
├── package.json                      # Project dependencies
└── .env                              # Environment configuration (not in git)
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0x...
```

### 3. Install Latest SDK

From the parent `agent0-ts` directory:

```bash
cd ../agent0-ts
npm run build && npm pack
cp agent0-sdk-0.2.1.tgz ../arweave-agent-test/
cd ../arweave-agent-test
npm install ./agent0-sdk-0.2.1.tgz
```

## Running Tests

### Agent Registration Test (Primary)

Tests agent registration with Arweave storage and tag generation:

```bash
npm start
# or
npx tsx index.ts
```

**What it tests:**
- SDK initialization with Arweave enabled
- Agent creation with capabilities (MCP, A2A, Wallet)
- Registration to Arweave with 12+ tags
- Tag verification via Arweave GraphQL
- Data accessibility via gateway
- Agent reload functionality

**Expected output:**
- Agent ID (e.g., `11155111:1782`)
- Arweave URI (e.g., `ar://1u07tuu-vIDOk6JtA2clny3ktlBAR-YsaBsEoqL_ZqM`)
- All 12 tags verified including Content-Type

### Check Arweave Tags

Verify tags on any Arweave transaction:

```bash
npx tsx tests/check-arweave-tags.ts
```

Edit the `txId` variable in the script to check different transactions.

### Complete Feedback Flow Test

End-to-end test of feedback submission with two wallets:

```bash
npx tsx tests/test-complete-arweave-feedback-flow.ts
```

**What it tests:**
- Pre-signing feedbackAuth (agent owner → feedback giver)
- Feedback submission with Arweave storage
- On-chain transaction confirmation
- Subgraph indexing verification

**Requirements:**
- Two funded wallets
- Existing agent owned by main wallet

### Comprehensive Verification

Verifies complete integration across all systems:

```bash
npx tsx tests/verify-complete-flow.ts
```

**What it checks:**
- Feedback entity created in subgraph
- FeedbackFile entity linked correctly
- URI type detection (`arweave`, not `ipfs`)
- No IPFS/Arweave conflicts
- All metadata fields populated

## Key Features Tested

### Arweave Tag Generation

The SDK automatically generates comprehensive tags:

**Registration Tags (12):**
- Content-Type: `application/json`
- App-Name: `Agent0-v{version}`
- Protocol: `ERC-8004`
- Data-Type: `agent-registration`
- Chain-Id: Network ID
- Schema-Version: `1.0`
- Agent-Id: Full agent identifier
- Has-MCP: Capability flag
- Has-A2A: Capability flag
- Has-Wallet: Capability flag
- Active: Status flag
- Timestamp: ISO 8601

**Feedback Tags (13+):**
- All registration tags except capabilities
- Score: Numerical rating
- Tag1, Tag2: Custom tags
- Reviewer: Client address
- Capability, Skill: Feedback content fields

### Arweave Integration

- Uses ArDrive Turbo SDK for uploads
- EthereumSigner (EVM wallet, not Arweave JWK)
- Free uploads for files <100KB
- Optimistic caching (immediate availability)
- Permanent, immutable storage

### Subgraph Indexing

- Dynamic data sources for Arweave content
- Mutually exclusive IPFS/Arweave handling
- URI type detection and classification
- Automatic retry on gateway failures

## Important Notes

### Tags Bug Fix (Nov 14, 2025)

**Problem:** Uploads had 0 tags due to BigInt initialization issue
**Solution:** Three-part fix ensuring tags always generated
**Details:** See `ARWEAVE-TAGS-FIX-SUMMARY.md`

**Verification:**
- Before: `ar://r9Zumbxb-WL1aIIw03Y8ZpgpflB1CR15MY7_3Nno6l0` (0 tags)
- After: `ar://1u07tuu-vIDOk6JtA2clny3ktlBAR-YsaBsEoqL_ZqM` (12 tags)

### Deployment Status

**SDK Repository:**
- Branch: `feat-add-ario-client`
- Commit: `5c033f7` (tags fix)
- Status: ✅ Pushed to remote
- Ready for: Merge to main, npm publish

**Subgraph Repository:**
- Branch: `feat/arweave-integration`
- Commit: `06bdf5e`
- Status: ✅ Pushed to remote
- Ready for: Merge to main, deploy

See `FINAL-DEPLOYMENT-SUMMARY.md` for complete deployment checklist.

## Common Issues

### "IndexLimit exceeded"

**Cause:** Feedback wallet has exceeded quota for this agent
**Solution:** Use different wallet or different agent

### Tags Not Appearing Immediately

**Cause:** Arweave indexing delay (5-60 seconds)
**Solution:** Wait and retry, or check gateway directly

### Data Not on Gateway

**Cause:** Turbo caching propagation (30-60 seconds)
**Solution:** Normal behavior, data will appear shortly

## Useful Links

### Documentation
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [ArDrive Turbo Docs](https://docs.ardrive.io/docs/turbo/)
- [Arweave GraphQL](https://arweave.net/graphql)

### Explorers
- [ViewBlock Arweave](https://viewblock.io/arweave)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)

### Example Transactions
- Working tags: `1u07tuu-vIDOk6JtA2clny3ktlBAR-YsaBsEoqL_ZqM`
- Broken tags: `r9Zumbxb-WL1aIIw03Y8ZpgpflB1CR15MY7_3Nno6l0`

## Development Commands

```bash
# Run main test
npm start

# Run specific test
npx tsx tests/check-arweave-tags.ts

# Install latest SDK from parent repo
cd ../agent0-ts && npm run build && npm pack && cd ../arweave-agent-test && npm install ../agent0-ts/agent0-sdk-0.2.1.tgz

# Check git status
git status
```

## Archive

Historical test files and documentation are preserved in `archive/` for reference. These represent the development and debugging process but are not needed for current testing.

## License

Same as agent0-sdk parent project.
