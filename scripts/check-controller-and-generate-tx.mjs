#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_RPC_URL = 'https://mainnet.base.org';
const CONTROLLER_ADDRESS = '0xb291844f213047eb9e1621ae555b1eae6700d553';
const JBRULESETS_ADDRESS = '0xda86eedb67c6c9fb3e58fe83efa28674d7c89826';
const JBBUYBACK_HOOK_ADDRESS = '0x11f46e22be3b83b429dca9f2610c2250506e6b22f';

async function checkController() {
  console.log("🔍 CHECKING PROJECT CONTROLLER");
  console.log("==============================\n");

  try {
    // Check if controller is a contract
    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [CONTROLLER_ADDRESS, 'latest'],
        id: 1
      })
    });

    const data = await response.json();
    const code = data.result;

    console.log(`Controller Address: ${CONTROLLER_ADDRESS}`);
    console.log(`Is Contract: ${code !== '0x' ? 'YES' : 'NO'}`);
    
    if (code !== '0x') {
      console.log("⚠️  This is a contract address - you may need to call it differently");
      console.log("   Check if there are specific methods to configure the buyback hook");
    } else {
      console.log("✅ This is an EOA (Externally Owned Account)");
      console.log("   You need the private key to sign transactions from this address");
    }

    console.log("\n📋 CONTROLLER ANALYSIS:");
    console.log("=======================");
    console.log("1. If you have the private key for this address:");
    console.log("   - Import it into your wallet");
    console.log("   - Use the generated transaction data below");
    
    console.log("\n2. If you don't have the private key:");
    console.log("   - Contact the project owner");
    console.log("   - Check if you have been granted permissions");
    console.log("   - Look for alternative configuration methods");

  } catch (error) {
    console.error("Error checking controller:", error.message);
  }
}

function calculateBuybackMetadata() {
  let metadata = 0n;
  
  // Enable data hooks
  metadata |= (1n << 80n); // useDataHookForPay = true
  metadata |= (1n << 81n); // useDataHookForCashOut = true
  
  // Set the buyback hook address
  const hookAddress = BigInt(JBBUYBACK_HOOK_ADDRESS);
  metadata |= (hookAddress << 82n);
  
  // Enable other necessary flags
  metadata |= (1n << 70n); // allowOwnerMinting
  metadata |= (1n << 79n); // useTotalSurplusForCashOuts
  
  return metadata;
}

function generateTransactionData() {
  console.log("\n🔧 GENERATING CORRECT TRANSACTION DATA");
  console.log("=====================================\n");

  const metadata = calculateBuybackMetadata();
  
  console.log("📋 Transaction Parameters:");
  console.log("==========================");
  console.log(`Contract: ${JBRULESETS_ADDRESS}`);
  console.log(`Method: queueFor()`);
  console.log(`Project ID: 53`);
  console.log(`Duration: 0`);
  console.log(`Weight: 1000000000000000000 (1.0)`);
  console.log(`Weight Cut Percent: 0`);
  console.log(`Approval Hook: 0x0000000000000000000000000000000000000000`);
  console.log(`Metadata: ${metadata}`);
  console.log(`Must Start At Or After: 0`);

  console.log("\n📊 Metadata Breakdown:");
  console.log("======================");
  console.log(`Use Data Hook For Pay: ${Boolean((metadata >> 80n) & 1n)}`);
  console.log(`Use Data Hook For Cash Out: ${Boolean((metadata >> 81n) & 1n)}`);
  const hookAddress = (metadata >> 82n) & ((1n << 160n) - 1n);
  console.log(`Data Hook Address: 0x${hookAddress.toString(16).padStart(40, '0')}`);
  console.log(`Allow Owner Minting: ${Boolean((metadata >> 70n) & 1n)}`);
  console.log(`Use Total Surplus For Cash Outs: ${Boolean((metadata >> 79n) & 1n)}`);

  console.log("\n🎯 NEXT STEPS:");
  console.log("==============");
  console.log("1. Use the controller account to sign this transaction");
  console.log("2. Call queueFor() with the parameters above");
  console.log("3. After queuing, you'll need to call launchFor() to activate the ruleset");
  console.log("4. Then configure the buyback hook with the Uniswap pool");
}

async function main() {
  await checkController();
  generateTransactionData();
}

main().catch(console.error);

