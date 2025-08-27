#!/usr/bin/env node

import fetch from 'node-fetch';

const THEGRAPH_API_KEY = "f98075161b29cf5d23462fe8dc08ec62";
const SCORES_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"; // We'll need to find the actual SCORES token address
const UNISWAP_BASE_SUBGRAPH = "https://api.thegraph.com/subgraphs/name/uniswap/universal-router";

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

async function checkScoresBalances() {
  console.log("🔍 Checking SCORES token balances for contributors\n");

  try {
    // First, let's find the SCORES token address by searching for it
    console.log("🔎 Searching for SCORES token...");
    
    const searchQuery = `
      query SearchScoresToken {
        tokens(
          where: { symbol_contains_nocase: "SCORES" }
          first: 10
        ) {
          id
          symbol
          name
          totalSupply
          volumeUSD
        }
      }
    `;

    const searchResponse = await fetch(UNISWAP_BASE_SUBGRAPH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
      }),
    });

    const searchResult = await searchResponse.json();
    
    if (searchResult.errors) {
      console.error('❌ GraphQL errors:', JSON.stringify(searchResult.errors, null, 2));
      return;
    }

    console.log("📋 Found tokens with 'SCORES' in symbol:");
    searchResult.data.tokens.forEach(token => {
      console.log(`- ${token.symbol}: ${token.name} (${token.id})`);
    });

    // If we found SCORES token, use it; otherwise use a placeholder
    const scoresTokenAddress = searchResult.data.tokens.length > 0 
      ? searchResult.data.tokens[0].id 
      : "0x0000000000000000000000000000000000000000";

    console.log(`\n🎯 Using SCORES token address: ${scoresTokenAddress}\n`);

    // Now check balances for each contributor
    const balances = [];

    for (const address of contributors) {
      console.log(`🔍 Checking balance for ${address}...`);
      
      const balanceQuery = `
        query GetTokenBalance($address: String!, $tokenAddress: String!) {
          token(id: $tokenAddress) {
            id
            symbol
            name
            decimals
          }
          account(id: $address) {
            id
            tokenBalances(
              where: { token: $tokenAddress }
            ) {
              id
              token {
                id
                symbol
                decimals
              }
              balance
            }
          }
        }
      `;

      const balanceResponse = await fetch(UNISWAP_BASE_SUBGRAPH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: balanceQuery,
          variables: {
            address: address.toLowerCase(),
            tokenAddress: scoresTokenAddress.toLowerCase()
          }
        }),
      });

      const balanceResult = await balanceResponse.json();
      
      if (balanceResult.errors) {
        console.error(`❌ Error checking ${address}:`, balanceResult.errors[0].message);
        balances.push({
          address,
          balance: "0",
          error: true
        });
        continue;
      }

      const account = balanceResult.data.account;
      const tokenBalance = account?.tokenBalances?.[0];
      
      if (tokenBalance) {
        const decimals = parseInt(tokenBalance.token.decimals);
        const balance = parseFloat(tokenBalance.balance) / Math.pow(10, decimals);
        balances.push({
          address,
          balance: balance.toString(),
          error: false
        });
        console.log(`✅ ${address}: ${balance} SCORES`);
      } else {
        balances.push({
          address,
          balance: "0",
          error: false
        });
        console.log(`✅ ${address}: 0 SCORES`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Generate the claim list
    console.log('\n📄 SCORES Token Balances Claim List');
    console.log('====================================\n');
    console.log('const scoresBalancesClaimList: { address: string; amount: string }[] = [');
    
    balances.forEach((item, index) => {
      const isLast = index === balances.length - 1;
      const comma = isLast ? '' : ',';
      const errorNote = item.error ? ' // ERROR' : '';
      
      console.log(`    { address: "${item.address}", amount: "${item.balance}" }${comma}${errorNote}`);
    });
    
    console.log('];');

    // Summary
    const nonZeroBalances = balances.filter(b => !b.error && parseFloat(b.balance) > 0);
    const totalBalance = balances.reduce((sum, b) => sum + (b.error ? 0 : parseFloat(b.balance)), 0);
    
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

  } catch (error) {
    console.error('❌ Error checking SCORES balances:', error.message);
  }
}

checkScoresBalances();
