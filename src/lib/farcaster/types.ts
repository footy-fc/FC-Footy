export type FootyDelegatedApp = 'footy';

export type FootySignerProvider = 'privy' | 'footy' | 'miniapp' | 'server-managed';

export type FootyWalletProvider = 'privy' | 'miniapp' | 'external' | 'unknown';

export type FootySignerCustody = 'client-delegated' | 'miniapp-hosted' | 'server-managed' | 'unknown';

export type FootySignerStatus = 'none' | 'pending' | 'authorized' | 'revoked';
