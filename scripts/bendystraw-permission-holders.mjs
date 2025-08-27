#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BENDYSTRAW_API_KEY = process.env.BENDYSTRAW_API_KEY || "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";

// GraphQL query for permission holders
const PERMISSION_HOLDERS_QUERY = `
  query allHolders($projectId: Int!, $chainId: Int!, $limit: Int) {
    permissionHolders(
      limit: $limit, 
      where: {projectId: $projectId, chainId: $chainId}
    ) {
      items {
        account
        chainId
        operator
        permissions
        projectId
      }
    }
  }
`;

/**
 * Fetch permission holders from Bendystraw GraphQL API
 */
async function fetchPermissionHolders(projectId, chainId, limit = 50) {
  try {
    console.log(`🔍 Fetching permission holders for project ${projectId} on chain ${chainId}...`);
    
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: PERMISSION_HOLDERS_QUERY,
        variables: { projectId, chainId, limit }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.permissionHolders.items;
  } catch (error) {
    console.error('❌ Failed to fetch permission holders:', error.message);
    throw error;
  }
}

/**
 * Display permission holders in a formatted table
 */
function displayPermissionHolders(permissionHolders, projectId, chainId) {
  console.log(`\n📋 Permission Holders for Project ${projectId} (Chain ${chainId})`);
  console.log('=' .repeat(80));
  
  if (!permissionHolders || permissionHolders.length === 0) {
    console.log('❌ No permission holders found');
    return;
  }

  console.log(`✅ Found ${permissionHolders.length} permission holders\n`);
  
  // Create table header
  console.log('Account'.padEnd(42) + ' | ' + 'Operator'.padEnd(42) + ' | ' + 'Permissions');
  console.log('-'.repeat(42) + '-+-' + '-'.repeat(42) + '-+-' + '-'.repeat(20));
  
  // Display each permission holder
  permissionHolders.forEach((holder, index) => {
    const account = holder.account || 'N/A';
    const operator = holder.operator || 'N/A';
    const permissions = holder.permissions ? holder.permissions.join(', ') : 'N/A';
    
    console.log(
      account.padEnd(42) + ' | ' + 
      operator.padEnd(42) + ' | ' + 
      permissions
    );
  });
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Main function to run the permission holders query
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const projectId = parseInt(args[0]) || 140; // Default to 140 if not provided
  const chainId = parseInt(args[1]) || 8453;  // Default to Base (8453) if not provided
  const limit = parseInt(args[2]) || 50;      // Default limit of 50

  console.log('🔐 Bendystraw Permission Holders Query');
  console.log('=' .repeat(50));
  console.log(`📊 Project ID: ${projectId}`);
  console.log(`⛓️  Chain ID: ${chainId} (${chainId === 8453 ? 'Base' : chainId === 1 ? 'Ethereum' : chainId === 10 ? 'Optimism' : chainId === 42161 ? 'Arbitrum' : 'Unknown'})`);
  console.log(`📈 Limit: ${limit}`);
  console.log('');

  try {
    const permissionHolders = await fetchPermissionHolders(projectId, chainId, limit);
    displayPermissionHolders(permissionHolders, projectId, chainId);
    
    // Summary statistics
    const uniqueAccounts = new Set(permissionHolders.map(h => h.account)).size;
    const uniqueOperators = new Set(permissionHolders.map(h => h.operator)).size;
    
    console.log(`\n📊 Summary:`);
    console.log(`   • Total permission holders: ${permissionHolders.length}`);
    console.log(`   • Unique accounts: ${uniqueAccounts}`);
    console.log(`   • Unique operators: ${uniqueOperators}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fetchPermissionHolders, displayPermissionHolders };

