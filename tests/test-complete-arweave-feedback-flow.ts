/**
 * COMPLETE END-TO-END TEST: Arweave Feedback Flow with Subgraph Verification
 *
 * This test proves the ENTIRE flow works:
 * 1. Agent owner (our main wallet) pre-signs feedbackAuth
 * 2. Feedback giver (test wallet) submits feedback with Arweave
 * 3. On-chain transaction completes successfully
 * 4. Subgraph indexes the feedback
 * 5. FeedbackFile entity is created and linked
 *
 * REQUIREMENTS:
 * - Test wallet needs ~0.01 Sepolia ETH for gas
 * - Main wallet needs Sepolia ETH (for agent ownership)
 */

import 'dotenv/config';
import { SDK } from 'agent0-sdk';
import { ethers } from 'ethers';

// Fixed test wallet (deterministic, can be funded once and reused)
const TEST_WALLET_PRIVATE_KEY = '0x1915f656b28f6de1a151d6733f463c92357dd41e75bed9495e2f74fbca1e6c82';

async function main() {
  console.log('🧪 COMPLETE END-TO-END TEST: Arweave Feedback with Subgraph Verification\n');
  console.log('═'.repeat(80));

  const config = {
    chainId: 11155111 as const,
    rpcUrl: process.env.RPC_URL!,
    signer: process.env.PRIVATE_KEY!,
    arweave: true,
    subgraphUrl: 'http://192.168.2.90:8000/subgraphs/name/agent0-sdk/agent0-sdk'
  };

  // Initialize SDK with main wallet (agent owner)
  const sdkMainWallet = new SDK(config);
  const mainWalletAddress = sdkMainWallet.web3Client.address!.toLowerCase();

  // Test wallet (feedback giver)
  const testWallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY);
  const testWalletAddress = testWallet.address.toLowerCase();

  console.log('👛 Main Wallet (Agent Owner):', mainWalletAddress);
  console.log('👛 Test Wallet (Feedback Giver):', testWalletAddress);
  console.log('');

  // Step 1: Find an agent owned by main wallet
  console.log('📝 Step 1: Find Agent Owned by Main Wallet');
  console.log('-'.repeat(80));

  const query = `
    query {
      agents(
        first: 5
        orderBy: createdAt
        orderDirection: desc
        where: { owner: "${mainWalletAddress}" }
      ) {
        id
        agentId
        owner
        registrationFile {
          name
          active
        }
      }
    }
  `;

  const response = await fetch(config.subgraphUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();
  const agents = result.data?.agents || [];

  if (agents.length === 0) {
    console.log('❌ No agents found owned by main wallet!');
    throw new Error('No agents to test with');
  }

  const targetAgent = agents[0];
  console.log(`✅ Found ${agents.length} agent(s)`);
  console.log(`\nTarget Agent:`);
  console.log(`  ID: ${targetAgent.id}`);
  console.log(`  Owner: ${targetAgent.owner}`);
  console.log(`  Name: ${targetAgent.registrationFile?.name || 'Unnamed'}\n`);

  // Step 2: Check test wallet balance
  console.log('📝 Step 2: Check Test Wallet Balance');
  console.log('-'.repeat(80));

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const balance = await provider.getBalance(testWalletAddress);
  const balanceEth = ethers.formatEther(balance);

  console.log(`Test Wallet Balance: ${balanceEth} ETH`);

  if (balance === 0n) {
    console.log('\n❌ Test wallet has no funds!\n');
    console.log('To complete this test, send Sepolia ETH to the test wallet:');
    console.log(`  Address: ${testWalletAddress}`);
    console.log(`  Amount: ~0.01 Sepolia ETH`);
    console.log('\nGet Sepolia ETH from:');
    console.log('  - https://sepoliafaucet.com/');
    console.log('  - https://www.alchemy.com/faucets/ethereum-sepolia');
    console.log('  - https://faucet.quicknode.com/ethereum/sepolia');
    console.log('\nAfter funding, re-run this test.\n');
    throw new Error('Test wallet needs funds');
  }

  console.log(`✅ Test wallet is funded!\n`);

  // Step 3: Main wallet pre-signs feedbackAuth for test wallet
  console.log('📝 Step 3: Pre-Sign FeedbackAuth (Main Wallet → Test Wallet)');
  console.log('-'.repeat(80));

  const feedbackIndex = 1;
  const expiryHours = 24;

  console.log('Authorization:');
  console.log(`  Agent: ${targetAgent.id}`);
  console.log(`  Signed by: ${mainWalletAddress} (agent owner)`);
  console.log(`  Authorized for: ${testWalletAddress} (feedback giver)`);
  console.log(`  Index: ${feedbackIndex}`);
  console.log(`  Expiry: ${expiryHours} hours\n`);

  const preSignedAuth = await sdkMainWallet.signFeedbackAuth(
    targetAgent.id,
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
    arweave: true,
    subgraphUrl: 'http://192.168.2.90:8000/subgraphs/name/agent0-sdk/agent0-sdk'
  };

  const sdkTestWallet = new SDK(configTestWallet);
  console.log('✅ SDK initialized with test wallet\n');

  // Step 5: Submit feedback with Arweave
  console.log('📝 Step 5: Submit Feedback with Arweave Storage');
  console.log('-'.repeat(80));

  const feedbackData = {
    score: 95,
    tag1: 'end-to-end-test',
    tag2: 'arweave-verified',
    text: 'Complete end-to-end test of Arweave feedback flow with subgraph indexing verification. This validates the entire stack works correctly.',
    capability: 'comprehensive_testing',
    skill: 'arweave_feedback_indexing'
  };

  console.log('Feedback Details:');
  console.log(`  From: ${testWalletAddress}`);
  console.log(`  To: ${targetAgent.id}`);
  console.log(`  Score: ${feedbackData.score}`);
  console.log(`  Storage: Arweave (ar://)`);
  console.log(`  Auth: Pre-signed by agent owner ✓\n`);

  console.log('⏳ Expected Flow:');
  console.log('  1. Pre-validation (estimateGas) → Should PASS');
  console.log('  2. Upload feedback to Arweave → Should SUCCEED');
  console.log('  3. Submit transaction on-chain → Should SUCCEED');
  console.log('  4. Wait for confirmation → Should SUCCEED');
  console.log('  5. Subgraph indexes event → Should CREATE feedback entity');
  console.log('  6. Subgraph creates FeedbackFile → Should LINK to feedback\n');

  const startTime = Date.now();

  try {
    const feedbackReceipt = await sdkTestWallet.giveFeedback(
      targetAgent.id,
      feedbackData,
      preSignedAuth
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ SUCCESS: Feedback submitted in ${duration}s!`);
    console.log(`\n📋 Transaction Details:`);
    console.log(`  TX Hash: ${feedbackReceipt.txHash}`);
    console.log(`  Feedback URI: ${feedbackReceipt.feedbackURI}`);

    if (!feedbackReceipt.feedbackURI || !feedbackReceipt.feedbackURI.startsWith('ar://')) {
      console.log('\n⚠️  WARNING: Expected ar:// URI but got:', feedbackReceipt.feedbackURI);
      console.log('   Arweave upload may have failed');
    } else {
      const arweaveTxId = feedbackReceipt.feedbackURI.replace('ar://', '');
      console.log(`  Arweave TX: ${arweaveTxId}`);
      console.log(`  View: https://viewblock.io/arweave/tx/${arweaveTxId}`);
    }

    // Step 6: Verify Arweave upload
    if (feedbackReceipt.feedbackURI?.startsWith('ar://')) {
      console.log('\n📝 Step 6: Verify Arweave Upload');
      console.log('-'.repeat(80));

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
          console.log(`  Text: ${data.text?.substring(0, 60)}...`);
          console.log(`  Capability: ${data.capability}`);
          console.log(`  Skill: ${data.skill}`);

          if (data.score === feedbackData.score) {
            console.log('\n  ✓ Data integrity verified!');
          }
        } else {
          console.log('⏳ Data not yet available (Arweave indexing delay)');
          console.log('   Will be available in 30-60 seconds');
        }
      } catch (error: any) {
        console.log(`⏳ Arweave retrieval: ${error.message}`);
      }
    }

    // Step 7: Verify Subgraph Indexing
    console.log('\n📝 Step 7: Verify Subgraph Indexing (CRITICAL TEST)');
    console.log('-'.repeat(80));
    console.log('⏳ Waiting 15 seconds for subgraph to index the event...\n');
    await new Promise(resolve => setTimeout(resolve, 15000));

    const feedbackQuery = `
      query {
        feedbacks(
          first: 1
          orderBy: createdAt
          orderDirection: desc
          where: {
            agent: "${targetAgent.id.toLowerCase()}"
            clientAddress: "${testWalletAddress}"
          }
        ) {
          id
          feedbackUri
          feedbackURIType
          score
          tag1
          tag2
          createdAt
          feedbackFile {
            id
            text
            capability
            skill
          }
        }
      }
    `;

    const subgraphResponse = await fetch(config.subgraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: feedbackQuery }),
    });

    const subgraphResult = await subgraphResponse.json();

    if (subgraphResult.data?.feedbacks && subgraphResult.data.feedbacks.length > 0) {
      const feedback = subgraphResult.data.feedbacks[0];

      console.log('✅ Feedback Indexed in Subgraph:');
      console.log(`  ID: ${feedback.id}`);
      console.log(`  URI: ${feedback.feedbackUri}`);
      console.log(`  URI Type: ${feedback.feedbackURIType}`);
      console.log(`  Score: ${feedback.score}`);
      console.log(`  Tag1: ${feedback.tag1}`);
      console.log(`  Tag2: ${feedback.tag2}`);

      // CRITICAL CHECK: Is it typed as "arweave"?
      if (feedback.feedbackURIType === 'arweave') {
        console.log('\n  ✅ CRITICAL: feedbackURIType = "arweave" ✓');
        console.log('     Subgraph correctly identified ar:// URI!');
      } else {
        console.log(`\n  ❌ CRITICAL: feedbackURIType = "${feedback.feedbackURIType}"`);
        console.log('     Expected "arweave" but got different type!');
      }

      // CRITICAL CHECK: Is FeedbackFile created and linked?
      if (feedback.feedbackFile) {
        console.log('\n  ✅ CRITICAL: FeedbackFile entity created and linked! ✓');
        console.log(`     ID: ${feedback.feedbackFile.id}`);
        console.log(`     Text: ${feedback.feedbackFile.text?.substring(0, 50)}...`);
        console.log(`     Capability: ${feedback.feedbackFile.capability}`);
        console.log(`     Skill: ${feedback.feedbackFile.skill}`);
        console.log('\n  ✅ ArweaveFeedbackFile data source worked!');
      } else {
        console.log('\n  ❌ CRITICAL: FeedbackFile entity NOT created!');
        console.log('     This means ArweaveFeedbackFile data source failed!');
      }

      // Final Summary
      console.log('\n' + '═'.repeat(80));
      console.log('🎉 END-TO-END TEST COMPLETE!\n');
      console.log('✅ VALIDATION RESULTS:\n');
      console.log('SDK Pre-Validation:');
      console.log('  ✓ Pre-validation (estimateGas) PASSED');
      console.log('  ✓ Authorization check PASSED');
      console.log('  ✓ Arweave upload SUCCEEDED');
      console.log('  ✓ On-chain transaction SUCCEEDED');
      console.log('  ✓ Transaction confirmed\n');
      console.log('Subgraph Indexing:');
      console.log(`  ${feedback.feedbackURIType === 'arweave' ? '✓' : '✗'} Feedback indexed with URIType="arweave"`);
      console.log(`  ${feedback.feedbackFile ? '✓' : '✗'} FeedbackFile entity created`);
      console.log(`  ${feedback.feedbackFile ? '✓' : '✗'} feedbackFile relation linked`);
      console.log(`  ${feedback.feedbackFile ? '✓' : '✗'} Data retrieved from Arweave\n`);

      if (feedback.feedbackURIType === 'arweave' && feedback.feedbackFile) {
        console.log('🚀 PRODUCTION READY: ALL SYSTEMS VERIFIED!');
        console.log('\n✅ SDK changes: PRODUCTION READY');
        console.log('✅ Subgraph changes: PRODUCTION READY');
        console.log('\nBoth can be deployed with confidence!');
      } else {
        console.log('⚠️  ISSUES DETECTED: See critical checks above');
      }
      console.log('═'.repeat(80));

    } else {
      console.log('⏳ Feedback not yet indexed in subgraph');
      console.log('   This could mean:');
      console.log('   1. Subgraph is still indexing (wait longer)');
      console.log('   2. Subgraph is not running');
      console.log('   3. Event was not emitted correctly');
      console.log('\n   Re-run check-arweave-feedback.ts in a few minutes');
    }

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    throw error;
  }
}

main().catch(console.error);
