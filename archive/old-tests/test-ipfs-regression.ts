/**
 * REGRESSION TEST: IPFS URI Indexing
 *
 * Verifies that changing from sequential 'if' to 'else if' didn't break IPFS indexing.
 * This is critical because we only tested Arweave URIs.
 */

import 'dotenv/config';

async function main() {
  console.log('🧪 REGRESSION TEST: IPFS URI Indexing\n');
  console.log('═'.repeat(80));

  const SUBGRAPH_URL = 'http://192.168.2.90:8000/subgraphs/name/agent0-sdk/agent0-sdk';

  // Query 1: Find agents with IPFS URIs
  console.log('\n📝 Query 1: Agents with IPFS URIs');
  console.log('-'.repeat(80));

  const ipfsQuery = `
    query {
      agents(
        first: 5
        orderBy: createdAt
        orderDirection: desc
        where: { agentURIType: "ipfs" }
      ) {
        id
        agentURI
        agentURIType
        registrationFile {
          cid
          name
          active
        }
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: ipfsQuery }),
    });

    const result = await response.json();

    if (result.data?.agents && result.data.agents.length > 0) {
      console.log(`✅ Found ${result.data.agents.length} agents with IPFS URIs:\n`);

      result.data.agents.forEach((agent: any, index: number) => {
        console.log(`  ${index + 1}. Agent ID: ${agent.id}`);
        console.log(`     URI: ${agent.agentURI}`);
        console.log(`     Type: ${agent.agentURIType}`);
        if (agent.registrationFile) {
          console.log(`     Name: ${agent.registrationFile.name || 'Not indexed'}`);
          console.log(`     Active: ${agent.registrationFile.active}`);
        } else {
          console.log(`     ⏳ Registration file not yet indexed`);
        }
        console.log();
      });

      console.log('✅ IPFS INDEXING STILL WORKS!');
      console.log('   The else if change did not break IPFS');
    } else {
      console.log('⚠️  No agents with IPFS URIs found');
      console.log('   This could mean:');
      console.log('   1. No IPFS agents exist on Sepolia (OK)');
      console.log('   2. IPFS indexing is broken (CRITICAL)');
      console.log('\n   Need to register an agent with IPFS URI to verify!');
    }
  } catch (error: any) {
    console.error('❌ Query failed:', error.message);
  }

  // Query 2: Check for agents with neither type
  console.log('\n📝 Query 2: Agents with Unknown/HTTP URIs');
  console.log('-'.repeat(80));

  const unknownQuery = `
    query {
      agents(
        first: 5
        where: { agentURIType_not_in: ["ipfs", "arweave"] }
      ) {
        id
        agentURI
        agentURIType
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: unknownQuery }),
    });

    const result = await response.json();

    if (result.data?.agents && result.data.agents.length > 0) {
      console.log(`✅ Found ${result.data.agents.length} agents with other URI types:\n`);

      result.data.agents.forEach((agent: any, index: number) => {
        console.log(`  ${index + 1}. Agent ID: ${agent.id}`);
        console.log(`     URI: ${agent.agentURI || 'Empty'}`);
        console.log(`     Type: ${agent.agentURIType || 'null'}\n`);
      });
    } else {
      console.log('✓ No agents with unknown URI types');
    }
  } catch (error: any) {
    console.error('❌ Query failed:', error.message);
  }

  // Query 3: Total agent count by type
  console.log('\n📝 Query 3: Agent Count by URI Type');
  console.log('-'.repeat(80));

  const types = ['ipfs', 'arweave', 'http', 'https', 'unknown'];

  for (const type of types) {
    const countQuery = `
      query {
        agents(where: { agentURIType: "${type}" }) {
          id
        }
      }
    `;

    try {
      const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: countQuery }),
      });

      const result = await response.json();
      const count = result.data?.agents?.length || 0;
      console.log(`  ${type.padEnd(10)}: ${count} agents`);
    } catch (error: any) {
      console.log(`  ${type.padEnd(10)}: Error - ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('🎯 REGRESSION TEST COMPLETE');
  console.log('═'.repeat(80));
}

main().catch(console.error);
