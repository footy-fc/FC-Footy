import { createClient, Errors } from '@farcaster/quick-auth';
import { NextRequest } from 'next/server';
import type { FarcasterRuntime } from '~/lib/farcaster/runtime';

const quickAuthClient = createClient();

export type AuthenticatedFootyUser = {
  runtime: FarcasterRuntime;
  userId: string;
  fid?: number;
  privyUserId?: string;
};

function resolveRequestDomain(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || '';
  return host.split(':')[0];
}

async function authenticateMiniApp(request: NextRequest, token: string): Promise<AuthenticatedFootyUser> {
  const domain = resolveRequestDomain(request);
  const payload = await quickAuthClient.verifyJwt({ token, domain });
  const fid = Number(payload.sub);

  if (!Number.isFinite(fid) || fid <= 0) {
    throw new Errors.InvalidTokenError('Invalid fid');
  }

  return {
    runtime: 'miniapp',
    userId: `farcaster:${fid}`,
    fid,
  };
}

async function authenticateStandalone(request: NextRequest): Promise<AuthenticatedFootyUser> {
  const userId = request.headers.get('x-footy-user-id')?.trim();
  const fidHeader = request.headers.get('x-footy-fid')?.trim();
  const fid = fidHeader ? Number(fidHeader) : undefined;

  if (!userId) {
    throw new Error('Missing Footy standalone user id');
  }

  return {
    runtime: 'standalone',
    userId,
    privyUserId: userId.startsWith('privy:') ? userId.slice('privy:'.length) : userId,
    fid: typeof fid === 'number' && Number.isFinite(fid) ? fid : undefined,
  };
}

export async function authenticateFootyUser(request: NextRequest): Promise<AuthenticatedFootyUser> {
  const runtimeHeader = request.headers.get('x-footy-runtime');

  if (runtimeHeader === 'miniapp') {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      throw new Error('Missing bearer token');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new Error('Missing bearer token');
    }

    return authenticateMiniApp(request, token);
  }

  if (runtimeHeader === 'standalone') {
    return authenticateStandalone(request);
  }

  const authorization = request.headers.get('authorization');
  try {
    if (!authorization?.startsWith('Bearer ')) {
      throw new Error('Missing bearer token');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new Error('Missing bearer token');
    }

    return await authenticateMiniApp(request, token);
  } catch {
    return authenticateStandalone(request);
  }
}
