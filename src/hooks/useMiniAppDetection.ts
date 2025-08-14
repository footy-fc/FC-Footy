import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export const useMiniAppDetection = () => {
  const [isMiniApp, setIsMiniApp] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkMiniApp = async () => {
      try {
        const result = await sdk.isInMiniApp();
        setIsMiniApp(result);
      } catch (error) {
        console.error('Error checking mini app status:', error);
        setIsMiniApp(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkMiniApp();
  }, []);

  return { isMiniApp, isLoading };
}; 