# 🔄 Buyback Configuration Guide for Project 53 (Base)

## 📋 Project Overview

**Project**: Footy App Points (Project 53)  
**Network**: Base (Chain ID: 8453)  
**Token**: SCORES (`0xBa1aFff81A239C926446a67D73F73eC51C37c777`)  
**Current Balance**: 0.487173 ETH  
**Volume**: 0.485973 ETH  

## 🔗 Contract Addresses

### Juicebox V4 Contracts (Base)
- **JBBuybackHook**: `0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b`
- **JBMultiTerminal**: `0xdb9644369c79c3633cde70d2df50d827d7dc7dbc`
- **JBPermissions**: `0xf5ca295dc286a176e35ebb7833031fd95550eb14`
- **JBProjects**: `0x0b538a02610d7d3cc91ce2870f423e0a34d646ad`
- **JBRulesets**: `0xda86eedb67c6c9fb3e58fe83efa28674d7c89826`

### Revnet Contracts (Base)
- **REVDeployer**: `0x027f1684c6d31066c3f2468117f2508e8134fdfc`
- **REVLoans**: `0x03de624feb08c0edeff779ca5702aef4b85d7f06`

### Token Addresses
- **SCORES Token**: `0xBa1aFff81A239C926446a67D73F73eC51C37c777`
- **WETH (Base)**: `0x4200000000000000000000000000000000000006`

## 🔐 Permission Holders

### High-Permission Accounts
- **`0x027f1684c6d31066c3f2468117f2508e8134fdfc`**
  - Permissions: 17, 25, 6, 18, 30, 20, 21, 22, 23
  - **This is the REVDeployer contract** - has full configuration permissions

### Other Permission Holders
- **`0xdf087b724174a3e4ed2338c0798193932e851f1b`**
  - Permissions: 1
  - Operator: `0x03de624feb08c0edeff779ca5702aef4b85d7f06`

- **`0xaa23bb616192b9f596945a088ed4febfb2d71efe`**
  - Permissions: 1
  - Operator: `0x03de624feb08c0edeff779ca5702aef4b85d7f06`

## 🎯 Goal: Configure Buyback Delegate to Uniswap V3 Pool

### Current Status
- ✅ Project has sufficient balance (0.487173 ETH)
- ✅ Permission holders have necessary permissions
- ✅ **SCORES token found on Uniswap V3**
- ✅ **3 Uniswap V3 pools exist for SCORES/WETH pair**
- ✅ **Recommended pool identified for buyback**
- 🔧 Ready to configure buyback delegate

## 🔧 Implementation Steps

### Step 1: Select Existing Uniswap V3 Pool

**✅ Pools Already Exist!** We found 3 pools for SCORES/WETH:

1. **Pool 1**: `0x3e06b10d12649b7f99543e0a7178003f0b53e988`
   - Fee Tier: 1% (10000)
   - Liquidity: 0
   - TVL: $0.00
   - **Status**: No liquidity

2. **Pool 2**: `0x51b57c7545ae3eca988e0ee3e19d05160efc5c1e`
   - Fee Tier: 0.3% (3000)
   - Liquidity: 14,141,547,640,154,394
   - TVL: $0.10
   - Volume: $3.19

3. **Pool 3**: `0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828` ⭐ **RECOMMENDED**
   - Fee Tier: 0.05% (500)
   - Liquidity: 21,395,689,413,102,723,000
   - TVL: $24.40
   - Volume: $14.01
   - **Status**: Most liquid pool

### Step 2: Configure Juicebox Buyback Hook

1. **Access Juicebox Interface**
   - Use Juicebox V4 interface for Base
   - Connect with account that has permissions: `0x027f1684c6d31066c3f2468117f2508e8134fdfc`

2. **Configure Buyback Delegate**
   - Navigate to Project 53 settings
   - Find funding cycle configuration
   - Set buyback delegate to: `0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b`
   - **Use Recommended Pool**: `0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828`
   - Set buyback parameters:
     - Slippage tolerance: 5% (500)
     - Minimum buyback amount: 0.01 ETH
     - Buyback frequency: As needed

### Step 3: Pool Status (Already Seeded)

1. **Pool Already Has Liquidity**
   - Pool `0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828` has $24.40 TVL
   - Sufficient liquidity exists for buyback operations
   - No additional seeding required

2. **Test Buyback Functionality**
   - Trigger a small buyback to test configuration
   - Verify tokens are being bought back correctly
   - Check that liquidity is being provided to the pool

## 📊 Expected Outcomes

### After Configuration
- **Automated Buyback**: Project funds will automatically buy back SCORES tokens
- **Liquidity Provision**: Bought tokens will be provided as liquidity to Uniswap V3 pool
- **Price Discovery**: Pool will establish price discovery mechanism for SCORES token
- **Token Utility**: SCORES tokens will have trading utility on Uniswap

### Benefits
- **Price Support**: Buyback mechanism supports token price
- **Liquidity**: Creates trading liquidity for SCORES token
- **Utility**: Enables trading and price discovery
- **Community**: Allows community members to trade SCORES tokens

## ⚠️ Important Notes

### Permissions
- Only accounts with permissions 17, 25, 6, 18, 30, 20, 21, 22, 23 can configure buyback
- Primary account: `0x027f1684c6d31066c3f2468117f2508e8134fdfc` (REVDeployer)

### Technical Considerations
- **Pool Creation**: Requires initial liquidity provision
- **Fee Tier**: Choose based on expected trading volume
- **Slippage**: Set appropriate slippage tolerance for buyback operations
- **Gas Costs**: Consider gas costs for buyback operations on Base

### Risk Management
- **Liquidity**: Ensure sufficient liquidity in pool for buyback operations
- **Slippage**: Monitor slippage during buyback operations
- **Testing**: Test with small amounts before full deployment

## 🛠️ Technical Implementation

### Buyback Hook Configuration
```solidity
// JBBuybackHook configuration parameters
{
     "pool": "0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828",
   "token0": "0x4200000000000000000000000000000000000006", // WETH
   "token1": "0xBa1aFff81A239C926446a67D73F73eC51C37c777", // SCORES
   "feeTier": 500, // 0.05%
   "slippageTolerance": 500, // 5%
   "minimumBuybackAmount": "10000000000000000000" // 0.01 ETH
}
```

### Funding Cycle Update
- Update funding cycle to include buyback delegate
- Set buyback parameters in funding cycle metadata
- Ensure proper permissions are in place

## 📞 Support Resources

- **Juicebox Documentation**: https://docs.juicebox.money/
- **Uniswap V3 Documentation**: https://docs.uniswap.org/
- **Base Network**: https://docs.base.org/
- **Revnet Documentation**: https://docs.revnet.eth.sucks/

---

**Last Updated**: January 2025  
**Status**: Ready for Implementation  
**Next Action**: Check existing Uniswap V3 pools and configure buyback delegate
