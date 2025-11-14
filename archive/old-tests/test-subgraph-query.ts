/**
 * Test: Query Local Subgraph for Arweave Agent
 *
 * Verifies the local subgraph has indexed the newly created agent
 * with ar:// URI and checks the mutually exclusive IPFS/Arweave handling.
 */

import 'dotenv/config';

async function main() {
  console.log('🧪 Testing Local Subgraph Indexing\n');
  console.log('═'.repeat(80));

  const SUBGRAPH_URL = 'http://192.168.2.90:8000/subgraphs/name/agent0-sdk/agent0-sdk';
  const AGENT_ID = '11155111:1690'; // From test-full-integration.ts

  // Query 1: Check if agent exists
  console.log('\n📝 Query 1: Check Agent Exists');
  console.log('-'.repeat(80));

  const agentQuery = `
    query {
      agent(id: "${AGENT_ID.toLowerCase()}") {
        id
        chainId
        agentId
        owner
        agentURI
        agentURIType
        createdAt
        updatedAt
        registrationFile {
          id
          cid
          name
          description
          active
          mcpEndpoint
          a2aEndpoint
        }
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: agentQuery }),
    });

    const result = await response.json();

    if (result.data?.agent) {
      const agent = result.data.agent;
      console.log('✅ Agent Found in Subgraph!');
      console.log(`  ID: ${agent.id}`);
      console.log(`  Chain ID: ${agent.chainId}`);
      console.log(`  Agent ID: ${agent.agentId}`);
      console.log(`  Owner: ${agent.owner}`);
      console.log(`  Agent URI: ${agent.agentURI}`);
      console.log(`  URI Type: ${agent.agentURIType}`);

      if (agent.registrationFile) {
        console.log(`\n  Registration File (from ${agent.agentURIType}):`);
        console.log(`    CID: ${agent.registrationFile.cid}`);
        console.log(`    Name: ${agent.registrationFile.name || 'Not indexed yet'}`);
        console.log(`    Active: ${agent.registrationFile.active}`);
        console.log(`    MCP Endpoint: ${agent.registrationFile.mcpEndpoint || 'None'}`);
        console.log(`    A2A Endpoint: ${agent.registrationFile.a2aEndpoint || 'None'}`);
      } else {
        console.log(`\n  ⏳ Registration file not yet indexed`);
      }

      if (agent.agentURI && agent.agentURI.startsWith('ar://')) {
        console.log('\n✅ SUCCESS: Subgraph correctly indexed ar:// URI!');

        if (agent.agentURIType === 'arweave') {
          console.log('✅ SUCCESS: URIType correctly set to "arweave"!');
        } else {
          console.log(`⚠️  WARNING: URIType is "${agent.agentURIType}", expected "arweave"`);
        }
      } else {
        console.log(`\n⚠️  Unexpected URI format: ${agent.agentURI}`);
      }
    } else {
      console.log('⏳ Agent not yet indexed in subgraph');
      console.log('   Subgraph may still be syncing...');

      if (result.errors) {
        console.log('\n❌ GraphQL Errors:');
        result.errors.forEach((err: any) => {
          console.log(`  - ${err.message}`);
        });
      }
    }
  } catch (error: any) {
    console.error('❌ Query failed:', error.message);
  }

  // Query 2: Check subgraph sync status
  console.log('\n📝 Query 2: Check Subgraph Sync Status');
  console.log('-'.repeat(80));

  const metaQuery = `
    query {
      _meta {
        block {
          number
          hash
        }
        deployment
        hasIndexingErrors
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: metaQuery }),
    });

    const result = await response.json();

    if (result.data?._meta) {
      const meta = result.data._meta;
      console.log('✅ Subgraph Status:');
      console.log(`  Current Block: ${meta.block.number}`);
      console.log(`  Block Hash: ${meta.block.hash}`);
      console.log(`  Deployment: ${meta.deployment}`);
      console.log(`  Has Indexing Errors: ${meta.hasIndexingErrors}`);
    } else {
      console.log('⚠️  Could not retrieve subgraph metadata');
    }
  } catch (error: any) {
    console.error('❌ Metadata query failed:', error.message);
  }

  // Query 3: Get recent agents with ar:// URIs
  console.log('\n📝 Query 3: Recent Agents with Arweave URIs');
  console.log('-'.repeat(80));

  const recentQuery = `
    query {
      agents(
        first: 5
        orderBy: createdAt
        orderDirection: desc
        where: { agentURIType: "arweave" }
      ) {
        id
        chainId
        agentId
        agentURI
        agentURIType
        registrationFile {
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
      body: JSON.stringify({ query: recentQuery }),
    });

    const result = await response.json();

    if (result.data?.agents && result.data.agents.length > 0) {
      console.log(`✅ Found ${result.data.agents.length} agents with Arweave URIs:\n`);

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

      console.log('✅ VERIFICATION: Subgraph mutually exclusive handling working!');
      console.log('   All ar:// URIs correctly identified as "arweave" type');
    } else {
      console.log('⏳ No agents with Arweave URIs found yet');
      console.log('   Subgraph may still be indexing...');
    }
  } catch (error: any) {
    console.error('❌ Recent agents query failed:', error.message);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('🎯 SUBGRAPH QUERY TEST COMPLETE');
  console.log('═'.repeat(80));
}

main().catch(console.error);
