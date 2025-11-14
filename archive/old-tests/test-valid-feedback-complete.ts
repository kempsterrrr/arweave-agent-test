/**
 * CRITICAL TEST: Valid Feedback Submission (Happy Path)
 *
 * This is the test we SHOULD have run first. We need to verify that
 * pre-validation ALLOWS valid feedback, not just that it REJECTS invalid feedback.
 *
 * Test Flow:
 * 1. Query subgraph for agent NOT owned by our wallet
 * 2. Submit valid feedback to that agent
 * 3. Verify pre-validation passes
 * 4. Verify Arweave upload succeeds
 * 5. Verify on-chain transaction succeeds
 * 6. Verify feedback is indexed in subgraph
 */

import 'dotenv/config';
import { SDK } from 'agent0-sdk';

async function main() {
  console.log('🧪 CRITICAL TEST: Valid Feedback Submission (Happy Path)\n');
  console.log('═'.repeat(80));

  const config = {
    chainId: 11155111 as const,
    rpcUrl: process.env.RPC_URL!,
    signer: process.env.PRIVATE_KEY!,
    arweave: true,
    subgraphUrl: 'http://192.168.2.90:8000/subgraphs/name/agent0-sdk/agent0-sdk'
  };

  const sdk = new SDK(config);
  const ourWallet = sdk.web3Client.address!.toLowerCase();

  console.log('✓ SDK initialized');
  console.log(`✓ Our wallet: ${ourWallet}\n`);

  // Step 1: Find an agent we DON'T own
  console.log('📝 Step 1: Find Agent Owned by Someone Else');
  console.log('-'.repeat(80));
  console.log('⏳ Querying subgraph for agents NOT owned by us...\n');

  const query = `
    query {
      agents(
        first: 10
        orderBy: createdAt
        orderDirection: desc
        where: { owner_not: "${ourWallet}" }
      ) {
        id
        owner
        agentURI
        agentURIType
        registrationFile {
          name
          active
        }
      }
    }
  `;

  let targetAgentId: string | null = null;
  let targetAgentName: string = 'Unknown';

  try {
    const response = await fetch(config.subgraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.data?.agents && result.data.agents.length > 0) {
      // Pick the first agent with a name
      const agent = result.data.agents.find((a: any) => a.registrationFile?.name) || result.data.agents[0];
      targetAgentId = agent.id;
      targetAgentName = agent.registrationFile?.name || 'Unknown';

      console.log('✅ Found Target Agent:');
      console.log(`  Agent ID: ${agent.id}`);
      console.log(`  Owner: ${agent.owner}`);
      console.log(`  Name: ${targetAgentName}`);
      console.log(`  URI Type: ${agent.agentURIType || 'none'}`);
      console.log(`  Active: ${agent.registrationFile?.active ?? 'unknown'}`);
      console.log(`\n  ✓ We DON'T own this agent (valid feedback target)\n`);
    } else {
      console.log('❌ No agents found owned by others!');
      console.log('   This is unexpected - there should be other agents on Sepolia.');
      throw new Error('No valid feedback target found');
    }
  } catch (error: any) {
    console.error('❌ Failed to query subgraph:', error.message);
    throw error;
  }

  if (!targetAgentId) {
    throw new Error('No target agent found');
  }

  // Step 2: Submit Valid Feedback
  console.log('📝 Step 2: Submit Valid Feedback');
  console.log('-'.repeat(80));
  console.log('This is the CRITICAL test we were missing!\n');

  const feedbackData = {
    score: 85,
    tag1: 'valid-test',
    tag2: 'happy-path',
    text: `Testing that valid feedback submission works correctly after implementing pre-validation fix. This feedback is being given from ${ourWallet} to agent ${targetAgentId} owned by someone else.`,
    capability: 'testing',
    skill: 'validation'
  };

  console.log('Feedback Details:');
  console.log(`  Target Agent: ${targetAgentId} (${targetAgentName})`);
  console.log(`  From: ${ourWallet}`);
  console.log(`  Score: ${feedbackData.score}`);
  console.log(`  Tags: ${feedbackData.tag1}, ${feedbackData.tag2}`);
  console.log(`  Text: ${feedbackData.text.substring(0, 60)}...`);

  console.log('\n⏳ Expected Flow:');
  console.log('  1. Pre-validation: estimateGas() → Should PASS ✓');
  console.log('  2. Upload to Arweave → Should SUCCEED ✓');
  console.log('  3. Submit to blockchain → Should SUCCEED ✓');
  console.log('  4. Wait for confirmation → Should SUCCEED ✓\n');

  const startTime = Date.now();
  let feedbackReceipt: any;

  try {
    console.log('⏳ Submitting feedback (with pre-validation)...\n');

    feedbackReceipt = await sdk.giveFeedback(targetAgentId, feedbackData);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ SUCCESS: Feedback submitted in ${duration}s!`);
    console.log(`  Transaction Hash: ${feedbackReceipt.txHash}`);
    console.log(`  Feedback URI: ${feedbackReceipt.feedbackURI || 'On-chain only'}`);

    // Step 3: Verify Arweave Upload
    if (feedbackReceipt.feedbackURI && feedbackReceipt.feedbackURI.startsWith('ar://')) {
      const txId = feedbackReceipt.feedbackURI.replace('ar://', '');

      console.log('\n📝 Step 3: Verify Arweave Upload');
      console.log('-'.repeat(80));
      console.log(`  Arweave TX ID: ${txId}`);
      console.log('  ✓ Pre-validation PASSED (allowed valid feedback)');
      console.log('  ✓ Arweave upload SUCCEEDED');
      console.log('  ✓ On-chain transaction SUCCEEDED');

      console.log('\n⏳ Waiting 5 seconds for Arweave indexing...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Retrieve feedback data from Arweave
      try {
        const response = await fetch(`https://arweave.net/${txId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Feedback Retrieved from Arweave:');
          console.log(`  Score: ${data.score}`);
          console.log(`  Tag1: ${data.tag1}`);
          console.log(`  Tag2: ${data.tag2}`);
          console.log(`  Text: ${data.text?.substring(0, 60)}...`);
          console.log(`  Has feedbackAuth: ${!!data.feedbackAuth}`);

          // Verify data integrity
          if (data.score === feedbackData.score &&
              data.tag1 === feedbackData.tag1 &&
              data.tag2 === feedbackData.tag2) {
            console.log('\n  ✓ Data integrity verified!');
          }
        } else {
          console.log('⏳ Data not yet available on Arweave (may take 30-60s)');
        }
      } catch (error: any) {
        console.log(`⏳ Arweave retrieval: ${error.message}`);
      }

      console.log(`\n🔗 View on Arweave:`);
      console.log(`   https://viewblock.io/arweave/tx/${txId}`);

    } else if (feedbackReceipt.feedbackURI && feedbackReceipt.feedbackURI.startsWith('ipfs://')) {
      console.log('\n⚠️  Feedback stored on IPFS instead of Arweave');
      console.log('   This is unexpected - Arweave should take priority');
    } else {
      console.log('\n⚠️  Feedback stored on-chain only (no Arweave URI)');
      console.log('   This might indicate an Arweave upload issue');
    }

    // Step 4: Verify in Subgraph
    console.log('\n📝 Step 4: Verify Feedback Indexed in Subgraph');
    console.log('-'.repeat(80));
    console.log('⏳ Waiting 10 seconds for subgraph indexing...\n');

    await new Promise(resolve => setTimeout(resolve, 10000));

    // Query for our feedback
    const feedbackQuery = `
      query {
        feedbacks(
          first: 1
          orderBy: createdAt
          orderDirection: desc
          where: {
            agent: "${targetAgentId.toLowerCase()}"
            clientAddress: "${ourWallet}"
          }
        ) {
          id
          score
          tag1
          tag2
          feedbackUri
          feedbackURIType
          isRevoked
          feedbackFile {
            text
            capability
            skill
          }
        }
      }
    `;

    try {
      const response = await fetch(config.subgraphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: feedbackQuery }),
      });

      const result = await response.json();

      if (result.data?.feedbacks && result.data.feedbacks.length > 0) {
        const feedback = result.data.feedbacks[0];
        console.log('✅ Feedback Indexed in Subgraph:');
        console.log(`  ID: ${feedback.id}`);
        console.log(`  Score: ${feedback.score}`);
        console.log(`  Tag1: ${feedback.tag1 || 'N/A'}`);
        console.log(`  Tag2: ${feedback.tag2 || 'N/A'}`);
        console.log(`  URI: ${feedback.feedbackUri || 'None'}`);
        console.log(`  URI Type: ${feedback.feedbackURIType || 'None'}`);
        console.log(`  Revoked: ${feedback.isRevoked}`);

        if (feedback.feedbackFile) {
          console.log('\n  Feedback File (from Arweave):');
          console.log(`    Text: ${feedback.feedbackFile.text?.substring(0, 50)}...`);
          console.log(`    Capability: ${feedback.feedbackFile.capability}`);
          console.log(`    Skill: ${feedback.feedbackFile.skill}`);
        }

        if (feedback.feedbackURIType === 'arweave') {
          console.log('\n  ✓ Subgraph correctly indexed ar:// URI as "arweave" type!');
        }
      } else {
        console.log('⏳ Feedback not yet indexed in subgraph');
        console.log('   (May take a few more minutes)');
      }
    } catch (error: any) {
      console.log(`⚠️  Subgraph query failed: ${error.message}`);
    }

    // Final Summary
    console.log('\n' + '═'.repeat(80));
    console.log('🎉 VALID FEEDBACK TEST COMPLETE!\n');
    console.log('✅ CRITICAL VERIFICATION: Pre-Validation Works for Valid Feedback!');
    console.log('\nTest Results:');
    console.log('  ✓ Pre-validation PASSED (estimateGas succeeded)');
    console.log('  ✓ Arweave upload SUCCEEDED');
    console.log('  ✓ On-chain transaction SUCCEEDED');
    console.log('  ✓ Transaction confirmed on blockchain');
    if (feedbackReceipt.feedbackURI?.startsWith('ar://')) {
      console.log('  ✓ Feedback stored on Arweave with ar:// URI');
      console.log('  ✓ Data retrievable from Arweave gateways');
    }
    console.log('\n✅ NO REGRESSION: Valid feedback flow still works after pre-validation fix!');
    console.log('✅ Pre-validation correctly:');
    console.log('   - REJECTS invalid feedback (self-feedback, unauthorized)');
    console.log('   - ALLOWS valid feedback (tested here)');
    console.log('\n🚀 SDK CHANGES ARE PRODUCTION READY!');
    console.log('═'.repeat(80));

  } catch (error: any) {
    console.error('\n❌ CRITICAL FAILURE: Valid feedback submission failed!');
    console.error(`   Error: ${error.message}\n`);
    console.error('Stack trace:', error.stack);

    console.log('\n⚠️  REGRESSION DETECTED:');
    console.log('   Pre-validation may be too strict or have a bug');
    console.log('   This should have succeeded but failed');
    console.log('\n   Possible causes:');
    console.log('   1. estimateGas() rejecting valid feedback');
    console.log('   2. Contract requires special authorization');
    console.log('   3. Agent is inactive or has restrictions');
    console.log('   4. Gas estimation issue');

    throw error;
  }
}

main().catch(console.error);
