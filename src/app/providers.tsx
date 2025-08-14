'use client';

import React from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { JBProjectProvider, JBChainId } from 'juice-sdk-react';
import { OPEN_IPFS_GATEWAY_HOSTNAME } from '~/lib/ipfs';
import { base, degen, mainnet, optimism } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../lib/apollo-client';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
// Neynar React removed for read-only chat mode

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
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ApolloProvider client={apolloClient}>
          <JBProjectProvider
              projectId={53n}
              chainId={8453 as JBChainId}
              ctxProps={{ metadata: { ipfsGatewayHostname: OPEN_IPFS_GATEWAY_HOSTNAME } }}
            >
            {children}
          </JBProjectProvider>
        </ApolloProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
