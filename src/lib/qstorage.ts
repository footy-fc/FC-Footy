"server only";

import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import path from "node:path";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export type QStorageUploadResult = {
  objectKey: string;
  publicUrl: string;
  contentType: string;
};

export type QStorageProbeResult = {
  config: ReturnType<typeof getQStorageDebugInfo>;
  list: {
    ok: boolean;
    keys?: string[];
    keyCount?: number;
    error?: {
      name?: string;
      message?: string;
      code?: string;
      resource?: string;
    };
  };
  put: {
    ok: boolean;
    objectKey: string;
    publicUrl: string;
    error?: {
      name?: string;
      message?: string;
      code?: string;
      resource?: string;
    };
  };
};

type QStorageUploadInput = {
  body: Buffer | Uint8Array;
  contentType?: string;
  fileName?: string;
  objectKey?: string;
};

type QStorageConfig = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
};

let client: S3Client | null = null;
let normalizedEndpoint: string | null = null;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getBucket() {
  return requireEnv("QSTORAGE_BUCKET");
}

export function getQStorageConfig(): QStorageConfig {
  return {
    endpoint: trimTrailingSlash(requireEnv("QSTORAGE_ENDPOINT")),
    bucket: getBucket(),
    region: process.env.QSTORAGE_REGION ?? "us-east-1",
    accessKeyId: requireEnv("QSTORAGE_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("QSTORAGE_SECRET_ACCESS_KEY"),
    prefix: trimSlashes(process.env.QSTORAGE_PREFIX ?? ""),
  };
}

export function getQStorageDebugInfo() {
  const config = getQStorageConfig();

  return {
    endpoint: config.endpoint,
    bucket: config.bucket,
    region: config.region,
    prefix: config.prefix,
    clientEndpoint: getClientEndpoint(),
  };
}

function getClientEndpoint() {
  const endpoint = requireEnv("QSTORAGE_ENDPOINT");
  const cleanEndpoint = trimTrailingSlash(endpoint);
  const bucketSuffix = `/${getBucket()}`;
  normalizedEndpoint = cleanEndpoint;

  return cleanEndpoint.endsWith(bucketSuffix)
    ? cleanEndpoint.slice(0, -bucketSuffix.length)
    : cleanEndpoint;
}

function getQStorageClient() {
  if (client) {
    return client;
  }

  const { accessKeyId, secretAccessKey, region } = getQStorageConfig();

  client = new S3Client({
    endpoint: getClientEndpoint(),
    region,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return client;
}

function inferExtension(fileName?: string, contentType?: string) {
  const extFromName = fileName ? path.extname(fileName) : "";
  if (extFromName) {
    return extFromName.toLowerCase();
  }

  switch (contentType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    case "application/json":
      return ".json";
    case "text/html":
      return ".html";
    case "text/css":
      return ".css";
    case "text/plain":
      return ".txt";
    default:
      return "";
  }
}

function normalizeObjectKey(objectKey: string) {
  return objectKey
    .split("/")
    .map((segment) => trimSlashes(segment))
    .filter(Boolean)
    .join("/");
}

function prefixedKey(objectKey: string) {
  const prefix = trimSlashes(process.env.QSTORAGE_PREFIX ?? "");
  const normalizedKey = normalizeObjectKey(objectKey);
  return prefix ? `${prefix}/${normalizedKey}` : normalizedKey;
}

function createObjectKey(fileName?: string, contentType?: string) {
  const extension = inferExtension(fileName, contentType);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = crypto.randomBytes(6).toString("hex");
  return `${timestamp}-${random}${extension}`;
}

export function buildQStoragePublicUrl(objectKey: string) {
  const base = normalizedEndpoint ?? trimTrailingSlash(process.env.QSTORAGE_ENDPOINT ?? "");
  const bucket = getBucket();
  const finalKey = prefixedKey(objectKey)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${trimTrailingSlash(base)}/${encodeURIComponent(bucket)}/${finalKey}`;
}

export async function uploadToQStorage({
  body,
  contentType = DEFAULT_CONTENT_TYPE,
  fileName,
  objectKey,
}: QStorageUploadInput): Promise<QStorageUploadResult> {
  const bucket = getBucket();
  const rawObjectKey = objectKey ? normalizeObjectKey(objectKey) : createObjectKey(fileName, contentType);
  const finalObjectKey = prefixedKey(rawObjectKey);

  console.log("QStorage upload target:", {
    bucket,
    key: finalObjectKey,
    contentType,
  });

  await getQStorageClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: finalObjectKey,
      Body: body,
      ContentType: contentType,
    })
  );

  return {
    objectKey: finalObjectKey,
    publicUrl: buildQStoragePublicUrl(rawObjectKey),
    contentType,
  };
}

function serializeQStorageError(error: unknown) {
  const maybeError = error as {
    name?: string;
    message?: string;
    Code?: string;
    code?: string;
    Resource?: string;
    resource?: string;
  };

  return {
    name: maybeError?.name,
    message: maybeError?.message,
    code: maybeError?.Code ?? maybeError?.code,
    resource: maybeError?.Resource ?? maybeError?.resource,
  };
}

export async function probeQStorage(): Promise<QStorageProbeResult> {
  const bucket = getBucket();
  const rawObjectKey = `codex-probe-${Date.now()}.txt`;
  const finalObjectKey = prefixedKey(rawObjectKey);
  const publicUrl = buildQStoragePublicUrl(rawObjectKey);

  const result: QStorageProbeResult = {
    config: getQStorageDebugInfo(),
    list: { ok: false },
    put: { ok: false, objectKey: finalObjectKey, publicUrl },
  };

  try {
    const listResponse = await getQStorageClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: process.env.QSTORAGE_PREFIX || undefined,
        MaxKeys: 5,
      })
    );

    result.list = {
      ok: true,
      keyCount: (listResponse.Contents ?? []).length,
      keys: (listResponse.Contents ?? [])
        .map((item) => item.Key)
        .filter((key): key is string => Boolean(key)),
    };
  } catch (error) {
    result.list = {
      ok: false,
      error: serializeQStorageError(error),
    };
  }

  try {
    await getQStorageClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: finalObjectKey,
        Body: "codex probe",
        ContentType: "text/plain",
      })
    );

    result.put = {
      ok: true,
      objectKey: finalObjectKey,
      publicUrl,
    };
  } catch (error) {
    result.put = {
      ok: false,
      objectKey: finalObjectKey,
      publicUrl,
      error: serializeQStorageError(error),
    };
  }

  return result;
}
