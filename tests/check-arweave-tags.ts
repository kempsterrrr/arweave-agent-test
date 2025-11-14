/**
 * Check what tags are present on our Arweave upload
 */

async function main() {
  const txId = 'r9Zumbxb-WL1aIIw03Y8ZpgpflB1CR15MY7_3Nno6l0';

  console.log('🔍 Checking Arweave Transaction Tags\n');
  console.log(`Transaction ID: ${txId}\n`);

  const query = `
    query {
      transaction(id: "${txId}") {
        id
        tags {
          name
          value
        }
      }
    }
  `;

  try {
    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.data?.transaction?.tags) {
      const tags = result.data.transaction.tags;
      console.log(`✅ Found ${tags.length} tags:\n`);

      tags.forEach((tag: any) => {
        console.log(`  ${tag.name}: ${tag.value}`);
      });

      // Check for Content-Type specifically
      const contentType = tags.find((t: any) => t.name === 'Content-Type');
      if (contentType) {
        console.log(`\n✅ Content-Type IS SET: ${contentType.value}`);
      } else {
        console.log('\n❌ Content-Type NOT FOUND in tags!');
        console.log('   This means tags were not properly uploaded.');
      }

    } else {
      console.log('❌ Transaction not found or has no tags');
      console.log('   Transaction may still be propagating...');
    }

  } catch (error: any) {
    console.error('❌ Query failed:', error.message);
  }
}

main().catch(console.error);
