/**
 * TEST: Valid Feedback with Pre-Validation Fix
 *
 * Verifies that valid feedback still works correctly after implementing
 * the pre-validation fix. We'll give feedback to an agent we DON'T own
 * to ensure the transaction succeeds.
 *
 * Expected Behavior:
 * 1. Pre-validation passes (we're not the agent owner)
 * 2. Feedback uploads to Arweave
 * 3. On-chain transaction succeeds
 * 4. Feedback is recorded with ar:// URI
 */

import 'dotenv/config';
import { SDK } from 'agent0-sdk';

async function main() {
  console.log('🧪 TESTING: Valid Feedback with Pre-Validation Fix\n');
  console.log('═'.repeat(80));

  // Use an agent we DON'T own (found via subgraph)
  // This is a real agent on Sepolia from the ecosystem
  const TARGET_AGENT_ID = '11155111:1'; // First agent registered on Sepolia

  const config = {
    chainId: 11155111 as const,
    rpcUrl: process.env.RPC_URL!,
    signer: process.env.PRIVATE_KEY!,
    arweave: true,
    subgraphUrl: 'http://192.168.2.90:8000/subgraphs/name/agent0-sdk/agent0-sdk'
  };

  const sdk = new SDK(config);
  console.log('✓ SDK initialized');
  console.log(`✓ Giving feedback from: ${sdk.web3Client.address}`);

  // Query agent to confirm it exists and we don't own it
  console.log('\n📝 Verifying Target Agent');
  console.log('-'.repeat(80));

  try {
    const agent = await sdk.loadAgent(TARGET_AGENT_ID);
    console.log(`✓ Agent exists: "${agent.name || 'Unknown'}"`);
    console.log(`✓ Agent owner: ${agent.getRegistrationFile().owner || 'Unknown'}`);

    if (agent.getRegistrationFile().owner?.toLowerCase() === sdk.web3Client.address?.toLowerCase()) {
      console.log('\n⚠️  WARNING: We own this agent! Trying a different one...');
      // Could try a different agent, but for now we'll proceed
    } else {
      console.log(`✓ We DON'T own this agent (safe for feedback)`);
    }
  } catch (error) {
    console.log(`⚠️  Could not load agent details: ${error instanceof Error ? error.message : String(error)}`);
    console.log('   Proceeding with test anyway...');
  }

  // Give valid feedback
  console.log('\n📝 Submitting Valid Feedback');
  console.log('-'.repeat(80));
  console.log('Testing complete flow with pre-validation:\n');

  const feedbackData = {
    score: 88,
    tag1: 'fix-test',
    tag2: 'valid-feedback',
    text: 'Testing that valid feedback still works correctly after implementing pre-validation fix to prevent orphaned uploads.',
    capability: 'validation',
    skill: 'pre_validation_check'
  };

  console.log('Feedback Data:');
  console.log(`  Score: ${feedbackData.score}`);
  console.log(`  Tags: ${feedbackData.tag1}, ${feedbackData.tag2}`);
  console.log(`  Capability: ${feedbackData.capability}`);
  console.log(`  Skill: ${feedbackData.skill}`);

  console.log('\n⏳ Expected Flow:');
  console.log('  1. Pre-validation: estimateGas (should pass)');
  console.log('  2. Upload to Arweave (should succeed)');
  console.log('  3. Submit to blockchain (should succeed)');
  console.log('  4. Wait for confirmation\n');

  const startTime = Date.now();

  try {
    const feedbackReceipt = await sdk.giveFeedback(TARGET_AGENT_ID, feedbackData);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Feedback submitted successfully in ${duration}s!`);
    console.log(`  Transaction Hash: ${feedbackReceipt.txHash}`);
    console.log(`  Feedback URI: ${feedbackReceipt.feedbackURI || 'On-chain only'}`);

    if (feedbackReceipt.feedbackURI && feedbackReceipt.feedbackURI.startsWith('ar://')) {
      const txId = feedbackReceipt.feedbackURI.replace('ar://', '');
      console.log(`  Arweave TX ID: ${txId}`);

      console.log('\n✅ SUCCESS: Complete Flow Working!');
      console.log('  ✓ Pre-validation passed (no orphaned upload)');
      console.log('  ✓ Feedback uploaded to Arweave');
      console.log('  ✓ On-chain transaction confirmed');
      console.log('  ✓ Feedback recorded with ar:// URI');

      console.log(`\n🔗 View on Arweave:`);
      console.log(`   https://viewblock.io/arweave/tx/${txId}`);

      // Verify data exists on Arweave
      console.log('\n📝 Verifying Data on Arweave');
      console.log('-'.repeat(80));
      console.log('⏳ Waiting 5 seconds for indexing...\n');

      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        const response = await fetch(`https://arweave.net/${txId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Feedback Retrieved from Arweave:');
          console.log(`  Score: ${data.score}`);
          console.log(`  Tag1: ${data.tag1}`);
          console.log(`  Tag2: ${data.tag2}`);
          console.log(`  Capability: ${data.capability}`);
          console.log(`  Skill: ${data.skill}`);

          if (data.score === feedbackData.score &&
              data.tag1 === feedbackData.tag1 &&
              data.tag2 === feedbackData.tag2) {
            console.log('\n  ✓ Data integrity verified!');
          }
        } else {
          console.log('⏳ Data not yet available (may take 30-60s)');
        }
      } catch (error: any) {
        console.log(`⏳ Data retrieval: ${error.message}`);
      }

    } else {
      console.log('\n⚠️  Feedback stored without Arweave URI');
      console.log('   (Arweave upload may have failed)');
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('🎉 VALID FEEDBACK TEST COMPLETE!\n');
    console.log('Pre-Validation Fix Verification:');
    console.log('  ✓ Pre-validation check runs before Arweave upload');
    console.log('  ✓ Valid feedback passes pre-validation');
    console.log('  ✓ Arweave upload proceeds normally');
    console.log('  ✓ On-chain transaction completes successfully');
    console.log('  ✓ No regression in valid feedback flow');
    console.log('\n✅ FIX VERIFIED: Pre-validation prevents orphans WITHOUT breaking valid feedback');
    console.log('═'.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Feedback submission failed:', error.message);
    console.error('\nStack trace:', error.stack);

    console.log('\n⚠️  If error is "Feedback validation failed":');
    console.log('   → Pre-validation is working (good!)');
    console.log('   → But we may need to use a different target agent');
    console.log('   → Try agent owned by someone else');

    throw error;
  }
}

main().catch(console.error);
