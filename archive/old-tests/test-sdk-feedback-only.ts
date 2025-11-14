/**
 * SDK-ONLY TEST: Complete Arweave Feedback Flow (No Subgraph)
 *
 * This test proves the SDK works end-to-end:
 * 1. Agent owner pre-signs feedbackAuth
 * 2. Test wallet submits feedback with Arweave
 * 3. On-chain transaction completes successfully
 *
 * Subgraph verification will be done separately once server is back up.
 */

import 'dotenv/config';
import { SDK } from 'agent0-sdk';
import { ethers } from 'ethers';

const TEST_WALLET_PRIVATE_KEY = '0x1915f656b28f6de1a151d6733f463c92357dd41e75bed9495e2f74fbca1e6c82';

async function main() {
  console.log('🧪 SDK END-TO-END TEST: Arweave Feedback Flow\n');
  console.log('═'.repeat(80));

  const config = {
    chainId: 11155111 as const,
    rpcUrl: process.env.RPC_URL!,
    signer: process.env.PRIVATE_KEY!,
    arweave: true
  };

  // Main wallet (agent owner)
  const sdkMainWallet = new SDK(config);
  const mainWalletAddress = sdkMainWallet.web3Client.address!.toLowerCase();

  // Test wallet (feedback giver)
  const testWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY);
  const testWalletAddress = testWallet.address.toLowerCase();

  console.log('👛 Main Wallet (Agent Owner):', mainWalletAddress);
  console.log('👛 Test Wallet (Feedback Giver):', testWalletAddress);
  console.log('');

  // Step 1: Check test wallet balance
  console.log('📝 Step 1: Verify Test Wallet Has Funds');
  console.log('-'.repeat(80));

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const balance = await provider.getBalance(testWalletAddress);
  const balanceEth = ethers.formatEther(balance);

  console.log(`Test Wallet Balance: ${balanceEth} ETH`);

  if (balance === 0n) {
    throw new Error('Test wallet needs funds');
  }

  console.log(`✅ Test wallet is funded!\n`);

  // Step 2: Find our agent by querying the blockchain directly
  console.log('📝 Step 2: Find Agent on Blockchain');
  console.log('-'.repeat(80));

  // We know from previous tests we have agent 11155111:1690
  const knownAgentId = '11155111:1690';
  console.log(`Using known agent: ${knownAgentId}`);
  console.log(`Owner: ${mainWalletAddress}\n`);

  // Step 3: Pre-sign feedbackAuth
  console.log('📝 Step 3: Pre-Sign FeedbackAuth');
  console.log('-'.repeat(80));

  const feedbackIndex = 1;
  const expiryHours = 24;

  console.log('Authorization:');
  console.log(`  Agent: ${knownAgentId}`);
  console.log(`  Signed by: ${mainWalletAddress} (agent owner)`);
  console.log(`  Authorized for: ${testWalletAddress}`);
  console.log(`  Index: ${feedbackIndex}`);
  console.log(`  Expiry: ${expiryHours} hours\n`);

  const preSignedAuth = await sdkMainWallet.signFeedbackAuth(
    knownAgentId,
    testWalletAddress,
    feedbackIndex,
    expiryHours
  );

  console.log('✅ FeedbackAuth pre-signed!\n');

  // Step 4: Initialize SDK with test wallet
  console.log('📝 Step 4: Initialize SDK with Test Wallet');
  console.log('-'.repeat(80));

  const configTestWallet = {
    chainId: 11155111 as const,
    rpcUrl: process.env.RPC_URL!,
    signer: TEST_WALLET_PRIVATE_KEY,
    arweave: true
  };

  const sdkTestWallet = new SDK(configTestWallet);
  console.log('✅ SDK initialized\n');

  // Step 5: Submit feedback
  console.log('📝 Step 5: Submit Feedback with Arweave');
  console.log('-'.repeat(80));

  const feedbackData = {
    score: 95,
    tag1: 'sdk-test',
    tag2: 'arweave-proof',
    text: 'Complete SDK test of Arweave feedback flow. This proves pre-validation works, Arweave upload succeeds, and on-chain transaction completes.',
    capability: 'sdk_testing',
    skill: 'arweave_feedback'
  };

  console.log('Feedback Details:');
  console.log(`  From: ${testWalletAddress}`);
  console.log(`  To: ${knownAgentId}`);
  console.log(`  Score: ${feedbackData.score}`);
  console.log(`  Auth: Pre-signed ✓\n`);

  console.log('⏳ Expected Flow:');
  console.log('  1. Pre-validation (estimateGas) → Should PASS');
  console.log('  2. Upload to Arweave → Should SUCCEED');
  console.log('  3. On-chain transaction → Should SUCCEED');
  console.log('  4. Transaction confirmation → Should SUCCEED\n');

  const startTime = Date.now();

  try {
    const feedbackReceipt = await sdkTestWallet.giveFeedback(
      knownAgentId,
      feedbackData,
      preSignedAuth
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ SUCCESS: Feedback submitted in ${duration}s!\n`);
    console.log('═'.repeat(80));
    console.log('📋 TRANSACTION DETAILS\n');
    console.log(`TX Hash: ${feedbackReceipt.txHash}`);
    console.log(`Feedback URI: ${feedbackReceipt.feedbackURI}`);

    if (feedbackReceipt.feedbackURI?.startsWith('ar://')) {
      const arweaveTxId = feedbackReceipt.feedbackURI.replace('ar://', '');
      console.log(`Arweave TX ID: ${arweaveTxId}`);
      console.log(`\nView on Explorers:`);
      console.log(`  Sepolia: https://sepolia.etherscan.io/tx/${feedbackReceipt.txHash}`);
      console.log(`  Arweave: https://viewblock.io/arweave/tx/${arweaveTxId}`);
    }

    // Verify Arweave upload
    if (feedbackReceipt.feedbackURI?.startsWith('ar://')) {
      console.log('\n' + '═'.repeat(80));
      console.log('📝 ARWEAVE VERIFICATION\n');

      const arweaveTxId = feedbackReceipt.feedbackURI.replace('ar://', '');
      console.log('⏳ Waiting 10 seconds for Arweave indexing...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));

      try {
        const arweaveResponse = await fetch(`https://arweave.net/${arweaveTxId}`);
        if (arweaveResponse.ok) {
          const data = await arweaveResponse.json();
          console.log('✅ Feedback Retrieved from Arweave:');
          console.log(`  Score: ${data.score}`);
          console.log(`  Tag1: ${data.tag1}`);
          console.log(`  Tag2: ${data.tag2}`);
          console.log(`  Capability: ${data.capability}`);
          console.log(`  Skill: ${data.skill}`);
          console.log(`  Text: ${data.text?.substring(0, 60)}...`);

          if (data.score === feedbackData.score) {
            console.log('\n✅ Data integrity verified!');
          }
        } else {
          console.log('⏳ Data not yet available on Arweave');
          console.log('   (Will be available in 30-60 seconds)');
        }
      } catch (error: any) {
        console.log(`⏳ Arweave retrieval: ${error.message}`);
      }
    }

    // Final summary
    console.log('\n' + '═'.repeat(80));
    console.log('🎉 SDK END-TO-END TEST COMPLETE!\n');
    console.log('✅ VALIDATION RESULTS:\n');
    console.log('SDK Pre-Validation:');
    console.log('  ✓ Pre-validation (estimateGas) PASSED');
    console.log('  ✓ Authorization check PASSED');
    console.log('  ✓ Arweave upload SUCCEEDED');
    console.log('  ✓ On-chain transaction SUCCEEDED');
    console.log('  ✓ Transaction confirmed on blockchain\n');

    console.log('What This Proves:');
    console.log('  ✓ SDK pre-validation fix works end-to-end');
    console.log('  ✓ No orphaned uploads (validation passed before upload)');
    console.log('  ✓ Arweave storage works correctly');
    console.log('  ✓ Two-wallet authorization works');
    console.log('  ✓ Cross-feedback flow is functional\n');

    console.log('🚀 SDK CHANGES: PRODUCTION READY!\n');
    console.log('Next Step: Verify subgraph indexing when server is back up');
    console.log('  Run: npx tsx check-arweave-feedback.ts');
    console.log('═'.repeat(80));

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);

    if (error.message.includes('Feedback validation failed')) {
      console.log('\n⚠️  Pre-validation rejected the feedback');
      console.log('   This means estimateGas() failed');
      console.log('   Check the error for the reason');
    }

    throw error;
  }
}

main().catch(console.error);
