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
import { useWaitForTransactionReceipt } from 'wagmi';
import { ethers } from 'ethers';
import { useWriteContract } from 'wagmi';
import { CONTRACT_ADDRESS_FEPL, CONTRACT_ABI_FEPL } from '../constants/contracts';

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

  interface FantasyEntry {
    rank: number;
    pfp: string | null;
    team: {
      name: string | null;
      logo: string | null;
    };
    manager: string;
    entry_name: string | null;
    last_name: string | null;
    fav_team: number | null;
    total: number | null;
    location: string | null;
    fid: number | null;
  }
  
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = usePrivy();

  const farcasterAccount = user?.linkedAccounts.find(
    (account) => account.type === 'farcaster'
  );

  const { writeContractAsync } = useWriteContract();

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
      } catch (error) {
        console.error("Failed to load Farcaster context:", error);
      }
    };
    if (!isContextLoaded) {
      loadContext();
    }
  }, [isContextLoaded]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingFantasy(true);
      try {
        const data = await fetchFantasyData();
        const rankedData = data.map((item, i) => ({
          ...item,
          rank: item.rank ?? i + 1,
        }));
        setFantasyData(rankedData);
      } catch (error) {
        setErrorFantasy(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoadingFantasy(false);
      }
    };

    fetchData();
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
      setStatusMessage('❌ Transaction failed. Try again.');
      setMintingInProgress(false);
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

      setStatusMessage('🌐 Uploading image to IPFS...');
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
  
  
  const defaultCardEntry = farcasterAccount
    ? fantasyData.find((entry) =>
        entry.manager.toLowerCase() === farcasterAccount?.username?.toLowerCase()
      )
    : fantasyData.find((entry) => entry.rank === 1);

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
          { trait_type: 'Points', value: cardEntry?.total || 0 },
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
  
        setStatusMessage('🌐 Uploading image to IPFS...');
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
      setStatusMessage(`❌ Error: ${(error as Error).message}`);
    } finally {
      setMintingInProgress(false);
    }
  };
  
  const cardEntry = selectedEntry || defaultCardEntry;

  return (
    <div>
      <div className="text-md font-bold mb-2">Closed League</div>
      
      {cardEntry && (
        <div
          ref={cardRef}
          key={renderKey} // 🔄 This forces React to fully re-render the element
          className="relative font-vt323 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 p-6 rounded-3xl shadow-2xl border-8 border-neonGreen pixel-border overflow-hidden"
        >
          {/* Card Title */}
          <h1 className="text-yellow-300 text-center text-4xl font-vt323 font-pixel mb-4">
            FC FEPL 24/25
          </h1>

          {/* Manager Info */}
          <div className="flex items-center space-x-4 relative z-10">
            <div
              className="border-4 border-white overflow-hidden"
              style={{ width: '96px', height: '96px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <img
                src={cardEntry.pfp || '/defifa_spinner.gif'}
                alt="Manager Avatar"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '9999px',
                }}
                onLoad={() => console.log(`✅ Image loaded for: ${cardEntry.manager}`)}
                onError={() => console.log(`🔄 Fallback image used for: ${cardEntry.manager}`)}
              />
            </div>
            <div>
              <p className="text-white font-pixel text-2xl tracking-wider">
                {cardEntry.manager}
              </p>
              <p className="text-gray-300 text-lg font-pixel">{cardEntry.team.name}</p>
              <p className="text-white text-xl font-pixel">Rank: {cardEntry.rank}</p>
              <p className="text-white text-lg font-pixel">Points: {cardEntry.total}</p>
            </div>
          </div>

          {/* Favorite Team Logo as Watermark */}
          {cardEntry.team.logo && (
            <div className="absolute top-0 right-0 opacity-30">
              <img
                src={cardEntry.team.logo || '/default-team-logo.png'}
                alt="Team Logo"
                className="object-contain w-[120px] h-[120px]"
                onLoad={() => console.log(`✅ Team logo loaded for: ${cardEntry.team.name}`)}
                onError={() => console.log(`🔄 Fallback team logo used for: ${cardEntry.team.name}`)}
              />

            </div>
          )}

          {/* Date */}
          <div className="absolute bottom-4 left-10 mt-4 text-yellow-300 font-pixel text-sm">
            {dayjs().format('MMM DD, YYYY')}
          </div>
        </div>
      )}

      {!loadingFantasy && (
        <div className="flex space-x-4 mt-4">
          <div className="flex space-x-4 w-full max-w-xs">
            {/* <button
              onClick={handleMintImage}
              disabled={mintingInProgress || !cardEntry}
              className={`flex-1 py-3 bg-deepPink text-white rounded-lg hover:bg-fontRed transition shadow-lg text-lg font-bold ${
                mintingInProgress ? 'opacity-50' : ''
              }`}
            >
              {mintingInProgress ? 'Minting...' : 'Mint NFTs'}
            </button> */}
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

          {/* Share Button */}
          {txReceipt && (
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

                  const castText = `🏆 Fantasy Football Card for @${cardEntry?.manager}!\n📊 Rank: ${cardEntry?.rank}\n⚽ Points: ${cardEntry?.total}\nCheck out the latest dickbutt FC Fantasy League manager cards. \nFC Fantasy League is on @base 🚀`;
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
          )}   
        </div>
      )}

      {statusMessage && <div className="mt-4 bg-gray-800 text-white p-3 rounded-lg">{statusMessage}</div>}
        <div className="mt-6">
          {loadingFantasy ? (
            <div className="text-center">Loading...</div>
          ) : errorFantasy ? (
            <div className="text-red-500">{errorFantasy}</div>
          ) : fantasyData.length > 0 ? (
            <table className="w-full bg-darkPurple rounded-lg">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Profile</th>
                  <th>Manager</th>
                  <th>Total</th>
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
