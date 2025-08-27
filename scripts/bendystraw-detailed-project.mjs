#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BENDYSTRAW_API_KEY = process.env.BENDYSTRAW_API_KEY || "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";

// GraphQL query for detailed project information
const DETAILED_PROJECT_QUERY = `
  query GetDetailedProject($projectId: Float!, $chainId: Float!) {
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

// GraphQL query for events to find buyback hooks and terminals
const PROJECT_EVENTS_QUERY = `
  query GetProjectEvents($projectId: Float!, $chainId: Float!) {
    events(
      limit: 100,
      where: {projectId: $projectId, chainId: $chainId},
      orderBy: "timestamp",
      orderDirection: "desc"
    ) {
      items {
        id
        type
        projectId
        chainId
        timestamp
        from
        to
        amount
        amountUsd
        metadata
      }
    }
  }
`;

// GraphQL query for pay events to understand project structure
const PAY_EVENTS_QUERY = `
  query GetPayEvents($projectId: Int!, $chainId: Int!) {
    payEvents(
      limit: 10,
      where: {projectId: $projectId, chainId: $chainId},
      orderBy: "timestamp",
      orderDirection: "desc"
    ) {
      items {
        id
        projectId
        chainId
        from
        amount
        amountUsd
        beneficiary
        timestamp
      }
    }
  }
`;

/**
 * Fetch detailed project information
 */
async function fetchDetailedProject(projectId, chainId) {
  try {
    console.log(`🔍 Fetching detailed project info for project ${projectId} on chain ${chainId}...`);
    
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: DETAILED_PROJECT_QUERY,
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
    console.error('❌ Failed to fetch detailed project:', error.message);
    throw error;
  }
}

/**
 * Fetch project events
 */
async function fetchProjectEvents(projectId, chainId) {
  try {
    console.log(`🔍 Fetching project events for project ${projectId} on chain ${chainId}...`);
    
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: PROJECT_EVENTS_QUERY,
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

    return result.data.events.items;
  } catch (error) {
    console.error('❌ Failed to fetch project events:', error.message);
    throw error;
  }
}

/**
 * Fetch pay events
 */
async function fetchPayEvents(projectId, chainId) {
  try {
    console.log(`🔍 Fetching pay events for project ${projectId} on chain ${chainId}...`);
    
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: PAY_EVENTS_QUERY,
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

    return result.data.payEvents.items;
  } catch (error) {
    console.error('❌ Failed to fetch pay events:', error.message);
    throw error;
  }
}

/**
 * Display project information
 */
function displayProjectInfo(project) {
  console.log(`\n📋 Project Information for Project ${project.projectId} (Chain ${project.chainId})`);
  console.log('=' .repeat(80));
  
  console.log(`✅ Project ID: ${project.projectId}`);
  console.log(`⛓️  Chain ID: ${project.chainId} (${project.chainId === 8453 ? 'Base' : project.chainId === 1 ? 'Ethereum' : project.chainId === 10 ? 'Optimism' : project.chainId === 42161 ? 'Arbitrum' : 'Unknown'})`);
  console.log(`💰 Balance: ${project.balance} wei (${(parseFloat(project.balance) / Math.pow(10, 18)).toFixed(6)} ETH)`);
  console.log(`📊 Volume: ${project.volume} wei (${(parseFloat(project.volume) / Math.pow(10, 18)).toFixed(6)} ETH)`);
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
 * Display project events
 */
function displayProjectEvents(events) {
  console.log(`\n📅 Project Events`);
  console.log('=' .repeat(80));
  
  if (!events || events.length === 0) {
    console.log('❌ No events found');
    return;
  }

  console.log(`✅ Found ${events.length} events\n`);
  
  // Group events by type
  const eventTypes = {};
  events.forEach(event => {
    if (!eventTypes[event.type]) {
      eventTypes[event.type] = [];
    }
    eventTypes[event.type].push(event);
  });
  
  Object.keys(eventTypes).forEach(type => {
    console.log(`📋 ${type.toUpperCase()} (${eventTypes[type].length} events):`);
    eventTypes[type].slice(0, 3).forEach(event => {
      const date = new Date(event.timestamp * 1000).toISOString();
      console.log(`   • ${date}: ${event.from} → ${event.to || 'N/A'} (${event.amount} wei)`);
    });
    if (eventTypes[type].length > 3) {
      console.log(`   ... and ${eventTypes[type].length - 3} more`);
    }
    console.log('');
  });
  
  console.log('='.repeat(80));
}

/**
 * Display pay events
 */
function displayPayEvents(payEvents) {
  console.log(`\n💰 Pay Events`);
  console.log('=' .repeat(80));
  
  if (!payEvents || payEvents.length === 0) {
    console.log('❌ No pay events found');
    return;
  }

  console.log(`✅ Found ${payEvents.length} pay events\n`);
  
  payEvents.forEach((event, index) => {
    const date = new Date(event.timestamp * 1000).toISOString();
    const amountEth = (parseFloat(event.amount) / Math.pow(10, 18)).toFixed(6);
    console.log(`${index + 1}. ${date}:`);
    console.log(`   From: ${event.from}`);
    console.log(`   Amount: ${amountEth} ETH (${event.amountUsd} USD)`);
    console.log(`   Beneficiary: ${event.beneficiary}`);
    console.log('');
  });
  
  console.log('='.repeat(80));
}

/**
 * Analyze for buyback hooks and swap terminals
 */
function analyzeProjectStructure(project, events, payEvents) {
  console.log(`\n🔍 Project Structure Analysis`);
  console.log('=' .repeat(80));
  
  console.log('📋 Looking for buyback hooks and swap terminals...\n');
  
  // Check for buyback-related events
  const buybackEvents = events?.filter(e => 
    e.type?.toLowerCase().includes('buyback') || 
    e.type?.toLowerCase().includes('redeem') ||
    e.metadata?.includes('buyback')
  ) || [];
  
  if (buybackEvents.length > 0) {
    console.log(`🔄 Buyback Events Found (${buybackEvents.length}):`);
    buybackEvents.forEach(event => {
      console.log(`   • ${event.type}: ${event.from} → ${event.to || 'N/A'}`);
    });
  } else {
    console.log('❌ No buyback events found');
  }
  
  // Check for swap/terminal related events
  const swapEvents = events?.filter(e => 
    e.type?.toLowerCase().includes('swap') || 
    e.type?.toLowerCase().includes('terminal') ||
    e.metadata?.includes('swap') ||
    e.metadata?.includes('terminal')
  ) || [];
  
  if (swapEvents.length > 0) {
    console.log(`\n💱 Swap/Terminal Events Found (${swapEvents.length}):`);
    swapEvents.forEach(event => {
      console.log(`   • ${event.type}: ${event.from} → ${event.to || 'N/A'}`);
    });
  } else {
    console.log('\n❌ No swap/terminal events found');
  }
  
  // Check pay events for patterns
  if (payEvents && payEvents.length > 0) {
    console.log(`\n💰 Pay Events Analysis:`);
    console.log(`   • Total pay events: ${payEvents.length}`);
    console.log(`   • Latest pay: ${new Date(payEvents[0].timestamp * 1000).toISOString()}`);
    console.log(`   • Total volume: ${(parseFloat(project.volume) / Math.pow(10, 18)).toFixed(6)} ETH`);
  }
  
  console.log('\n📝 Note: For detailed contract addresses (buyback hooks, swap terminals),');
  console.log('   you may need to query the Juicebox protocol contracts directly');
  console.log('   or check the project\'s funding cycle configuration.');
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const projectId = parseInt(args[0]) || 53;
  const chainId = parseInt(args[1]) || 8453;

  console.log('🔍 Bendystraw Detailed Project Analysis');
  console.log('=' .repeat(50));
  console.log(`📊 Project ID: ${projectId}`);
  console.log(`⛓️  Chain ID: ${chainId} (${chainId === 8453 ? 'Base' : chainId === 1 ? 'Ethereum' : chainId === 10 ? 'Optimism' : chainId === 42161 ? 'Arbitrum' : 'Unknown'})`);
  console.log('');

  try {
    const project = await fetchDetailedProject(projectId, chainId);
    displayProjectInfo(project);
    
    // Note: Events query not available in current Bendystraw schema
    console.log('⚠️  Project events query not available in current Bendystraw schema');
    
    let payEvents = null;
    try {
      payEvents = await fetchPayEvents(projectId, chainId);
      displayPayEvents(payEvents);
    } catch (error) {
      console.log('⚠️  Could not fetch pay events:', error.message);
    }
    
    // Analyze project structure
    analyzeProjectStructure(project, null, payEvents);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fetchDetailedProject, fetchProjectEvents, fetchPayEvents };
