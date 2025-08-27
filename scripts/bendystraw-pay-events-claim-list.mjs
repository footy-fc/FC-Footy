#!/usr/bin/env node

import fetch from 'node-fetch';

const BENDYSTRAW_API_KEY = "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";
const NEYNAR_API_KEY = "DF367E27-ECE3-4D8E-B820-D24A7A07B104";

async function getPayEventsClaimList() {
  console.log("📋 Generating Bendystraw Pay Events Claim List\n");

  try {
    // Get pay events from Bendystraw for Base chain project 53
    const query = `
      query GetPayEvents {
        payEvents(
          where: {
            projectId: 53
            chainId: 8453
          }
          orderBy: "timestamp"
          orderDirection: "desc"
          limit: 100
        ) {
          items {
            id
            timestamp
            from
            amount
            amountUsd
            projectId
            chainId
          }
        }
      }
    `;

    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', JSON.stringify(result.errors, null, 2));
      return;
    }

    console.log(`✅ Found ${result.data.payEvents.items.length} pay events`);

    // Process pay events
    const payEventData = {};
    
    result.data.payEvents.items.forEach((event) => {
      const address = event.from.toLowerCase();
      
      if (!payEventData[address]) {
        payEventData[address] = {
          address: event.from,
          totalPaid: 0,
          totalPaidUSD: 0,
          eventCount: 0,
          firstEvent: new Date(event.timestamp * 1000),
          lastEvent: new Date(event.timestamp * 1000)
        };
      }
      
      payEventData[address].totalPaid += parseFloat(event.amount);
      payEventData[address].totalPaidUSD += parseFloat(event.amountUsd || '0');
      payEventData[address].eventCount += 1;
      
      const eventDate = new Date(event.timestamp * 1000);
      if (eventDate < payEventData[address].firstEvent) payEventData[address].firstEvent = eventDate;
      if (eventDate > payEventData[address].lastEvent) payEventData[address].lastEvent = eventDate;
    });

    // Get unique addresses
    const addresses = Object.keys(payEventData);
    console.log(`📊 Processing ${addresses.length} unique contributors`);

    // Get Farcaster profiles for all addresses
    const addressesParam = addresses.join(',');
    
    const profileResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addressesParam}&address_types=ethereum`, {
      method: 'GET',
      headers: {
        'api_key': NEYNAR_API_KEY
      }
    });

    const profileResult = await profileResponse.json();

    // Helper function to get user info
    const getUserInfo = (address) => {
      const users = profileResult[address] || [];
      const user = users[0];
      return {
        fid: user ? user.fid : 'N/A',
        username: user ? user.username : 'Anonymous'
      };
    };

    // Convert wei to ETH for display
    const weiToEth = (wei) => {
      const eth = parseFloat(wei) / Math.pow(10, 18);
      return eth.toFixed(6);
    };

    // Sort by total paid amount
    const sortedContributors = Object.values(payEventData)
      .sort((a, b) => b.totalPaid - a.totalPaid);

    // Generate claim list
    console.log('📄 Bendystraw Pay Events Claim List');
    console.log('===================================\n');
    console.log('const payEventsClaimList: { address: string; amount: string }[] = [');
    
    sortedContributors.forEach((contributor, index) => {
      const user = getUserInfo(contributor.address);
      const amountEth = weiToEth(contributor.totalPaid);
      const isLast = index === sortedContributors.length - 1;
      const comma = isLast ? '' : ',';
      
      console.log(`    { address: "${contributor.address}", amount: "${amountEth}" }${comma} // @${user.username} (FID: ${user.fid}) - ${contributor.eventCount} payments`);
    });
    
    console.log('];');

    // Summary statistics
    console.log(`\n📈 Summary:`);
    console.log(`Total Contributors: ${sortedContributors.length}`);
    console.log(`Total Pay Events: ${result.data.payEvents.items.length}`);
    console.log(`Total Amount Paid: ${weiToEth(sortedContributors.reduce((sum, c) => sum + c.totalPaid, 0))} ETH`);
    console.log(`Total USD Value: $${sortedContributors.reduce((sum, c) => sum + c.totalPaidUSD, 0).toFixed(2)}`);
    
    // Farcaster stats
    const withFarcaster = sortedContributors.filter(c => {
      const user = getUserInfo(c.address);
      return user.fid !== 'N/A';
    });
    
    console.log(`Contributors with Farcaster: ${withFarcaster.length} (${(withFarcaster.length/sortedContributors.length*100).toFixed(1)}%)`);

    // Show top contributors
    console.log(`\n🏆 Top 5 Contributors:`);
    sortedContributors.slice(0, 5).forEach((contributor, index) => {
      const user = getUserInfo(contributor.address);
      const amountEth = weiToEth(contributor.totalPaid);
      console.log(`${index + 1}. @${user.username} (FID: ${user.fid}) - ${amountEth} ETH (${contributor.eventCount} payments)`);
    });

  } catch (error) {
    console.error('❌ Error generating pay events claim list:', error.message);
  }
}

getPayEventsClaimList();
