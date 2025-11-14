/**
 * Check for existing feedback on Sepolia to understand how the protocol works
 */

import 'dotenv/config';

async function main() {
  console.log('🔍 Checking for Existing Feedback on Sepolia\n');
  console.log('═'.repeat(80));

  const SUBGRAPH_URL = 'http://192.168.2.90:8000/subgraphs/name/agent0-sdk/agent0-sdk';

  const query = `
    query {
      feedbacks(
        first: 20
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        agent {
          id
          agentId
          owner
          registrationFile {
            name
          }
        }
        clientAddress
        score
        tag1
        tag2
        feedbackUri
        feedbackURIType
        isRevoked
        createdAt
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.data?.feedbacks && result.data.feedbacks.length > 0) {
      console.log(`✅ Found ${result.data.feedbacks.length} feedback records on Sepolia:\n`);

      const feedbackList = result.data.feedbacks;

      // Analyze patterns
      const selfFeedbackCount = feedbackList.filter((f: any) =>
        f.agent.owner.toLowerCase() === f.clientAddress.toLowerCase()
      ).length;

      const crossFeedbackCount = feedbackList.length - selfFeedbackCount;

      console.log('📊 Feedback Statistics:');
      console.log(`   Total: ${feedbackList.length}`);
      console.log(`   Cross-feedback (from others): ${crossFeedbackCount}`);
      console.log(`   Self-feedback (from owner): ${selfFeedbackCount}`);
      console.log('');

      if (crossFeedbackCount > 0) {
        console.log('✅ CRITICAL: Found cross-feedback examples!');
        console.log('   This proves the protocol DOES allow feedback from others\n');
      }

      console.log('📝 Recent Feedback Records:\n');

      feedbackList.forEach((feedback: any, index: number) => {
        const isSelfFeedback = feedback.agent.owner.toLowerCase() === feedback.clientAddress.toLowerCase();

        console.log(`${index + 1}. Feedback ID: ${feedback.id}`);
        console.log(`   Agent: ${feedback.agent.agentId} (${feedback.agent.registrationFile?.name || 'Unnamed'})`);
        console.log(`   Agent Owner: ${feedback.agent.owner}`);
        console.log(`   Feedback From: ${feedback.clientAddress}`);
        console.log(`   Score: ${feedback.score}`);
        console.log(`   Tags: ${feedback.tag1 || 'none'}, ${feedback.tag2 || 'none'}`);
        console.log(`   URI Type: ${feedback.feedbackURIType || 'none'}`);
        console.log(`   Self-feedback: ${isSelfFeedback ? 'YES ⚠️' : 'NO ✓'}`);
        console.log('');
      });

      // Find our wallet's feedback
      const ourWallet = process.env.PRIVATE_KEY ?
        '0x...' : // Will be calculated by SDK
        'unknown';

      console.log('═'.repeat(80));
      console.log('🎯 Key Insights:\n');

      if (selfFeedbackCount > 0) {
        console.log('⚠️  WARNING: Found self-feedback records!');
        console.log('   This contradicts our "Self-feedback not allowed" error');
        console.log('   Possible explanations:');
        console.log('   1. Contract was upgraded to prevent self-feedback');
        console.log('   2. Old feedback from before the rule was added');
        console.log('   3. Different validation rules for different scenarios\n');
      }

      if (crossFeedbackCount > 0) {
        console.log('✅ Cross-feedback EXISTS on Sepolia');
        console.log('   This means the authorization model DOES work');
        console.log('   We need to understand HOW it was authorized\n');

        // Show an example of cross-feedback
        const crossExample = feedbackList.find((f: any) =>
          f.agent.owner.toLowerCase() !== f.clientAddress.toLowerCase()
        );

        if (crossExample) {
          console.log('📋 Example Cross-Feedback:');
          console.log(`   Agent Owner: ${crossExample.agent.owner}`);
          console.log(`   Feedback From: ${crossExample.clientAddress}`);
          console.log('   ✓ This worked - how did they get authorization?');
        }
      }

    } else {
      console.log('❌ No feedback records found on Sepolia\n');
      console.log('This suggests:');
      console.log('  1. Feedback functionality is rarely used, OR');
      console.log('  2. Authorization is blocking most feedback attempts, OR');
      console.log('  3. The subgraph is not indexing feedback events\n');

      console.log('Next steps:');
      console.log('  - Check blockchain directly for FeedbackGiven events');
      console.log('  - Look at ERC-8004 reference implementation');
      console.log('  - Contact protocol maintainers for guidance');
    }

  } catch (error: any) {
    console.error('❌ Query failed:', error.message);
  }
}

main().catch(console.error);
