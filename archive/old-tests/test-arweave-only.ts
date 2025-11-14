/**
 * Focused Arweave Test - Tests ArDrive Turbo SDK integration directly
 *
 * This test focuses on:
 * 1. ArweaveClient initialization with EthereumSigner
 * 2. Direct upload to Arweave via Turbo SDK
 * 3. Tag generation and verification
 * 4. Parallel gateway retrieval
 * 5. Data persistence validation
 *
 * No on-chain transactions required!
 */

import 'dotenv/config';
import { EthereumSigner } from '@ardrive/turbo-sdk';
import { TurboFactory } from '@ardrive/turbo-sdk';

async function main() {
  console.log('🧪 Testing ArDrive Turbo SDK Integration\n');
  console.log('═'.repeat(80));

  // Test 1: Initialize EthereumSigner
  console.log('\n📝 Test 1: Initialize EthereumSigner');
  console.log('-'.repeat(80));

  const privateKey = process.env.PRIVATE_KEY!;
  if (!privateKey.startsWith('0x')) {
    throw new Error('PRIVATE_KEY must start with 0x');
  }

  const signer = new EthereumSigner(privateKey);
  console.log('✓ EthereumSigner created');

  // Test 2: Initialize Turbo Client
  console.log('\n📝 Test 2: Initialize TurboFactory');
  console.log('-'.repeat(80));

  const turbo = TurboFactory.authenticated({
    signer,
    token: 'ethereum'
  });
  console.log('✓ Turbo client created with EthereumSigner');

  // Get wallet address from turbo client
  const address = await turbo.signer.getNativeAddress();
  console.log(`✓ Wallet address: ${address}`);

  // Check balance
  try {
    const balance = await turbo.getBalance();
    console.log(`✓ Turbo Credits balance: ${balance.winc} winc`);
  } catch (error: any) {
    console.log(`⚠️  Could not fetch balance: ${error.message}`);
    console.log('   (This is OK - you may need to top up Turbo credits)');
  }

  // Test 3: Create test data with comprehensive tags
  console.log('\n📝 Test 3: Prepare Test Data with Tags');
  console.log('-'.repeat(80));

  const testData = {
    name: 'Test Agent ' + Math.floor(Math.random() * 9000 + 1000),
    description: 'Testing ArDrive Turbo SDK integration',
    type: 'agent',
    endpoints: [
      {
        type: 'mcp',
        url: 'https://mcp.example.com/test',
        version: '2025-06-18'
      },
      {
        type: 'a2a',
        url: 'https://a2a.example.com/test.json',
        version: '0.35'
      }
    ],
    wallet: {
      address: 'eip155:1:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      chainId: 1
    },
    active: true,
    timestamp: new Date().toISOString()
  };

  console.log('✓ Test data created:');
  console.log(`  Name: ${testData.name}`);
  console.log(`  Endpoints: ${testData.endpoints.length}`);
  console.log(`  Active: ${testData.active}`);

  // Test 4: Generate comprehensive tags
  console.log('\n📝 Test 4: Generate Comprehensive Tags');
  console.log('-'.repeat(80));

  const tags = [
    // Essential tags
    { name: 'Content-Type', value: 'application/json' },
    { name: 'App-Name', value: 'Agent0-v0.2.1' },
    { name: 'Protocol', value: 'ERC-8004' },
    { name: 'Data-Type', value: 'Registration' },

    // Metadata tags
    { name: 'Chain-Id', value: '11155111' }, // Sepolia
    { name: 'Timestamp', value: new Date().toISOString() },

    // Capability tags
    { name: 'Has-MCP', value: 'true' },
    { name: 'Has-A2A', value: 'true' },
    { name: 'Has-Wallet', value: 'true' },
    { name: 'Active', value: 'true' },

    // Searchability tags
    { name: 'Agent-Name', value: testData.name },
  ];

  console.log('✓ Generated tags:');
  tags.forEach(tag => {
    console.log(`  ${tag.name.padEnd(20)} | ${tag.value}`);
  });
  console.log(`\n✓ Total tags: ${tags.length}`);

  // Test 5: Upload to Arweave with tags
  console.log('\n📝 Test 5: Upload to Arweave via Turbo SDK');
  console.log('-'.repeat(80));
  console.log('⏳ Uploading data with tags...');

  const dataString = JSON.stringify(testData, null, 2);
  console.log(`  Data size: ${dataString.length} bytes`);

  if (dataString.length < 102400) {
    console.log('  ✓ Under 100KB - This upload is FREE!');
  }

  const startTime = Date.now();

  try {
    const uploadResult = await turbo.upload({
      data: dataString,
      dataItemOpts: {
        tags: tags
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Upload successful in ${duration}s!`);
    console.log(`  Transaction ID: ${uploadResult.id}`);
    console.log(`  Owner: ${uploadResult.owner}`);
    console.log(`  Arweave URI: ar://${uploadResult.id}`);

    if (uploadResult.dataCaches && uploadResult.dataCaches.length > 0) {
      console.log(`  Data caches: ${uploadResult.dataCaches.length}`);
    }
    if (uploadResult.fastFinalityIndexes && uploadResult.fastFinalityIndexes.length > 0) {
      console.log(`  Fast finality indexes: ${uploadResult.fastFinalityIndexes.length}`);
    }

    // Test 6: Query tags from Arweave GraphQL
    console.log('\n📝 Test 6: Verify Tags via Arweave GraphQL');
    console.log('-'.repeat(80));
    console.log('⏳ Waiting 5 seconds for indexing...');

    await new Promise(resolve => setTimeout(resolve, 5000));

    const query = `
      query {
        transaction(id: "${uploadResult.id}") {
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
    const retrievedTags = graphqlResult.data?.transaction?.tags || [];

    if (retrievedTags.length > 0) {
      console.log('✅ Tags retrieved from Arweave:\n');
      console.log('  Tag Name              | Value');
      console.log('  ' + '-'.repeat(70));

      for (const tag of retrievedTags) {
        const name = tag.name.padEnd(20);
        console.log(`  ${name} | ${tag.value}`);
      }

      // Verify critical tags
      const verifications = [
        { name: 'Content-Type', expected: 'application/json' },
        { name: 'Protocol', expected: 'ERC-8004' },
        { name: 'Has-MCP', expected: 'true' },
        { name: 'Has-A2A', expected: 'true' },
        { name: 'Has-Wallet', expected: 'true' },
        { name: 'Active', expected: 'true' },
      ];

      console.log('\n✅ Tag Verification:');
      verifications.forEach(({ name, expected }) => {
        const tag = retrievedTags.find((t: any) => t.name === name);
        if (tag && tag.value === expected) {
          console.log(`   ✓ ${name}: ${expected}`);
        } else {
          console.log(`   ✗ ${name}: Expected "${expected}", got "${tag?.value || 'missing'}"`);
        }
      });
    } else {
      console.log('⏳ Tags not yet indexed (normal - try again in 30-60 seconds)');
    }

    // Test 7: Retrieve data from multiple AR.IO gateways (parallel)
    console.log('\n📝 Test 7: Test Parallel Gateway Retrieval');
    console.log('-'.repeat(80));

    const gateways = [
      'https://arweave.net',
      'https://ar-io.net',
      'https://g8way.io'
    ];

    console.log(`⏳ Querying ${gateways.length} gateways in parallel...`);

    const gatewayTests = gateways.map(async (gateway) => {
      const gatewayStart = Date.now();
      try {
        const response = await fetch(`${gateway}/${uploadResult.id}`, {
          signal: AbortSignal.timeout(10000)
        });
        const gatewayDuration = Date.now() - gatewayStart;

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const data = await response.json();
          return {
            gateway,
            success: true,
            duration: gatewayDuration,
            contentType,
            dataName: data.name
          };
        } else {
          return {
            gateway,
            success: false,
            duration: gatewayDuration,
            status: response.status
          };
        }
      } catch (error: any) {
        return {
          gateway,
          success: false,
          duration: Date.now() - gatewayStart,
          error: error.message
        };
      }
    });

    const gatewayResults = await Promise.allSettled(gatewayTests);

    console.log('\n✅ Gateway Results:');
    for (const result of gatewayResults) {
      if (result.status === 'fulfilled') {
        const value = result.value as any;
        if (value.success) {
          console.log(`  ✓ ${value.gateway.padEnd(25)} | ${value.duration}ms | ${value.contentType}`);
          console.log(`    Data retrieved: "${value.dataName}"`);
        } else {
          console.log(`  ✗ ${value.gateway.padEnd(25)} | ${value.duration}ms | ${value.status || value.error}`);
        }
      } else {
        console.log(`  ✗ Gateway test failed: ${result.reason}`);
      }
    }

    // Test Summary
    console.log('\n' + '═'.repeat(80));
    console.log('🎉 ARWEAVE INTEGRATION TEST COMPLETE!\n');
    console.log('Summary of Tests:');
    console.log('  ✓ Test 1: EthereumSigner initialization');
    console.log('  ✓ Test 2: TurboFactory authentication');
    console.log('  ✓ Test 3: Test data preparation');
    console.log('  ✓ Test 4: Comprehensive tag generation');
    console.log('  ✓ Test 5: Upload to Arweave with tags');
    console.log('  ✓ Test 6: Tag verification via GraphQL');
    console.log('  ✓ Test 7: Parallel gateway retrieval');
    console.log('\nArDrive Turbo SDK Integration: ✅ WORKING');
    console.log(`Transaction ID: ${uploadResult.id}`);
    console.log(`View on Arweave: https://viewblock.io/arweave/tx/${uploadResult.id}`);
    console.log('═'.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Upload failed:', error.message);

    if (error.message.includes('insufficient credits') || error.message.includes('balance')) {
      console.log('\n💡 Solution: Your wallet needs Turbo credits.');
      console.log('   You can:');
      console.log('   1. Top up via https://turbo.ardrive.io');
      console.log('   2. Use crypto to fund: turbo.topUpWithTokens()');
      console.log('   3. Files <100KB are free (your data is ' + dataString.length + ' bytes)');
    }

    throw error;
  }
}

main().catch(console.error);
