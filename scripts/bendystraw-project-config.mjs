#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BENDYSTRAW_API_KEY = process.env.BENDYSTRAW_API_KEY || "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";

// GraphQL query for detailed project configuration
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
      participants {
        items {
          address
          balance
        }
      }
    }
  }
`;

// GraphQL query for funding cycles
const FUNDING_CYCLES_QUERY = `
  query GetFundingCycles($projectId: Float!, $chainId: Float!) {
    fundingCycles(
      limit: 10,
      where: {projectId: $projectId, chainId: $chainId},
      orderBy: "number",
      orderDirection: "desc"
    ) {
      items {
        id
        projectId
        chainId
        number
        weight
        discountRate
        ballot
        duration
        target
        currency
        start
        end
        metadata
      }
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
 * Fetch project configuration from Bendystraw GraphQL API
 */
async function fetchProjectConfig(projectId, chainId) {
  try {
    console.log(`🔍 Fetching project configuration for project ${projectId} on chain ${chainId}...`);
    
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
 * Fetch funding cycles from Bendystraw GraphQL API
 */
async function fetchFundingCycles(projectId, chainId) {
  try {
    console.log(`🔍 Fetching funding cycles for project ${projectId} on chain ${chainId}...`);
    
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: FUNDING_CYCLES_QUERY,
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

    return result.data.fundingCycles.items;
  } catch (error) {
    console.error('❌ Failed to fetch funding cycles:', error.message);
    throw error;
  }
}

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
 * Display project configuration
 */
function displayProjectConfig(project) {
  console.log(`\n📋 Project Configuration for Project ${project.projectId} (Chain ${project.chainId})`);
  console.log('=' .repeat(80));
  
  console.log(`✅ Project ID: ${project.projectId}`);
  console.log(`⛓️  Chain ID: ${project.chainId} (${project.chainId === 8453 ? 'Base' : project.chainId === 1 ? 'Ethereum' : project.chainId === 10 ? 'Optimism' : project.chainId === 42161 ? 'Arbitrum' : 'Unknown'})`);
  console.log(`💰 Balance: ${project.balance} wei`);
  console.log(`📊 Volume: ${project.volume} wei`);
  console.log(`💵 Volume USD: ${project.volumeUsd} USD`);
  console.log(`🪙 Token Supply: ${project.tokenSupply}`);
  
  if (project.metadata) {
    console.log(`📝 Name: ${project.metadata.name || 'N/A'}`);
    console.log(`📄 Description: ${project.metadata.description || 'N/A'}`);
    if (project.metadata.logoUri) {
      console.log(`🖼️  Logo: ${project.metadata.logoUri}`);
    }
  }
  
  console.log(`👥 Participants: ${project.participants?.items?.length || 0}`);
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Display funding cycles
 */
function displayFundingCycles(fundingCycles) {
  console.log(`\n📈 Funding Cycles`);
  console.log('=' .repeat(80));
  
  if (!fundingCycles || fundingCycles.length === 0) {
    console.log('❌ No funding cycles found');
    return;
  }

  console.log(`✅ Found ${fundingCycles.length} funding cycles\n`);
  
  fundingCycles.forEach((cycle, index) => {
    console.log(`🔄 Funding Cycle #${cycle.number}:`);
    console.log(`   • Weight: ${cycle.weight}`);
    console.log(`   • Discount Rate: ${cycle.discountRate}`);
    console.log(`   • Duration: ${cycle.duration} seconds`);
    console.log(`   • Target: ${cycle.target} wei`);
    console.log(`   • Currency: ${cycle.currency}`);
    console.log(`   • Start: ${new Date(cycle.start * 1000).toISOString()}`);
    console.log(`   • End: ${new Date(cycle.end * 1000).toISOString()}`);
    
    if (cycle.metadata) {
      console.log(`   • Metadata: ${JSON.stringify(cycle.metadata)}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(80));
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
 * Main function to run the project configuration query
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const projectId = parseInt(args[0]) || 53;   // Default to 53 if not provided
  const chainId = parseInt(args[1]) || 8453;   // Default to Base (8453) if not provided

  console.log('🔍 Bendystraw Project Configuration Query');
  console.log('=' .repeat(50));
  console.log(`📊 Project ID: ${projectId}`);
  console.log(`⛓️  Chain ID: ${chainId} (${chainId === 8453 ? 'Base' : chainId === 1 ? 'Ethereum' : chainId === 10 ? 'Optimism' : chainId === 42161 ? 'Arbitrum' : 'Unknown'})`);
  console.log('');

  try {
    // Fetch project configuration
    const project = await fetchProjectConfig(projectId, chainId);
    displayProjectConfig(project);
    
    // Fetch funding cycles
    try {
      const fundingCycles = await fetchFundingCycles(projectId, chainId);
      displayFundingCycles(fundingCycles);
    } catch (error) {
      console.log('⚠️  Could not fetch funding cycles:', error.message);
    }
    
    // Fetch permission holders
    try {
      const permissionHolders = await fetchPermissionHolders(projectId, chainId, 100);
      displayPermissionHolders(permissionHolders);
    } catch (error) {
      console.log('⚠️  Could not fetch permission holders:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fetchProjectConfig, fetchFundingCycles, fetchPermissionHolders };
