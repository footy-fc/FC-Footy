import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Contract addresses
const CURRENT_HOOK = "0x027f1684c6d31066c3f2468117f2508e8134fdfc";
const EXPECTED_BUYBACK_HOOK = "0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b";
const BASE_RPC_URL = "https://mainnet.base.org";

/**
 * Make RPC call to Base
 */
async function makeRpcCall(method, params) {
  try {
    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: params
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`RPC error: ${result.error.message}`);
    }

    return result.result;
  } catch (error) {
    console.error('❌ RPC call failed:', error.message);
    throw error;
  }
}

/**
 * Get contract code
 */
async function getContractCode(address) {
  return await makeRpcCall('eth_getCode', [address, 'latest']);
}

/**
 * Call contract method
 */
async function callContract(to, data) {
  return await makeRpcCall('eth_call', [{
    to: to,
    data: data
  }, 'latest']);
}

/**
 * Check if contract supports interface
 */
async function supportsInterface(address, interfaceId) {
  try {
    // supportsInterface(bytes4) - function selector: 0x01ffc9a7
    const data = `0x01ffc9a7${interfaceId.replace('0x', '')}`;
    const result = await callContract(address, data);
    return result === '0x0000000000000000000000000000000000000000000000000000000000000001';
  } catch (error) {
    return false;
  }
}

/**
 * Check if contract is a data hook
 */
async function checkDataHookInterface(address) {
  // IJBPayHook interface ID (approximate)
  const payHookInterface = "0x01ffc9a7"; // ERC165 interface
  const dataHookInterface = "0x01ffc9a7"; // Generic data hook
  
  console.log(`🔍 Checking interface support...`);
  
  const supportsPayHook = await supportsInterface(address, payHookInterface);
  console.log(`   • Supports Pay Hook Interface: ${supportsPayHook}`);
  
  return supportsPayHook;
}

/**
 * Get contract name and version
 */
async function getContractInfo(address) {
  try {
    // Try to get name() - function selector: 0x06fdde03
    const nameData = "0x06fdde03";
    const nameResult = await callContract(address, nameData);
    
    // Try to get symbol() - function selector: 0x95d89b41
    const symbolData = "0x95d89b41";
    const symbolResult = await callContract(address, symbolData);
    
    return {
      name: nameResult,
      symbol: symbolResult
    };
  } catch (error) {
    return { name: null, symbol: null };
  }
}

/**
 * Check if it's a buyback hook
 */
async function checkBuybackHook(address) {
  try {
    // Check for buyback-specific methods
    // beforePayHook(uint256,uint256,uint256,address,uint256,uint256,uint256,address,bytes) - 0x...
    // afterPayHook(uint256,uint256,uint256,address,uint256,uint256,uint256,address,bytes) - 0x...
    
    console.log(`🔍 Checking for buyback hook methods...`);
    
    // Try to call a method that might exist on buyback hooks
    // This is a simplified check - we'll look for common patterns
    
    return false; // Placeholder
  } catch (error) {
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Current Hook Analysis');
  console.log('=' .repeat(50));
  console.log(`🔧 Current Hook: ${CURRENT_HOOK}`);
  console.log(`🔧 Expected Buyback Hook: ${EXPECTED_BUYBACK_HOOK}`);
  console.log(`🔗 RPC URL: ${BASE_RPC_URL}`);
  console.log('');

  try {
    // Check if contract exists
    console.log('📋 Step 1: Check Contract Existence');
    console.log('=' .repeat(30));
    
    const code = await getContractCode(CURRENT_HOOK);
    if (code === '0x' || code === '0x0') {
      console.log('❌ Contract does not exist at this address');
      return;
    }
    
    console.log('✅ Contract exists');
    console.log(`📊 Code length: ${code.length} characters`);
    console.log('');

    // Check interface support
    console.log('📋 Step 2: Check Interface Support');
    console.log('=' .repeat(30));
    
    const isDataHook = await checkDataHookInterface(CURRENT_HOOK);
    console.log(`✅ Is Data Hook: ${isDataHook}`);
    console.log('');

    // Get contract info
    console.log('📋 Step 3: Get Contract Information');
    console.log('=' .repeat(30));
    
    const contractInfo = await getContractInfo(CURRENT_HOOK);
    console.log(`📊 Name: ${contractInfo.name || 'Not available'}`);
    console.log(`📊 Symbol: ${contractInfo.symbol || 'Not available'}`);
    console.log('');

    // Manual verification steps
    console.log('📋 Step 4: Manual Verification Steps');
    console.log('=' .repeat(30));
    
    console.log('🔍 Check Basescan:');
    console.log(`   • Visit: https://basescan.org/address/${CURRENT_HOOK}`);
    console.log('   • Look at the "Contract" tab');
    console.log('   • Check if it\'s verified and readable');
    console.log('');
    
    console.log('🔍 Check for buyback functionality:');
    console.log('   • Look for methods like:');
    console.log('     - beforePayHook()');
    console.log('     - afterPayHook()');
    console.log('     - buyback()');
    console.log('     - swap()');
    console.log('');
    
    console.log('🔍 Compare with expected hook:');
    console.log(`   • Expected: https://basescan.org/address/${EXPECTED_BUYBACK_HOOK}`);
    console.log(`   • Current: https://basescan.org/address/${CURRENT_HOOK}`);
    console.log('');

    // Summary
    console.log('📋 SUMMARY');
    console.log('=' .repeat(50));
    
    if (isDataHook) {
      console.log('✅ Current hook is a data hook');
      console.log('⚠️  Need to verify if it\'s specifically a buyback hook');
      console.log('🔍 Check the contract code manually to confirm functionality');
    } else {
      console.log('❌ Current hook may not be a proper data hook');
      console.log('🔧 Consider updating to the standard JBBuybackHook');
    }
    
    console.log('\n' + '=' .repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

