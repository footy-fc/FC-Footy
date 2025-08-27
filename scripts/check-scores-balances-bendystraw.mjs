#!/usr/bin/env node

import fetch from 'node-fetch';

const BENDYSTRAW_API_KEY = "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";

// List of contributors from pay events
const contributors = [
    "0xdf087b724174a3e4ed2338c0798193932e851f1b",
    "0x7c527d956f47920fec38dfc5834fe31b5a72db12",
    "0xa32ad653ddb29aafaf67ca906f7bcee145444746",
    "0xe423b19262ea8fbc68ab9509f90080ab6aa1930b",
    "0x34520adcaccb7d698a038831ec00bdd8bcd3942f",
    "0xa502a06c1f3c2605eb16bec110ce14404a031810",
    "0xbe95bb47789e5f4af467306c97ded0877bf817b5",
    "0xa499ccf474840fbeab6eb58a23b487fe99de6d9e",
    "0xf41b246040ffde54554a64081cae788822caa5d0",
    "0x172a77d409c0aa422ee88514181765372c1eb8f1",
    "0x307f9cc8650862e0815adf833b9125f4e0ed4055",
    "0x3944cc1a70c4be8ad75f456ba0ab525b02ad827a",
    "0x30e5a4e6a52b2d6b891454a0fd04938732c55193",
    "0x346da3233271e9a80981278443324be5dfc55955",
    "0x00d6d1bda9ca0cd4a04ee1fb3563a3525f1dff23",
    "0x868d077d5ae521e972d0494486807363e9d65604",
    "0x59733c7cd78d08dab90368ad2cc09c8c81f097c0",
    "0xc9ed679962e0d4e82d6ebc12ee3f0561f44f23c6",
    "0x9eb59cd29db306f09a7c8dfe22e0b7574c6d4fb3",
    "0xaa23bb616192b9f596945a088ed4febfb2d71efe",
    "0x6d55b0cd0f28f0066fee721037c466813980842c",
    "0x29652b15678190fdaa4f19e474d9a8b0cb281884",
    "0xd890974185f65cda87ed14add68b154c8950cadd",
    "0x7dddc4d43639eb2c2be85ac621328bf8b0482546",
    "0xfd0725b9fd15b983514b8b99fb70e2ae018c9a8d"
];

async function checkScoresBalancesBendystraw() {
  console.log("🔍 Checking SCORES token balances via Bendystraw\n");

  try {
    // Get project info first
    console.log("📋 Getting project info...");
    const projectQuery = `
      query GetProject {
        project(projectId: 53, chainId: 8453) {
          id
          projectId
          chainId
          name
          tokenSupply
          volume
          volumeUsd
          participants {
            items {
              address
              balance
            }
          }
        }
      }
    `;

    const projectResponse = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: projectQuery,
      }),
    });

    if (!projectResponse.ok) {
      throw new Error(`HTTP error! status: ${projectResponse.status}`);
    }

    const projectResult = await projectResponse.json();
    
    if (projectResult.errors) {
      console.error('❌ GraphQL errors:', JSON.stringify(projectResult.errors, null, 2));
      return;
    }

    const project = projectResult.data.project;
    console.log(`✅ Project: ${project.name}`);
    console.log(`📊 Token Supply: ${project.tokenSupply}`);
    console.log(`💰 Total Volume: ${project.volumeUsd} USD\n`);

    // Create a map of participant balances
    const participantBalances = {};
    project.participants.items.forEach(participant => {
      participantBalances[participant.address.toLowerCase()] = {
        address: participant.address,
        balance: participant.balance
      };
    });

    console.log(`📋 Found ${project.participants.items.length} participants with balances\n`);

    // Check balances for our contributors
    const balances = [];

    for (const address of contributors) {
      const addressLower = address.toLowerCase();
      const participant = participantBalances[addressLower];
      
      if (participant) {
        // Convert wei to ETH for display
        const balanceEth = parseFloat(participant.balance) / Math.pow(10, 18);
        const totalPaidEth = parseFloat(participant.totalPaid) / Math.pow(10, 18);
        
        balances.push({
          address,
          balance: balanceEth.toString(),
          found: true
        });
        
        console.log(`✅ ${address}: ${balanceEth} SCORES`);
      } else {
        balances.push({
          address,
          balance: "0",
          balanceUSD: "0",
          totalPaid: "0",
          totalPaidUSD: "0",
          found: false
        });
        
        console.log(`❌ ${address}: 0 SCORES (not found in participants)`);
      }
    }

    // Generate the claim list
    console.log('\n📄 SCORES Token Balances Claim List');
    console.log('====================================\n');
    console.log('const scoresBalancesClaimList: { address: string; amount: string }[] = [');
    
    balances.forEach((item, index) => {
      const isLast = index === balances.length - 1;
      const comma = isLast ? '' : ',';
      const foundNote = item.found ? '' : ' // Not found in participants';
      
      console.log(`    { address: "${item.address}", amount: "${item.balance}" }${comma}${foundNote}`);
    });
    
    console.log('];');

    // Summary
    const nonZeroBalances = balances.filter(b => parseFloat(b.balance) > 0);
    const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.balance), 0);
    
    console.log(`\n📈 Summary:`);
    console.log(`Total Contributors Checked: ${balances.length}`);
    console.log(`Contributors with SCORES: ${nonZeroBalances.length}`);
    console.log(`Total SCORES Held: ${totalBalance.toFixed(6)}`);
    
    if (nonZeroBalances.length > 0) {
      console.log(`\n🏆 Top SCORES Holders:`);
      nonZeroBalances
        .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
        .slice(0, 5)
        .forEach((holder, index) => {
          console.log(`${index + 1}. ${holder.address}: ${holder.balance} SCORES`);
        });
    }

    // Show participants not in our list
    const ourAddresses = new Set(contributors.map(a => a.toLowerCase()));
    const otherParticipants = project.participants.items.filter(p => !ourAddresses.has(p.address.toLowerCase()));
    
    if (otherParticipants.length > 0) {
      console.log(`\n📋 Other Participants (${otherParticipants.length}):`);
      otherParticipants
        .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
        .slice(0, 10)
        .forEach((participant, index) => {
          const balanceEth = parseFloat(participant.balance) / Math.pow(10, 18);
          console.log(`${index + 1}. ${participant.address}: ${balanceEth} SCORES`);
        });
    }

  } catch (error) {
    console.error('❌ Error checking SCORES balances:', error.message);
  }
}

checkScoresBalancesBendystraw();
