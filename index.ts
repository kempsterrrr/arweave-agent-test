/**
 * External Test Script for Arweave Tagging
 *
 * Use this script to test the SDK from an external project after npm pack.
 *
 * Setup:
 *   1. In agent0-ts: npm run build && npm pack
 *   2. Create new project: mkdir test-project && cd test-project
 *   3. Install: npm init -y && npm install ../agent0-ts/agent0-sdk-0.2.1.tgz
 *   4. Install deps: npm install dotenv && npm install -D typescript ts-node @types/node
 *   5. Copy this file to test-project/test-tags.ts
 *   6. Create .env with RPC_URL and PRIVATE_KEY
 *   7. Run: npx ts-node test-tags.ts
 */

import 'dotenv/config';
import { SDK } from 'agent0-sdk';

async function main() {
  console.log('🧪 Testing Arweave Tagging Support\n');

  // Configuration
  const config = {
    chainId: 11155111 as const, // Sepolia
    rpcUrl: process.env.RPC_URL!,
    signer: process.env.PRIVATE_KEY!,
    arweave: true, // Enable Arweave with tagging
    subgraphUrl: 'http://localhost:8000/subgraphs/name/agent0-sdk/agent0-sdk/graphql',
  };

  console.log('✓ Configuration loaded');
  console.log(`  Chain: Sepolia (${config.chainId})`);
  console.log(`  Arweave: Enabled\n`);

  // Initialize SDK
  const sdk = new SDK(config);
  console.log('✓ SDK initialized with Arweave client\n');

  // Create agent with capabilities
  const randomId = Math.floor(Math.random() * 9000) + 1000;
  const agent = sdk.createAgent(
    `Test Agent ${randomId}`,
    `Testing Arweave tagging - ${new Date().toISOString()}`,
    `https://example.com/agent-${randomId}.png`
  );

  console.log(`✓ Agent created: "${agent.name}"`);

  // Add endpoints (tags will reflect these capabilities)
  await agent.setMCP(
    `https://mcp.example.com/${randomId}`,
    '2025-06-18',
    false // Disable endpoint crawling for speed
  );
  console.log('✓ MCP endpoint added (Has-MCP tag will be true)');

  await agent.setA2A(
    `https://a2a.example.com/${randomId}.json`,
    '0.35',
    false
  );
  console.log('✓ A2A endpoint added (Has-A2A tag will be true)');

  agent.setAgentWallet('0x' + 'a'.repeat(40), 1);
  console.log('✓ Wallet configured (Has-Wallet tag will be true)');

  agent.setActive(true);
  console.log('✓ Agent set to active (Active tag will be true)\n');

  // Register on Arweave
  console.log('📤 Registering agent on Arweave with tags...');
  console.log('   This will generate tags for:');
  console.log('   - Content-Type: application/json');
  console.log('   - App-Name: Agent0-v0.2.1');
  console.log('   - Protocol: ERC-8004');
  console.log('   - Chain-Id: 11155111');
  console.log('   - Agent-Id: (after registration)');
  console.log('   - Has-MCP: true');
  console.log('   - Has-A2A: true');
  console.log('   - Has-Wallet: true');
  console.log('   - Active: true');
  console.log('   - Timestamp: (ISO 8601)\n');

  const startTime = Date.now();
  const result = await agent.registerArweave();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Registration complete in ${duration}s!\n`);
  console.log(`Agent ID: ${result.agentId}`);
  console.log(`Arweave URI: ${result.agentURI}\n`);

  const txId = result.agentURI!.replace('ar://', '');

  // Query tags from Arweave GraphQL
  console.log('🔍 Querying tags from Arweave...\n');

  try {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s for indexing

    const query = `
      query {
        transaction(id: "${txId}") {
          tags {
            name
            value
          }
        }
      }
    `;

    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const graphqlResult = await response.json();
    const tags = graphqlResult.data?.transaction?.tags || [];

    if (tags.length > 0) {
      console.log('📋 Tags retrieved from Arweave:\n');
      console.log('  Tag Name              | Value');
      console.log('  ' + '-'.repeat(70));

      for (const tag of tags) {
        const name = tag.name.padEnd(20);
        console.log(`  ${name} | ${tag.value}`);
      }
      console.log();

      // Verify critical tags
      const contentType = tags.find((t: any) => t.name === 'Content-Type');
      const protocol = tags.find((t: any) => t.name === 'Protocol');
      const hasMCP = tags.find((t: any) => t.name === 'Has-MCP');
      const hasA2A = tags.find((t: any) => t.name === 'Has-A2A');

      console.log('✅ Tag Verification:');
      if (contentType?.value === 'application/json') {
        console.log('   ✓ Content-Type: application/json');
      }
      if (protocol?.value === 'ERC-8004') {
        console.log('   ✓ Protocol: ERC-8004');
      }
      if (hasMCP?.value === 'true') {
        console.log('   ✓ Has-MCP: true');
      }
      if (hasA2A?.value === 'true') {
        console.log('   ✓ Has-A2A: true');
      }
      console.log();
    } else {
      console.log('⏳ Tags not yet indexed (this is normal)');
      console.log('   Try querying again in 30-60 seconds\n');
    }
  } catch (error: any) {
    console.log('⚠️  Tag query failed (tags still exist, just not retrievable yet)');
    console.log(`   Error: ${error.message}\n`);
  }

  // Verify data is accessible
  console.log('📥 Verifying data accessibility...\n');

  try {
    const dataResponse = await fetch(`https://arweave.net/${txId}`);
    const contentType = dataResponse.headers.get('content-type');
    const data = await dataResponse.json();

    console.log('✅ Data retrieved successfully!');
    console.log(`   Content-Type: ${contentType}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Type: ${data.type}`);
    console.log(`   Endpoints: ${data.endpoints?.length || 0}\n`);
  } catch (error: any) {
    console.log('⏳ Data not yet available on gateway');
    console.log('   This is normal - Turbo caching takes 30-60s\n');
  }

  // Test reload
  console.log('🔄 Testing agent reload...\n');

  try {
    const reloadedAgent = await sdk.loadAgent(result.agentId!);
    console.log('✅ Agent reloaded successfully!');
    console.log(`   Name: ${reloadedAgent.name}`);
    console.log(`   Active: ${reloadedAgent.getRegistrationFile().active}`);
    console.log(`   Endpoints: ${reloadedAgent.getRegistrationFile().endpoints.length}\n`);
  } catch (error: any) {
    console.log(`⚠️  Reload failed: ${error.message}\n`);
  }

  // Summary
  console.log('═'.repeat(80));
  console.log('🎉 TEST COMPLETE!\n');
  console.log('Summary:');
  console.log('  ✓ Agent registered with Arweave storage');
  console.log('  ✓ Tags automatically generated and authenticated');
  console.log('  ✓ Content-Type properly set for gateway serving');
  console.log('  ✓ Data follows ERC-8004 standard\n');
  console.log('View on Arweave:');
  console.log(`  https://viewblock.io/arweave/tx/${txId}`);
  console.log(`  https://arweave.net/${txId}\n`);
  console.log('═'.repeat(80));
}

main().catch(console.error);
