#!/usr/bin/env node

import { JsonRpcProvider, Wallet, ZeroAddress, formatEther } from 'ethers';
import { createRequire } from 'node:module';

// Load the SDK's CommonJS build. Its ESM build currently imports lodash named
// exports, which Node does not expose reliably from lodash's CommonJS package.
const require = createRequire(import.meta.url);
const { SchemaRegistry } = require('@ethereum-attestation-service/eas-sdk');

const BASE_CHAIN_ID = 8453n;
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const EAS_SCHEMA_REGISTRY = '0x4200000000000000000000000000000000000020';
const SCHEMA = 'uint64 fid,uint32 entryId,uint16 season,bytes32 evidenceHash,uint8 method';
const RESOLVER = ZeroAddress;
const REVOCABLE = true;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

async function main() {
  const privateKey = process.env.EAS_PRIVATE_KEY;
  if (!privateKey) {
    fail('Set EAS_PRIVATE_KEY to the Base-funded registration wallet private key.');
    return;
  }

  const dryRun = process.argv.includes('--dry-run');
  const provider = new JsonRpcProvider(BASE_RPC_URL, Number(BASE_CHAIN_ID));
  const network = await provider.getNetwork();

  if (network.chainId !== BASE_CHAIN_ID) {
    fail(`RPC returned chain ${network.chainId}; expected Base mainnet (${BASE_CHAIN_ID}).`);
    return;
  }

  const signer = new Wallet(privateKey, provider);
  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);
  const registry = new SchemaRegistry(EAS_SCHEMA_REGISTRY, { signer });
  const schemaUID = SchemaRegistry.getSchemaUID(SCHEMA, RESOLVER, REVOCABLE);

  console.log(`Network: Base mainnet (${BASE_CHAIN_ID})`);
  console.log(`Signer: ${address}`);
  console.log(`Balance: ${formatEther(balance)} ETH`);
  console.log(`Schema: ${SCHEMA}`);
  console.log(`Resolver: ${RESOLVER}`);
  console.log(`Revocable: ${REVOCABLE}`);
  console.log(`Expected UID: ${schemaUID}`);

  try {
    const existing = await registry.getSchema({ uid: schemaUID });
    console.log('\nSchema already registered; no transaction was sent.');
    console.log(`UID: ${existing.uid}`);
    return;
  } catch (error) {
    // EAS SDK throws when the UID is not registered. Continue to registration.
    if (!(error instanceof Error) || !error.message.includes('Schema not found')) {
      throw error;
    }
  }

  const transaction = await registry.register({
    schema: SCHEMA,
    resolverAddress: RESOLVER,
    revocable: REVOCABLE,
  });
  const gas = await transaction.estimateGas();
  console.log(`Estimated gas: ${gas.toString()}`);

  if (dryRun) {
    console.log('Dry run complete; no transaction was sent.');
    return;
  }

  const uid = await transaction.wait(2);
  console.log('\nSchema registered on Base mainnet.');
  console.log(`UID: ${uid}`);
  console.log(`Transaction: ${transaction.receipt.hash}`);
  console.log('Add this UID to the app configuration as NEXT_PUBLIC_EAS_SCHEMA_UID.');
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
