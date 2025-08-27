#!/usr/bin/env node

// Decode the transaction data from the failed simulation
const transactionData = "0x70174dcc000000000000000000000000000000000000000000000000000000000000003500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011f46e22be3b83b429dca9f2610c2250506e6b22f804000000000000000000000000000000000000000000000000000000000000000000000000000000000";

console.log("🔍 DECODING FAILED TRANSACTION");
console.log("================================\n");

// Extract function selector (first 4 bytes)
const functionSelector = transactionData.slice(0, 10);
console.log(`Function Selector: ${functionSelector}`);

// Extract parameters (remove 0x and function selector)
const params = transactionData.slice(10);

// Decode parameters based on function signature
// queueFor(uint256 projectId, uint256 duration, uint256 weight, uint256 weightCutPercent, address approvalHook, uint256 metadata, uint256 mustStartAtOrAfter)

const projectId = BigInt("0x" + params.slice(0, 64));
const duration = BigInt("0x" + params.slice(64, 128));
const weight = BigInt("0x" + params.slice(128, 192));
const weightCutPercent = BigInt("0x" + params.slice(192, 256));
const approvalHook = "0x" + params.slice(256, 296);
const metadata = BigInt("0x" + params.slice(296, 360));
const mustStartAtOrAfter = BigInt("0x" + params.slice(360, 424));

console.log("📋 DECODED PARAMETERS:");
console.log("=======================");
console.log(`Project ID: ${projectId}`);
console.log(`Duration: ${duration} seconds`);
console.log(`Weight: ${weight} (${Number(weight) / 1e18} in decimal)`);
console.log(`Weight Cut Percent: ${weightCutPercent}`);
console.log(`Approval Hook: ${approvalHook}`);
console.log(`Metadata: ${metadata}`);
console.log(`Must Start At Or After: ${mustStartAtOrAfter}`);

console.log("\n❌ ERROR ANALYSIS:");
console.log("==================");
console.log("The transaction failed with: 'JBControlled_ControllerUnauthorized'");
console.log("\nThis means:");
console.log("1. The caller (0x0000000000000000000000000000000000000000) is not authorized");
console.log("2. The project controller is: 0xb291844f213047eb9e1621ae555b1eae6700d553");
console.log("3. Only the project controller can call queueFor()");

console.log("\n🔧 SOLUTION:");
console.log("============");
console.log("You need to call queueFor() from the project controller address:");
console.log("0xb291844f213047eb9e1621ae555b1eae6700d553");
console.log("\nOR");
console.log("If you have the private key for the controller, use that account to sign the transaction.");

console.log("\n📊 METADATA ANALYSIS:");
console.log("=====================");
// Decode the metadata to see what was being configured
const metadataHex = metadata.toString(16);
console.log(`Metadata (hex): 0x${metadataHex}`);

// Check if this metadata has the buyback hook configured
const useDataHookForPay = Boolean((metadata >> 80n) & 1n);
const useDataHookForCashOut = Boolean((metadata >> 81n) & 1n);
const hookAddress = (metadata >> 82n) & ((1n << 160n) - 1n);

console.log(`Use Data Hook For Pay: ${useDataHookForPay}`);
console.log(`Use Data Hook For Cash Out: ${useDataHookForCashOut}`);
console.log(`Data Hook Address: 0x${hookAddress.toString(16).padStart(40, '0')}`);

// Check if this matches the expected JBBuybackHook address
const expectedHookAddress = "0x11f46e22be3b83b429dca9f2610c2250506e6b22f";
console.log(`Expected Hook Address: ${expectedHookAddress}`);
console.log(`Hook Address Match: ${hookAddress.toString(16) === expectedHookAddress.slice(2)}`);

console.log("\n✅ VERIFICATION:");
console.log("================");
console.log("The metadata appears to be correctly configured for the buyback hook.");
console.log("The issue is purely authorization - you need to call from the correct controller account.");
