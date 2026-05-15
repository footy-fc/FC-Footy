import { createHash, randomBytes, randomUUID } from "node:crypto";
import { recoverMessageAddress } from "viem";

import {
  createKeyCeremony,
  getPublicKey,
  type QkmsSignResult,
  signPayload,
  startSigningSession,
} from "~/lib/qkms";
import { buildApprovalMessage } from "~/lib/qkms-approvals";
import {
  getRequiredParticipants,
  validatePolicyParticipants,
} from "~/lib/qkms-policy";
import { buildRegistrationMessage } from "~/lib/qkms-registration";
import type {
  ActionType,
  AuditEvent,
  Ceremony,
  DashboardData,
  ExternalRole,
  Invite,
  Participant,
  QkmsKey,
  RegistrationBundle,
  Role,
  SignRequest,
} from "~/lib/qkms-types";

type StoreState = {
  invites: Invite[];
  participants: Participant[];
  ceremonies: Ceremony[];
  signRequests: SignRequest[];
  keys: QkmsKey[];
  auditEvents: AuditEvent[];
  coordinatorWalletAddress?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __qkmsStore?: StoreState;
};

function now() {
  return new Date().toISOString();
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createAuditEvent(
  type: AuditEvent["type"],
  message: string,
): AuditEvent {
  return {
    id: randomUUID(),
    type,
    message,
    createdAt: now(),
  };
}

function normalizeCeremony(ceremony: Ceremony): Ceremony {
  return {
    ...ceremony,
    selectedParticipants:
      ceremony.selectedParticipants ??
      ceremony.activeParticipants.filter(
        (role): role is ExternalRole => role !== "C",
      ),
    inviteIds: ceremony.inviteIds ?? [],
    joinLinks: ceremony.joinLinks ?? [],
  };
}

function getStore(): StoreState {
  if (!globalStore.__qkmsStore) {
    globalStore.__qkmsStore = {
      invites: [],
      participants: [],
      ceremonies: [],
      signRequests: [],
      keys: [],
      auditEvents: [],
      coordinatorWalletAddress:
        process.env.QKMS_COORDINATOR_WALLET_ADDRESS ??
        process.env.NEXT_PUBLIC_QKMS_COORDINATOR_WALLET,
    };
  }

  return globalStore.__qkmsStore;
}

export function resetStore() {
  globalStore.__qkmsStore = {
    invites: [],
    participants: [],
    ceremonies: [],
    signRequests: [],
    keys: [],
    auditEvents: [
      createAuditEvent("invite.created", "QKMS demo state reset."),
    ],
    coordinatorWalletAddress:
      process.env.QKMS_COORDINATOR_WALLET_ADDRESS ??
      process.env.NEXT_PUBLIC_QKMS_COORDINATOR_WALLET,
  };

  return getStore();
}

function sanitizeInvite(invite: Invite) {
  const { hashedToken, ...safeInvite } = invite;
  void hashedToken;
  return safeInvite;
}

function getParticipant(role: ExternalRole) {
  return getStore().participants.find((participant) => participant.role === role);
}

function requireRegistered(role: ExternalRole) {
  const participant = getParticipant(role);
  if (!participant || participant.status !== "ready") {
    throw new Error(`${role} must be registered and ready first.`);
  }

  return participant;
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function assertRoleAllowedForCeremony(role: Role) {
  if (role !== "C") {
    throw new Error("Only C can start registration ceremonies.");
  }
}

export function createInvite(role: ExternalRole, hours = 24) {
  const store = getStore();
  const { invite, rawToken } = createInviteRecord(role, hours);
  store.auditEvents.unshift(
    createAuditEvent("invite.created", `Invite created for role ${role}.`),
  );

  return {
    invite: sanitizeInvite(invite),
    rawToken,
  };
}

export async function registerParticipant(bundle: RegistrationBundle) {
  const store = getStore();
  const invite = store.invites.find(
    (entry) => entry.hashedToken === hashToken(bundle.inviteToken),
  );

  if (!invite) {
    throw new Error("Invite token is invalid.");
  }

  if (invite.role !== bundle.role) {
    throw new Error("Invite token role does not match the registration route.");
  }

  if (invite.status !== "pending") {
    throw new Error("Invite token has already been used.");
  }

  if (isExpired(invite.expiresAt)) {
    invite.status = "expired";
    throw new Error("Invite token has expired.");
  }

  const expectedMessage = buildRegistrationMessage(bundle.role, bundle.inviteToken);
  if (bundle.registrationMessage !== expectedMessage) {
    throw new Error("Registration message does not match the expected invite payload.");
  }

  const recoveredAddress = await recoverMessageAddress({
    message: bundle.registrationMessage,
    signature: bundle.registrationSignature as `0x${string}`,
  });

  if (recoveredAddress.toLowerCase() !== bundle.walletAddress.toLowerCase()) {
    throw new Error("Registration signature does not match the submitted wallet address.");
  }

  const existing = store.participants.find(
    (participant) => participant.role === bundle.role,
  );
  const timestamp = now();

  const participant: Participant = {
    id: existing?.id ?? randomUUID(),
    role: bundle.role,
    displayName: bundle.displayName,
    walletAddress: recoveredAddress,
    registrationMessage: bundle.registrationMessage,
    registrationSignature: bundle.registrationSignature,
    source: bundle.source,
    status: "ready",
    inviteId: invite.id,
    registeredAt: existing?.registeredAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (existing) {
    const index = store.participants.findIndex(
      (entry) => entry.role === bundle.role,
    );
    store.participants[index] = participant;
  } else {
    store.participants.push(participant);
  }

  invite.status = "used";
  invite.usedAt = timestamp;
  store.auditEvents.unshift(
    createAuditEvent(
      "participant.registered",
      `${bundle.role} registered wallet ${recoveredAddress.slice(0, 10)}...`,
    ),
  );

  return participant;
}

export function getRegistrationMessage(role: ExternalRole, inviteToken: string) {
  return buildRegistrationMessage(role, inviteToken);
}

export function resolveInviteToken(inviteToken: string) {
  const store = getStore();
  const hashedToken = hashToken(inviteToken);
  const invite = store.invites.find((entry) => entry.hashedToken === hashedToken);

  if (!invite) {
    throw new Error("Invite token is invalid.");
  }

  const ceremony = store.ceremonies
    .map(normalizeCeremony)
    .find((entry) => entry.inviteIds.includes(invite.id));

  return {
    invite: sanitizeInvite(invite),
    ceremonyId: ceremony?.id ?? null,
  };
}

export function getDashboardData(): DashboardData {
  const store = getStore();

  for (const invite of store.invites) {
    if (invite.status === "pending" && isExpired(invite.expiresAt)) {
      invite.status = "expired";
    }
  }

  return {
    invites: store.invites.map(sanitizeInvite),
    participants: store.participants,
    ceremonies: store.ceremonies.map(normalizeCeremony),
    signRequests: store.signRequests,
    keys: store.keys,
    auditEvents: store.auditEvents.slice(0, 12),
  };
}

export function getCeremonyById(id: string) {
  const ceremony = getStore().ceremonies.find((entry) => entry.id === id);

  if (!ceremony) {
    throw new Error("Ceremony not found.");
  }

  return normalizeCeremony(ceremony);
}

function createInviteRecord(role: ExternalRole, hours = 24) {
  const store = getStore();
  const rawToken = randomBytes(16).toString("hex");
  const invite: Invite = {
    id: randomUUID(),
    role,
    hashedToken: hashToken(rawToken),
    expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
    status: "pending",
    createdAt: now(),
  };

  store.invites.unshift(invite);

  return { invite, rawToken };
}

export function createCeremony(input: {
  requestedByRole: Role;
  selectedParticipants: ExternalRole[];
  inviteHours?: number;
  origin?: string;
}) {
  const store = getStore();
  assertRoleAllowedForCeremony(input.requestedByRole);
  const selectedParticipants = [...new Set(input.selectedParticipants)];
  if (selectedParticipants.length !== 2) {
    throw new Error("Choose exactly two invited participants for the 2-of-3 ceremony.");
  }

  const inviteHours = input.inviteHours ?? 24;
  const inviteRecords = selectedParticipants.map((role) =>
    createInviteRecord(role, inviteHours),
  );
  const joinLinks = inviteRecords.map(({ invite, rawToken }) => ({
    role: invite.role,
    inviteUrl: input.origin
      ? `${input.origin}/qkms/join/${rawToken}`
      : `/qkms/join/${rawToken}`,
  }));
  const ceremony: Ceremony = {
    id: randomUUID(),
    requestedByRole: input.requestedByRole,
    selectedParticipants,
    activeParticipants: ["C"],
    inviteIds: inviteRecords.map(({ invite }) => invite.id),
    joinLinks,
    status: "pending",
    createdAt: now(),
    updatedAt: now(),
  };

  store.ceremonies.unshift(ceremony);
  store.auditEvents.unshift(
    createAuditEvent(
      "ceremony.created",
      `Registration ceremony started by C for ${selectedParticipants.join(" + ")}.`,
    ),
  );

  return {
    ceremony,
    inviteRecords: inviteRecords.map(({ invite, rawToken }) => ({
      invite: sanitizeInvite(invite),
      rawToken,
    })),
  };
}

export function joinCeremony(id: string, role: "M" | "P") {
  const store = getStore();
  const ceremony = store.ceremonies.find((entry) => entry.id === id);

  if (!ceremony) {
    throw new Error("Ceremony not found.");
  }

  requireRegistered(role);

  if (ceremony.activeParticipants.includes(role)) {
    throw new Error(`${role} is already active in this ceremony.`);
  }

  ceremony.activeParticipants = [...ceremony.activeParticipants, role];
  ceremony.status = "ready";
  ceremony.updatedAt = now();
  store.auditEvents.unshift(
    createAuditEvent("ceremony.joined", `${role} joined ceremony ${id}.`),
  );

  return ceremony;
}

export async function createKeyForCeremony(id: string) {
  const store = getStore();
  const ceremony = store.ceremonies.find((entry) => entry.id === id);

  if (!ceremony) {
    throw new Error("Ceremony not found.");
  }

  if (ceremony.selectedParticipants.length !== 2) {
    throw new Error("Ceremony must have exactly two invited participants.");
  }

  for (const role of ceremony.selectedParticipants) {
    requireRegistered(role);
  }

  ceremony.activeParticipants = ["C", ...ceremony.selectedParticipants];
  ceremony.status = "ready";
  ceremony.updatedAt = now();

  const key = await createKeyCeremony({
    participants: ["C", ...ceremony.selectedParticipants],
    threshold: 2,
    totalParties: 3,
    keySpec: "secp256k1",
    usage: "Sign/Verify",
  });

  store.keys.unshift(key);
  ceremony.keyId = key.id;
  ceremony.status = "key-created";
  ceremony.updatedAt = now();
  store.auditEvents.unshift(
    createAuditEvent(
      "ceremony.key-created",
      `Key ${key.id} created from ceremony ${id}.`,
    ),
  );

  return { ceremony, key };
}

export function createSignRequest(input: {
  title: string;
  keyId: string;
  actionType: ActionType;
  payloadHash: string;
}) {
  const store = getStore();
  const key = store.keys.find((entry) => entry.id === input.keyId);

  if (!key) {
    throw new Error("Key not found.");
  }

  const signRequest: SignRequest = {
    id: randomUUID(),
    title: input.title,
    keyId: input.keyId,
    actionType: input.actionType,
    payloadHash: input.payloadHash,
    requiredParticipants: getRequiredParticipants(input.actionType),
    approvals: [],
    status: "pending-approvals",
    createdAt: now(),
    updatedAt: now(),
  };

  store.signRequests.unshift(signRequest);
  store.auditEvents.unshift(
    createAuditEvent(
      "sign-request.created",
      `Sign request created for ${input.actionType} action.`,
    ),
  );

  return signRequest;
}

export async function approveSignRequest(input: {
  id: string;
  role: Role;
  walletAddress: string;
  approvalMessage: string;
  approvalSignature: string;
}) {
  const store = getStore();
  const signRequest = store.signRequests.find((entry) => entry.id === input.id);

  if (!signRequest) {
    throw new Error("Sign request not found.");
  }

  if (signRequest.status === "revoked" || signRequest.status === "archived") {
    throw new Error("This sign request is no longer active.");
  }

  if (!signRequest.requiredParticipants.includes(input.role)) {
    throw new Error(`${input.role} cannot approve this request.`);
  }

  const expectedMessage = buildApprovalMessage(signRequest, input.role);
  if (input.approvalMessage !== expectedMessage) {
    throw new Error("Approval message does not match the expected request payload.");
  }

  const recoveredAddress = await recoverMessageAddress({
    message: input.approvalMessage,
    signature: input.approvalSignature as `0x${string}`,
  });

  if (recoveredAddress.toLowerCase() !== input.walletAddress.toLowerCase()) {
    throw new Error("Approval signature does not match the submitted wallet address.");
  }

  const expectedWalletAddress =
    input.role === "C"
      ? store.coordinatorWalletAddress ?? recoveredAddress
      : requireRegistered(input.role).walletAddress;

  if (input.role === "C" && !store.coordinatorWalletAddress) {
    store.coordinatorWalletAddress = recoveredAddress;
  }

  if (recoveredAddress.toLowerCase() !== expectedWalletAddress.toLowerCase()) {
    throw new Error(`${input.role} approval must be signed by the enrolled wallet.`);
  }

  const approval = {
    id: randomUUID(),
    role: input.role,
    walletAddress: recoveredAddress,
    approvalMessage: input.approvalMessage,
    approvalSignature: input.approvalSignature,
    createdAt: now(),
  };

  const existingApprovalIndex = signRequest.approvals.findIndex(
    (entry) => entry.role === input.role,
  );

  if (existingApprovalIndex >= 0) {
    signRequest.approvals[existingApprovalIndex] = approval;
  } else {
    signRequest.approvals.push(approval);
  }

  signRequest.status =
    signRequest.approvals.length === signRequest.requiredParticipants.length
      ? "approved"
      : "pending-approvals";
  signRequest.updatedAt = now();
  store.auditEvents.unshift(
    createAuditEvent(
      "sign-request.approved",
      `${input.role} approved sign request ${input.id} with wallet ${recoveredAddress.slice(0, 10)}...`,
    ),
  );

  return signRequest;
}

export async function processSignRequest(id: string, liveParticipants: Role[]) {
  const store = getStore();
  const signRequest = store.signRequests.find((entry) => entry.id === id);

  if (!signRequest) {
    throw new Error("Sign request not found.");
  }

  if (signRequest.status === "revoked" || signRequest.status === "archived") {
    throw new Error("This sign request is no longer active.");
  }

  const participantError = validatePolicyParticipants(liveParticipants);
  if (participantError) {
    throw new Error(participantError);
  }

  const normalizedLive = [...new Set(liveParticipants)].sort().join(",");
  const normalizedRequired = [...signRequest.requiredParticipants].sort().join(",");

  if (normalizedLive !== normalizedRequired) {
    throw new Error("Live MPC participants must match the required policy pair.");
  }

  const approvedRoles = signRequest.approvals.map((approval) => approval.role);
  const missingApprovals = signRequest.requiredParticipants.filter(
    (role) => !approvedRoles.includes(role),
  );

  if (missingApprovals.length > 0) {
    throw new Error(
      `Missing approvals from ${missingApprovals.join(", ")} before processing.`,
    );
  }

  signRequest.status = "processing";
  signRequest.updatedAt = now();

  await startSigningSession({
    keyId: signRequest.keyId,
    participants: liveParticipants,
    payloadHash: signRequest.payloadHash,
  });
  await getPublicKey(signRequest.keyId);
  const result: QkmsSignResult = await signPayload(
    signRequest.keyId,
    signRequest.payloadHash,
    liveParticipants,
  );

  if (result.kind === "signature") {
    signRequest.resultSignature = result.signature;
    signRequest.resultSummary = `${result.provider} signature returned.`;
    signRequest.providerName = result.provider;
    signRequest.providerRequestId = undefined;
  } else {
    signRequest.resultSignature = undefined;
    signRequest.resultSummary = result.summary;
    signRequest.providerName = result.provider;
    signRequest.providerRequestId = result.operationId;
  }
  signRequest.status = "completed";
  signRequest.updatedAt = now();
  store.auditEvents.unshift(
    createAuditEvent(
      "sign-request.processed",
      `Sign request ${id} completed with ${liveParticipants.join(" + ")}.`,
    ),
  );

  return signRequest;
}

export function revokeSignRequest(id: string) {
  const store = getStore();
  const signRequest = store.signRequests.find((entry) => entry.id === id);

  if (!signRequest) {
    throw new Error("Sign request not found.");
  }

  if (signRequest.status === "completed") {
    throw new Error("Completed requests cannot be revoked.");
  }

  if (signRequest.status === "archived") {
    throw new Error("Archived requests cannot be revoked.");
  }

  signRequest.status = "revoked";
  signRequest.updatedAt = now();
  store.auditEvents.unshift(
    createAuditEvent(
      "sign-request.revoked",
      `Sign request ${id} was revoked by C.`,
    ),
  );

  return signRequest;
}

export function archiveSignRequest(id: string) {
  const store = getStore();
  const signRequest = store.signRequests.find((entry) => entry.id === id);

  if (!signRequest) {
    throw new Error("Sign request not found.");
  }

  if (
    signRequest.status !== "completed" &&
    signRequest.status !== "revoked" &&
    signRequest.status !== "rejected"
  ) {
    throw new Error("Only completed or revoked requests can be archived.");
  }

  signRequest.status = "archived";
  signRequest.updatedAt = now();
  store.auditEvents.unshift(
    createAuditEvent(
      "sign-request.archived",
      `Sign request ${id} was archived by C.`,
    ),
  );

  return signRequest;
}
