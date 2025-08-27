# Transaction Failure Analysis

## 🔍 What Happened

The transaction failed with error: **`JBControlled_ControllerUnauthorized`**

## 📋 Decoded Transaction Data

**Function:** `queueFor()` on JBRulesets contract  
**Contract:** `0xda86eedb67c6c9fb3e58fe83efa28674d7c89826`  
**Caller:** `0x0000000000000000000000000000000000000000` (zero address)

### Parameters:
- **Project ID:** 53
- **Duration:** 0 seconds
- **Weight:** 1.0 (1:1 token minting)
- **Weight Cut Percent:** 0
- **Approval Hook:** `0x0000000000000000000000000000000000000000`
- **Metadata:** `25025346461514172090089746293217232547022566`
- **Must Start At Or After:** `80595614008834977083747854003827565127984954810707039626792766465694553341952`

## ❌ Root Cause

**Authorization Error:** The caller (`0x0000000000000000000000000000000000000000`) is not authorized to call `queueFor()`.

**Project Controller:** `0xb291844f213047eb9e1621ae555b1eae6700d553`

Only the project controller can queue new rulesets for a Juicebox project.

## 🔧 Solution

You need to call `queueFor()` from the **project controller address**:

```
0xb291844f213047eb9e1621ae555b1eae6700d553
```

### Steps to Fix:

1. **Use the correct account:** Sign the transaction with the private key for the project controller
2. **Same transaction data:** Use the exact same parameters (they are correct)
3. **Same contract:** Call `queueFor()` on `0xda86eedb67c6c9fb3e58fe83efa28674d7c89826`

## 📊 Metadata Analysis

The metadata in the transaction appears to have some issues:

- **Use Data Hook For Pay:** `false` ❌ (should be `true`)
- **Use Data Hook For Cash Out:** `true` ✅
- **Data Hook Address:** `0x00000000000000000000000047d1b88af8ee0ed0` ❌ (incorrect)
- **Expected Hook Address:** `0x11f46e22be3b83b429dca9f2610c2250506e6b22f`

## 🚨 Additional Issues Found

1. **Authorization:** Caller is not the project controller
2. **Metadata:** The metadata is not correctly configured for the buyback hook
3. **Hook Address:** The data hook address in the metadata is wrong

## ✅ Correct Approach

1. **Fix the metadata** to properly include the JBBuybackHook address
2. **Call from the correct account** (project controller)
3. **Use the correct transaction data**

The transaction parameters are mostly correct, but the metadata needs to be recalculated to properly include the buyback hook configuration.

