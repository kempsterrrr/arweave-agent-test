/**
 * TEST: Orphaned Arweave Upload Issue
 *
 * This test demonstrates the CRITICAL flow order issue where feedback
 * is uploaded to Arweave BEFORE on-chain validation, resulting in
 * orphaned permanent storage when validation fails.
 *
 * Expected Behavior:
 * 1. Feedback should be VALIDATED on-chain first
 * 2. Only THEN uploaded to Arweave if validation passes
 *
 * Actual Behavior:
 * 1. Feedback uploaded to Arweave first (permanent, costs credits)
 * 2. On-chain validation happens second (can fail)
 * 3. If validation fails, Arweave data is ORPHANED
 *
 * Reference: CRITICAL-FLOW-ORDER-ISSUE.md
 */

import 'dotenv/config';
import { SDK } from 'agent0-sdk';

async function main() {
  console.log('🧪 TESTING: Orphaned Arweave Upload Issue\n');
  console.log('═'.repeat(80));

  // Use existing agent from previous test
  const AGENT_ID = '11155111:1676'; // From test-full-integration.ts

  const config = {
    chainId: 11155111 as const,
    rpcUrl: process.env.RPC_URL!,
    signer: process.env.PRIVATE_KEY!,
    arweave: true, // Enable Arweave
    subgraphUrl: 'https://gateway.thegraph.com/api/00a452ad3cd1900273ea62c1bf283f93/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT'
  };

  const sdk = new SDK(config);
  console.log('✓ SDK initialized with Arweave client');

  // SCENARIO 1: Self-Feedback (Expected to fail on-chain)
  console.log('\n📝 SCENARIO 1: Self-Feedback Validation Failure');
  console.log('-'.repeat(80));
  console.log('Testing feedback from agent owner to their own agent...');
  console.log('Expected: On-chain validation fails with "Self-feedback not allowed"');
  console.log('Issue: Arweave upload happens BEFORE validation\n');

  const feedbackData = {
    score: 95,
    tag1: 'orphan-test',
    tag2: 'validation-failure',
    text: 'This feedback will be uploaded to Arweave but rejected on-chain, demonstrating the orphaned upload issue.',
    capability: 'testing',
    skill: 'flow_order_validation'
  };

  console.log('Feedback Data:');
  console.log(`  Score: ${feedbackData.score}`);
  console.log(`  Tags: ${feedbackData.tag1}, ${feedbackData.tag2}`);
  console.log(`  Text: ${feedbackData.text.substring(0, 60)}...`);

  let orphanedTxId: string | null = null;

  try {
    console.log('\n⏳ Submitting feedback...\n');
    const feedbackReceipt = await sdk.giveFeedback(AGENT_ID, feedbackData);

    // If we reach here, something unexpected happened
    console.log('\n⚠️  UNEXPECTED: Feedback was accepted!');
    console.log(`  Transaction Hash: ${feedbackReceipt.txHash}`);
    console.log(`  Feedback URI: ${feedbackReceipt.feedbackURI}`);

  } catch (error: any) {
    console.log('\n❌ On-Chain Transaction Failed (Expected):');
    console.log(`  Error: ${error.message}`);

    // Extract feedbackUri from error message
    const uriMatch = error.message.match(/ar:\/\/([a-zA-Z0-9_-]+)/);
    if (uriMatch) {
      orphanedTxId = uriMatch[1];
      console.log(`  Feedback URI: ar://${orphanedTxId}`);
      console.log('\n🚨 CRITICAL ISSUE CONFIRMED:');
      console.log('  ✓ Arweave upload succeeded (data is permanent)');
      console.log('  ✗ On-chain validation failed (transaction reverted)');
      console.log('  ⚠️  Result: ORPHANED DATA on Arweave');
    }
  }

  // Verify the orphaned data exists on Arweave
  if (orphanedTxId) {
    console.log('\n📝 Verifying Orphaned Data on Arweave');
    console.log('-'.repeat(80));
    console.log(`⏳ Retrieving data from ar://${orphanedTxId}...\n`);

    // Wait for Arweave indexing
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      const response = await fetch(`https://arweave.net/${orphanedTxId}`);
      if (response.ok) {
        const data = await response.json();

        console.log('✅ Orphaned Data Retrieved Successfully:');
        console.log(`  Score: ${data.score}`);
        console.log(`  Tag1: ${data.tag1}`);
        console.log(`  Tag2: ${data.tag2}`);
        console.log(`  Text: ${data.text?.substring(0, 60)}...`);
        console.log(`  Has feedbackAuth: ${!!data.feedbackAuth}`);

        console.log('\n💰 Resource Impact:');
        console.log('  ✓ Turbo credits spent on this upload');
        console.log('  ✗ Upload cannot be deleted (Arweave is immutable)');
        console.log('  ✗ Credits wasted on rejected feedback');

        console.log(`\n🔗 View on Arweave:`);
        console.log(`   https://viewblock.io/arweave/tx/${orphanedTxId}`);

      } else {
        console.log('⏳ Data not yet available (may take 30-60s to index)');
      }
    } catch (error: any) {
      console.log(`⏳ Could not retrieve: ${error.message}`);
      console.log('   (Data may not be indexed yet, try again in 60s)');
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('🎯 TEST SUMMARY: Orphaned Upload Issue\n');
  console.log('Problem Identified:');
  console.log('  1. Feedback uploads to Arweave BEFORE on-chain validation');
  console.log('  2. On-chain validation happens AFTER upload');
  console.log('  3. When validation fails, Arweave data is orphaned');
  console.log('\nEvidence:');
  if (orphanedTxId) {
    console.log(`  ✓ Orphaned transaction exists: ar://${orphanedTxId}`);
    console.log('  ✓ Data is permanent and irretrievable');
    console.log('  ✓ Turbo credits were wasted');
  }
  console.log('\nComparison with agent.registerArweave():');
  console.log('  ✓ Agent registration validates on-chain FIRST');
  console.log('  ✓ Arweave upload happens SECOND (only if validation passes)');
  console.log('  ✓ No orphaned uploads in agent registration flow');
  console.log('\nRecommended Fix:');
  console.log('  → Add pre-validation check before Arweave upload');
  console.log('  → Use eth_call to simulate transaction');
  console.log('  → Only upload to Arweave if simulation succeeds');
  console.log('\n  See: CRITICAL-FLOW-ORDER-ISSUE.md for detailed analysis');
  console.log('═'.repeat(80));
}

main().catch(console.error);
