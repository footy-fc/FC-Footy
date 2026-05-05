const textEncoder = new TextEncoder();

export const FARCASTER_PFP_MAX_BYTES = 256;
export const FARCASTER_DISPLAY_NAME_MAX_BYTES = 32;
export const FARCASTER_BIO_MAX_BYTES = 256;
export const FARCASTER_FNAME_MAX_LENGTH = 16;
export const FARCASTER_ENS_USERNAME_MAX_LENGTH = 20;
export const FARCASTER_FNAME_REGEX = /^[a-z0-9][a-z0-9-]{0,15}$/;

export type ValidatedProfileField = {
  normalized: string;
  error: string | null;
  bytes: number;
  maxBytes?: number;
};

export function getUtf8ByteLength(value: string) {
  return textEncoder.encode(value).length;
}

export function normalizeProfileText(value?: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeUsernameInput(value?: string | null) {
  return normalizeProfileText(value).replace(/^@+/, '').toLowerCase();
}

export function validateDisplayNameInput(value?: string | null): ValidatedProfileField {
  const normalized = normalizeProfileText(value);
  const bytes = getUtf8ByteLength(normalized);

  if (!normalized) {
    return { normalized, bytes, maxBytes: FARCASTER_DISPLAY_NAME_MAX_BYTES, error: 'Display name is required' };
  }

  if (bytes > FARCASTER_DISPLAY_NAME_MAX_BYTES) {
    return {
      normalized,
      bytes,
      maxBytes: FARCASTER_DISPLAY_NAME_MAX_BYTES,
      error: `Display name must be ${FARCASTER_DISPLAY_NAME_MAX_BYTES} UTF-8 bytes or fewer`,
    };
  }

  return { normalized, bytes, maxBytes: FARCASTER_DISPLAY_NAME_MAX_BYTES, error: null };
}

export function validateBioInput(value?: string | null): ValidatedProfileField {
  const normalized = normalizeProfileText(value);
  const bytes = getUtf8ByteLength(normalized);

  if (bytes > FARCASTER_BIO_MAX_BYTES) {
    return {
      normalized,
      bytes,
      maxBytes: FARCASTER_BIO_MAX_BYTES,
      error: `Bio must be ${FARCASTER_BIO_MAX_BYTES} UTF-8 bytes or fewer`,
    };
  }

  return { normalized, bytes, maxBytes: FARCASTER_BIO_MAX_BYTES, error: null };
}

export function validatePfpUrlInput(value?: string | null): ValidatedProfileField {
  const normalized = normalizeProfileText(value);
  const bytes = getUtf8ByteLength(normalized);

  if (!normalized) {
    return { normalized, bytes, maxBytes: FARCASTER_PFP_MAX_BYTES, error: 'Profile picture URL is required' };
  }

  if (bytes > FARCASTER_PFP_MAX_BYTES) {
    return {
      normalized,
      bytes,
      maxBytes: FARCASTER_PFP_MAX_BYTES,
      error: `Profile picture URL must be ${FARCASTER_PFP_MAX_BYTES} UTF-8 bytes or fewer`,
    };
  }

  return { normalized, bytes, maxBytes: FARCASTER_PFP_MAX_BYTES, error: null };
}

function validateFname(value: string) {
  if (value.length > FARCASTER_FNAME_MAX_LENGTH) {
    return `Username must be ${FARCASTER_FNAME_MAX_LENGTH} characters or fewer unless it ends in .eth`;
  }

  if (!FARCASTER_FNAME_REGEX.test(value)) {
    return 'Username must start with a letter or number and then use only lowercase letters, numbers, or hyphens';
  }

  return null;
}

function validateEnsUsername(value: string) {
  if (!value.endsWith('.eth')) {
    return 'ENS usernames must end in .eth';
  }

  const nameParts = value.split('.');
  if (nameParts.length !== 2 || !nameParts[0]) {
    return 'Only root .eth names are supported here';
  }

  if (value.length > FARCASTER_ENS_USERNAME_MAX_LENGTH) {
    return `ENS usernames must be ${FARCASTER_ENS_USERNAME_MAX_LENGTH} characters or fewer`;
  }

  if (!FARCASTER_FNAME_REGEX.test(nameParts[0])) {
    return 'The part before .eth must start with a letter or number and then use only lowercase letters, numbers, or hyphens';
  }

  return null;
}

export function validateUsernameInput(value?: string | null): ValidatedProfileField {
  const normalized = normalizeUsernameInput(value);
  const bytes = getUtf8ByteLength(normalized);

  if (!normalized) {
    return { normalized, bytes, maxBytes: FARCASTER_ENS_USERNAME_MAX_LENGTH, error: 'Username is required' };
  }

  const error = normalized.endsWith('.eth') ? validateEnsUsername(normalized) : validateFname(normalized);
  return {
    normalized,
    bytes,
    maxBytes: normalized.endsWith('.eth') ? FARCASTER_ENS_USERNAME_MAX_LENGTH : FARCASTER_FNAME_MAX_LENGTH,
    error,
  };
}
