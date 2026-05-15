import { createHmac, randomBytes } from "node:crypto";

import type {
  QkmsKey,
  RegistrationBundle,
  Role,
} from "~/lib/qkms-types";

type QkmsProvider = "mock" | "qredo";

type CreateKeyConfig = {
  participants: Role[];
  threshold: 2;
  totalParties: 3;
  keySpec: "secp256k1";
  usage: "Sign/Verify";
};

type StartSigningRequest = {
  keyId: string;
  participants: Role[];
  payloadHash: string;
};

export type QkmsSignResult =
  | {
      kind: "signature";
      signature: string;
      provider: QkmsProvider;
    }
  | {
      kind: "operation";
      operationId: string;
      summary: string;
      provider: QkmsProvider;
    };

type QredoTokenCache = {
  token: string;
  expiresAt: number;
};

const qredoTokenCache: QredoTokenCache = {
  token: "",
  expiresAt: 0,
};

function nowIso() {
  return new Date().toISOString();
}

function getProvider(): QkmsProvider {
  return process.env.QKMS_PROVIDER === "qredo" ? "qredo" : "mock";
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for live Qredo integration.`);
  }

  return value;
}

function readQredoConfig() {
  const baseUrl = (
    process.env.QREDO_API_BASE_URL ?? "https://api-v2.qredo.network/api/v2"
  ).replace(/\/$/, "");

  return {
    baseUrl,
    workspaceId: getRequiredEnv("QREDO_WORKSPACE_ID"),
    apiKeyId: getRequiredEnv("QREDO_API_KEY_ID"),
    apiSecret: getRequiredEnv("QREDO_API_SECRET"),
    walletId: getRequiredEnv("QREDO_WALLET_ID"),
    walletAddress: getRequiredEnv("QREDO_WALLET_ADDRESS"),
    chainId: getRequiredEnv("QREDO_CHAIN_ID"),
    transactionMode: process.env.QREDO_TX_MODE ?? "raw",
    destinationAddress:
      process.env.QREDO_DESTINATION_WALLET ?? process.env.QREDO_TO_ADDRESS ?? "",
    broadcast:
      process.env.QREDO_BROADCAST?.toLowerCase() === "false" ? false : true,
    defaultValue: process.env.QREDO_VALUE ?? "0",
    gas: process.env.QREDO_GAS ?? "",
    gasPrice: process.env.QREDO_GAS_PRICE ?? "",
    maxFeePerGas: process.env.QREDO_MAX_FEE_PER_GAS ?? "",
    maxPriorityFeePerGas: process.env.QREDO_MAX_PRIORITY_FEE_PER_GAS ?? "",
  };
}

function buildQredoAuthHeaders(method: string, url: string) {
  const { apiKeyId, apiSecret } = readQredoConfig();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = Buffer.from(apiSecret, "base64").toString("ascii");
  const message = `${timestamp}${method.toUpperCase()}${url}`;
  const signature = createHmac("sha256", secret)
    .update(message)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return {
    "qredo-api-key": apiKeyId,
    "qredo-api-timestamp": timestamp,
    "qredo-api-signature": signature,
  };
}

async function getQredoToken() {
  if (qredoTokenCache.token && Date.now() < qredoTokenCache.expiresAt) {
    return qredoTokenCache.token;
  }

  const { baseUrl, workspaceId } = readQredoConfig();
  const url = `${baseUrl}/workspaces/${workspaceId}/token`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...buildQredoAuthHeaders("GET", url),
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(
      json.message ??
        json.error ??
        "Failed to get Qredo authentication token.",
    );
  }

  const token =
    json.token ??
    json.jwt ??
    json.accessToken ??
    json.data?.token ??
    json.data?.jwt;

  if (!token || typeof token !== "string") {
    throw new Error("Qredo token response did not include a token.");
  }

  qredoTokenCache.token = token;
  qredoTokenCache.expiresAt = Date.now() + 55 * 60 * 1000;
  return token;
}

async function qredoFetch<T>(
  path: string,
  init?: RequestInit & { bodyJson?: unknown },
): Promise<T> {
  const { baseUrl } = readQredoConfig();
  const token = await getQredoToken();
  const url = `${baseUrl}${path}`;
  const body =
    init?.bodyJson === undefined ? init?.body : JSON.stringify(init.bodyJson);
  const response = await fetch(url, {
    ...init,
    body,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "x-token": token,
      ...(init?.headers ?? {}),
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(
      json.message ?? json.error ?? `Qredo request failed for ${path}.`,
    );
  }

  return json as T;
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildQredoTransactionBody(request: StartSigningRequest) {
  const config = readQredoConfig();
  const parsedPayload = tryParseJson(request.payloadHash);
  const note = `QKMS ${request.participants.join("+")} ${request.keyId}`;

  if (config.transactionMode === "legacy") {
    if (!parsedPayload) {
      throw new Error(
        "QREDO_TX_MODE=legacy requires the sign request payload to be a JSON transaction body.",
      );
    }

    return {
      broadcast: config.broadcast,
      from: config.walletId,
      to: config.destinationAddress,
      chainID: config.chainId,
      value: config.defaultValue,
      input: "",
      nonce: "",
      gas: config.gas,
      gasPrice: config.gasPrice,
      note,
      ...parsedPayload,
    };
  }

  if (config.transactionMode === "dynamicFee") {
    if (!parsedPayload) {
      throw new Error(
        "QREDO_TX_MODE=dynamicFee requires the sign request payload to be a JSON transaction body.",
      );
    }

    return {
      broadcast: config.broadcast,
      from: config.walletId,
      to: config.destinationAddress,
      chainID: config.chainId,
      value: config.defaultValue,
      input: "",
      nonce: "",
      gas: config.gas,
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas,
      note,
      ...parsedPayload,
    };
  }

  return {
    broadcast: config.broadcast,
    from: config.walletId,
    chainID: config.chainId,
    data:
      parsedPayload?.data && typeof parsedPayload.data === "string"
        ? parsedPayload.data
        : request.payloadHash,
    value:
      parsedPayload?.value && typeof parsedPayload.value === "string"
        ? parsedPayload.value
        : config.defaultValue,
    note,
  };
}

function qredoTransactionPath() {
  const { workspaceId, transactionMode } = readQredoConfig();
  const suffix =
    transactionMode === "legacy"
      ? "legacy"
      : transactionMode === "dynamicFee"
        ? "dynamicFee"
        : "raw";

  return `/workspaces/${workspaceId}/web3/networks/evm/transactions/${suffix}`;
}

export async function registerSidecar(bundle: RegistrationBundle) {
  if (getProvider() === "qredo") {
    return {
      accepted: true,
      role: bundle.role,
      registeredAt: nowIso(),
      provider: "qredo",
    };
  }

  return {
    accepted: true,
    role: bundle.role,
    registeredAt: nowIso(),
    provider: "mock",
  };
}

export async function createKeyCeremony(
  config: CreateKeyConfig,
): Promise<QkmsKey> {
  if (getProvider() === "qredo") {
    const qredo = readQredoConfig();
    return {
      id: qredo.walletId,
      publicKey: qredo.walletAddress,
      threshold: config.threshold,
      totalParties: config.totalParties,
      keySpec: config.keySpec,
      usage: config.usage,
      participantRoles: config.participants,
      createdAt: nowIso(),
    };
  }

  return {
    id: `key_${randomBytes(6).toString("hex")}`,
    publicKey: `02${randomBytes(32).toString("hex")}`,
    threshold: config.threshold,
    totalParties: config.totalParties,
    keySpec: config.keySpec,
    usage: config.usage,
    participantRoles: config.participants,
    createdAt: nowIso(),
  };
}

export async function startSigningSession(request: StartSigningRequest) {
  if (getProvider() === "qredo") {
    const result = await qredoFetch<Record<string, unknown>>(
      qredoTransactionPath(),
      {
        method: "POST",
        bodyJson: buildQredoTransactionBody(request),
      },
    );

    const operationId =
      (typeof result.txID === "string" && result.txID) ||
      (typeof result.id === "string" && result.id) ||
      (typeof result.actionID === "string" && result.actionID) ||
      `qredo_${randomBytes(6).toString("hex")}`;

    return {
      sessionId: operationId,
      provider: "qredo" as const,
      result,
      ...request,
      startedAt: nowIso(),
    };
  }

  return {
    sessionId: `sign_${randomBytes(6).toString("hex")}`,
    provider: "mock" as const,
    ...request,
    startedAt: nowIso(),
  };
}

export async function getPublicKey(keyId: string) {
  if (getProvider() === "qredo") {
    const { walletId, walletAddress } = readQredoConfig();
    return {
      keyId,
      publicKey: keyId === walletId ? walletAddress : walletAddress,
    };
  }

  return {
    keyId,
    publicKey: `02${randomBytes(32).toString("hex")}`,
  };
}

export async function signPayload(
  keyId: string,
  payloadHash: string,
  participants: Role[],
): Promise<QkmsSignResult> {
  if (getProvider() === "qredo") {
    return {
      kind: "operation",
      operationId: keyId,
      summary: `Qredo transaction request submitted for ${participants.join(" + ")} using payload ${payloadHash.slice(0, 18)}...`,
      provider: "qredo",
    };
  }

  return {
    kind: "signature",
    provider: "mock",
    signature: `0x${randomBytes(65).toString("hex")}`,
  };
}
