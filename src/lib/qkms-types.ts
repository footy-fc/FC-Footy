export type Role = "C" | "M" | "P";

export type ExternalRole = Exclude<Role, "C">;

export type InviteStatus = "pending" | "used" | "expired";

export type ParticipantStatus = "invited" | "registered" | "ready";

export type CeremonyStatus = "pending" | "ready" | "key-created";

export type SignRequestStatus =
  | "pending-approvals"
  | "approved"
  | "processing"
  | "completed"
  | "rejected"
  | "revoked"
  | "archived";

export type ActionType = "security" | "admin";

export interface RegistrationBundle {
  inviteToken: string;
  displayName: string;
  role: ExternalRole;
  walletAddress: string;
  registrationMessage: string;
  registrationSignature: string;
  source: "external-wallet" | "embedded-wallet";
}

export interface Invite {
  id: string;
  role: ExternalRole;
  hashedToken: string;
  expiresAt: string;
  status: InviteStatus;
  createdAt: string;
  usedAt?: string;
}

export interface Participant {
  id: string;
  role: ExternalRole;
  displayName: string;
  walletAddress: string;
  registrationMessage: string;
  registrationSignature: string;
  source: RegistrationBundle["source"];
  status: ParticipantStatus;
  inviteId: string;
  registeredAt: string;
  updatedAt: string;
}

export interface Ceremony {
  id: string;
  requestedByRole: Role;
  selectedParticipants: ExternalRole[];
  activeParticipants: Role[];
  inviteIds: string[];
  joinLinks?: Array<{ role: ExternalRole; inviteUrl: string }>;
  status: CeremonyStatus;
  keyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  role: Role;
  walletAddress: string;
  approvalMessage: string;
  approvalSignature: string;
  createdAt: string;
}

export interface SignRequest {
  id: string;
  title: string;
  keyId: string;
  actionType: ActionType;
  payloadHash: string;
  requiredParticipants: Role[];
  approvals: Approval[];
  status: SignRequestStatus;
  createdAt: string;
  updatedAt: string;
  resultSignature?: string;
  resultSummary?: string;
  providerRequestId?: string;
  providerName?: string;
}

export interface QkmsKey {
  id: string;
  publicKey: string;
  threshold: 2;
  totalParties: 3;
  keySpec: "secp256k1";
  usage: "Sign/Verify";
  participantRoles: Role[];
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  type:
    | "invite.created"
    | "participant.registered"
    | "ceremony.created"
    | "ceremony.joined"
    | "ceremony.key-created"
    | "sign-request.created"
    | "sign-request.approved"
    | "sign-request.processed"
    | "sign-request.revoked"
    | "sign-request.archived";
  message: string;
  createdAt: string;
}

export interface DashboardData {
  invites: Array<Omit<Invite, "hashedToken">>;
  participants: Participant[];
  ceremonies: Ceremony[];
  signRequests: SignRequest[];
  keys: QkmsKey[];
  auditEvents: AuditEvent[];
}
