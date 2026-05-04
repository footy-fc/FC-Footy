'use client';

import React from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { base, degen, mainnet, optimism } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../lib/apollo-client';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
import PrivyProviders from '~/components/providers/PrivyProvider';

export const config = createConfig({
  chains: [base, optimism, mainnet, degen],
  transports: {
    [base.id]: http(),
    [optimism.id]: http(),
    [mainnet.id]: http(),
    [degen.id]: http(),
  },
  connectors: [
    miniAppConnector()
  ],
});

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = React.useState(() => new QueryClient());
  return (
    <PrivyProviders>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ApolloProvider client={apolloClient}>
            {children}
          </ApolloProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProviders>
  );
}
