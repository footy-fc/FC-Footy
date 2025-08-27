// Metadata from ruleset 1746995565
const metadata = 68919109647499848311901657909174180860888783343309932454684456084570113n;

console.log('🔍 Decoding Ruleset Metadata');
console.log('=' .repeat(50));
console.log(`📊 Raw Metadata: ${metadata}`);
console.log(`📊 Hex: 0x${metadata.toString(16)}`);
console.log('');

// Decode the packed metadata
const packed = metadata;

const decoded = {
  reservedPercent: Number((packed >> 4n) & ((1n << 16n) - 1n)),
  cashOutTaxRate: Number((packed >> 20n) & ((1n << 16n) - 1n)),
  baseCurrency: Number((packed >> 36n) & ((1n << 32n) - 1n)),
  pausePay: Boolean((packed >> 68n) & 1n),
  pauseCreditTransfers: Boolean((packed >> 69n) & 1n),
  allowOwnerMinting: Boolean((packed >> 70n) & 1n),
  allowSetCustomToken: Boolean((packed >> 71n) & 1n),
  allowTerminalMigration: Boolean((packed >> 72n) & 1n),
  allowSetTerminals: Boolean((packed >> 73n) & 1n),
  allowSetController: Boolean((packed >> 74n) & 1n),
  allowAddAccountingContext: Boolean((packed >> 75n) & 1n),
  allowAddPriceFeed: Boolean((packed >> 76n) & 1n),
  ownerMustSendPayouts: Boolean((packed >> 77n) & 1n),
  holdFees: Boolean((packed >> 78n) & 1n),
  useTotalSurplusForCashOuts: Boolean((packed >> 79n) & 1n),
  useDataHookForPay: Boolean((packed >> 80n) & 1n),
  useDataHookForCashOut: Boolean((packed >> 81n) & 1n),
  dataHook: `0x${((packed >> 82n) & ((1n << 160n) - 1n)).toString(16).padStart(40, "0")}`,
  metadata: Number((packed >> 242n) & ((1n << 14n) - 1n))
};

console.log('🔍 Decoded Metadata:');
console.log('=' .repeat(50));
console.log(`   • Reserved Percent: ${decoded.reservedPercent}%`);
console.log(`   • Cash Out Tax Rate: ${decoded.cashOutTaxRate}%`);
console.log(`   • Base Currency: ${decoded.baseCurrency}`);
console.log(`   • Pause Pay: ${decoded.pausePay}`);
console.log(`   • Pause Credit Transfers: ${decoded.pauseCreditTransfers}`);
console.log(`   • Allow Owner Minting: ${decoded.allowOwnerMinting}`);
console.log(`   • Allow Set Custom Token: ${decoded.allowSetCustomToken}`);
console.log(`   • Allow Terminal Migration: ${decoded.allowTerminalMigration}`);
console.log(`   • Allow Set Terminals: ${decoded.allowSetTerminals}`);
console.log(`   • Allow Set Controller: ${decoded.allowSetController}`);
console.log(`   • Allow Add Accounting Context: ${decoded.allowAddAccountingContext}`);
console.log(`   • Allow Add Price Feed: ${decoded.allowAddPriceFeed}`);
console.log(`   • Owner Must Send Payouts: ${decoded.ownerMustSendPayouts}`);
console.log(`   • Hold Fees: ${decoded.holdFees}`);
console.log(`   • Use Total Surplus For Cash Outs: ${decoded.useTotalSurplusForCashOuts}`);
console.log(`   • Use Data Hook For Pay: ${decoded.useDataHookForPay} ⭐`);
console.log(`   • Use Data Hook For Cash Out: ${decoded.useDataHookForCashOut}`);
console.log(`   • Data Hook: ${decoded.dataHook}`);
console.log(`   • Metadata: ${decoded.metadata}`);

console.log('\n' + '=' .repeat(50));

// Check buyback hook configuration
const expectedBuybackHook = "0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b";

if (decoded.useDataHookForPay && decoded.dataHook !== "0x0000000000000000000000000000000000000000") {
  console.log('✅ BUYBACK HOOK CONFIGURED!');
  console.log(`   • Data Hook: ${decoded.dataHook}`);
  
  if (decoded.dataHook.toLowerCase() === expectedBuybackHook.toLowerCase()) {
    console.log(`   • ✅ Matches JBBuybackHook: ${expectedBuybackHook}`);
    console.log('   • 🎉 The buyback delegate is properly configured!');
  } else {
    console.log(`   • ⚠️  Different from JBBuybackHook: ${expectedBuybackHook}`);
    console.log(`   • Current hook: ${decoded.dataHook}`);
  }
} else {
  console.log('❌ NO BUYBACK HOOK CONFIGURED');
  console.log(`   • Use Data Hook For Pay: ${decoded.useDataHookForPay}`);
  console.log(`   • Data Hook: ${decoded.dataHook}`);
  console.log('   • Manual configuration required');
}

console.log('\n' + '=' .repeat(50));

