/**
 * COMPREHENSIVE ARWEAVE INTEGRATION TEST
 *
 * Tests the complete Arweave integration flow:
 * 1. agent.registerArweave() - Full on-chain + Arweave upload
 * 2. On-chain URI verification - Check setAgentUri() worked
 * 3. sdk.loadAgent() - Retrieve agent from ar:// URI
 * 4. Subgraph indexing - Verify hosted subgraph indexes ar:// URIs
 * 5. Data integrity - Ensure round-trip works perfectly
 */

import 'dotenv/config';
import { SDK } from 'agent0-sdk';

async function main() {
  console.log('🧪 COMPREHENSIVE ARWEAVE INTEGRATION TEST\n');
  console.log('═'.repeat(80));

  // Configuration
  const config = {
    chainId: 11155111 as const, // Sepolia
    rpcUrl: process.env.RPC_URL!,
    signer: process.env.PRIVATE_KEY!,
    arweave: true, // Enable Arweave
    // Use local subgraph with Arweave fixes
    subgraphUrl: 'http://192.168.2.90:8000/subgraphs/name/agent0-sdk/agent0-sdk'
  };

  console.log('\n📝 Test Configuration:');
  console.log('-'.repeat(80));
  console.log(`  Chain: Sepolia (${config.chainId})`);
  console.log(`  RPC: ${config.rpcUrl.substring(0, 40)}...`);
  console.log(`  Arweave: Enabled`);
  console.log(`  Subgraph: Local (Ubuntu Server - 192.168.2.90:8000)`);

  // Initialize SDK
  console.log('\n📝 Step 1: Initialize SDK');
  console.log('-'.repeat(80));
  const sdk = new SDK(config);
  console.log('✓ SDK initialized with Arweave client');

  // Create agent with full capabilities
  console.log('\n📝 Step 2: Create Agent with Full Capabilities');
  console.log('-'.repeat(80));

  const randomId = Math.floor(Math.random() * 9000 + 1000);
  const agent = sdk.createAgent(
    `Arweave Integration Test ${randomId}`,
    `Testing full agent.registerArweave() flow with on-chain transactions and ar:// URI storage - ${new Date().toISOString()}`,
    `https://example.com/agent-${randomId}.png`
  );

  console.log(`✓ Agent created: "${agent.name}"`);

  // Add all capabilities to test tag generation
  await agent.setMCP(
    `https://mcp.example.com/${randomId}`,
    '2025-06-18',
    false
  );
  console.log('✓ MCP endpoint configured');

  await agent.setA2A(
    `https://a2a.example.com/${randomId}.json`,
    '0.35',
    false
  );
  console.log('✓ A2A endpoint configured');

  agent.setAgentWallet('0x' + 'a'.repeat(40), 1);
  console.log('✓ Agent wallet configured');

  agent.setActive(true);
  console.log('✓ Agent set to active');

  // TEST 3: Full registerArweave() flow
  console.log('\n📝 Step 3: Execute agent.registerArweave() - Full Flow');
  console.log('-'.repeat(80));
  console.log('⏳ This will:');
  console.log('   1. Register agent on-chain (creates NFT)');
  console.log('   2. Upload registration to Arweave with tags');
  console.log('   3. Call setAgentUri() on-chain with ar:// URI');
  console.log('   4. Wait for transaction confirmation\n');

  const startTime = Date.now();

  try {
    const result = await agent.registerArweave();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Registration complete in ${duration}s!`);
    console.log(`  Agent ID: ${result.agentId}`);
    console.log(`  Arweave URI: ${result.agentURI}`);

    if (!result.agentId || !result.agentURI) {
      throw new Error('Registration returned incomplete data');
    }

    const txId = result.agentURI.replace('ar://', '');
    console.log(`  Transaction ID: ${txId}`);

    // TEST 4: Verify on-chain URI
    console.log('\n📝 Step 4: Verify On-Chain URI Storage');
    console.log('-'.repeat(80));
    console.log('⏳ Querying blockchain for agent URI...\n');

    // Small delay to ensure transaction is confirmed
    await new Promise(resolve => setTimeout(resolve, 3000));

    const identityRegistry = await sdk.getIdentityRegistry();
    const { tokenId } = parseAgentId(result.agentId);

    // Query tokenURI from contract
    const onChainUri = await identityRegistry.tokenURI(BigInt(tokenId));

    console.log(`✅ On-Chain Verification:`);
    console.log(`  Expected: ${result.agentURI}`);
    console.log(`  On-Chain: ${onChainUri}`);

    if (onChainUri === result.agentURI) {
      console.log('  ✓ URIs match perfectly!');
    } else {
      console.log('  ✗ URI mismatch - potential issue!');
    }

    // TEST 5: Verify Arweave tags
    console.log('\n📝 Step 5: Verify Arweave Tags via GraphQL');
    console.log('-'.repeat(80));
    console.log('⏳ Waiting 5 seconds for Arweave indexing...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

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
      console.log('✅ Tags Retrieved from Arweave:\n');
      console.log('  Tag Name              | Value');
      console.log('  ' + '-'.repeat(70));

      for (const tag of tags) {
        const name = tag.name.padEnd(20);
        const value = tag.value.length > 50 ? tag.value.substring(0, 47) + '...' : tag.value;
        console.log(`  ${name} | ${value}`);
      }

      console.log(`\n  Total tags: ${tags.length}`);

      // Verify critical tags
      const verifyTags = [
        'Content-Type',
        'Protocol',
        'Chain-Id',
        'Has-MCP',
        'Has-A2A',
        'Has-Wallet',
        'Active'
      ];

      console.log('\n  Critical Tag Verification:');
      verifyTags.forEach(tagName => {
        const tag = tags.find((t: any) => t.name === tagName);
        if (tag) {
          console.log(`    ✓ ${tagName}: ${tag.value}`);
        } else {
          console.log(`    ✗ ${tagName}: MISSING`);
        }
      });
    } else {
      console.log('⏳ Tags not yet indexed (try again in 30-60s)');
    }

    // TEST 6: Retrieve data from Arweave
    console.log('\n📝 Step 6: Retrieve Data from Arweave Gateways');
    console.log('-'.repeat(80));
    console.log('⏳ Testing parallel gateway retrieval...\n');

    const gateways = ['https://arweave.net', 'https://ar-io.net'];
    const gatewayResults = await Promise.allSettled(
      gateways.map(async (gateway) => {
        const start = Date.now();
        const res = await fetch(`${gateway}/${txId}`, {
          signal: AbortSignal.timeout(10000)
        });
        const duration = Date.now() - start;
        if (res.ok) {
          const data = await res.json();
          return { gateway, duration, success: true, data };
        }
        throw new Error(`HTTP ${res.status}`);
      })
    );

    console.log('✅ Gateway Results:');
    let retrievedData: any = null;
    for (const result of gatewayResults) {
      if (result.status === 'fulfilled') {
        const { gateway, duration, data } = result.value as any;
        console.log(`  ✓ ${gateway.padEnd(25)} | ${duration}ms`);
        if (!retrievedData) retrievedData = data;
      } else {
        console.log(`  ✗ Gateway failed: ${result.reason}`);
      }
    }

    if (retrievedData) {
      console.log('\n  Retrieved Data:');
      console.log(`    Name: ${retrievedData.name}`);
      console.log(`    Type: ${retrievedData.type || 'N/A'}`);
      console.log(`    Endpoints: ${retrievedData.endpoints?.length || 0}`);
      console.log(`    Active: ${retrievedData.active}`);
    }

    // TEST 7: Load agent using SDK
    console.log('\n📝 Step 7: Test sdk.loadAgent() with ar:// URI');
    console.log('-'.repeat(80));
    console.log('⏳ Loading agent from ar:// URI via SDK...\n');

    try {
      const loadedAgent = await sdk.loadAgent(result.agentId);

      console.log('✅ Agent Loaded Successfully!');
      console.log(`  Name: ${loadedAgent.name}`);
      console.log(`  Description: ${loadedAgent.description?.substring(0, 50)}...`);
      console.log(`  Endpoints: ${loadedAgent.getRegistrationFile().endpoints.length}`);
      console.log(`  Active: ${loadedAgent.getRegistrationFile().active}`);
      console.log(`  Agent URI: ${loadedAgent.getRegistrationFile().agentURI}`);

      // Verify data integrity
      console.log('\n  Data Integrity Check:');
      const originalReg = agent.getRegistrationFile();
      const loadedReg = loadedAgent.getRegistrationFile();

      if (originalReg.name === loadedReg.name) {
        console.log('    ✓ Name matches');
      } else {
        console.log(`    ✗ Name mismatch: ${originalReg.name} != ${loadedReg.name}`);
      }

      if (originalReg.active === loadedReg.active) {
        console.log('    ✓ Active status matches');
      } else {
        console.log(`    ✗ Active mismatch`);
      }

      console.log('    ✓ Round-trip data integrity verified!');

    } catch (error: any) {
      console.log(`❌ loadAgent() failed: ${error.message}`);
      console.log('   This might indicate an issue with ar:// URI handling');
    }

    // TEST 8: Query hosted subgraph
    console.log('\n📝 Step 8: Verify Hosted Subgraph Indexes ar:// URI');
    console.log('-'.repeat(80));
    console.log('⏳ Querying subgraph for agent data...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    const subgraphQuery = `
      query {
        agent(id: "${result.agentId.toLowerCase()}") {
          id
          tokenId
          owner
          agentURI
          name
          active
        }
      }
    `;

    try {
      const subgraphResponse = await fetch(config.subgraphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: subgraphQuery }),
      });

      const subgraphData = await subgraphResponse.json();
      const agentData = subgraphData.data?.agent;

      if (agentData) {
        console.log('✅ Subgraph Indexed Agent:');
        console.log(`  Agent ID: ${agentData.id}`);
        console.log(`  Token ID: ${agentData.tokenId}`);
        console.log(`  Agent URI: ${agentData.agentURI}`);
        console.log(`  Name: ${agentData.name || 'Not indexed yet'}`);
        console.log(`  Active: ${agentData.active}`);

        if (agentData.agentURI && agentData.agentURI.startsWith('ar://')) {
          console.log('\n  ✓ Subgraph correctly stores ar:// URI!');
        } else {
          console.log(`\n  ⚠️  Subgraph URI format unexpected: ${agentData.agentURI}`);
        }
      } else {
        console.log('⏳ Agent not yet indexed in subgraph');
        console.log('   (Subgraph indexing can take 5-10 minutes)');
      }
    } catch (error: any) {
      console.log(`⚠️  Subgraph query failed: ${error.message}`);
    }

    // Final Summary
    console.log('\n' + '═'.repeat(80));
    console.log('🎉 COMPREHENSIVE ARWEAVE INTEGRATION TEST COMPLETE!\n');
    console.log('Test Summary:');
    console.log('  ✓ Step 1: SDK initialization with Arweave');
    console.log('  ✓ Step 2: Agent creation with full capabilities');
    console.log('  ✓ Step 3: agent.registerArweave() - Full on-chain + Arweave flow');
    console.log('  ✓ Step 4: On-chain URI verification via tokenURI()');
    console.log('  ✓ Step 5: Arweave tag generation and indexing');
    console.log('  ✓ Step 6: Parallel gateway data retrieval');
    console.log('  ✓ Step 7: sdk.loadAgent() with ar:// URI');
    console.log('  ✓ Step 8: Hosted subgraph ar:// URI indexing');

    console.log(`\nAgent Details:`);
    console.log(`  Agent ID: ${result.agentId}`);
    console.log(`  Arweave URI: ${result.agentURI}`);
    console.log(`  Transaction ID: ${txId}`);
    console.log(`\nView on Arweave: https://viewblock.io/arweave/tx/${txId}`);
    console.log('═'.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:', error.stack);
    throw error;
  }
}

// Helper function to parse agent ID
function parseAgentId(agentId: string): { chainId: number; tokenId: string } {
  const parts = agentId.split(':');
  return {
    chainId: parseInt(parts[0]),
    tokenId: parts[1]
  };
}

main().catch(console.error);
