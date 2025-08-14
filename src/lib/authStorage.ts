import { createStore, get, set, del } from 'idb-keyval';

let store: ReturnType<typeof createStore> | null = null;

function getClientStore() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return null;
  if (!store) {
    store = createStore('fc-footy-neynar', 'auth');
  }
  return store;
}

function signerKey(fid?: number | string) {
  return `neynar:signer:${fid ?? 'default'}`;
}

export async function saveSigner(fid: number | string, signerUuid: string): Promise<void> {
  const s = getClientStore();
  if (!s) return;
  await set(signerKey(fid), signerUuid, s);
}

export async function loadSigner(fid: number | string): Promise<string | null> {
  const s = getClientStore();
  if (!s) return null;
  const value = await get<string | null>(signerKey(fid), s);
  return value ?? null;
}

export async function clearSigner(fid: number | string): Promise<void> {
  const s = getClientStore();
  if (!s) return;
  await del(signerKey(fid), s);
}


