# How to Use Project Controller Account to Sign Transactions

## 🔑 Project Controller Details

**Controller Address:** `0xb291844f213047eb9e1621ae555b1eae6700d553`  
**Required:** Private key for this address to sign transactions

## 🚨 Current Situation

The transaction failed because it was called from the **zero address** (`0x0000000000000000000000000000000000000000`), but only the project controller can call `queueFor()`.

## 🔧 Options to Sign with Controller Account

### Option 1: You Have the Private Key ✅

If you have the private key for `0xb291844f213047eb9e1621ae555b1eae6700d553`:

1. **Import the private key** into your wallet (MetaMask, etc.)
2. **Switch to that account** in your wallet
3. **Sign the transaction** with the correct parameters

### Option 2: You Don't Have the Private Key ❌

If you don't have access to the controller's private key, you have these options:

#### A. Contact the Project Owner
- Find who controls `0xb291844f213047eb9e1621ae555b1eae6700d553`
- Ask them to execute the transaction
- Provide them with the exact transaction data

#### B. Check if You Have Permission
- The controller might have granted permissions to other addresses
- Check if your address has been given permission to call `queueFor()`

#### C. Use a Different Approach
- If this is a Revnet project, the controller might be a contract
- Check if there are other ways to configure the buyback hook

## 🔍 How to Check Controller Ownership

### 1. Check on Basescan
Visit: `https://basescan.org/address/0xb291844f213047eb9e1621ae555b1eae6700d553`

### 2. Check Recent Transactions
Look for transactions from this address to understand who controls it.

### 3. Check if it's a Contract
```bash
# Check if it's a contract or EOA
curl -X POST https://mainnet.base.org \
  -H "Content-Type: application/json" \
  --data '{
    "jsonrpc": "2.0",
    "method": "eth_getCode",
    "params": ["0xb291844f213047eb9e1621ae555b1eae6700d553", "latest"],
    "id": 1
  }'
```

## 📋 Correct Transaction Parameters

When you have the right account, use these parameters:

**Contract:** `0xda86eedb67c6c9fb3e58fe83efa28674d7c89826` (JBRulesets)  
**Method:** `queueFor()`  
**Parameters:**
- `projectId`: 53
- `duration`: 0
- `weight`: 1000000000000000000 (1.0 in wei)
- `weightCutPercent`: 0
- `approvalHook`: 0x0000000000000000000000000000000000000000
- `metadata`: [NEEDS TO BE FIXED - see below]
- `mustStartAtOrAfter`: 0

## 🔧 Fix the Metadata

The metadata in the failed transaction was incorrect. You need to calculate the correct metadata:

```javascript
function calculateBuybackMetadata() {
  let metadata = 0n;
  metadata |= (1n << 80n); // useDataHookForPay = true
  metadata |= (1n << 81n); // useDataHookForCashOut = true
  const hookAddress = BigInt("0x11f46e22be3b83b429dca9f2610c2250506e6b22f");
  metadata |= (hookAddress << 82n); // Set dataHook address
  metadata |= (1n << 70n); // allowOwnerMinting
  metadata |= (1n << 79n); // useTotalSurplusForCashOuts
  return metadata;
}
```

## 🎯 Next Steps

1. **Determine if you have the private key** for the controller
2. **If yes:** Import it and sign the transaction
3. **If no:** Contact the project owner or find alternative approaches
4. **Fix the metadata** to include the correct buyback hook configuration
5. **Execute the transaction** from the controller account

## ⚠️ Security Note

If you do have the private key, be extremely careful:
- Never share it
- Use a secure environment
- Consider using a hardware wallet
- Test on a testnet first if possible

