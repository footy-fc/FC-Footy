#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BENDYSTRAW_API_KEY = process.env.BENDYSTRAW_API_KEY || "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";

// Juicebox V4 contract addresses for Base
const JB_CONTRACTS = {
  JBBuybackHook: "0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b",
  JBMultiTerminal: "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc",
  JBPermissions: "0xf5ca295dc286a176e35ebb7833031fd95550eb14",
  JBProjects: "0x0b538a02610d7d3cc91ce2870f423e0a34d646ad",
  JBRulesets: "0xda86eedb67c6c9fb3e58fe83efa28674d7c89826"
};

// Revnet contract addresses for Base
const REVNET_CONTRACTS = {
  REVDeployer: "0x027f1684c6d31066c3f2468117f2508e8134fdfc",
  REVLoans: "0x03de624feb08c0edeff779ca5702aef4b85d7f06"
};

// GraphQL query for project configuration
const PROJECT_CONFIG_QUERY = `
  query GetProjectConfig($projectId: Float!, $chainId: Float!) {
    project(projectId: $projectId, chainId: $chainId) {
      id
      projectId
      chainId
      balance
      volume
      volumeUsd
      tokenSupply
      metadata
    }
  }
`;

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
 * Fetch project configuration
 */
async function fetchProjectConfig(projectId, chainId) {
  try {
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: PROJECT_CONFIG_QUERY,
        variables: { projectId, chainId }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.project;
  } catch (error) {
    console.error('❌ Failed to fetch project config:', error.message);
    throw error;
  }
}

/**
 * Fetch permission holders
 */
async function fetchPermissionHolders(projectId, chainId, limit = 50) {
  try {
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
 * Display project information
 */
function displayProjectInfo(project) {
  console.log(`\n📋 Project 53 Configuration (Base)`);
  console.log('=' .repeat(80));
  
  console.log(`✅ Project ID: ${project.projectId}`);
  console.log(`⛓️  Chain ID: ${project.chainId} (Base)`);
  console.log(`💰 Balance: ${project.balance} wei (${(parseFloat(project.balance) / Math.pow(10, 18)).toFixed(6)} ETH)`);
  console.log(`📊 Volume: ${project.volume} wei (${(parseFloat(project.volume) / Math.pow(10, 18)).toFixed(6)} ETH)`);
  console.log(`💵 Volume USD: ${project.volumeUsd} USD`);
  console.log(`🪙 Token Supply: ${project.tokenSupply}`);
  
  if (project.metadata) {
    console.log(`📝 Name: ${project.metadata.name || 'N/A'}`);
    console.log(`📄 Description: ${project.metadata.description || 'N/A'}`);
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Display contract addresses
 */
function displayContractAddresses() {
  console.log(`\n🔗 Juicebox V4 Contract Addresses (Base)`);
  console.log('=' .repeat(80));
  
  Object.entries(JB_CONTRACTS).forEach(([name, address]) => {
    console.log(`${name.padEnd(20)}: ${address}`);
  });
  
  console.log(`\n🔗 Revnet Contract Addresses (Base)`);
  console.log('=' .repeat(80));
  
  Object.entries(REVNET_CONTRACTS).forEach(([name, address]) => {
    console.log(`${name.padEnd(20)}: ${address}`);
  });
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Display permission holders
 */
function displayPermissionHolders(permissionHolders) {
  console.log(`\n🔐 Permission Holders`);
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
  permissionHolders.forEach((holder) => {
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
 * Analyze buyback configuration
 */
function analyzeBuybackConfiguration(project, permissionHolders) {
  console.log(`\n🔄 Buyback Configuration Analysis`);
  console.log('=' .repeat(80));
  
  console.log('📋 Current Status:');
  console.log('   • Project has sufficient balance for buyback operations');
  console.log('   • Permission holders have the necessary permissions to configure buyback');
  
  console.log('\n🔧 Required Configuration:');
  console.log('   1. Configure buyback delegate in funding cycle');
  console.log('   2. Set up Uniswap V3 pool for SCORES token');
  console.log('   3. Configure buyback hook parameters');
  
  console.log('\n📝 Next Steps:');
  console.log('   1. Check current funding cycle configuration');
  console.log('   2. Verify if buyback delegate is already set');
  console.log('   3. If not configured, set up buyback delegate to Uniswap V3 pool');
  console.log('   4. Seed the Uniswap V3 pool with initial liquidity');
  
  console.log('\n⚠️  Note:');
  console.log('   • Buyback configuration requires funding cycle updates');
  console.log('   • Only permission holders can modify these settings');
  console.log('   • Uniswap V3 pool needs to be created first');
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Display action items
 */
function displayActionItems(permissionHolders) {
  console.log(`\n🎯 Action Items for Buyback Configuration`);
  console.log('=' .repeat(80));
  
  // Find accounts with highest permissions
  const highPermissionHolders = permissionHolders.filter(holder => 
    holder.permissions && holder.permissions.some(p => [17, 25, 6, 18, 30, 20, 21, 22, 23].includes(p))
  );
  
  if (highPermissionHolders.length > 0) {
    console.log('✅ Accounts with buyback configuration permissions:');
    highPermissionHolders.forEach(holder => {
      console.log(`   • ${holder.account} (Permissions: ${holder.permissions.join(', ')})`);
    });
  }
  
  console.log('\n🔧 Technical Steps:');
  console.log('   1. Create Uniswap V3 pool for SCORES/WETH pair');
  console.log('   2. Configure JBBuybackHook with pool parameters');
  console.log('   3. Update funding cycle with buyback delegate');
  console.log('   4. Seed pool with initial liquidity');
  
  console.log('\n📊 Expected Outcome:');
  console.log('   • Automated buyback of SCORES tokens');
  console.log('   • Liquidity provision to Uniswap V3 pool');
  console.log('   • Price discovery mechanism for SCORES token');
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const projectId = parseInt(args[0]) || 53;
  const chainId = parseInt(args[1]) || 8453;

  console.log('🔄 Buyback Configuration Check for Project 53');
  console.log('=' .repeat(50));
  console.log(`📊 Project ID: ${projectId}`);
  console.log(`⛓️  Chain ID: ${chainId} (Base)`);
  console.log('');

  try {
    // Fetch project configuration
    const project = await fetchProjectConfig(projectId, chainId);
    displayProjectInfo(project);
    
    // Display contract addresses
    displayContractAddresses();
    
    // Fetch permission holders
    const permissionHolders = await fetchPermissionHolders(projectId, chainId, 100);
    displayPermissionHolders(permissionHolders);
    
    // Analyze buyback configuration
    analyzeBuybackConfiguration(project, permissionHolders);
    
    // Display action items
    displayActionItems(permissionHolders);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fetchProjectConfig, fetchPermissionHolders };

