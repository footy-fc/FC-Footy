"use client"
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { sdk } from '@farcaster/frame-sdk'

const UrlDisplayContent = () => {
  const searchParams = useSearchParams();
  const url = searchParams?.get('url') || 'No URL provided';

  const handleButtonClick = async (url: string) => {
    await sdk.actions.openUrl(url)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#181424' }}>
      <div className="max-w-2xl w-full p-8 rounded-lg shadow-lg" style={{ backgroundColor: '#010513', border: '1px solid #BD195D' }}>
        <h1 className="text-3xl font-bold mb-6 text-center" style={{ color: '#FEA282' }}>
          FOOTY URL-REDIRECT
        </h1>
        
        <div className="mb-8">
          <p className="text-lg mb-2" style={{ color: '#C0B2F0' }}>Gm gm Anon:</p>
          <div className="p-4 rounded-md" style={{ backgroundColor: 'rgba(162, 230, 52, 0.1)', border: '1px solid #32CD32' }}>
            <p className="text-xl break-all" style={{ color: '#32CD32' }}>{url}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            className="px-6 py-3 rounded-full font-medium transition-all hover:scale-105"
            style={{ 
              backgroundColor: '#BD195D', 
              color: 'white',
              boxShadow: '0 0 15px rgba(189, 25, 93, 0.5)'
            }}
            onClick={() => handleButtonClick(url)}
          >
            See Cast
          </button>
        </div>

        <div className="mt-8 pt-6 border-t" style={{ borderColor: '#BD195D' }}>
          <p className="text-sm text-center" style={{ color: '#C0B2F0' }}>
            Thank you!
          </p>
        </div>
      </div>
    </div>
  );
};

const UrlDisplayPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#181424' }}>
        <p style={{ color: '#FEA282' }}>Loading...</p>
      </div>
    }>
      <UrlDisplayContent />
    </Suspense>
  );
};

export default UrlDisplayPage;