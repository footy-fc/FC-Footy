#!/usr/bin/env node

// Pay events contributors from Bendystraw
const payEventsContributors = [
    "0xdf087b724174a3e4ed2338c0798193932e851f1b",
    "0x7c527d956f47920fec38dfc5834fe31b5a72db12",
    "0xa32ad653ddb29aafaf67ca906f7bcee145444746",
    "0xe423b19262ea8fbc68ab9509f90080ab6aa1930b",
    "0x34520adcaccb7d698a038831ec00bdd8bcd3942f",
    "0xa502a06c1f3c2605eb16bec110ce14404a031810",
    "0xbe95bb47789e5f4af467306c97ded0877bf817b5",
    "0xa499ccf474840fbeab6eb58a23b487fe99de6d9e",
    "0xf41b246040ffde54554a64081cae788822caa5d0",
    "0x172a77d409c0aa422ee88514181765372c1eb8f1",
    "0x307f9cc8650862e0815adf833b9125f4e0ed4055",
    "0x3944cc1a70c4be8ad75f456ba0ab525b02ad827a",
    "0x30e5a4e6a52b2d6b891454a0fd04938732c55193",
    "0x346da3233271e9a80981278443324be5dfc55955",
    "0x00d6d1bda9ca0cd4a04ee1fb3563a3525f1dff23",
    "0x868d077d5ae521e972d0494486807363e9d65604",
    "0x59733c7cd78d08dab90368ad2cc09c8c81f097c0",
    "0xc9ed679962e0d4e82d6ebc12ee3f0561f44f23c6",
    "0x9eb59cd29db306f09a7c8dfe22e0b7574c6d4fb3",
    "0xaa23bb616192b9f596945a088ed4febfb2d71efe",
    "0x6d55b0cd0f28f0066fee721037c466813980842c",
    "0x29652b15678190fdaa4f19e474d9a8b0cb281884",
    "0xd890974185f65cda87ed14add68b154c8950cadd",
    "0x7dddc4d43639eb2c2be85ac621328bf8b0482546",
    "0xfd0725b9fd15b983514b8b99fb70e2ae018c9a8d"
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

function comparePayEventsVsHolders() {
    console.log("🔄 Comparing Pay Events Contributors vs Current SCORES Holders\n");
    
    // Create a map of current holders
    const holdersMap = {};
    currentScoresHolders.forEach(holder => {
        holdersMap[holder.address.toLowerCase()] = holder;
    });
    
    // Check which pay events contributors are still holding
    const stillHolding = [];
    const soldOut = [];
    
    payEventsContributors.forEach(address => {
        const addressLower = address.toLowerCase();
        const holder = holdersMap[addressLower];
        
        if (holder) {
            stillHolding.push({
                address,
                amount: holder.amount,
                percentage: holder.percentage
            });
        } else {
            soldOut.push(address);
        }
    });
    
    console.log("✅ Pay Events Contributors Still Holding SCORES:");
    console.log("================================================\n");
    
    if (stillHolding.length > 0) {
        console.log('const payEventsContributorsStillHolding: { address: string; amount: string }[] = [');
        
        stillHolding.forEach((holder, index) => {
            const isLast = index === stillHolding.length - 1;
            const comma = isLast ? '' : ',';
            
            console.log(`    { address: "${holder.address}", amount: "${holder.amount}" }${comma} // ${holder.percentage}%`);
        });
        
        console.log('];');
        
        // Summary for still holding
        const totalScores = stillHolding.reduce((sum, holder) => sum + parseFloat(holder.amount), 0);
        const totalPercentage = stillHolding.reduce((sum, holder) => sum + parseFloat(holder.percentage), 0);
        
        console.log(`\n📊 Still Holding Summary:`);
        console.log(`Contributors Still Holding: ${stillHolding.length}/${payEventsContributors.length} (${(stillHolding.length/payEventsContributors.length*100).toFixed(1)}%)`);
        console.log(`Total SCORES Still Held: ${totalScores.toLocaleString()}`);
        console.log(`Total Percentage: ${totalPercentage.toFixed(3)}%`);
        
        console.log(`\n🏆 Top Contributors Still Holding:`);
        stillHolding
            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
            .forEach((holder, index) => {
                console.log(`${index + 1}. ${holder.address}: ${parseFloat(holder.amount).toLocaleString()} SCORES (${holder.percentage}%)`);
            });
    } else {
        console.log("❌ No pay events contributors are still holding SCORES tokens.");
    }
    
    console.log(`\n❌ Contributors Who Sold Out (${soldOut.length}):`);
    soldOut.forEach((address, index) => {
        console.log(`${index + 1}. ${address}`);
    });
    
    // Show new holders who weren't in pay events
    const payEventsSet = new Set(payEventsContributors.map(a => a.toLowerCase()));
    const newHolders = currentScoresHolders.filter(holder => !payEventsSet.has(holder.address.toLowerCase()));
    
    console.log(`\n🆕 New Holders (Not in Pay Events) - Top 10:`);
    newHolders
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
        .slice(0, 10)
        .forEach((holder, index) => {
            console.log(`${index + 1}. ${holder.address}: ${parseFloat(holder.amount).toLocaleString()} SCORES (${holder.percentage}%)`);
        });
}

comparePayEventsVsHolders();
