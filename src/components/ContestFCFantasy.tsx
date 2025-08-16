/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { sdk as frameSdk, sdk } from "@farcaster/miniapp-sdk";
import FantasyRow from './ContestFantasyRow';
import { fetchFantasyData } from './utils/fetchFantasyData';
import { usePrivy } from '@privy-io/react-auth';
import { toPng } from 'html-to-image';
import dayjs from 'dayjs';
import { useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { ethers } from 'ethers';
import { useWriteContract } from 'wagmi';
import { CONTRACT_ADDRESS_FEPL, CONTRACT_ABI_FEPL } from '../constants/contracts';

// Define FantasyEntry type to match fetchFantasyData return type
type FantasyEntry = {
  id: number;
  rank: number;
  manager: string;
  teamName: string;
  totalPoints: number;
  eventTotal: number;
  entry: number;
  entryName: string;
  fid?: number;
  team?: {
    name: string | null;
    logo: string | null;
  };
};

const testing = false; // Toggle this for testing - will not mint NFTs


const ContestFCFantasy = () => {
  const [fantasyData, setFantasyData] = useState<FantasyEntry[]>([]);
  const [loadingFantasy, setLoadingFantasy] = useState(false);
  const [errorFantasy, setErrorFantasy] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<FantasyEntry | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | JSX.Element>('');
  const [mintingInProgress, setMintingInProgress] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isContextLoaded, setIsContextLoaded] = useState<boolean>(false);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [imageCid, setImageCid] = useState<string | null>(null);
  const [metadataCid, setMetadataCid] = useState<string | null>(null);
  const [currentUserFid, setCurrentUserFid] = useState<number | null>(null);
  const [cardPfpUrl, setCardPfpUrl] = useState<string>('/defifa_spinner.gif');
  
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = usePrivy();

  const farcasterAccount = user?.linkedAccounts.find(
    (account) => account.type === 'farcaster'
  );

  const { writeContractAsync } = useWriteContract();
  const userAddress = user?.wallet?.address || '0x0000000000000000000000000000000000000000';
  
/*   console.log('🔍 Contract query setup:', {
    contractAddress: CONTRACT_ADDRESS_FEPL,
    userFid: currentUserFid,
    userAddress,
    userWalletAddress: user?.wallet?.address,
    hasBalanceOfFunction: CONTRACT_ABI_FEPL.some((func: any) => func.name === 'balanceOf')
  });
 */
  const { data: userBalance } = useReadContract({
    address: CONTRACT_ADDRESS_FEPL,
    abi: CONTRACT_ABI_FEPL,
    functionName: 'balanceOf',
    args: [userAddress],
    query: {
      enabled: !!user?.wallet?.address && !!CONTRACT_ADDRESS_FEPL,
    },
  });

  useEffect(() => {
    const loadContext = async () => {
      try {
        const ctx = await frameSdk.context;
        //console.log("Farcaster context loaded:",JSON.stringify(ctx, null, 2));
        if (!ctx) {
          console.log("Farcaster context returned null or undefined.");
          return;
        }
        setIsContextLoaded(true);
        setCurrentUserFid(ctx.user?.fid || null);
        //console.log('🔍 Farcaster context user:', ctx.user);
      } catch (error) {
        console.error("Failed to load Farcaster context:", error);
      }
    };
    if (!isContextLoaded) {
      loadContext();
    }
  }, [isContextLoaded]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      const startTime = Date.now();
      console.log('🚀 Starting fantasy data fetch...');
      
      setLoadingFantasy(true);
      try {
        const data = await fetchFantasyData();
        
        if (!isMounted) return; // Prevent setting state if component unmounted
        
        console.log(`✅ Fantasy data fetched in ${Date.now() - startTime}ms`);
        
        const rankedData = data.map((item, i) => ({
          ...item,
          rank: item.rank ?? i + 1,
        }));
        setFantasyData(rankedData);
        console.log(`✅ Data processed and set in ${Date.now() - startTime}ms total`);
      } catch (error) {
        if (!isMounted) return;
        
        console.error(`❌ Error fetching fantasy data after ${Date.now() - startTime}ms:`, error);
        setErrorFantasy(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        if (isMounted) {
          setLoadingFantasy(false);
        }
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const { data: txReceipt, error: txError } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  
  useEffect(() => {
    if (txReceipt) {
      console.log('✅ NFT Minted:', txReceipt);
      setStatusMessage(
        <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline text-blue-300">
          🎉 NFT Minted! View Tx
        </a>
      );
      setMintingInProgress(false);
      setTxHash(undefined);
    } else if (txError) {
      console.error('❌ Transaction failed:', txError);
      setStatusMessage('User Rejected');
      setMintingInProgress(false);
      
      // Auto-dismiss error message after 2 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 2000);
    }
  }, [txReceipt, txError]);



  const forceDOMUpdate = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve(); // Resolves with no value (undefined), which satisfies void
      });
    });
  };

  const handleCheckHash = async () => {
    if (!cardRef.current) return;
    const currentCardEntry = selectedEntry || defaultCardEntry;
    if (!currentCardEntry) {
      setStatusMessage('❌ No card entry selected.');
      return;
    }

    setMintingInProgress(true);
    setStatusMessage('🖼️ Preparing card image...');

    try {
      await forceDOMUpdate();
      await waitForDOMUpdate();
      await document.fonts.ready;
      await waitForImagesToLoad(cardRef);
      cardRef.current.getBoundingClientRect();
      await new Promise((resolve) => setTimeout(resolve, 500));

      setStatusMessage('🎨 Converting to PNG...');

      const dataUrl = await toPng(cardRef.current, {
        style: { fontFamily: 'VT323, monospace' },
        cacheBust: true,
      });

      setStatusMessage('🌐 Uploading image...');
      const blob = await (await fetch(dataUrl)).blob();
      const response = await fetch('/api/upload', { method: 'POST', body: blob });
      const result: { ipfsHash: string } = await response.json();

      if (!response.ok) {
        throw new Error('Image upload failed');
      }

      const imageCid = result.ipfsHash;
      console.log('✅ Image uploaded to IPFS:', imageCid);

      setStatusMessage('📁 Uploading metadata...');
      const metadataCid = await uploadMetadataToIPFS(imageCid, currentCardEntry);

      if (!metadataCid) throw new Error('Metadata upload failed');

      console.log('✅ Metadata uploaded:', metadataCid);

      setStatusMessage(
        <div>
          <p>✅ Image CID: {imageCid}</p>
          <p>✅ Metadata CID: {metadataCid}</p>
        </div>
      );

    } catch (error) {
      console.error('❌ Error during hash check:', error);
      setStatusMessage(`❌ Error: ${(error as Error).message}`);
    } finally {
      setMintingInProgress(false);
    }
  };
  
  
  // Find the current user's entry in the fantasy data
  const currentUserEntry = currentUserFid 
    ? fantasyData.find((entry) => entry.fid === currentUserFid)
    : null;

  // Only show card if user has explicitly selected an entry
  const defaultCardEntry = selectedEntry;

    const waitForImagesToLoad = async (ref: React.RefObject<HTMLElement>): Promise<void> => {
      if (!ref.current) return;
    
      const images = ref.current.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
      const promises: Promise<void>[] = [];
    
      images.forEach((img) => {
        if (img.complete && img.naturalHeight !== 0) {
          promises.push(img.decode().catch(() => {}));
        } else {
          promises.push(new Promise((resolve) => {
            img.onload = () => {
              img.decode().then(resolve).catch(resolve);
            };
            img.onerror = () => resolve();
          }));
        }
      });
    
      await Promise.all(promises);
    };
    
    
    
  
    const waitForDOMUpdate = (): Promise<void> => {
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve(); // Explicitly resolves the Promise with 'void'
        });
      });
    };

  // Fetch PFP for the selected entry
  useEffect(() => {
    const fetchCardPfp = async () => {
      if (!selectedEntry?.fid) {
        setCardPfpUrl('/defifa_spinner.gif');
        return;
      }

      try {
        // Fetch Farcaster profile data
        const response = await fetch(`https://hub.merv.fun/v1/userDataByFid?fid=${selectedEntry.fid}`);
        const data = await response.json();
        
        // Look for PFP in the user data
        const messages = data.messages || [];
        for (const message of messages) {
          if (message.data?.userDataBody?.type === 'USER_DATA_TYPE_PFP') {
            const pfp = message.data.userDataBody.value;
            if (pfp && pfp !== '/defifa_spinner.gif') {
              setCardPfpUrl(pfp);
              return;
            }
          }
        }
        
        // If no PFP found, use fallback
        setCardPfpUrl('/defifa_spinner.gif');
      } catch (error) {
        console.error('Error fetching PFP for card FID:', selectedEntry.fid, error);
        setCardPfpUrl('/defifa_spinner.gif');
      }
    };

    fetchCardPfp();
  }, [selectedEntry?.fid]);
    
  
    const handleRowSelect = async (selected: FantasyEntry) => {
      setSelectedEntry(selected);
      setImageCid(null);        // 👈 Reset image CID
      setMetadataCid(null);     // 👈 Reset metadata CID
      setStatusMessage('');
      setRenderKey((prev) => prev + 1);
    
      await forceDOMUpdate();
      await waitForImagesToLoad(cardRef);
    
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
  
  const uploadMetadataToIPFS = async (imageCid: string, cardEntry: FantasyEntry | undefined): Promise<string | null> => {
    try {
      const metadata = {
        name: `FC Footy NFT - ${cardEntry?.manager}`,
        description: `Fantasy Football rank card for ${cardEntry?.manager}.`,
        image: `ipfs://${imageCid}`,
        attributes: [
          { trait_type: 'License', value: 'CC0' },
          { trait_type: 'Theme', value: 'FC Footy Retro' },
          { trait_type: 'Rank', value: cardEntry?.rank || 'Unranked' },
          { trait_type: 'Points', value: cardEntry?.totalPoints || 0 },
        ],
      };
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: metadataBlob,
      });
      const result: { ipfsHash: string } = await response.json();
      return response.ok ? result.ipfsHash : null;
    } catch (error) {
      console.error('Metadata upload failed', error);
      return null;
    }
  };

  const handleMintImage = async () => {
    if (!cardRef.current) return;
  
    setMintingInProgress(true);
    setStatusMessage('🖼️ Preparing card image...');
  
    try {
      let localImageCid = imageCid;
      let localMetadataCid = metadataCid;
  
      if (!localImageCid || !localMetadataCid) {
        await forceDOMUpdate();
        await waitForDOMUpdate();
        await document.fonts.ready;
        await waitForImagesToLoad(cardRef);
        cardRef.current.getBoundingClientRect();
        await new Promise((resolve) => setTimeout(resolve, 500));
  
        setStatusMessage('🎨 Converting to PNG...');
  
        const dataUrl = await toPng(cardRef.current, {
          style: { fontFamily: 'VT323, monospace' },
          cacheBust: true,
        });
  
        setStatusMessage('🌐 Uploading image...');
        const blob = await (await fetch(dataUrl)).blob();
        const response = await fetch('/api/upload', { method: 'POST', body: blob });
        const result: { ipfsHash: string } = await response.json();
  
        if (!response.ok) {
          throw new Error('Image upload failed');
        }
  
        localImageCid = result.ipfsHash;
        setImageCid(localImageCid);
  
        setStatusMessage('📁 Uploading metadata...');
        localMetadataCid = await uploadMetadataToIPFS(localImageCid, cardEntry);
  
        if (!localMetadataCid) throw new Error('Metadata upload failed');
  
        setMetadataCid(localMetadataCid);
      }
  
      if (testing) {
        setStatusMessage('🧪 Test mode: Image and metadata uploaded. Minting skipped.');
        return;
      }
  
      setStatusMessage('🚀 Minting NFT...');
  
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS_FEPL,
        abi: CONTRACT_ABI_FEPL,
        functionName: 'mintAsWhitelisted',
        args: [`ipfs://${localMetadataCid}`],
        value: ethers.parseEther('0.0007'),
      });
  
      if (!tx) throw new Error('No valid transaction hash received');
  
      setTxHash(tx);
      setStatusMessage(
        <a href={`https://basescan.org/tx/${tx}`} target="_blank" className="underline text-blue-300">
          ⏳ Waiting for confirmation...
        </a>
      );
  
    } catch (error) {
      console.error('❌ Error during minting:', error);
      setStatusMessage('User Rejected');
      
      // Auto-dismiss error message after 2 seconds
      setTimeout(() => {
        setStatusMessage('');
      }, 2000);
    } finally {
      setMintingInProgress(false);
    }
  };
  
  const cardEntry = selectedEntry || defaultCardEntry || undefined;

  // Helper functions for league status
  const isUserInLeague = () => {
    return currentUserEntry !== null;
  };

  const getLeagueStatus = () => {
    if (loadingFantasy) return "Loading...";
    if (errorFantasy) return "Error loading league data";
    if (!fantasyData.length) return "No league data available";
    
    const memberCount = fantasyData.length;
    return `${memberCount} managers competing`;
  };

  // Debug logging
/*   console.log('🔍 Component state:', {
    currentUserFid,
    currentUserEntry: !!currentUserEntry,
    cardEntry: !!cardEntry,
    isUserInLeague: isUserInLeague()
  }); */

  return (
    <div>
      {/* League Status - Only show for non-members */}
      {!isUserInLeague() && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">Farcaster Fantasy EPL</h3>
            <p className="text-gray-300 text-sm mb-3">{getLeagueStatus()}</p>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <span>League ID: 18526</span>
              <span>•</span>
              <span>Season: 2025/26</span>
              <span>•</span>
              <span>Platform: Fantasy Premier League</span>
            </div>
            <button 
              onClick={async () => {
                try {
                  await sdk.actions.openUrl('https://fantasy.premierleague.com/leagues/18526/standings');
                } catch (error) {
                  console.error('Failed to open URL:', error);
                  window.open('https://fantasy.premierleague.com/leagues/18526/standings', '_blank');
                }
              }}
              className="mt-3 bg-deepPink hover:bg-fontRed text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Join League
            </button>
          </div>
        </div>
      )}
      
      {cardEntry && (
        <div
          ref={cardRef}
          key={renderKey} // 🔄 This forces React to fully re-render the element
          className="relative font-vt323 bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-2xl shadow-2xl border-4 border-gold overflow-hidden"
          style={{ width: '350px', height: '500px' }}
        >
          {/* 70s/80s Style Header */}
          <div className="text-center mb-6">
            <h1 className="text-yellow-300 text-3xl font-bold font-vt323 tracking-wider mb-1">
              SEASON PASS
            </h1>
            <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 rounded-full text-sm font-bold inline-block overflow-hidden">
              {/* Original Art: Geometric OG Badge */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400 opacity-80"></div>
              <div className="absolute top-1 left-1 w-2 h-2 bg-black rounded-full opacity-60"></div>
              <div className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full opacity-60"></div>
              <div className="absolute bottom-1 left-2 w-1 h-1 bg-black rounded-full opacity-40"></div>
              <div className="absolute bottom-1 right-2 w-1 h-1 bg-black rounded-full opacity-40"></div>
              <div className="relative z-10 font-vt323 tracking-wider">
                FOOTY APP OG SUPPORTER
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="relative mb-6">
            {/* Manager PFP - Large and Prominent */}
            <div className="w-full h-48 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-2 border-white overflow-hidden mb-4">
              <img
                src={cardPfpUrl}
                alt="Manager Avatar"
                className="w-full h-full object-cover"
                onLoad={() => console.log(`✅ Card PFP loaded for: ${cardEntry.manager}`)}
                onError={() => {
                  console.log(`🔄 Fallback PFP used for: ${cardEntry.manager}`);
                  setCardPfpUrl('/defifa_spinner.gif');
                }}
              />
            </div>

            {/* Favorite Team Logo - Positioned as a badge */}
            {cardEntry.team?.logo && (
              <div className="absolute top-2 right-2">
                <div className="bg-white rounded-full p-2 shadow-lg">
                  <img
                    src={cardEntry.team.logo}
                    alt="Favorite Club"
                    className="w-12 h-12 object-contain"
                    onLoad={() => console.log(`✅ Favorite club logo loaded for: ${cardEntry.team?.name}`)}
                    onError={() => console.log(`🔄 Fallback club logo used for: ${cardEntry.team?.name}`)}
                  />
                </div>
              </div>
            )}

            {/* Season Badge */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-80 text-white px-3 py-1 rounded text-sm font-bold">
              2025/26
            </div>
          </div>

          {/* Manager Name - Clean and Bold */}
          <div className="text-center mb-6">
            <h2 className="text-white text-2xl font-bold font-vt323 tracking-wide">
              {cardEntry.manager}
            </h2>
          </div>

          {/* League Branding - Minimal */}
          <div className="text-center mb-6">
            <div className="text-yellow-300 text-lg font-vt323 font-bold">FARCASTER FANTASY EPL</div>
          </div>

          {/* Card Footer - Clean */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-center">
              <div className="text-yellow-300 text-xs font-vt323">
                {dayjs().format('MMM DD, YYYY')}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Contract Information */}
{/*       {!hasMinted && (
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-bold text-notWhite mb-3 text-center">Contract Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="text-gray-400">Mint Price</p>
            <p className="text-white font-semibold">0.0007 ETH</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Contract</p>
            <p className="text-white font-mono text-xs break-all">
              {CONTRACT_ADDRESS_FEPL.slice(0, 6)}...{CONTRACT_ADDRESS_FEPL.slice(-4)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Network</p>
            <p className="text-white font-semibold">Base</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400 text-center">
          <p>💰 Proceeds from minting go to the contract owner</p>
        </div>
      </div>
      )} */}

      {!loadingFantasy && cardEntry && (
        <div className="flex justify-center mt-4 w-full">
          <button
            onClick={handleMintImage}
            disabled={mintingInProgress || !cardEntry}
            className={`py-3 px-8 bg-deepPink text-white rounded-lg hover:bg-fontRed transition shadow-lg text-lg font-bold ${
              mintingInProgress ? 'opacity-50' : ''
            }`}
          >
            {mintingInProgress ? 'Minting...' : 'Collect Season Pass'}
          </button>
            {testing && (
              <button
                onClick={handleCheckHash}
                disabled={mintingInProgress || !cardEntry}
                className={`flex-1 py-3 bg-deepPink text-white rounded-lg hover:bg-fontRed transition shadow-lg text-lg font-bold ${
                  mintingInProgress ? 'opacity-50' : ''
                }`}
              >
                {mintingInProgress ? 'Processing...' : 'Check Hash'}
              </button>
            )}
          </div>
      )}

      {statusMessage && <div className="mt-4 bg-gray-800 text-white p-3 rounded-lg">{statusMessage}</div>}
      
      {/* Share Button */}
      {txReceipt && (
        <div className="flex justify-center mt-4 w-full">
          <button
            onClick={async () => {
              if (!cardRef.current) {
                setStatusMessage('❌ No card selected to share.');
                return;
              }
              setSharingInProgress(true);
              setStatusMessage('🔄 Preparing shareable image...');

              try {
                let localImageCid = imageCid;

                if (!localImageCid) {
                  await forceDOMUpdate();
                  await waitForDOMUpdate();
                  await document.fonts.ready;
                  await waitForImagesToLoad(cardRef);
                  cardRef.current.getBoundingClientRect();
                  await new Promise((resolve) => setTimeout(resolve, 500));

                  const dataUrl = await toPng(cardRef.current, {
                    style: { fontFamily: 'VT323, monospace' },
                    cacheBust: true,
                  });

                  const blob = await (await fetch(dataUrl)).blob();
                  const response = await fetch('/api/upload', { method: 'POST', body: blob });
                  const result: { ipfsHash: string } = await response.json();

                  if (!response.ok) {
                    throw new Error('Image upload failed');
                  }

                  localImageCid = result.ipfsHash;
                  setImageCid(localImageCid);
                }

                const castText = `🎫 Farcaster Fantasy EPL Season Pass for @${cardEntry?.manager}!\n🏆 2025/26 Season\n⚽ ${cardEntry?.team?.name || 'EPL'} Supporter\n⭐ OG NFT with exclusive benefits\nCheck out the latest Farcaster Fantasy EPL collection on @base 🚀`;
                const encodedText = encodeURIComponent(castText);
                const encodedEmbed1 = encodeURIComponent(`https://tan-hidden-whippet-249.mypinata.cloud/ipfs/${localImageCid}`);
                // const encodedEmbed2 = encodeURIComponent(`https://fc-footy.vercel.app?tab=contests`);

                // const warpcastUrl = `https://warpcast.com/~/compose?text=${encodedText}&channelKey=football&embeds[]=${encodedEmbed1}&embeds[]=${encodedEmbed2}`;

                // if (isContextLoaded) {
                //   frameSdk.actions.openUrl(warpcastUrl);
                // } else {
                //   // window.open(warpcastUrl, '_blank');
                //       await sdk.actions.openUrl(warpcastUrl);
                // }
                
                setStatusMessage('🚀 Shared on Warpcast! (check popup blocker)');
              } catch (error) {
                console.error('❌ Sharing failed:', error);
                setStatusMessage(`❌ Sharing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setSharingInProgress(false);
              }
            }}
            disabled={sharingInProgress || !cardEntry}
            className={`w-full max-w-xs py-3 bg-deepPink text-white rounded-lg hover:bg-fontRed transition shadow-lg text-lg font-bold ${
              sharingInProgress ? 'opacity-50' : ''
            }`}
          >
            {sharingInProgress ? 'Sharing...' : 'Share'}
          </button>
        </div>
      )}
      
      <div className="mt-6">
          <h2 className="text-2xl font-bold text-notWhite mb-4 text-center">League Standings</h2>
          <h3 className="text-md font-bold text-lightPurple mb-4 text-center">Select to collect</h3>
          {loadingFantasy ? (
            <div className="text-center">Loading...</div>
          ) : errorFantasy ? (
            <div className="text-red-500">{errorFantasy}</div>
          ) : fantasyData.length > 0 ? (
            <table className="w-full bg-darkPurple">
              <thead className="bg-darkPurple">
                <tr>
                  <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                    Rank
                  </th>
                  <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                    Profile
                  </th>
                  <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-left font-medium">
                    Team
                  </th>
                  <th className="h-12 px-1 sm:px-4 border-b border-limeGreenOpacity text-notWhite text-center font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {fantasyData.map((entry, index) => (
                  <FantasyRow key={index} entry={entry} onRowClick={handleRowSelect} />
                ))}
              </tbody>
            </table>
          ) : (
            <div>No fantasy data available.</div>
          )}
        </div>
    </div>
  );
};

export default ContestFCFantasy;
