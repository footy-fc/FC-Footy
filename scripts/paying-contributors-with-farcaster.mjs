#!/usr/bin/env node

import fetch from 'node-fetch';

const NEYNAR_API_KEY = "DF367E27-ECE3-4D8E-B820-D24A7A07B104";

// Pay events contributors from Bendystraw with their paid amounts
const payEventsContributors = [
    { address: "0xdf087b724174a3e4ed2338c0798193932e851f1b", paid: "0.106210" },
    { address: "0x7c527d956f47920fec38dfc5834fe31b5a72db12", paid: "0.100000" },
    { address: "0xa32ad653ddb29aafaf67ca906f7bcee145444746", paid: "0.100000" },
    { address: "0xe423b19262ea8fbc68ab9509f90080ab6aa1930b", paid: "0.031000" },
    { address: "0x34520adcaccb7d698a038831ec00bdd8bcd3942f", paid: "0.030000" },
    { address: "0xa502a06c1f3c2605eb16bec110ce14404a031810", paid: "0.025000" },
    { address: "0xbe95bb47789e5f4af467306c97ded0877bf817b5", paid: "0.021000" },
    { address: "0xa499ccf474840fbeab6eb58a23b487fe99de6d9e", paid: "0.020000" },
    { address: "0xf41b246040ffde54554a64081cae788822caa5d0", paid: "0.010000" },
    { address: "0x172a77d409c0aa422ee88514181765372c1eb8f1", paid: "0.010000" },
    { address: "0x307f9cc8650862e0815adf833b9125f4e0ed4055", paid: "0.010000" },
    { address: "0x3944cc1a70c4be8ad75f456ba0ab525b02ad827a", paid: "0.010000" },
    { address: "0x30e5a4e6a52b2d6b891454a0fd04938732c55193", paid: "0.003000" },
    { address: "0x346da3233271e9a80981278443324be5dfc55955", paid: "0.002000" },
    { address: "0x00d6d1bda9ca0cd4a04ee1fb3563a3525f1dff23", paid: "0.002000" },
    { address: "0x868d077d5ae521e972d0494486807363e9d65604", paid: "0.002000" },
    { address: "0x59733c7cd78d08dab90368ad2cc09c8c81f097c0", paid: "0.001266" },
    { address: "0xc9ed679962e0d4e82d6ebc12ee3f0561f44f23c6", paid: "0.001000" },
    { address: "0x9eb59cd29db306f09a7c8dfe22e0b7574c6d4fb3", paid: "0.001000" },
    { address: "0xaa23bb616192b9f596945a088ed4febfb2d71efe", paid: "0.000215" },
    { address: "0x6d55b0cd0f28f0066fee721037c466813980842c", paid: "0.000100" },
    { address: "0x29652b15678190fdaa4f19e474d9a8b0cb281884", paid: "0.000100" },
    { address: "0xd890974185f65cda87ed14add68b154c8950cadd", paid: "0.000062" },
    { address: "0x7dddc4d43639eb2c2be85ac621328bf8b0482546", paid: "0.000010" },
    { address: "0xfd0725b9fd15b983514b8b99fb70e2ae018c9a8d", paid: "0.000010" }
];

// Current SCORES holders data
const currentScoresHolders = [
    { address: "0x727556f2aff622797228cc80cf6af46b10ad126e", amount: "813000", percentage: "3.541" },
    { address: "0x7c527d956f47920fec38dfc5834fe31b5a72db12", amount: "85000", percentage: "0.367" },
    { address: "0xe423b19262ea8fbc68ab9509f90080ab6aa1930b", amount: "80000", percentage: "0.346" },
    { address: "0xa499ccf474840fbeab6eb58a23b487fe99de6d9e", amount: "52000", percentage: "0.226" },
    { address: "0xa32ad653ddb29aafaf67ca906f7bcee145444746", amount: "51000", percentage: "0.219" },
    { address: "0x346da3233271e9a80981278443324be5dfc55955", amount: "43000", percentage: "0.185" },
    { address: "0x30e5a4e6a52b2d6b891454a0fd04938732c55193", amount: "20000", percentage: "0.088" },
    { address: "0xe97c29b17ed7d742e3843affa357449fa10a1855", amount: "17000", percentage: "0.071" },
    { address: "0x34520adcaccb7d698a038831ec00bdd8bcd3942f", amount: "15000", percentage: "0.065" },
    { address: "0xa502a06c1f3c2605eb16bec110ce14404a031810", amount: "13000", percentage: "0.054" },
    { address: "0x5e3cd56eaab5f45a8f09337555ce03d36bb08ebe", amount: "6000", percentage: "0.026" },
    { address: "0x3944cc1a70c4be8ad75f456ba0ab525b02ad827a", amount: "5000", percentage: "0.021" },
    { address: "0x307f9cc8650862e0815adf833b9125f4e0ed4055", amount: "5000", percentage: "0.021" },
    { address: "0xd3015cc7496ea1ec539b05347323b1afeeefdcf6", amount: "4000", percentage: "0.019" },
    { address: "0x56af02fb34fe93cf172d339df34e448dc97f324d", amount: "4000", percentage: "0.017" },
    { address: "0x172a77d409c0aa422ee88514181765372c1eb8f1", amount: "3000", percentage: "0.013" },
    { address: "0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828", amount: "3000", percentage: "0.012" },
    { address: "0xbe95bb47789e5f4af467306c97ded0877bf817b5", amount: "2000", percentage: "0.009" },
    { address: "0x00d6d1bda9ca0cd4a04ee1fb3563a3525f1dff23", amount: "2000", percentage: "0.008" },
    { address: "0x3d0438cf16e6bf871d1f28e18b5bb175762f3f7c", amount: "1000", percentage: "0.004" },
    { address: "0x1acbb32e13d98a6ca81f0fc52ecf455cc0abfdbf", amount: "1000", percentage: "0.004" },
    { address: "0x868d077d5ae521e972d0494486807363e9d65604", amount: "1000", percentage: "0.004" },
    { address: "0xf41b246040ffde54554a64081cae788822caa5d0", amount: "871.15", percentage: "0.003" },
    { address: "0x04cc449d711bf9612f423f01d567c69c5c7a843b", amount: "550", percentage: "0.002" },
    { address: "0xbbc721ac8b50244cd059df203d899e048f0833d7", amount: "534.90", percentage: "0.002" },
    { address: "0xfc6ef2aa4477dc317cc81a521e08bea8c4a83c01", amount: "534.32", percentage: "0.002" },
    { address: "0x0dc4175a845820d3742554a24c2bc59c780f5d56", amount: "524.23", percentage: "0.002" },
    { address: "0xd3c2c5edc949b48d5e64486da020c9f52fa502e3", amount: "508.46", percentage: "0.002" },
    { address: "0x08aeba13caf4b279e107cd80f73b50171a75b261", amount: "500", percentage: "0.002" }
];

async function fetchFarcasterProfiles(addresses) {
    console.log("🔍 Fetching Farcaster profiles...");
    
    const addressesParam = addresses.join(',');
    
    try {
        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addressesParam}&address_types=ethereum`, {
            method: 'GET',
            headers: {
                'api_key': NEYNAR_API_KEY
            }
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('❌ Error fetching Farcaster profiles:', error.message);
        return {};
    }
}

async function generatePayingContributorsWithFarcaster() {
    console.log("📄 Paying Contributors with Farcaster Profiles");
    console.log("==============================================\n");
    
    // Create a map of current holders
    const holdersMap = {};
    currentScoresHolders.forEach(holder => {
        holdersMap[holder.address.toLowerCase()] = holder;
    });
    
    // Combine pay events data with current holdings
    const combinedData = payEventsContributors.map(contributor => {
        const addressLower = contributor.address.toLowerCase();
        const holder = holdersMap[addressLower];
        
        return {
            address: contributor.address,
            paid: contributor.paid,
            scoresHeld: holder ? holder.amount : "0",
            percentage: holder ? holder.percentage : "0"
        };
    });
    
    // Get all addresses for Farcaster lookup
    const addresses = combinedData.map(item => item.address);
    const farcasterProfiles = await fetchFarcasterProfiles(addresses);
    
    // Helper function to get user info
    const getUserInfo = (address) => {
        const users = farcasterProfiles[address] || [];
        const user = users[0];
        return {
            fid: user ? user.fid : 'N/A',
            username: user ? user.username : 'Anonymous'
        };
    };
    
    // Sort by amount paid (descending)
    combinedData.sort((a, b) => parseFloat(b.paid) - parseFloat(a.paid));
    
    console.log('const payingContributorsWithScores: { address: string; amount: string }[] = [');
    
    combinedData.forEach((item, index) => {
        const isLast = index === combinedData.length - 1;
        const comma = isLast ? '' : ',';
        const status = parseFloat(item.scoresHeld) > 0 ? 'HOLDING' : 'SOLD';
        const user = getUserInfo(item.address);
        
        console.log(`    { address: "${item.address}", amount: "${item.scoresHeld}" }${comma} // @${user.username} (FID: ${user.fid}) - ${status} - ${item.percentage}%`);
    });
    
    console.log('];');
    
    // Summary statistics
    const totalPaid = combinedData.reduce((sum, item) => sum + parseFloat(item.paid), 0);
    const totalScoresHeld = combinedData.reduce((sum, item) => sum + parseFloat(item.scoresHeld), 0);
    const stillHolding = combinedData.filter(item => parseFloat(item.scoresHeld) > 0);
    const soldOut = combinedData.filter(item => parseFloat(item.scoresHeld) === 0);
    
    // Farcaster stats
    const withFarcaster = combinedData.filter(item => {
        const user = getUserInfo(item.address);
        return user.fid !== 'N/A';
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`Total Contributors: ${combinedData.length}`);
    console.log(`Total ETH Paid: ${totalPaid.toFixed(6)} ETH`);
    console.log(`Total SCORES Still Held: ${totalScoresHeld.toLocaleString()}`);
    console.log(`Still Holding: ${stillHolding.length} (${(stillHolding.length/combinedData.length*100).toFixed(1)}%)`);
    console.log(`Sold Out: ${soldOut.length} (${(soldOut.length/combinedData.length*100).toFixed(1)}%)`);
    console.log(`With Farcaster: ${withFarcaster.length} (${(withFarcaster.length/combinedData.length*100).toFixed(1)}%)`);
    
    // Top 10 by amount paid with Farcaster info
    console.log(`\n🏆 Top 10 Contributors by Amount Paid:`);
    combinedData.slice(0, 10).forEach((item, index) => {
        const status = parseFloat(item.scoresHeld) > 0 ? 'HOLDING' : 'SOLD';
        const user = getUserInfo(item.address);
        console.log(`${index + 1}. @${user.username} (FID: ${user.fid}): ${item.paid} ETH paid, ${parseFloat(item.scoresHeld).toLocaleString()} SCORES held (${status})`);
    });
    
    // Top 10 by SCORES held with Farcaster info
    const sortedByScores = [...combinedData].sort((a, b) => parseFloat(b.scoresHeld) - parseFloat(a.scoresHeld));
    console.log(`\n🏆 Top 10 Contributors by SCORES Held:`);
    sortedByScores.slice(0, 10).forEach((item, index) => {
        if (parseFloat(item.scoresHeld) > 0) {
            const user = getUserInfo(item.address);
            console.log(`${index + 1}. @${user.username} (FID: ${user.fid}): ${parseFloat(item.scoresHeld).toLocaleString()} SCORES (${item.percentage}%) - paid ${item.paid} ETH`);
        }
    });
}

generatePayingContributorsWithFarcaster();
