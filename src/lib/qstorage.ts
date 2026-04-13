"server only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import path from "node:path";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export type QStorageUploadResult = {
  objectKey: string;
  publicUrl: string;
  contentType: string;
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

let cachedClient: S3Client | null = null;

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getQStorageConfig(): QStorageConfig {
  return {
    endpoint: trimTrailingSlash(requireEnv("QSTORAGE_ENDPOINT")),
    bucket: requireEnv("QSTORAGE_BUCKET"),
    region: requireEnv("QSTORAGE_REGION"),
    accessKeyId: requireEnv("QSTORAGE_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("QSTORAGE_SECRET_ACCESS_KEY"),
    prefix: process.env.QSTORAGE_PREFIX || "",
  };
}

function getClientEndpoint(config: QStorageConfig) {
  const endpointUrl = new URL(config.endpoint);
  const pathWithoutSlashes = trimSlashes(endpointUrl.pathname);

  // When the configured endpoint already includes "/<bucket>", use the service
  // root for S3 signing and keep the configured endpoint as the public base URL.
  if (pathWithoutSlashes === config.bucket) {
    return endpointUrl.origin;
  }

  return config.endpoint;
}

function getQStorageClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getQStorageConfig();
  cachedClient = new S3Client({
    region: config.region,
    endpoint: getClientEndpoint(config),
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
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

function createObjectKey(prefix: string, fileName?: string, contentType?: string) {
  const safePrefix = prefix;
  const extension = inferExtension(fileName, contentType);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = crypto.randomBytes(6).toString("hex");
  return normalizeObjectKey(`${safePrefix}${timestamp}-${random}${extension}`);
}

export function buildQStoragePublicUrl(objectKey: string) {
  const { endpoint } = getQStorageConfig();
  const normalizedKey = normalizeObjectKey(objectKey)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${trimTrailingSlash(endpoint)}/${normalizedKey}`;
}

export async function uploadToQStorage({
  body,
  contentType = DEFAULT_CONTENT_TYPE,
  fileName,
  objectKey,
}: QStorageUploadInput): Promise<QStorageUploadResult> {
  const config = getQStorageConfig();
  const finalObjectKey = normalizeObjectKey(
    objectKey || createObjectKey(config.prefix, fileName, contentType)
  );

  await getQStorageClient().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: finalObjectKey,
      Body: body,
      ContentType: contentType,
    })
  );

  return {
    objectKey: finalObjectKey,
    publicUrl: buildQStoragePublicUrl(finalObjectKey),
    contentType,
  };
}
