'use client';

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { PRIVY_APP_ID } from '~/lib/farcaster/privy';

export default function Providers({children}: {children: React.ReactNode}) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        embeddedWallets: {
          createOnLogin: "all-users",
        },
        appearance: {
          walletList: ["detected_wallets"],
          theme: 'light',
          accentColor: '#676FFF',
          logo: 'defifa_spinner.gif',
        },
        loginMethods: ['farcaster'],
      }}
    >
      <SmartWalletsProvider>{children}</SmartWalletsProvider>
    </PrivyProvider>
  );
}
